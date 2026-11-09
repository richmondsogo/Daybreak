# PowerShell script to securely upload local .env secrets to GitHub Actions using gh CLI
[CmdletBinding()]
param(
  [string]$EnvFile = ".env"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $EnvFile)) {
  Write-Error "Could not find env file at '$EnvFile'."
}

Write-Host "Reading secrets from $EnvFile..." -ForegroundColor Cyan

$secretKeys = @(
  "GMAIL_USER",
  "GMAIL_APP_PASSWORD",
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN",
  "APP_PASSWORD"
)

$envMap = @{}

Get-Content $EnvFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
    $idx = $line.IndexOf("=")
    $key = $line.Substring(0, $idx).Trim()
    $val = $line.Substring($idx + 1).Trim()
    # Strip quotes if wrapped
    if (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'"))) {
      $val = $val.Substring(1, $val.Length - 2)
    }
    $envMap[$key] = $val
  }
}

$uploaded = 0
foreach ($key in $secretKeys) {
  if ($envMap.ContainsKey($key) -and $envMap[$key]) {
    Write-Host "Setting secret: $key" -ForegroundColor Yellow
    $body = $envMap[$key]
    gh secret set $key --body "$body"
    $uploaded++
  } else {
    Write-Host "Skipping $key (not found or empty in $EnvFile)" -ForegroundColor DarkGray
  }
}

Write-Host "`nSuccessfully updated $uploaded secret(s) in GitHub repository." -ForegroundColor Green
