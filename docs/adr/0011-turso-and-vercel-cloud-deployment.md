# 0011. Turso Cloud Persistence and Vercel Deployment

## Status

Accepted

## Context

Daybreak was originally designed to run exclusively on a single host with a local file-based SQLite database (`better-sqlite3`) and local cron. However, running a persistent local home server introduces hardware maintenance and uptime constraints. The user requested the ability to deploy Daybreak to the web at zero hosting cost on Vercel's Hobby tier, allowing full reading access from any device worldwide while maintaining 24/7 background Medium digest ingestion.

Vercel Serverless Functions feature an ephemeral, read-only filesystem where local SQLite writes are lost upon container recreation or re-deployment. Furthermore, Vercel Hobby schedules are limited to once daily with a ±1 hour jitter window, and native Node.js C++ bindings (`better-sqlite3`) do not deploy cleanly across serverless edge boundaries.

## Decision

1. **Dual-Mode Database Layer via `@libsql/client`**:
   - Replaced `better-sqlite3` with `@libsql/client` and `drizzle-orm/libsql`.
   - Converted all repository functions to asynchronous (`async/await`) operations.
   - Retained local file SQLite compatibility (`file:...`) while adding native support for remote Turso cloud databases (`libsql://...`) via HTTP/WebSocket.

2. **Serverless Web Deployment on Vercel**:
   - Host the Next.js App Router application on Vercel's free Hobby plan.
   - Protect all reading routes behind a single-user password gate (`APP_PASSWORD`) using Next.js Edge Middleware (`src/middleware.ts`) and Web Crypto API (`crypto.subtle.digest`).
   - Store session state in an encrypted, `HttpOnly`, `SameSite=Lax` 30-day cookie (`daybreak_session`).

3. **Scheduled Ingestion via GitHub Actions**:
   - Decouple the background IMAP ingestion CLI (`pnpm fetch-digests`) from the web server runtime.
   - Run the ingestion worker as a scheduled GitHub Actions workflow (`.github/workflows/fetch-digests.yml`) twice daily (06:00 and 18:00 UTC) with unlimited free minutes for public repositories.
   - Inject repository secrets (`GMAIL_USER`, `GMAIL_APP_PASSWORD`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `APP_PASSWORD`) directly into the runner environment.

4. **Data Continuity**:
   - Provided a migration utility (`src/cli/migrate-to-turso.ts`) to transfer existing local SQLite records (articles, processed emails, and ingest runs) to the remote Turso database.

## Consequences

- **Zero Hosting Costs**: The application runs entirely within the free tiers of Vercel (Hobby), Turso (free starter database), and GitHub Actions.
- **Global Availability**: The reader is accessible anywhere over HTTPS at `https://daybreak-reader.vercel.app` with responsive layout and dark mode.
- **Data Persistence**: Articles and email processing state persist reliably in Turso without risk of serverless filesystem wipes.
- **Security & Privacy**: The web application never receives or stores Gmail credentials. Unauthenticated public traffic cannot access paywalled article text or reading history.
- **Backward Compatibility**: Developers can continue developing and testing locally using local SQLite files without needing an internet connection.
