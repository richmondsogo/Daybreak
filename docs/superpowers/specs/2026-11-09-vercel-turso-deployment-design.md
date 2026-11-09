# Design Document: Vercel + Turso + GitHub Actions Deployment for Daybreak

## Status
Approved in Concept (Pending Final Design Doc Sign-off)

## 1. Intent and the Why
The user wants Daybreak to run autonomously 24/7 without needing a paid server or keeping their local machine running. When they open the web application on any device (phone, laptop), their Medium Daily Digest articles should already be ingested and ready to read in Daybreak's distraction-free reader.

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **24/7 Availability**: Web app hosted in the cloud, accessible anytime via HTTPS.
- **Automated Background Ingestion**: Digest emails fetched and articles parsed periodically on a schedule without manual intervention.
- **Zero Hosting Costs**: Operate entirely within generous free tiers (Vercel Hobby, Turso Starter, GitHub Actions free minutes).
- **Dual-Environment Database**: Use a unified SQLite client (`@libsql/client`) that can run against Turso in the cloud or a local SQLite file during local development/testing.
- **Data Continuity**: Transfer all existing 193 local articles, bookmarks, and read states from `data/medium-reader.db` to the new Turso database.
- **Mobile-Friendly Access Protection**: Protect paywalled Medium content with a minimalist password screen and a 30-day persistent cookie (`APP_PASSWORD`).

### Non-Goals
- Full multi-tenant authentication (OAuth, multi-user accounts, signups).
- Migrating to a different database engine (PostgreSQL, MySQL). Schema remains SQLite.
- Immediate real-time WebSocket ingestion (scheduled batch ingestion is sufficient).

### Anti-Goals
- Exposing paywalled article text openly to search crawlers or unauthenticated visitors on a public `.vercel.app` domain.
- Leaving broken or dead `better-sqlite3` code behind.
- Adding complex multi-service orchestration or vendor lock-in that breaks local testing.

## 3. Constraints
- **Vercel Ephemeral Filesystem**: Serverless lambdas have ephemeral, read-only storage (except transient `/tmp`). Persistent local files cannot be used.
- **Async I/O Requirement**: Remote databases communicate over HTTP/WebSockets, requiring all database operations to be asynchronous (`Promise`-based).
- **Single-User Security Requirement (ADR 0005)**: Articles must not be openly accessible on the public web.
- **GitHub Actions Quota**: Must comfortably fit within the 2,000 free minutes/month for private repositories (a 1-minute daily job uses ~30 min/month).

## 4. Approaches Considered

### Approach 1: Vercel + Turso (Remote SQLite) + GitHub Actions (SELECTED)
- **Architecture**:
  - Web UI: Next.js App Router deployed on Vercel Hobby.
  - Database: Turso (LibSQL), a serverless SQLite cloud database.
  - Ingestion: GitHub Actions cron job executing `pnpm fetch-digests`.
- **Trade-offs**: Requires migrating Daybreak's database query layer from synchronous `better-sqlite3` to asynchronous `@libsql/client`. In exchange, it delivers a maintenance-free, 24/7 serverless setup with zero hosting costs.
- **Selection Reason**: Matches user's desire for an automated, zero-cost cloud deployment with minimal infrastructure management.

### Approach 2: Always-Free Linux VM (Oracle Cloud / Fly.io)
- **Architecture**: Host the existing codebase on a free cloud VM or container with persistent storage.
- **Trade-offs**: Requires zero codebase changes, but demands manual Linux system administration, Docker/systemd configuration, and reverse proxy/tunnel maintenance. Rejected by user in favor of the serverless approach.

## 5. System Design & Architectural Changes

### 5.1 Database Layer Migration (`@libsql/client` + Drizzle)
- Replace `better-sqlite3` with `@libsql/client` (and `drizzle-orm/libsql`).
- Schema (`src/db/schema.ts`): Preserves existing SQLite schema definitions (`sqliteTable`, `integer`, `text`, `index`).
- Client Configuration (`src/db/client.ts`):
  - In Cloud/Production: connects via `TURSO_DATABASE_URL` (e.g. `libsql://...`) and `TURSO_AUTH_TOKEN`.
  - In Local/Test: connects via local file URL (e.g. `file:data/daybreak.db`) or in-memory (`:memory:`).
- Repository Functions (`src/db/articles.ts`, `src/db/processedEmails.ts`, `src/db/ingestRuns.ts`):
  - Converted from synchronous `.get()`, `.all()`, `.run()` to `await` equivalents.
- Web & Server Action Callers:
  - `src/app/(reader)/layout.tsx`: `await listArticles(db)`.
  - `src/app/(reader)/read/[id]/page.tsx`: `await getArticleById(db, id)`.
  - `src/server/actions.ts`: `await setArticleRead(db, id, true)`.
- CLI & Ingest Pipeline:
  - `src/ingest/fetchDigests.ts`: `await upsertArticle(db, ...)`, `await markEmailProcessed(db, ...)`.
  - `src/cli/fetch-digests.ts`, `purge-old-articles.ts`, `inspect-db.ts`: updated for async database methods.

### 5.2 Existing Data Migration CLI (`src/cli/migrate-to-turso.ts`)
- A dedicated, idempotent CLI script to transfer data from the local SQLite file to Turso:
  - Reads `articles`, `processedEmails`, and `ingestRuns` from `data/medium-reader.db`.
  - Batches and inserts them into the target Turso database.
  - Verifies record counts and integrity.
- Run once prior to cutting over production traffic.

### 5.3 Scheduled Ingestion via GitHub Actions
- Workflow file: `.github/workflows/fetch-digests.yml`.
- Triggers:
  - `schedule`: `cron: '0 6,18 * * *'` (runs twice daily, e.g. 6:00 and 18:00 UTC).
  - `workflow_dispatch`: Manual execution button in GitHub UI for on-demand sync.
- Action Steps:
  1. Check out repository.
  2. Setup Node.js (v22+) and enable `pnpm`.
  3. Install dependencies (`pnpm install --frozen-lockfile`).
  4. Run `pnpm fetch-digests`.
- Secrets passed via GitHub Repository Secrets:
  - `GMAIL_USER`
  - `GMAIL_APP_PASSWORD`
  - `TURSO_DATABASE_URL`
  - `TURSO_AUTH_TOKEN`
  - `LOG_LEVEL` (optional, default `info`)

### 5.4 Privacy & Single-User Access Gate
- Lightweight Next.js Middleware (`src/middleware.ts`) + Minimal Login Route (`src/app/login/page.tsx`):
  - Styled strictly according to Daybreak's design system (`typography.tsx`, `DESIGN.md`).
  - Single password input comparing against `APP_PASSWORD`.
  - Sets an `HttpOnly`, `SameSite=Lax`, secure cookie valid for 30 days.
  - Bypasses static assets, icons, and Next.js internal paths.
  - Keeps the app private from search crawlers and public readers without popup dialogs.

### 5.5 What We Need From the User
No complex MCP installations are required from you. You will only need to supply credentials from web dashboards:
1. **Turso Database**: Create a free database at [turso.tech](https://turso.tech) (takes 1 minute), which gives you:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
2. **Vercel Project**: Link your GitHub repository in [vercel.com](https://vercel.com) and add the environment variables (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `APP_PASSWORD`).
3. **GitHub Secrets**: Add `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `TURSO_DATABASE_URL`, and `TURSO_AUTH_TOKEN` to your GitHub repo Settings -> Secrets and variables -> Actions.

## 6. What's Left to the Builder
- Implementing the `@libsql/client` wrapper in `src/db/client.ts`.
- Updating colocated Vitest tests to `await` async repository functions.
- Verifying all TypeScript types, ESLint rules, and `pnpm check` static gates pass cleanly.
