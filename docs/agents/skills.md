# Agent Skills Guide

Project-local skills live in `.agents/skills/<skill-name>/SKILL.md`. Every skill sits in its own subdirectory with YAML frontmatter (`name`, `description`). Do not place loose `.md` files directly inside `.agents/skills/`.

## Core Daybreak Skills

| Skill | Path | When to Use |
| :--- | :--- | :--- |
| **`daybreak-design-skill`** | `.agents/skills/daybreak-design-skill/SKILL.md` | Creating or modifying any UI component, typography role, spacing, color token, or layout in Daybreak. |
| **`security-audit`** | `.agents/skills/security-audit/SKILL.md` | Auditing ingestion parsers, URL sanitization, Markdown rendering, IMAP/env secret boundaries, or dependencies (Cloudflare `security-audit-skill`). |
| **`browser-verification`** | `.agents/skills/browser-verification/SKILL.md` | Verifying `/`, `/read/[id]`, and `/style-guide` in a live dev server across dark/light themes and desktop/mobile viewports. |
| **`tdd`** | `.agents/skills/tdd/SKILL.md` | Writing failing unit/integration tests before implementing features or bug fixes. |
| **`code-review`** | `.agents/skills/code-review/SKILL.md` | Reviewing a branch or step diff against Daybreak standards and spec requirements. |
| **`diagnosing-bugs`** | `.agents/skills/diagnosing-bugs/SKILL.md` | Investigating extraction regressions, Medium chrome leaks, or performance bottlenecks. |
| **`codebase-design`** | `.agents/skills/codebase-design/SKILL.md` | Designing deep modules with narrow, testable interfaces. |
| **`domain-modeling`** | `.agents/skills/domain-modeling/SKILL.md` | Updating `CONTEXT.md` or recording Architecture Decision Records in `docs/adr/`. |
| **`frontend-design`** | `.agents/skills/frontend-design/SKILL.md` | Maintaining intentional, high-craft visual restraint. |
