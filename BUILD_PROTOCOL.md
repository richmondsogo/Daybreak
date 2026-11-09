# Daybreak Build & Codebase Evolution Protocol

This document is the authoritative standard for developing, extending, testing, and deploying Daybreak (`medium-reader`). Every agent or human engineer collaborating on this repository must adhere to this protocol without exception.

---

## 0. Superpowers Foundations & Operating Principles

1. **Invoke Superpowers Skills First (`using-superpowers`)**:
   - Check and invoke applicable skills *before* taking any action or writing any code.
   - For creative or new functionality: invoke `brainstorming` before planning.
   - For multi-step tasks: invoke `writing-plans` to produce a step-by-step implementation plan.
   - For bugs or regressions: invoke `systematic-debugging` before proposing fixes.
   - For all code changes: follow `test-driven-development` (`tdd`) red-green-refactor loop.
   - Before declaring any task complete: run `verification-before-completion`.
   - When completing feature work: invoke `finishing-a-development-branch`.

2. **Wait for Approval**:
   - Present a structured plan with clear Success Criteria and per-item verification checks.
   - Do not edit production source files until the user explicitly approves the plan.

3. **One Step at a Time**:
   - Work strictly on the single step or task approved by the user. Do not speculatively start subsequent steps.

4. **Dedicated Branching**:
   - Every step or feature must be developed on a dedicated branch off `main` (`git checkout -b step/<number>-<slug>`).
   - Atomic, logical commits using conventional commit types (`feat:`, `fix:`, `perf:`, `refactor:`, `docs:`, `test:`, `chore:`).
   - **STANDING RULE**: Never run `git push --force` or `git push -f` under any circumstance without stopping and asking the user first.

5. **Surgical Precision**:
   - Touch only what the current task strictly requires.
   - No speculative flexibility, unused helpers, or dead code left behind. If removing a feature, remove all supporting infrastructure in the same change.

6. **No Unapproved Dependencies**:
   - Never run `pnpm add` or install new packages without asking the user first and providing clear technical justification why existing tools cannot suffice.

---

## 1. The Superpowers Execution Loop

Every code modification follows this 5-phase loop:

```
[ Phase 1: Exploration & Brainstorming ]
                   │
                   ▼
[ Phase 2: Implementation Planning ]
                   │
                   ▼
[ Phase 3: Test-Driven Implementation (TDD) ]
                   │
                   ▼
[ Phase 4: Verification Gate (Static + Runtime) ]
                   │
                   ▼
[ Phase 5: Branch Finish & Integration ]
```

### Phase 1: Exploration & Brainstorming
- Check `CONTEXT.md` to ensure domain terminology and bounded contexts are respected.
- Read existing implementations and tests to understand module boundaries.
- For open-ended or architectural choices, invoke `brainstorming` to explore alternatives and stress-test assumptions before committing to an approach.

### Phase 2: Implementation Planning
- Invoke `writing-plans`.
- Break work down into small, cohesive, bite-sized tasks.
- Every task must define:
  1. Files to create/modify.
  2. Test cases to add/update.
  3. Explicit, runnable verification command.
- Wait for explicit user approval before touching code.

### Phase 3: Test-Driven Implementation
- Invoke `test-driven-development` (`tdd`).
- **Red**: Write a failing unit or integration test (`*.test.ts` / `*.test.tsx`) that captures the new requirement or reproduces the reported bug.
- **Green**: Write the minimal implementation code necessary to make the test pass.
- **Refactor**: Clean up implementation and test code while keeping tests green.
- Respect architectural seams:
  - `src/app/` = Routing, layout composition, and page metadata only.
  - `src/components/` = UI components. Never import database clients or ingest environment here.
  - `src/server/` = Server Actions and server-side request orchestrators.
  - `src/db/` = All database queries and mutations via repository functions.
  - `src/ingest/` = Pure pipeline functions for fetching, parsing, and cleaning digests.

### Phase 4: Verification Gate
Never assert success based on inspecting code. Always run real verification commands:
1. **Static & Test Gate**:
   ```powershell
   pnpm check
   .\scripts\verify.ps1
   ```
2. **Runtime & Browser Gate** (mandatory for UI, CSS, or route changes):
   - Start the local dev server (`pnpm dev`) or inspect the live Vercel deployment.
   - Use Chrome DevTools MCP (`navigate_page`, `take_snapshot`) or browser verification to inspect real DOM rendering.
   - Verify both dark and light modes, responsive viewports, and console hygiene (zero warnings/errors).

### Phase 5: Branch Finish & Delivery
- Invoke `finishing-a-development-branch`.
- Document changes in `docs/steps/step-<number>-<slug>.md`.
- Update relevant architecture records (`CONTEXT.md`, `DESIGN.md`, `docs/architecture.md`, `docs/adr/`).
- Merge cleanly into `main`, push to GitHub, and verify automated CI/CD.

---

## 2. Protocol for Adding a New Feature

When creating new capabilities for Daybreak:

### Step 1: Interface & Domain Design
1. Check `CONTEXT.md`. Define the domain concept, data fields, and lifecycle states using existing project vocabulary.
2. If UI is involved, consult `DESIGN.md`.
   - **MANDATORY**: All text styling must use semantic primitives from `src/components/ui/typography.tsx` (`<Wordmark>`, `<UiLabel>`, `<Meta>`, `<Button>`, `<ArticleTitle>`, etc.).
   - Never write raw Tailwind typography utilities (`text-sm`, `font-bold`, `leading-relaxed`) directly in components or pages.
   - Preserve Daybreak's quiet, book-like visual aesthetic.

### Step 2: Define Deep Module Seams
- Keep interfaces narrow and implementations deep.
- Network and external services (IMAP, HTTP fetchers, clocks) must sit behind TypeScript interfaces to allow straightforward mock injection in tests.

### Step 3: Write Tests First
- Add test suites in colocated test files (`src/feature/myFeature.test.ts`).
- Ensure test coverage covers:
  - Happy path.
  - Edge cases (network timeouts, empty strings, malformed HTML, unexpected characters).
  - Idempotency (running twice produces identical outcomes).

### Step 4: Implement & Verify
- Implement the feature following the TDD loop.
- Run `pnpm check`.
- Verify runtime behavior in the browser or terminal.

---

## 3. Protocol for Bug Fixes & Regressions

When diagnosing or fixing an unexpected behavior or failure:

### Step 1: Systematic Investigation
1. Invoke `systematic-debugging`.
2. Do not jump to conclusions or apply trial-and-error patches.
3. Inspect runtime error logs and active state (e.g. `pnpm inspect-db` or GitHub Actions run logs).

### Step 2: Reproducing Test Fixture
1. If the bug involves email or HTML parsing, capture the failing payload into `fixtures/emails/` or `fixtures/html/`.
2. Write a minimal reproduction test case that fails against current code.

### Step 3: Surgical Root-Cause Fix
1. Fix the underlying root cause in the responsible pure module.
2. **NEVER** delete, weaken, or skip existing tests to make a suite pass.
3. Run `pnpm check` and `.\scripts\verify.ps1` to confirm zero regressions across the entire suite.

---

## 4. Protocol for Database & Schema Evolution

Daybreak uses Drizzle ORM with `@libsql/client` supporting dual runtimes: local SQLite files (`file:...`) and remote Turso cloud databases (`libsql://...`). All repository calls are asynchronous.

### Step 1: Update Schema Definition
1. Modify table structures or indexes in `src/db/schema.ts`.
2. Ensure new columns are optional or have sensible default values to maintain backwards compatibility with existing rows.
3. If query patterns change, add supporting B-tree or full-text indexes.

### Step 2: Generate Migrations
1. Run Drizzle migration generation:
   ```bash
   pnpm db:generate
   ```
2. Inspect the generated SQL migration file under `drizzle/migrations/` to verify correctness.

### Step 3: Update Repository Methods
1. Update repository functions in `src/db/articles.ts`, `src/db/processedEmails.ts`, or `src/db/ingestRuns.ts`.
2. Ensure every repository function accepts `db: Database` as its first parameter and returns typed `Promise<T>`.
3. Update repository unit tests in `src/db/*.test.ts` to verify mutations and queries.

### Step 4: Verify Both Runtimes
1. Verify against a local SQLite file (default `DATABASE_PATH`).
2. Verify against the remote Turso database when `TURSO_DATABASE_URL` is set.
3. Run `pnpm inspect-db` to confirm database statistics and index integrity.

---

## 5. Protocol for Ingest Pipeline & Chrome Parser Enhancements

Medium regularly alters its layout, promo banners, and markup structure. Follow this protocol when new chrome leaks appear:

### Step 1: Soft Warning Detection
- Digest runs surface new Medium chrome variants as soft warnings in `errorSummary` (`detectResidualChromeMarkers`) rather than failing silently or breaking UI layout.
- Review warnings in terminal logs or GitHub Actions run logs.

### Step 2: Prototype Regexes in Throwaway Scripts
- **MANDATORY**: For complex or uncertain regular expressions (e.g., nested markdown links or multi-line promo banners), prototype them in a standalone scratch script (`scratch-<name>.js`, outside the test suite) against real examples first.
- Confirm behavior on real text samples before moving the finalized regex into production code.
- Delete all scratch scripts before committing.

### Step 3: Update Cleaner & Add Regression Tests
1. Add the cleanup rule to `src/ingest/cleanArticleMarkdown.ts`.
2. Add a matching test case to `src/ingest/cleanArticleMarkdown.test.ts`.
3. If necessary, run `pnpm backfill-subtitles` or re-extract affected articles.

---

## 6. Protocol for Cloud Deployment & GitHub Actions

Daybreak is deployed on **Vercel** (Hobby tier) with automated background ingestion running on **GitHub Actions** (twice daily at 06:00 and 18:00 UTC).

### Step 1: Environment Variables & Secrets
Daybreak enforces a strict security boundary:
- **Web App (`src/lib/env.ts`)**: Reads only `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `APP_PASSWORD`, `DATABASE_PATH`, and `LOG_LEVEL`. Never load email or IMAP credentials on the web server.
- **Ingestion Worker (`src/lib/ingest-env.ts`)**: Reads `GMAIL_USER`, `GMAIL_APP_PASSWORD`, and fetcher configuration.
- **Syncing Secrets**: Use `scripts/set-gh-secrets.ps1` to sync credentials from local `.env` to GitHub repository secrets.

### Step 2: Workflow Validation
Before committing modifications to `.github/workflows/*.yml`:
1. Validate workflow syntax and schema using `actionlint`:
   ```bash
   actionlint .github/workflows/fetch-digests.yml
   ```
2. Verify that literal values (such as `LOG_LEVEL: info`) are not wrapped in unsupported secret fallback expressions.

### Step 3: Production Deployment to Vercel
1. Pushing commits to `main` automatically triggers production builds on Vercel.
2. To trigger or inspect deployments via CLI/API, verify using the project ID `prj_hnTZbESLONYrloS8xXc6cE1nbaAa`.
3. Verify live deployment at: [https://daybreak-reader.vercel.app](https://daybreak-reader.vercel.app).
4. Verify password authentication gate redirects unauthenticated users to `/login`.

### Step 4: Ingestion Workflow Verification
1. To test the scheduled background ingestion on-demand:
   ```bash
   gh workflow run fetch-digests.yml
   ```
2. Monitor run progress:
   ```bash
   gh run list --workflow=fetch-digests.yml
   gh run view --job=<job_id>
   ```
3. Confirm that new articles appear in the Turso database and render on the live site.

---

## 7. Verification Checklist Gate

Every change is considered complete **only** when all checks pass:

- [ ] `pnpm lint` — Zero ESLint warnings or errors.
- [ ] `pnpm typecheck` — TypeScript compiles cleanly with zero errors.
- [ ] `pnpm test` — All unit and integration test suites pass.
- [ ] `.\scripts\verify.ps1` — Static repository hygiene and secret leakage checks pass.
- [ ] **Runtime verification**: Tested via live dev server or live Vercel URL.
- [ ] **Documentation**: `CONTEXT.md`, `DESIGN.md`, `docs/architecture.md`, or relevant ADRs updated.
- [ ] **Step Log**: Created in `docs/steps/step-<number>-<slug>.md`.
- [ ] **Git Tree Clean**: No temporary or untracked scratch files (`git status` clean).
- [ ] **One Conventional Commit**: Clear, descriptive commit message.
