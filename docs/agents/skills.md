# Agent Skills Guide

Daybreak employs a two-tier skill architecture:
1. **Superpowers Skills** (global process framework governing planning, TDD, systematic debugging, and verification).
2. **Project-Local Domain Skills** (`.agents/skills/` governing typography tokens, security audits, and browser verification).

---

## 1. Superpowers Skills (Process Framework)

In accordance with `using-superpowers`, process skills always take priority. If there is any chance a skill applies, invoke it before acting or generating code:

| Superpowers Skill | When to Use in Daybreak |
| :--- | :--- |
| **`using-superpowers`** | Starting any conversation or step. Establishes skill invocation requirements before taking action. |
| **`brainstorming`** | Before planning new features, UI components, architectural changes, or creative work. |
| **`writing-plans`** | Multi-step implementation tasks. Produces a numbered plan with explicit verification steps. |
| **`test-driven-development`** (`tdd`) | Any feature or bugfix. Strictly enforces red-green-refactor loop with colocated unit tests. |
| **`systematic-debugging`** | When any test fails, an ingestion error occurs, or unexpected behavior is observed. |
| **`verification-before-completion`** | Before declaring any task, step, or PR complete. Demands runtime command evidence before assertions. |
| **`finishing-a-development-branch`** | When implementation is verified and ready for merge into `main`. |
| **`requesting-code-review`** | When completing major features or before merging to verify requirements. |
| **`receiving-code-review`** | When receiving review feedback, before implementing suggestions. |

---

## 2. Project-Local Domain Skills (`.agents/skills/`)

Project-local skills live in `.agents/skills/<skill-name>/SKILL.md`. Every skill sits in its own subdirectory with YAML frontmatter (`name`, `description`):

| Skill | Path | When to Use |
| :--- | :--- | :--- |
| **`daybreak-design-skill`** | `.agents/skills/daybreak-design-skill/SKILL.md` | Creating or modifying any UI component, typography role, spacing, color token, or layout in Daybreak. |
| **`security-audit`** | `.agents/skills/security-audit/SKILL.md` | Auditing ingestion parsers, URL sanitization, Markdown rendering, IMAP/env secret boundaries, or dependencies. |
| **`browser-verification`** | `.agents/skills/browser-verification/SKILL.md` | Verifying `/`, `/read/[id]`, `/login`, and `/style-guide` in a real browser via Chrome DevTools or Playwright MCP across dark/light themes. |
| **`tdd`** | `.agents/skills/tdd/SKILL.md` | Writing failing unit/integration tests before implementing features or bug fixes. |
| **`code-review`** | `.agents/skills/code-review/SKILL.md` | Reviewing a branch or step diff against Daybreak standards and spec requirements. |
| **`diagnosing-bugs`** | `.agents/skills/diagnosing-bugs/SKILL.md` | Investigating extraction regressions, Medium chrome leaks, or performance bottlenecks. |
| **`codebase-design`** | `.agents/skills/codebase-design/SKILL.md` | Designing deep modules with narrow, testable interfaces. |
| **`domain-modeling`** | `.agents/skills/domain-modeling/SKILL.md` | Updating `CONTEXT.md` or recording Architecture Decision Records in `docs/adr/`. |
| **`frontend-design`** | `.agents/skills/frontend-design/SKILL.md` | Maintaining intentional, high-craft visual restraint. |

---

## 3. Skill Execution Priority

When tackling any task in Daybreak, compose skills in this strict order:

1. **Process First**: `using-superpowers` → `brainstorming` (if creative) → `writing-plans`.
2. **Domain Execution**:
   - For UI tasks: Load `daybreak-design-skill` + `src/components/ui/typography.tsx`.
   - For database tasks: Follow asynchronous `@libsql/client` repository patterns.
   - For ingest tasks: Follow pure function pipeline with JSDOM / Readability / Turndown.
3. **Test-First Implementation**: `test-driven-development` (`tdd`).
4. **Verification**: `verification-before-completion` + `browser-verification` (for UI routes).
5. **Branch Integration**: `finishing-a-development-branch`.
