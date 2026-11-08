# Fix GitHub Repository Language Statistics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configure GitHub Linguist via `.gitattributes` to ignore test fixtures (`fixtures/**`), agent skills/scanners (`.agents/**`), and migrations (`drizzle/migrations/**`) so GitHub accurately displays Daybreak as ~97% TypeScript instead of 47.4% HTML and 24.9% Python.

**Architecture:** GitHub uses [Linguist](https://github.com/github-linguist/linguist) to compute the Languages breakdown bar shown on repository homepages. By default, Linguist counts all bytes of code in tracked files. In Daybreak, 575 KB of test fixtures (`fixtures/html/*.html`) and 419 KB of agent skills scripts (`.agents/skills/security-audit/**/*.{py,cjs}`) are counted as repository code. By annotating `.gitattributes` with `linguist-vendored` and `linguist-generated`, Linguist ignores these non-application files from language statistics while preserving their functionality for tests and local tooling.

**Tech Stack:** Git, GitHub Linguist, `.gitattributes`, Vitest, PowerShell

---

## User Review Required

> [!NOTE]
> **Why GitHub was reporting 47.4% HTML & 24.9% Python:**
> Linguist calculates language stats purely by byte count of tracked code files:
> - **HTML (47.4% / 575 KB):** The 4 offline parser test fixtures in `fixtures/html/`.
> - **Python (24.9% / 302 KB):** Scanner scripts and test suites inside Cloudflare's security audit skill in `.agents/skills/security-audit/`.
> - **JavaScript (9.7% / 117 KB):** CJS test files in `.agents/skills/security-audit/`.
> - **TypeScript (16.6% / 196 KB):** The actual Daybreak application source code in `src/`.
>
> Marking `fixtures/**` and `.agents/**` with `linguist-vendored` in `.gitattributes` tells GitHub to exclude them from code stats, restoring TypeScript to **~97%**.

---

## Proposed Changes

### Configuration: `.gitattributes`

#### [MODIFY] `.gitattributes`

Add explicit GitHub Linguist overrides:
```gitattributes
# Keep CRLF vs LF line endings consistent
* text=auto eol=lf
*.eml -text

# Exclude offline test fixtures from GitHub language statistics and diffs
fixtures/** linguist-vendored
fixtures/html/** -text

# Exclude agent skills and third-party security scanners from language stats
.agents/** linguist-vendored

# Exclude auto-generated Drizzle database migrations from language stats
drizzle/migrations/** linguist-generated
```

---

## Verification Plan

### Automated Tests
1. Verify git attributes application:
   ```powershell
   git check-attr -a fixtures/html/free-direct.html
   git check-attr -a .agents/skills/security-audit/audit.py
   git check-attr -a src/app/page.tsx
   ```
   - `fixtures/html/free-direct.html` should report `linguist-vendored: set`.
   - `.agents/skills/security-audit/audit.py` should report `linguist-vendored: set`.
   - `src/app/page.tsx` should report `linguist-vendored: unspecified`.

2. Run repository verification:
   ```powershell
   .\scripts\verify.ps1
   ```
   - Must pass all hygiene, linting, TypeScript, and 26 Vitest test suites.

### Manual Verification
1. Push commit to GitHub `main` branch.
2. View repository page on GitHub (`https://github.com/richmondsogo/Daybreak`).
3. Confirm GitHub language bar updates to show TypeScript as the primary dominant language (~97%).
