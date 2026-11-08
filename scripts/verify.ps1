#Requires -Version 5.1
$ErrorActionPreference = "Stop"

Write-Host "=== Daybreak Verification Gate ===" -ForegroundColor Cyan

Write-Host "`n[1/4] Checking repository hygiene & secret boundaries..." -ForegroundColor Yellow
$trackedEnv = git ls-files ".env*" | Where-Object { $_ -ne ".env.example" -and $_ -ne ".env.test" }
if ($trackedEnv) {
    Write-Error "Secret leak risk: real .env file is tracked by git: $trackedEnv"
    exit 1
}
$scratchFiles = Get-ChildItem -Path . -Filter "scratch-*" -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "\\node_modules\\|\\\.next\\|\\\.git\\" }
if ($scratchFiles) {
    Write-Error "Hygiene error: temporary scratch files present: $($scratchFiles.FullName -join ', ')"
    exit 1
}

Write-Host "[2/4] Running ESLint (pnpm lint)..." -ForegroundColor Yellow
pnpm lint
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[3/4] Running TypeScript typecheck (pnpm typecheck)..." -ForegroundColor Yellow
pnpm typecheck
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[4/4] Running Vitest suite (pnpm test)..." -ForegroundColor Yellow
pnpm test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nAll Daybreak verification checks PASSED." -ForegroundColor Green
