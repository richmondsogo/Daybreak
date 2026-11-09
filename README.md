# Daybreak (`medium-reader`)

Daybreak is a calm, dense, type-driven private reader for Medium Daily Digest emails. It ingests digest emails via Gmail IMAP, extracts and cleans full article content into clean Markdown, stores records in a persistent SQLite database (local file or Turso cloud), and serves a quiet reading interface designed for long-form reading without noise or distraction.

---

## Live Deployment

- **Production URL**: [https://daybreak-reader.vercel.app](https://daybreak-reader.vercel.app)
- **Hosting Tier**: Vercel Hobby (Zero hosting cost)
- **Database**: Turso Cloud SQLite (Serverless `@libsql/client`)
- **Ingestion**: Automated background workflow via GitHub Actions (runs twice daily at 06:00 and 18:00 UTC)
- **Protection**: Edge single-user password gate (`APP_PASSWORD`) with an encrypted `HttpOnly` 30-day session cookie.

---

## Interface

### Dark Mode (Primary)
![Daybreak Dark Mode Reader](docs/screenshots/daybreak-reader-dark.png)

### Light Mode (OS Preference)
![Daybreak Light Mode Reader](docs/screenshots/daybreak-reader-light.png)

---

## Core Capabilities

- **Automatic IMAP Digest Ingestion**: Searches for Medium Daily Digest emails from Gmail using `ImapflowClient` with configurable lookback windows.
- **Resilient Multi-Source Extraction**: Attempts direct Medium retrieval, falling back gracefully to configured Freedium mirror endpoints for member-only/paywalled stories.
- **Concurrent Politeness**: Bounded worker concurrency (`ARTICLE_FETCH_CONCURRENCY=3`) with per-worker delays to balance fast ingestion with upstream rate limits.
- **Zero Chrome Leakage**: Strips Medium promotional banners, follow recommendations, clap counters, image zoom prompts, and Freedium boilerplate before markdown storage.
- **Dual-Mode SQLite Persistence**: Powered by `@libsql/client` and Drizzle ORM, supporting both local file-based SQLite and remote Turso cloud persistence with the exact same codebase.
- **Indexed Reverse-Chronological Archive**: Indexed by `ingestedAt` (`articles_ingested_at_idx`) with bounded sidebar queries (`DEFAULT_SIDEBAR_ARTICLE_LIMIT = 500`) and CSS `content-visibility: auto` for smooth scrolling over large libraries.
- **Single-Pass DOM Extraction**: Optimized with high-efficiency `TreeWalker` algorithms for sub-millisecond parsing and subtitle extraction.
- **Strict Typography Gate**: Strict separation of concerns via `src/components/ui/typography.tsx` (`IBM Plex Sans` + `Geist Mono` wordmark and code blocks), enforced by automated tests and ESLint.

---

## Quick Start

### Prerequisites
- Node.js 20.9.0 or later (Node 22+ recommended)
- pnpm 10 or later
- A Gmail account receiving Medium Daily Digest emails

### Option A: Local Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/richmondsogo/Daybreak.git
   cd Daybreak
   ```

2. Bootstrap dependencies and environment:
   ```powershell
   .\scripts\bootstrap.ps1
   ```
   *(Or run `pnpm install` and `cp .env.example .env` manually)*

3. Configure Gmail credentials in `.env`:
   - `GMAIL_USER=your_email@gmail.com`
   - `GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx` *(generate an App Password in Google Account -> Security -> 2-Step Verification -> App passwords)*
   - `APP_PASSWORD=your_secure_password`

4. Run local digest ingestion:
   ```bash
   pnpm fetch-digests
   ```

5. Launch the local reader web UI:
   ```bash
   pnpm dev
   ```
   Open `http://localhost:3000` in your browser.

---

### Option B: Cloud Deployment (Vercel + Turso + GitHub Actions)

1. **Turso Database**:
   - Create a database at [turso.tech](https://turso.tech): `turso db create daybreak-database`.
   - Obtain database URL and auth token: `turso db show daybreak-database --url` and `turso db tokens create daybreak-database`.
   - Add `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` to your `.env`.

2. **Migrate Historical Articles to Turso**:
   ```bash
   pnpm db:migrate-to-turso
   ```

3. **Deploy to Vercel**:
   - Import the repository into Vercel.
   - Configure Environment Variables on Vercel:
     - `TURSO_DATABASE_URL`
     - `TURSO_AUTH_TOKEN`
     - `APP_PASSWORD`
   - Deploy. Unauthenticated traffic redirects to `/login`.

4. **Automate 24/7 Ingestion via GitHub Actions**:
   - Sync required secrets to GitHub using the helper script:
     ```powershell
     .\scripts\set-gh-secrets.ps1
     ```
   - The workflow `.github/workflows/fetch-digests.yml` runs automatically at 06:00 and 18:00 UTC.
   - Trigger a manual test run anytime:
     ```bash
     gh workflow run fetch-digests.yml
     ```

---

## Command Reference

| Command | Description | Safety Behavior |
| :--- | :--- | :--- |
| `pnpm dev` | Starts the Next.js development server on port 3000. | Read-only web server. |
| `pnpm build` | Compiles the production build of the Next.js application. | Read-only build task. |
| `pnpm start` | Runs the compiled Next.js production server. | Read-only web server. |
| `pnpm lint` | Runs ESLint standards verification. | Read-only code check. |
| `pnpm typecheck` | Validates TypeScript types across the codebase. | Read-only code check. |
| `pnpm test` | Executes the Vitest automated test suite. | Read-only test runner. |
| `pnpm check` | Runs lint, typecheck, and unit test suites sequentially. | Read-only verification pipeline. |
| `.\scripts\verify.ps1` | Full verification gate: repository hygiene, secret checks, lint, typecheck, and tests. | Read-only test & hygiene check. |
| `pnpm fetch-digests` | Connects to Gmail via IMAP, parses new digest emails, and stores articles in SQLite. | Idempotent upsert of articles and run logs. |
| `pnpm inspect-db` | Displays database statistics, counts by fetch status, and recent additions. | Read-only query against SQLite / Turso. |
| `pnpm purge-old-articles` | Removes articles older than 90 days (`--confirm` required to execute). | Safe dry-run by default. |
| `pnpm backfill-subtitles` | Extracts missing subtitles for stored articles (`--apply` required to write). | Safe dry-run by default. |
| `pnpm db:generate` | Generates SQLite migration files from schema definitions. | Generates migrations in `drizzle/migrations/`. |
| `pnpm db:migrate-to-turso` | Transfers local SQLite records to remote Turso database. | Idempotent upsert into Turso. |
| `gh workflow run fetch-digests.yml` | Manually triggers the GitHub Actions background ingestion job. | Runs ingestion on GitHub runner. |

---

## Architectural & Design References

- [`BUILD_PROTOCOL.md`](BUILD_PROTOCOL.md) — Comprehensive developer & agent protocol for adding features, bugfixes, database migrations, and deployments via `using-superpowers`.
- [`CONTEXT.md`](CONTEXT.md) — Domain model, bounded contexts, and glossary.
- [`DESIGN.md`](DESIGN.md) — Typography roles, spacing scale, ink hierarchy, and layout rules.
- [`docs/architecture.md`](docs/architecture.md) — Ingestion pipeline, caching, dual-mode database, and deployment architecture.
- [`docs/agents/file-structure.md`](docs/agents/file-structure.md) — Canonical directory layout and boundaries.
- [`docs/agents/skills.md`](docs/agents/skills.md) — Superpowers and project-local skills hierarchy.

---

## Privacy & Security

Daybreak is a personal reading tool. Fetched articles may contain copyrighted or paywalled content. When deployed to Vercel, the application is protected by an Edge Single-User Password Gate (`APP_PASSWORD`) with an encrypted HTTP-only session cookie (`daybreak_session`) to block unauthenticated public crawlers. Markdown rendering disables raw HTML to prevent script injection. Secrets are isolated to `src/lib/ingest-env.ts` and never accessible to client components or web routes.
