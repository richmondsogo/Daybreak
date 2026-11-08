#Requires -Version 5.1
$ErrorActionPreference = "Stop"

Write-Host "=== Daybreak Environment Pre-flight Check ===" -ForegroundColor Cyan

foreach ($cmd in @("node", "pnpm", "git")) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Error "Missing required command: $cmd"
        exit 1
    }
}

Write-Host "Node: $(node -v)"
Write-Host "pnpm: $(pnpm -v)"
Write-Host "git:  $(git --version)"

if (-not (Test-Path ".env.example")) {
    Write-Error "Missing .env.example in repository root."
    exit 1
}

if (-not (Test-Path ".env")) {
    Write-Warning ".env not found. Copy .env.example to .env before running ingest CLI commands."
} else {
    Write-Host ".env file detected." -ForegroundColor Green
}
