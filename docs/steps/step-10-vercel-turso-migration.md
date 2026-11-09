# Step 10: Vercel, Turso & GitHub Actions 24/7 Deployment

## Goal
Enable autonomous 24/7 Medium Daily Digest reading from anywhere in the world on a free live Vercel domain (`*.vercel.app`) with zero hosting costs, protected by a single-user password gate, powered by a Turso cloud SQLite database, and kept up-to-date by a scheduled GitHub Actions cron job.

## Changes Made
1. **Dependencies & Env**:
   - Replaced `better-sqlite3` and `@types/better-sqlite3` with `@libsql/client`.
   - Updated `src/lib/env.ts` and `src/lib/ingest-env.ts` to include `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and `APP_PASSWORD`.
2. **Database Engine & Repositories**:
   - Migrated `src/db/client.ts` and `src/db/instance.ts` to use `@libsql/client` and `drizzle-orm/libsql`.
   - Converted all database queries in `src/db/articles.ts`, `src/db/processedEmails.ts`, and `src/db/ingestRuns.ts` from synchronous to `async/await`.
   - Updated all callers in server components (`src/app/(reader)/layout.tsx`, `src/app/(reader)/read/[id]/page.tsx`), server actions (`src/server/actions.ts`), and CLI ingestion (`src/ingest/fetchDigests.ts`, `src/cli/*.ts`).
3. **Data Continuity**:
   - Implemented `src/cli/migrate-to-turso.ts` to port local SQLite rows to Turso.
   - Executed migration: all 193 articles, 15 processed emails, and 3 ingest runs transferred to Turso and verified.
4. **Access Gate**:
   - Implemented Next.js middleware in `src/middleware.ts` checking for 30-day session token.
   - Built minimal, distraction-free `/login` screen in `src/app/login/page.tsx` adhering to Daybreak's semantic typography tokens.
   - Created `src/server/auth-actions.ts` and `src/lib/auth.ts` using standard Web Crypto API.
5. **Automation & Secrets**:
   - Added `.github/workflows/fetch-digests.yml` running on twice-daily cron (`0 6,18 * * *`) and `workflow_dispatch`.
   - Added `scripts/set-gh-secrets.ps1` and populated GitHub Actions secrets directly via `gh secret set`.

## Verification Results
- `pnpm check`: Passed (ESLint clean, `tsc --noEmit` clean, 159 Vitest unit tests passed).
- `.\scripts\verify.ps1`: Passed (repository hygiene, secret boundaries, lint, typecheck, tests).
- `pnpm build`: Passed (Next.js production build succeeded with zero errors and zero Edge warnings).
- `pnpm tsx src/cli/inspect-db.ts`: Verified 193 articles and 15 processed emails in live Turso database.
