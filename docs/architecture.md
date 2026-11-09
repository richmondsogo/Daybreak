# Architecture Overview

Daybreak (`medium-reader`) is a private, single-user reading application. It ingests Medium Daily Digest emails via the Internet Message Access Protocol (IMAP). A digest email is a daily summary email sent by Medium that highlights recommended articles. The system fetches article content, cleans and converts HTML into markdown, and stores records in an asynchronous SQLite database (supporting both local file-based SQLite and remote Turso cloud persistence). It serves articles through a Next.js App Router reading interface with an Edge single-user password gate. The design intentionally omits a separate REST or GraphQL API layer (see ADR 0001, ADR 0003, and ADR 0011).

## System Diagram

```
+-------------------------------------------------------------------+
| Gmail (IMAP Inbox)                                                |
+---------------------------------+---------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
| Ingestion Pipeline (Local CLI cron OR GitHub Actions cron)        |
|  - IMAP Fetcher & MIME Parser (imapflow, mailparser)              |
|  - Direct-First Fetcher Chain: Medium -> Freedium Mirror -> Raw   |
|  - Subtitle Extraction & Validation Guards                        |
|  - Mozilla Readability + Turndown (HTML to Markdown)              |
|  - Chrome Stripping (cleanArticleMarkdown)                        |
+---------------------------------+---------------------------------+
                                  |
                                  v (writes)
+-------------------------------------------------------------------+
| SQLite Database Layer (@libsql/client + Drizzle ORM)              |
|  - Local Runtime: Local File SQLite (WAL mode, FTS5)              |
|  - Cloud Runtime: Remote Turso Database (HTTP/WebSocket)          |
|  - Managed via Drizzle ORM (src/db/schema.ts)                     |
+---------------------------------+---------------------------------+
                                  ^
                                  | (queries & mutations)
+---------------------------------+---------------------------------+
| Next.js App Router (Dynamic SSR via src/app)                      |
|  - Edge Auth Middleware (src/middleware.ts & Web Crypto API)      |
|  - Single-User Password Gate (/login & 30-day session cookie)     |
|  - Single Cached DB Connection (globalThis.__mediumReaderDb)      |
|  - React Server Components (direct async DB reads)                |
|  - Server Actions (direct async DB writes / status updates)       |
|  - Resilient Image Pipeline (URL rewrite + retries + fallback)    |
|  - Shared Design Tokens (src/components/ui/typography.tsx)        |
+---------------------------------+---------------------------------+
                                  |
                                  v (HTTPS / Vercel or Private Network)
+-----------------------------------+
| Reader Client (Clean Reading UI)  |
|  - Web / Mobile / Tablet Browser  |
|  - Routes: / and /read/[id]       |
+-----------------------------------+
```

## Component Architecture

### 1. Ingestion Pipeline (`src/ingest`)

The Command-Line Interface (CLI) runner executes the ingestion process in `src/cli/fetch-digests.ts`. The pipeline executes six sequential steps:

1. **Email Discovery**: Connects to Gmail over IMAP using `ImapflowClient` and searches for digest emails within `INGEST_LOOKBACK_DAYS`.
2. **Digest Parsing**: Parses raw MIME email buffers using `mailparser` in `parseDigest()`. It extracts article URLs, authors, and email snippets.
3. **Idempotency Check**: Skips previously processed emails by checking `processedEmails` using their unique `messageId` (see ADR 0009).
4. **Resilient Fetcher Chain**: Fetches article HTML using `fetchArticleHtml()`. It attempts a direct fetch to Medium first. If Medium returns a truncated paywalled preview, it falls back to configured Freedium mirror URLs (see ADR 0004 and ADR 0008). Ingestion runs concurrently across articles with bounded concurrency (`ARTICLE_FETCH_CONCURRENCY`, default 3) and politeness delays (`ARTICLE_FETCH_DELAY_MS`) per worker.
5. **Content Extraction and Single-Pass Cleaning**: Converts HTML to markdown using Mozilla Readability and Turndown in `extractArticleContent()`. DOM traversal is optimized via a single-pass `TreeWalker` over text nodes to remove Freedium beta banners without $O(N \times \text{depth})$ subtree rescanning. `cleanArticleMarkdown()` is executed once during extraction, and the resulting `cleanedMarkdown` is attached to `ExtractedArticle` for reuse during residual chrome detection.
6. **Database Persistence**: Writes normalized records into the `articles` SQLite table with an `ingestedAt` timestamp (see ADR 0006).

### 2. Subtitle Extraction System (`src/ingest/extractSubtitle.ts`)

Medium articles present subtitles in Open Graph metadata tags (`og:description` or `meta[name="description"]`). The ingestion pipeline and the backfill CLI (`src/cli/backfill-subtitles.ts`) extract candidate subtitles during processing.

Candidate subtitles must pass six validation guards in order:

1. **Missing Guard**: Rejects empty strings or whitespace-only candidates.
2. **Title Duplicate Guard**: Rejects candidates identical to the article title.
3. **Boilerplate Guard**: Rejects generic publication bylines matching `is published by ...`.
4. **Truncation Guard**: Rejects candidates ending in ellipsis characters (`…` or `...`).
5. **Length Guard**: Rejects candidates longer than 200 characters.
6. **Body Duplicate Guard**: Rejects candidates that duplicate the beginning of the article body text.

The reader user interface accesses validated subtitles using `getDisplaySubtitle()`. If an article lacks a valid subtitle, the reader displays no subtitle rather than falling back to snippet text.

### 3. Image URL Rewrite and Resilient Fallback Layer

Medium images sourced from Freedium mirrors use relative paths like `/img/700/<hash>`. When resolved against `medium.com`, these paths return HTTP 403 Forbidden errors.

The reader handles images through a two-part resilient pipeline:

- **URL Rewriting (`src/lib/rewriteImageUrl.ts`)**: Rewrites `medium.com/img/*` URLs to Medium's public Content Delivery Network (CDN) endpoint at `https://miro.medium.com/v2/resize:fit:1400/<hash>`.
- **Resilient Image Component (`src/components/article-image.tsx`)**: Replaces default `<img>` tags in markdown rendering. If an image fails to load, the component automatically retries up to two times with backoff delays of 300ms and 800ms. If all retries fail, it renders a clean fallback card (`ImageFallback`) displaying an icon and sanitized alternative text.

### 4. Database Architecture and Concurrency (`src/db`)

Data persistence is powered by `@libsql/client` and Drizzle ORM (see ADR 0002 and ADR 0011):

- **Dual-Mode Engine**: Supports both local SQLite files (`file:...`) and remote Turso cloud databases (`libsql://...`) with the exact same codebase and schema. All repository functions are asynchronous (`async/await`).
- **Concurrency & Indexing**: In local mode, SQLite operates in Write-Ahead Logging (`PRAGMA journal_mode = WAL`). The `articles` table features a dedicated B-tree index on `ingestedAt` (`articles_ingested_at_idx`) enabling instant reverse-chronological sorting. Sidebar queries are bounded to `DEFAULT_SIDEBAR_ARTICLE_LIMIT` (500 rows) by default to prevent unbounded memory and DOM expansion.
- **Connection Management in Web Process**: The web server caches a single database client on `globalThis.__mediumReaderDb` in `src/db/instance.ts` (see ADR 0010). On `/read/[id]`, database lookups are wrapped in `React.cache()` (`getArticleForRequest`) so `generateMetadata` and `ArticlePage` share a single query per request.
- **CLI Connection Model**: CLI scripts create dedicated connections using `createDb()` in `src/db/client.ts`. Connections close automatically when CLI processes terminate.
- **Full-Text Search**: An FTS5 virtual table indexes article titles, authors, and markdown content for fast text searches.

### 5. Environment Separation and Security (`src/lib`)

The application enforces a strict security boundary to protect sensitive credentials (see ADR 0010 and ADR 0011):

- **Web Runtime Schema (`src/lib/env.ts`)**: Validates only `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `APP_PASSWORD`, `DATABASE_PATH`, and `LOG_LEVEL`. The web reader process never loads mail credentials or proxy configurations.
- **Ingest Runtime Schema (`src/lib/ingest-env.ts`)**: Extends the base schema with `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `FREEDIUM_BASE_URLS`, `ARTICLE_FETCH_DELAY_MS`, and `INGEST_LOOKBACK_DAYS`.
- **Lint Boundary Enforcement**: ESLint enforces a `no-restricted-imports` rule preventing `src/app/**` and `src/components/**` from importing `ingest-env`.
- **Edge Auth Protection**: When `APP_PASSWORD` is configured, Next.js Edge Middleware (`src/middleware.ts`) protects all routes except `/login` and static assets. Session state is authenticated using the Web Crypto API (`crypto.subtle.digest`) and stored in an `HttpOnly`, `SameSite=Lax` 30-day cookie (`daybreak_session`). Markdown rendering disables raw HTML to prevent script injection.

### 6. Web Application and Dynamic Rendering (`src/app`)

The reader runs on the Next.js App Router without intermediate API endpoints (see ADR 0003).

- **Route Structure**:
  - `/`: Main two-pane layout showing the article sidebar and reading pane.
  - `/read/[id]`: Article reading view. Article URLs are generated using the `articlePath()` helper from `src/lib/routes.ts`.
  - `/login`: Minimal single-user password authentication view.
  - `/style-guide`: Design token typography reference for development.
- **Dynamic Rendering**: Reader routes enforce `export const dynamic = "force-dynamic"` (see ADR 0010). Server Components query SQLite directly on each request. Newly ingested articles and read-state mutations appear immediately in the sidebar without rebuilding the application.
- **Branding and Typography**: The application brand name is `Daybreak` from `src/lib/brand.ts`. All textual styling uses centralized semantic components from `src/components/ui/typography.tsx`.

---

## Production Deployment Models

Daybreak supports two production runtime models:

### Model A: Zero-Cost Cloud Deployment (Vercel + Turso + GitHub Actions)
1. **Web App on Vercel**: Hosted on Vercel's free Hobby plan with custom domain [https://daybreak-reader.vercel.app](https://daybreak-reader.vercel.app). Environment variables configured: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `APP_PASSWORD`.
2. **Database on Turso**: Serverless SQLite cloud database with high availability, daily retention, and zero maintenance.
3. **Automated Background Ingestion**: GitHub Actions workflow (`.github/workflows/fetch-digests.yml`) runs twice daily (06:00 and 18:00 UTC) with zero hosting costs, connecting directly to Gmail IMAP and Turso.

### Model B: Self-Hosted Local Server (Local Node.js + Local Cron)
1. **Web Runtime**: Compiled Next.js server on a private network (e.g., Tailscale):
   ```bash
   pnpm build && pnpm start
   ```
2. **Ingest Job**: Local OS cron or systemd timer triggering `pnpm fetch-digests`.
3. **Retention Purge**: Scheduled cleanup:
   ```bash
   pnpm purge-old-articles --confirm
   ```
