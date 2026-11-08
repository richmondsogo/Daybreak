# Step 08: Cleanup, Performance Optimization, Skills & Build Protocol Alignment

## Goal
Comprehensive codebase cleanup, performance optimization, repository governance alignment, local skill creation (`design-system`, `security-audit`, `browser-verification`), and verification across Daybreak (`medium-reader`).

## Success Criteria & Results
1. **Repository Hygiene**: Remove stale HTML files, old inspection scripts, empty files, unused SVGs, and untracked backups. — **PASSED**
2. **Performance — Database Index & Bounded Sidebar**: Add SQLite index on `articles.ingestedAt` (`articles_ingested_at_idx`), add `DEFAULT_SIDEBAR_ARTICLE_LIMIT = 500` without UI buttons, and apply CSS `content-visibility: auto`. — **PASSED**
3. **Performance — Ingest Optimization**: Single-pass `TreeWalker` DOM extraction, deduplicated `cleanArticleMarkdown()` execution, and bounded worker concurrency (`ARTICLE_FETCH_CONCURRENCY=3`). — **PASSED**
4. **Performance — Request Deduplication**: Wrap `getArticleById` in `React.cache()` on `/read/[id]`, hoist markdown components, and stop double-calling image rewrite functions. — **PASSED**
5. **Design System & Typography Gate**: Establish `.agents/skills/design-system/SKILL.md` (documenting `font-mono` on `<Wordmark>`, spacing, hierarchy, and composition) and enforce zero raw typography classes in routes/components via automated tests. — **PASSED**
6. **Local Skills & Governance**: Install Cloudflare `security-audit-skill` locally into `.agents/skills/security-audit/`, align `BUILD_PROTOCOL.md`, `CONTEXT.md`, `DESIGN.md`, `AGENTS.md`, and add `scripts/verify.ps1`. — **PASSED**
7. **Runtime & Browser Verification**: Start Next.js dev server, verify `/`, `/read/[id]`, `/style-guide` across dark and light color schemes with zero console errors, capture product screenshots, and embed them in `README.md`. — **PASSED**

## Changes Made
- `tmp/`: Deleted stale inspection files and updated `.gitignore` to ignore `.tmp/` and `tmp/`.
- `public/`: Removed unused Create-Next-App starter SVGs (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`).
- `src/style.css`: Removed unused CSS file.
- `scripts/`: Cleaned up one-off diagnostic scripts (`inspect-article-images.ts`, `inspect-article-overlap.ts`, `inspect-chrome-leakage.ts`, `inspect-eml.ts`, `inspect-processed-emails.ts`, `imap-dry-run.ts`, `list-candidate-urls.ts`).
- `.agents/skills/`:
  - Installed Cloudflare's `security-audit` skill into `.agents/skills/security-audit/`.
  - Created `.agents/skills/design-system/SKILL.md`.
  - Created `.agents/skills/browser-verification/SKILL.md`.
  - Created `.agents/mcp_config.json.example`.
  - Removed loose outdated `.md` files in `.agents/skills/`.
- `src/db/`:
  - Added `articles_ingested_at_idx` index on `articles.ingestedAt` in `src/db/schema.ts`.
  - Generated Drizzle migration `drizzle/migrations/0002_closed_captain_midlands.sql`.
  - Added `DEFAULT_SIDEBAR_ARTICLE_LIMIT = 500` and `limit` option to `listArticles()` in `src/db/articles.ts`.
  - Added unit test coverage for `listArticles` limit in `src/db/articles.test.ts`.
- `src/ingest/` & `src/lib/`:
  - Rewrote `extractArticleContent.ts` to use `script:not([src])` and a single-pass `TreeWalker` over text nodes for innermost element matching.
  - Added `cleanedMarkdown` to `ExtractedArticle` in `src/ingest/types.ts` and returned it from `src/ingest/fetchAndExtractArticle.ts`.
  - Reused `extracted.cleanedMarkdown` in `src/ingest/fetchDigests.ts` during residual chrome detection.
  - Added `ARTICLE_FETCH_CONCURRENCY` (default 3) to `src/lib/ingest-env.ts` and `.env.example`, and bounded worker pool concurrency in `src/ingest/fetchDigests.ts` and `src/cli/fetch-digests.ts`.
  - Updated unit test suites (`extractArticleContent.test.ts`, `fetchAndExtractArticle.test.ts`, `fetchDigests.test.ts`, `ingest-env.test.ts`).
- `src/app/` & `src/components/`:
  - In `src/app/(reader)/sidebar.tsx`: flattened scroll wrapper DOM directly onto `<ul>`, added `content-visibility: auto` to list items, and guarded missing reading times.
  - In `src/app/(reader)/read/[id]/page.tsx`: wrapped DB access in `React.cache()`, hoisted markdown config, unified Not Found handling using `<SectionLabel>` and `<Meta>`, and avoided double URL rewriting.
  - In `src/app/style-guide/page.tsx`: migrated all text elements to semantic `typography.tsx` components and `APP_NAME`.
  - In `src/components/ui/typography.tsx`: preserved `font-mono` on `Wordmark`.
  - In `src/components/ui/typography.test.tsx`: added automated typography discipline test verifying no raw Tailwind font-size/weight/line-height classes exist in route components.
- Root Governance & Scripts:
  - Created `BUILD_PROTOCOL.md`, `CONTEXT.md`, `docs/agents/file-structure.md`, `docs/agents/skills.md`, `docs/agents/mcps.md`, and `docs/steps/00-plan-template.md`.
  - Created `scripts/verify.ps1`, `scripts/check-env.ps1`, and `scripts/bootstrap.ps1`.
  - Added `vitest.config.ts` scoping test runs to `src/`.
  - Updated `eslint.config.mjs` to ignore `.agents/**`.
  - Updated `DESIGN.md`, `AGENTS.md`, `README.md`, and `docs/architecture.md`.
  - Captured dark and light mode screenshots (`docs/screenshots/daybreak-reader-dark.png` and `docs/screenshots/daybreak-reader-light.png`).

## Verification Summary
- `pnpm check`: PASSED (0 errors across ESLint, TypeScript, and 153 tests in Vitest).
- `.\scripts\verify.ps1`: PASSED (Hygiene, secrets, ESLint, TypeScript, Vitest).
- `pnpm build`: PASSED (optimized Next.js Turbopack build).
- Live Browser Verification: Checked `/`, `/read/1`, and `/style-guide` with Chrome DevTools MCP (0 errors, 0 warnings).
