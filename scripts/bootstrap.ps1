#Requires -Version 5.1
$ErrorActionPreference = "Stop"

Write-Host "=== Bootstrapping Daybreak ===" -ForegroundColor Cyan

& "$PSScriptRoot\check-env.ps1"

if (-not (Test-Path ".env") -and (Test-Path ".env.example")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example (fill in GMAIL_USER and GMAIL_APP_PASSWORD for IMAP ingestion)." -ForegroundColor Yellow
}

if (-not (Test-Path "data")) {
    New-Item -ItemType Directory -Path "data" | Out-Null
}

pnpm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

& "$PSScriptRoot\verify.ps1"
