# Vercel, Turso, and GitHub Actions Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Daybreak from synchronous local SQLite (`better-sqlite3`) to `@libsql/client` (Turso in the cloud, local file-based in dev), migrate existing articles and read states to Turso, implement a single-user mobile-friendly password gate, and configure scheduled background ingestion via GitHub Actions and deployment to Vercel at zero cost.

**Architecture:** 
1. Replace `better-sqlite3` with `@libsql/client` and `drizzle-orm/libsql`.
2. Convert all database calls in `src/db/`, server components (`src/app/`), server actions (`src/server/`), and CLI ingestion (`src/ingest/`, `src/cli/`) to `async/await`.
3. Add a lightweight single-user password screen (`/login`) with an `HttpOnly` 30-day session cookie and middleware to protect paywalled content on Vercel without multi-tenant complexity.
4. Implement an idempotent migration script (`src/cli/migrate-to-turso.ts`) to transfer the 193 existing local articles, bookmarks, and digest history into Turso.
5. Create a GitHub Actions workflow (`.github/workflows/fetch-digests.yml`) running twice daily on cron to fetch and parse Medium digests autonomously, using GitHub Secrets configured via `gh secret set`.

**Tech Stack:** Next.js 16 App Router, TypeScript, Drizzle ORM, `@libsql/client` (Turso), GitHub Actions, Vercel, Vitest, Zod.

**Spec:** `docs/superpowers/specs/2026-11-09-vercel-turso-deployment-design.md`

## Global Constraints
- Every database query must use `@libsql/client` and return a Promise (`await`).
- The SQLite table schema (`src/db/schema.ts`) must remain identical to preserve data compatibility.
- Local development must still function offline when `TURSO_DATABASE_URL` starts with `file:`.
- All text styling on the new `/login` page must use `src/components/ui/typography.tsx`.
- Secrets must never be logged or committed to Git.
- All tasks must pass `pnpm check` (`pnpm lint && pnpm typecheck && pnpm test`).

## Review Focus
1. **Network Latency & Connection Pooling**: Turso HTTP connections over serverless lambdas must reuse client instances rather than leaking connections per query.
2. **Batch Upsert Integrity**: Data migration from local SQLite to Turso must preserve IDs, timestamps, read/saved boolean states, and `processedEmails` records without constraint violations.
3. **Session Cookie Security**: The `daybreak_auth` cookie must be `HttpOnly`, `Secure` in production, `SameSite=Lax`, and validate against a hashed `APP_PASSWORD`.
4. **GitHub Actions Timing & Secret Injection**: The cron workflow must cleanly inject `GMAIL_APP_PASSWORD` and Turso credentials into the CLI process without logging them in GitHub Actions output.
5. **Vercel Build Compatibility**: The build step (`pnpm build`) must not fail on pre-rendering dynamic routes (`force-dynamic` must be preserved).

---

### Task 1: Dependencies and Environment Validation

**Files:**
- Modify: `package.json`
- Modify: `src/lib/env.ts`
- Modify: `src/lib/env.test.ts`
- Modify: `src/lib/ingest-env.ts`
- Modify: `src/lib/ingest-env.test.ts`

**Interfaces:**
- Consumes: Environment variables (`process.env.TURSO_DATABASE_URL`, `process.env.TURSO_AUTH_TOKEN`, `process.env.APP_PASSWORD`).
- Produces: Type-safe environment schemas in `src/lib/env.ts` and `src/lib/ingest-env.ts`.

- [ ] **Step 1: Write failing tests in `src/lib/env.test.ts` and `src/lib/ingest-env.test.ts` for Turso and Auth env vars**
- [ ] **Step 2: Run tests to verify failure**
  Run: `pnpm test src/lib/env.test.ts src/lib/ingest-env.test.ts`
  Expected: FAIL (missing fields in Zod schema)
- [ ] **Step 3: Update `package.json` to replace `better-sqlite3` and `@types/better-sqlite3` with `@libsql/client`**
  Run: `pnpm remove better-sqlite3 @types/better-sqlite3 && pnpm add @libsql/client`
- [ ] **Step 4: Update Zod validation schemas in `src/lib/env.ts` and `src/lib/ingest-env.ts`**
  Add `TURSO_DATABASE_URL` (optional in test/dev, string), `TURSO_AUTH_TOKEN` (optional in test/dev, string), and `APP_PASSWORD` (string, optional with default in dev).
- [ ] **Step 5: Run tests to verify pass**
  Run: `pnpm test src/lib/env.test.ts src/lib/ingest-env.test.ts`
  Expected: PASS
- [ ] **Step 6: Commit**
  `git commit -m "feat(env): add turso and auth env vars and switch to @libsql/client"`

---

### Task 2: Database Client & Instance Migration (`src/db/client.ts`, `src/db/instance.ts`)

**Files:**
- Modify: `src/db/client.ts`
- Modify: `src/db/client.test.ts`
- Modify: `src/db/instance.ts`
- Modify: `src/db/instance.test.ts`

**Interfaces:**
- Consumes: `@libsql/client`, `drizzle-orm/libsql`.
- Produces: `createDb(config: { url: string; authToken?: string }) -> LibSQLDatabase`, `getDb() -> LibSQLDatabase`.

- [ ] **Step 1: Write failing unit test in `src/db/client.test.ts` asserting `createDb` returns a LibSQL Drizzle instance connecting via `file:` or `:memory:`**
- [ ] **Step 2: Run test to verify failure**
  Run: `pnpm test src/db/client.test.ts`
  Expected: FAIL
- [ ] **Step 3: Refactor `src/db/client.ts` to use `createClient` from `@libsql/client` and `drizzle` from `drizzle-orm/libsql`**
  Support local file paths (`file:...`), memory (`:memory:`), and remote Turso URLs (`libsql://...` with auth token).
- [ ] **Step 4: Update `src/db/instance.ts` to instantiate using `env.TURSO_DATABASE_URL || env.DATABASE_PATH` and `env.TURSO_AUTH_TOKEN`**
- [ ] **Step 5: Run tests to verify pass**
  Run: `pnpm test src/db/client.test.ts src/db/instance.test.ts`
  Expected: PASS
- [ ] **Step 6: Commit**
  `git commit -m "feat(db): implement libsql client in createDb and instance caching"`

---

### Task 3: Async Database Repository Layer (`src/db/articles.ts`, `src/db/processedEmails.ts`, `src/db/ingestRuns.ts`)

**Files:**
- Modify: `src/db/articles.ts`
- Modify: `src/db/articles.test.ts`
- Modify: `src/db/processedEmails.ts`
- Modify: `src/db/processedEmails.test.ts`
- Modify: `src/db/ingestRuns.ts`
- Modify: `src/db/ingestRuns.test.ts`

**Interfaces:**
- Consumes: `DbClient` from `src/db/client.ts`.
- Produces: Async repository functions:
  - `upsertArticle(db, article): Promise<{ row: Article; action: "inserted" | "updated" | "unchanged" }>`
  - `listArticles(db, options?): Promise<SidebarArticle[]>`
  - `getArticleById(db, id): Promise<Article | undefined>`
  - `setArticleRead(db, id, isRead): Promise<Article | undefined>`
  - `setArticleSaved(db, id, isSaved): Promise<Article | undefined>`
  - `purgeOldArticles(db, olderThanIso): Promise<number>`
  - `countPurgeCandidates(db, olderThanIso): Promise<number>`
  - `markEmailProcessed(db, messageId, count): Promise<void>`
  - `isEmailProcessed(db, messageId): Promise<boolean>`
  - `createIngestRun(db, startedAt): Promise<number>`
  - `finishIngestRun(db, id, stats): Promise<void>`

- [ ] **Step 1: Update repository tests in `src/db/*.test.ts` with `async/await`**
- [ ] **Step 2: Run tests to verify failure**
  Run: `pnpm test src/db/articles.test.ts src/db/processedEmails.test.ts src/db/ingestRuns.test.ts`
  Expected: FAIL
- [ ] **Step 3: Update `src/db/articles.ts` to replace `.get()`, `.all()`, and `.run()` with `await` query executions**
- [ ] **Step 4: Update `src/db/processedEmails.ts` and `src/db/ingestRuns.ts` to be `async`**
- [ ] **Step 5: Run tests to verify pass**
  Run: `pnpm test src/db/`
  Expected: PASS
- [ ] **Step 6: Commit**
  `git commit -m "feat(db): convert articles, processedEmails, and ingestRuns repositories to async"`

---

### Task 4: Ingestion Pipeline & CLI Async Updates

**Files:**
- Modify: `src/ingest/fetchDigests.ts`
- Modify: `src/ingest/fetchDigests.test.ts`
- Modify: `src/cli/fetch-digests.ts`
- Modify: `src/cli/purge-old-articles.ts`
- Modify: `src/cli/inspect-db.ts`
- Modify: `src/cli/backfill-subtitles.ts`
- Modify: `src/cli/backfill-subtitles.test.ts`

**Interfaces:**
- Consumes: Async functions from `src/db/*.ts`.
- Produces: Updated CLI commands and ingestion pipeline compatible with Promise-based repository calls.

- [ ] **Step 1: Update `src/ingest/fetchDigests.test.ts` and `src/cli/backfill-subtitles.test.ts` for async expectations**
- [ ] **Step 2: Run tests to verify failure**
  Run: `pnpm test src/ingest/fetchDigests.test.ts src/cli/backfill-subtitles.test.ts`
  Expected: FAIL
- [ ] **Step 3: Update `src/ingest/fetchDigests.ts` to `await` calls to `isEmailProcessed`, `upsertArticle`, and `markEmailProcessed`**
- [ ] **Step 4: Update CLI scripts (`fetch-digests.ts`, `purge-old-articles.ts`, `inspect-db.ts`, `backfill-subtitles.ts`) to `await` DB calls**
- [ ] **Step 5: Run tests to verify pass**
  Run: `pnpm test src/ingest/ src/cli/`
  Expected: PASS
- [ ] **Step 6: Commit**
  `git commit -m "feat(ingest): wire async db repository calls into ingest pipeline and cli"`

---

### Task 5: Web UI & Server Actions Async Updates

**Files:**
- Modify: `src/server/actions.ts`
- Modify: `src/server/actions.test.ts`
- Modify: `src/app/(reader)/layout.tsx`
- Modify: `src/app/(reader)/read/[id]/page.tsx`

**Interfaces:**
- Consumes: Async `listArticles`, `getArticleById`, `setArticleRead`.
- Produces: Async Server Components and Server Actions in App Router.

- [ ] **Step 1: Update `src/server/actions.test.ts` to await `setArticleRead`**
- [ ] **Step 2: Update `src/server/actions.ts` to `await setArticleRead(db, parsedId, true)`**
- [ ] **Step 3: Update `src/app/(reader)/layout.tsx` to `const articles = await listArticles(db)`**
- [ ] **Step 4: Update `src/app/(reader)/read/[id]/page.tsx` to `await getArticleById(db, id)`**
- [ ] **Step 5: Run tests to verify pass**
  Run: `pnpm test src/server/actions.test.ts`
  Expected: PASS
- [ ] **Step 6: Commit**
  `git commit -m "feat(web): update reader layout, article page, and actions for async db queries"`

---

### Task 6: Data Migration CLI (`src/cli/migrate-to-turso.ts`)

**Files:**
- Create: `src/cli/migrate-to-turso.ts`
- Create: `src/cli/migrate-to-turso.test.ts`
- Modify: `package.json` (add `"db:migrate-to-turso"` script)

**Interfaces:**
- Consumes: Local SQLite database at `data/medium-reader.db` and target Turso database client.
- Produces: CLI tool to safely copy all 193 articles, bookmarks, and digest records from local SQLite to Turso.

- [ ] **Step 1: Write test in `src/cli/migrate-to-turso.test.ts` verifying migration copies rows between two SQLite/LibSQL instances idempotently**
- [ ] **Step 2: Run test to verify failure**
  Run: `pnpm test src/cli/migrate-to-turso.test.ts`
  Expected: FAIL (file does not exist)
- [ ] **Step 3: Implement `src/cli/migrate-to-turso.ts`**
  - Connects to source database (`data/medium-reader.db` via file URL or better-sqlite3 reader/libsql file).
  - Connects to target database via `env.TURSO_DATABASE_URL` and `env.TURSO_AUTH_TOKEN`.
  - Migrates schema if needed, batches articles, bookmarks, and `processedEmails`.
  - Prints summary stats (count migrated, skipped, errors).
- [ ] **Step 4: Run test to verify pass**
  Run: `pnpm test src/cli/migrate-to-turso.test.ts`
  Expected: PASS
- [ ] **Step 5: Commit**
  `git commit -m "feat(cli): add migrate-to-turso CLI script for existing data porting"`

---

### Task 7: Single-User Access Gate (`src/middleware.ts` & `src/app/login/page.tsx`)

**Files:**
- Create: `src/middleware.ts`
- Create: `src/app/login/page.tsx`
- Create: `src/server/auth-actions.ts`
- Create: `src/server/auth-actions.test.ts`

**Interfaces:**
- Consumes: `env.APP_PASSWORD`.
- Produces:
  - Route middleware protecting `/` and `/read/*` when `APP_PASSWORD` is configured.
  - Minimal Daybreak-styled `/login` page with single password input.
  - Server action setting 30-day `HttpOnly`, `SameSite=Lax`, `Secure` cookie `daybreak_auth`.

- [ ] **Step 1: Write unit test in `src/server/auth-actions.test.ts` testing password verification and cookie generation**
- [ ] **Step 2: Run test to verify failure**
  Run: `pnpm test src/server/auth-actions.test.ts`
  Expected: FAIL
- [ ] **Step 3: Implement `src/server/auth-actions.ts`**
  Exports `loginAction(password: string): Promise<{ success: boolean; error?: string }>`.
- [ ] **Step 4: Implement `src/middleware.ts`**
  Intercepts requests; if `APP_PASSWORD` is set and cookie `daybreak_auth` is missing or invalid, redirects to `/login`. Skips `_next`, `favicon.ico`, and static assets.
- [ ] **Step 5: Implement `src/app/login/page.tsx`**
  Minimalist, distraction-free login form using `<UiLabel>`, `<SectionLabel>`, `<Button>`, and semantic typography.
- [ ] **Step 6: Run tests to verify pass**
  Run: `pnpm test src/server/auth-actions.test.ts`
  Expected: PASS
- [ ] **Step 7: Commit**
  `git commit -m "feat(auth): implement single-user password gate and login screen"`

---

### Task 8: GitHub Actions Scheduled Ingestion Workflow

**Files:**
- Create: `.github/workflows/fetch-digests.yml`
- Create: `scripts/set-gh-secrets.ps1`

**Interfaces:**
- Consumes: GitHub Secrets (`GMAIL_USER`, `GMAIL_APP_PASSWORD`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `LOG_LEVEL`).
- Produces: Scheduled twice-daily cron workflow and helper script to upload local `.env` secrets via `gh secret set`.

- [ ] **Step 1: Create `.github/workflows/fetch-digests.yml`**
  - Trigger: `schedule: cron '0 6,18 * * *'` + `workflow_dispatch:`.
  - Runner: `ubuntu-latest`.
  - Steps: Checkout, setup pnpm, setup node 22, install dependencies, run `pnpm fetch-digests`.
- [ ] **Step 2: Create `scripts/set-gh-secrets.ps1`**
  Reads keys from local `.env` and calls `gh secret set <NAME> -b "<VALUE>"` for each required credential.
- [ ] **Step 3: Commit**
  `git commit -m "ci: add fetch-digests github actions workflow and secret setup script"`

---

### Task 9: Full Verification Gate, Data Migration, and Cutover

**Files:**
- Verify: Full static & test gate (`pnpm check`).
- Execute: Data migration CLI to populate Turso.
- Execute: Push secrets to GitHub Actions using `scripts/set-gh-secrets.ps1`.
- Verify: Test run of GitHub Action via `gh workflow run fetch-digests.yml`.

- [ ] **Step 1: Run static and test gate**
  Run: `pnpm check`
  Expected: Lint clean, TypeScript clean, all Vitest suites PASS.
- [ ] **Step 2: Run data migration script to populate remote Turso DB**
  Run: `pnpm tsx src/cli/migrate-to-turso.ts`
  Expected: 193 articles and processed emails successfully transferred to Turso.
- [ ] **Step 3: Run `scripts/set-gh-secrets.ps1` to upload repository secrets to GitHub**
  Expected: Secrets set successfully via GitHub CLI.
- [ ] **Step 4: Trigger test run of the GitHub Actions ingestion workflow**
  Run: `gh workflow run fetch-digests.yml`
  Expected: Workflow triggered and runs green.
- [ ] **Step 5: Verify production build passes**
  Run: `pnpm build`
  Expected: Next.js build succeeds with zero errors.
- [ ] **Step 6: Update documentation and write step log**
  Update `CONTEXT.md` and write `docs/steps/step-10-vercel-turso-migration.md`.
