# Repository File Structure

Daybreak is a single-package TypeScript application combining an IMAP/HTTP ingestion CLI with a Next.js App Router reader UI.

```text
medium-reader/
├── .agents/
│   ├── mcp_config.json.example   # Reference MCP server definitions
│   └── skills/                   # Project-local agent skills (<skill-name>/SKILL.md)
│       ├── browser-verification/ # Live DevTools / Playwright route verification
│       ├── code-review/          # Standards + spec review skill
│       ├── codebase-design/      # Deep module design vocabulary
│       ├── design-system/        # Daybreak typography, spacing, hierarchy & composition rules
│       ├── diagnosing-bugs/      # Systematic bug & performance diagnosis
│       ├── domain-modeling/      # CONTEXT.md & ADR maintenance
│       ├── frontend-design/      # Visual craft & anti-slop UI guidance
│       ├── security-audit/       # Local Cloudflare security audit skill & validators
│       └── tdd/                  # Red-green-refactor workflow
├── docs/
│   ├── adr/                      # Architecture Decision Records (0001-0005+)
│   ├── agents/                   # Agent workflow & convention references
│   │   ├── domain.md
│   │   ├── file-structure.md
│   │   ├── issue-tracker.md
│   │   ├── mcps.md
│   │   ├── skills.md
│   │   └── triage-labels.md
│   ├── notes/                    # Empirical domain notes (email format, subtitles, images)
│   ├── screenshots/              # Product screenshots referenced by README.md
│   ├── steps/                    # Chronological step logs & 00-plan-template.md
│   └── architecture.md           # High-level system architecture
├── drizzle/
│   └── migrations/               # Generated SQLite schema migrations
├── fixtures/                     # Private local test fixtures (NEVER paste publicly)
│   ├── emails/                   # Raw .eml Medium Daily Digest fixtures
│   └── html/                     # Fetched HTML fixtures (direct & Freedium mirror)
├── scripts/
│   ├── bootstrap.ps1             # Environment & dependency bootstrap script
│   ├── check-env.ps1             # Pre-flight toolchain & .env check
│   ├── fetch-fixture.ts          # Helper to capture an HTML test fixture
│   └── verify.ps1                # Full verification gate (lint, typecheck, test, hygiene)
├── src/
│   ├── app/                      # Next.js App Router routes ONLY (no business logic)
│   │   ├── (reader)/             # Master-detail reader shell (/ and /read/[id])
│   │   ├── style-guide/          # Typography & token verification route (/style-guide)
│   │   ├── globals.css           # Tailwind v4 tokens, prefers-color-scheme, .article-prose
│   │   ├── icon.svg              # Daybreak tab icon (only graphic in the app)
│   │   └── layout.tsx            # Root HTML/font layout (IBM Plex Sans + Geist Mono)
│   ├── cli/                      # CLI entrypoints (fetch-digests, purge-old-articles, inspect-db, backfill-subtitles)
│   ├── components/
│   │   ├── ui/typography.tsx     # Single source of truth for all UI text roles
│   │   └── article-image.tsx     # Resilient article image component with fallback handling
│   ├── db/                       # SQLite client, Drizzle schema, and repository functions
│   ├── ingest/                   # Pure ingestion pipeline modules + colocated *.test.ts
│   ├── lib/                      # Shared utilities (env, ingest-env, brand, routes, cleanArticleMarkdown)
│   └── server/                   # Next.js Server Actions (markArticleReadAction)
├── AGENTS.md                     # Primary agent instructions & conventions
├── BUILD_PROTOCOL.md             # Step-by-step execution & verification protocol
├── CONTEXT.md                    # Domain model & bounded contexts
├── DESIGN.md                     # Canonical design system specification
└── README.md                     # Project overview, screenshots, setup & usage
```

## Directory Rules
1. **No Root Clutter**: Never commit scratch scripts (`scratch-*.js`), temporary dumps, or database backups to the root directory. Use `.tmp/` (gitignored) for ephemeral files and delete them before committing.
2. **Colocated Tests**: Unit and integration tests live alongside the module they test (`src/**/*.test.ts`, `src/**/*.test.tsx`).
3. **Strict Layering**:
   - `src/app/` and `src/components/` must never import `src/lib/ingest-env.ts` or `better-sqlite3`/`drizzle-orm` directly.
   - All text elements in `src/app/` and `src/components/` must use `src/components/ui/typography.tsx`.
