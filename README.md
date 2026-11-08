# Daybreak (`medium-reader`)

Daybreak is a calm, dense, type-driven private reader for Medium Daily Digest emails. It ingests digest emails via Gmail IMAP, extracts and cleans full article content into clean Markdown, stores records in a local SQLite database (WAL mode), and serves a quiet reading interface designed for long-form reading without noise or distraction.

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
- **Indexed Reverse-Chronological Archive**: SQLite database indexed by `ingestedAt` (`articles_ingested_at_idx`) with bounded sidebar queries (`DEFAULT_SIDEBAR_ARTICLE_LIMIT = 500`) and CSS `content-visibility: auto` for smooth scrolling over large libraries.
- **Single-Pass DOM Extraction**: Optimized with high-efficiency `TreeWalker` algorithms for sub-millisecond parsing and subtitle extraction.
- **Strict Typography Gate**: Strict separation of concerns via `src/components/ui/typography.tsx` (`IBM Plex Sans` + `Geist Mono` wordmark and code blocks), enforced by automated tests and ESLint.

---

## Quick Start

### Prerequisites
- Node.js 20.9.0 or later
- pnpm 10 or later
- A Gmail account receiving Medium Daily Digest emails

### Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/richmondsogo/medium-reader.git
   cd medium-reader
   ```

2. Bootstrap dependencies and environment:
   ```powershell
   .\scripts\bootstrap.ps1
   ```
   *(Or run `pnpm install` and `cp .env.example .env` manually)*

3. Configure Gmail IMAP credentials in `.env`:
   - `GMAIL_USER=your_email@gmail.com`
   - `GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx` *(generate an App Password in Google Account -> Security -> 2-Step Verification -> App passwords)*

4. Ingest articles from your digests:
   ```bash
   pnpm fetch-digests
   ```

5. Launch the reader web UI:
   ```bash
   pnpm dev
   ```
   Open `http://localhost:3000` in your browser.

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
| `pnpm inspect-db` | Displays database statistics, counts by fetch status, and recent additions. | Read-only query against SQLite. |
| `pnpm purge-old-articles` | Removes articles older than 90 days (`--confirm` required to execute). | Safe dry-run by default. |
| `pnpm backfill-subtitles` | Extracts missing subtitles for stored articles (`--apply` required to write). | Safe dry-run by default. |
| `pnpm db:generate` | Generates SQLite migration files from schema definitions. | Generates migrations in `drizzle/migrations/`. |

---

## Architectural & Design References

- [`BUILD_PROTOCOL.md`](BUILD_PROTOCOL.md) — Step-by-step execution protocol, branching strategy, and verification gate.
- [`CONTEXT.md`](CONTEXT.md) — Domain model, bounded contexts, and glossary.
- [`DESIGN.md`](DESIGN.md) — Typography roles, spacing scale, ink hierarchy, and layout rules.
- [`docs/architecture.md`](docs/architecture.md) — Ingestion pipeline, caching, and database architecture.
- [`docs/agents/file-structure.md`](docs/agents/file-structure.md) — Canonical directory layout and boundaries.
- [`docs/agents/skills.md`](docs/agents/skills.md) — Project-local agent skills catalog.

---

## Privacy & Security

Daybreak is a personal reading tool intended strictly for private network deployment (e.g., via Tailscale or localhost). It stores copyrighted and paywalled content locally for personal use and must never be exposed to the public internet. Secrets are isolated to `src/lib/ingest-env.ts` and never accessible to client components or web routes.
