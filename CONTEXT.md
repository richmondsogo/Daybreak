# Daybreak — Domain Context (`CONTEXT.md`)

**Daybreak** (`medium-reader`) is a private, single-user web application and ingestion CLI that fetches Medium Daily Digest emails via Gmail IMAP, extracts full article content into clean Markdown, stores articles in a local SQLite (WAL) database, and serves a distraction-free, dark-mode-first reading interface.

---

## Core Bounded Contexts

### 1. Digest Ingestion (`src/ingest/`, `src/cli/`)
- **Pipeline**: `ImapflowClient` → `parseDigestEmail` → `cleanTrackingUrl` → `fetchArticleHtml` (direct fetch with Freedium mirror fallbacks) → `extractArticleContent` (JSDOM + Readability + Turndown) → `cleanArticleMarkdown` + `extractSubtitle` → `upsertArticleByUrl` + `markEmailProcessed`.
- **Concurrency & Politeness**: `fetchDigests` processes candidate articles with bounded worker concurrency (`ARTICLE_FETCH_CONCURRENCY`, default `3` in CLI, `1` when omitted in unit tests) and a per-worker delay (`ARTICLE_FETCH_DELAY_MS`) between network fetches.
- **Resilience**: Paywalled or incomplete direct fetches automatically fall back to configured Freedium mirrors. New Medium UI chrome leaks surface as soft warnings in `errorSummary` via `detectResidualChromeMarkers()`.

### 2. Storage & Repository Layer (`src/db/`)
- **Engine**: Local SQLite via `better-sqlite3` (WAL mode, `busy_timeout = 5000`) and Drizzle ORM.
- **Tables**:
  - `articles`: Deduplicated by canonical `url` (`UNIQUE`), indexed by `ingested_at` (`articles_ingested_at_idx`) for fast reverse-chronological sidebar queries.
  - `processed_emails`: Tracks processed IMAP `message_id`s so digest runs are idempotent.
- **Boundary**: Only `src/db/*.ts` imports `better-sqlite3` or `drizzle-orm` directly. `listArticles(db, { limit })` bounds sidebar queries to `DEFAULT_SIDEBAR_ARTICLE_LIMIT` (`500`).

### 3. Reader Web UI (`src/app/`, `src/components/`, `src/server/`)
- **Architecture**: Next.js App Router with Server Components for data reading and a single Server Action (`markArticleReadAction`) for marking an article read on view.
- **Environment Boundary**: Web routes (`src/app/`, `src/components/`) never import `src/lib/ingest-env.ts` (enforced by ESLint). They read only `DATABASE_PATH` and `LOG_LEVEL` from `src/lib/env.ts`.
- **Design System**: Strict typography gate (`src/components/ui/typography.tsx`), `IBM Plex Sans` + `Geist Mono` (`<Wordmark>` and code blocks), OS-driven `prefers-color-scheme`, viewport-locked master-detail layout (`ReaderShell`), and zero pagination/filter buttons.

---

## Key Glossary

| Term | Meaning in Daybreak |
| :--- | :--- |
| **Digest Email** | A Medium Daily Digest email fetched via IMAP (`noreply@medium.com`) containing ~10–15 curated article links. |
| **Canonical URL** | The stripped Medium article URL (`cleanTrackingUrl`) used as the unique deduplication key in `articles.url`. |
| **Chrome Leakage** | Residual Medium or Freedium UI boilerplate (follow links, clap counters, image zoom prompts, member-only banners) stripped by `cleanArticleMarkdown`. |
| **Fetched Via** | Which source succeeded for an article body: `"direct"`, `"freedium"`, `"freedium-mirror"`, or `"failed"`. |
| **Fetch Status** | Lifecycle state of an article row: `"pending"`, `"fetched"`, `"partial"`, or `"failed"`. |
| **Wordmark** | The lowercase `daybreak` brand label rendered in `Geist Mono` (`font-mono`) in the sidebar header. |
