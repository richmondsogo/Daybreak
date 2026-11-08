# Daybreak Build Protocol

This file governs how an AI coding agent collaborates on Daybreak. Read this before proposing or writing code.

---

## 0. Operating Principles

1. **Wait for Approval**: Never edit production source files before presenting a step plan and receiving user approval.
2. **One Step at a Time**: Work only on the step named by the user. Do not speculatively start later steps.
3. **Branch Per Step**:
   - Start every step on a dedicated branch off `main` (`git checkout -b step/<number>-<slug>`).
   - Commit logical units with conventional commit messages (`feat:`, `perf:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`).
   - Never run `git push --force` or `git push -f` without stopping and asking the user first.
4. **Surgical Changes**:
   - Touch only what the current task requires.
   - Do not add speculative configuration, unused helpers, or unrequested UI controls.
   - If a feature is removed, remove its supporting infrastructure in the same change.
5. **No New Dependencies Without Approval**:
   - Never run `pnpm add` without asking the user first and justifying why existing tools cannot solve the problem.

---

## 1. Execution Loop (Per Step)

### Phase 1: Context & Plan
1. Read `AGENTS.md`, `CONTEXT.md`, `DESIGN.md`, and relevant `docs/adr/` records.
2. Load applicable skills from `.agents/skills/` (e.g., `design-system`, `tdd`, `code-review`, `security-audit`, `browser-verification`).
3. Present a concise numbered plan with explicit **Success Criteria** and a **Verify** check for every item.
4. Wait for user approval.

### Phase 2: Implementation (TDD & Deep Modules)
1. Write or update colocated unit/integration tests (`*.test.ts` / `*.test.tsx`) first whenever adding or changing behavior.
2. Keep `src/app/` strictly for routing and composition; business logic belongs in `src/ingest/`, `src/db/`, `src/server/`, or `src/lib/`.
3. Route all database access through `src/db/*.ts` repository functions.
4. Route all text styling through `src/components/ui/typography.tsx`.

### Phase 3: Verification Gate
Every step must pass all applicable verification checks before completion:
1. **Static & Unit Gate**:
   ```powershell
   pnpm check
   .\scripts\verify.ps1
   ```
2. **Runtime & Browser Gate** (required for any change touching `src/app/`, `src/components/`, or `src/app/globals.css`):
   - Start `pnpm dev` and load the affected routes (`/`, `/read/[id]`, `/style-guide`) in a real browser via Chrome DevTools or Playwright MCP.
   - Verify both dark and light color schemes, scroll isolation, and zero console errors.
3. **Documentation & Step Log**:
   - Update `CONTEXT.md`, `DESIGN.md`, `README.md`, or `docs/adr/` if architecture or behavior changed.
   - Write a step log in `docs/steps/step-<id>.md` recording Goal, Changes Made, Verification Results, and Deviations.
4. **Clean Commit**:
   - Confirm `git status` shows no untracked scratch files (`scratch-*.js`, `.tmp/*`), stage changes, and create a conventional commit.
