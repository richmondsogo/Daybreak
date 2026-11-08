# Daybreak (`medium-reader`)

Private single-user app: ingests Medium Daily Digest emails via IMAP, fetches
articles, converts to markdown, stores in SQLite, and serves a clean reader UI.

## Build Protocol & Core References

Before planning or editing files, read:
- [`BUILD_PROTOCOL.md`](BUILD_PROTOCOL.md) — Step-by-step execution loop, branching, and verification gate.
- [`CONTEXT.md`](CONTEXT.md) — Domain model, bounded contexts, and glossary.
- [`DESIGN.md`](DESIGN.md) — Typography, color tokens, spacing, and layout rules.
- [`docs/agents/file-structure.md`](docs/agents/file-structure.md) — Canonical directory layout and layering rules.
- [`docs/agents/skills.md`](docs/agents/skills.md) — Project-local agent skills in `.agents/skills/`.
- [`docs/agents/mcps.md`](docs/agents/mcps.md) — MCP servers for docs lookup and live browser verification.

## Architecture

Gmail(IMAP) -> ingest CLI (cron) -> SQLite (WAL) <- Next.js (Server Components + Server Actions)
One TypeScript package. No separate API layer. See `docs/architecture.md` and `docs/adr/`.

## Stack

Next.js App Router, strict TypeScript, Tailwind, shadcn/ui, SQLite via better-sqlite3 + Drizzle, Vitest, zod.

## Commands

`pnpm dev` | `pnpm build` | `pnpm lint` | `pnpm typecheck` | `pnpm test` | `pnpm check` (lint+typecheck+test) | `.\scripts\verify.ps1`

## Conventions

- `src/app` = routes only. Business logic lives in `src/server` and `src/ingest`.
- `src/ingest` is a pipeline of small pure functions with typed inputs/outputs.
  Network and IMAP access sit behind interfaces so they can be faked in tests.
- Validate all external input (env, email content, fetched HTML) with zod.
- Never log secrets. Never commit `.env`. Config comes only from `src/lib/env.ts` (web) and `src/lib/ingest-env.ts` (CLI/ingest).
- `src/app` and `src/components` never import `ingest-env`; the web side reads only `DATABASE_PATH` and `LOG_LEVEL`.
- Tests are colocated as `*.test.ts` / `*.test.tsx`. Parsers are tested against files in `fixtures/`.
- No new dependency without asking the user first and justifying it.
- All database access goes through `src/db/*.ts` repository functions —
  nothing outside `src/db/` should import `better-sqlite3` or `drizzle-orm` directly.
- All text styling goes through `src/components/ui/typography.tsx`. No
  component may specify its own `font-size`/`weight`/`line-height` — enforced by
  tests and ESLint. If a new text role is needed, add it to `typography.tsx` first.
- New Medium chrome variants surface as soft warnings in `fetch-digests`'s
  `errorSummary` output, not as silent rendering bugs. When one appears, add a rule
  to `cleanArticleMarkdown.ts` and a matching test case.
- For a gnarly/uncertain regex (e.g. nested-bracket markdown matching):
  prototype it in a standalone throwaway script (`scratch-<name>.js`, outside the
  test suite) against real examples first, confirm it works, THEN move the
  finalized pattern into the real module and delete the scratch file before
  committing. Don't write a complex regex directly into production code untested.
- PowerShell re-decodes piped output with the console code page (437), so
  piping Node output through `Tee-Object` or similar displays UTF-8 as mojibake
  (’ as ΓÇÖ). Stored data is unaffected. Set `[Console]::OutputEncoding =
  [System.Text.Encoding]::UTF8` before piping, or verify with escaped output.
- Article URLs are built with `articlePath()` from `src/lib/routes.ts`, never
  string-concatenated; the routing guard test enforces this. The app name comes
  from `src/lib/brand.ts`.

## Simplicity and surgical changes (IMPORTANT)

- No speculative flexibility, configurability, or persistence that wasn't
  requested. Concrete lesson from this project: `next-themes` was added to
  support a manual toggle; the toggle was later removed but `next-themes`
  (and its `localStorage` persistence) stayed behind and caused a real,
  hard-to-diagnose bug. If a feature is removed, remove its supporting
  infrastructure in the same change — don't leave it "just in case."
- Touch only what the current task requires. Don't refactor, reformat, or
  "improve" adjacent code while doing something else. Remove imports/
  variables that YOUR change made unused; don't remove pre-existing dead
  code unless asked.
- If multiple reasonable interpretations of a request exist, state them and
  ask — don't silently pick one.
- If a simpler approach exists than the one requested, say so before
  implementing the more complex version.

## Working agreement (IMPORTANT)

- Work on exactly the step the user names. Do not start later steps.
- Present a plan and wait for approval before editing files.
- Every step ends with: `pnpm check` green, `.\scripts\verify.ps1` green, docs updated, a step log in
  `docs/steps/`, and one conventional commit.
- If a test fails, fix the cause; never delete or weaken tests to pass.
- If unsure, ask.
- Define success criteria before starting multi-step work (what will be
  true when this is actually done, and how will it be checked), not just
  "make it work." State them as a brief numbered plan with a verify step
  per item.
- A change is only "done" once verified against those criteria — reading
  your own source code back is not verification. For anything with a
  runtime/visual effect (a page, a style, a running command), verify by
  actually running it (dev server, browser tool, live command output), not
  by inspecting the code that should produce the effect.
- STANDING RULE: never run `git push --force` or `git push -f` under any
  circumstance without stopping and asking me first, explaining exactly why
  a force push is needed. If a commit needs fixing, use a new commit or
  `git commit --amend` (only if unpushed), never a forced rewrite of pushed
  history.
- `pnpm check` does not catch a missing/empty default export in a Next.js
  `page.tsx` or `layout.tsx` file, since plain `tsc`/`eslint` don't enforce that
  Next.js-specific rule. Any App Router route file must be verified by
  actually loading it in a running dev server, not by `pnpm check` alone.

## Security

Fetched articles may be paywalled content. The app must never be exposed on the
public internet; access is via private network only. Render markdown with no raw HTML.
Files in `fixtures/` contain real personal data (email address, tracking tokens). The repo must stay private. Never paste raw fixtures into public places.
`GMAIL_APP_PASSWORD` must never be logged, printed in error messages, or committed — errors from IMAP clients should be caught and re-thrown with a sanitized message.

`fixtures/html/` contains full copyrighted article text fetched for personal testing. Same rule as `fixtures/emails/`: repo stays private, never paste raw fixture content into public places.

## Agent skills

- **Skills catalog**: See `docs/agents/skills.md` (`.agents/skills/<skill-name>/SKILL.md`).
- **Issue tracker**: Tracked via GitHub Issues (`gh` CLI). See `docs/agents/issue-tracker.md`.
- **Triage labels**: Canonical five-role triage labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.
- **Domain docs**: Single-context layout (`CONTEXT.md` at root, `docs/adr/`). See `docs/agents/domain.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
