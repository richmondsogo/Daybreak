# Step 09: Configure GitHub Linguist in .gitattributes

## Goal
Exclude test fixtures (`fixtures/**`), agent tooling/scanners (`.agents/**`), and generated migrations (`drizzle/migrations/**`) from GitHub repository language statistics via `.gitattributes` so GitHub accurately displays Daybreak as a TypeScript application.

## Root Cause
GitHub Linguist computes language statistics by summing code bytes in tracked files:
- `fixtures/html/*.html` contributed ~575 KB (47.4% HTML).
- `.agents/skills/security-audit/**/*.{py,cjs}` contributed ~419 KB (24.9% Python, 9.7% JavaScript).
- Actual application code in `src/` is 100% TypeScript (~196 KB, 16.6%).

## Changes
- Updated `.gitattributes` to mark:
  - `fixtures/** linguist-vendored`
  - `.agents/** linguist-vendored`
  - `drizzle/migrations/** linguist-generated`
- Added implementation plan in `docs/superpowers/plans/2026-11-08-github-linguist-language-stats.md`.

## Verification
- `git check-attr -a fixtures/html/free-direct.html`: `linguist-vendored: set`
- `git check-attr -a .agents/skills/security-audit/audit.py`: `linguist-vendored: set`
- `git check-attr -a drizzle/migrations/0000_fluffy_starfox.sql`: `linguist-generated: set`
- `git check-attr -a src/app/page.tsx`: `linguist-vendored: (unspecified)`
- `.\scripts\verify.ps1`: All gates green.
