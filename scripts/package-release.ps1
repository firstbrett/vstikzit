param(
  [switch]$Install = $false,
  [string]$VSCodeCmd = "code"
)

$ErrorActionPreference = 'Continue'

function Test-Command { param([string]$Name) try { Get-Command $Name -ErrorAction Stop | Out-Null; return $true } catch { return $false } }
function Resolve-CodeCmd { param([string]$Cmd)
  if (Test-Command $Cmd) { return $Cmd }
  $fallback = Join-Path $Env:LocalAppData 'Programs\Microsoft VS Code\bin\code.cmd'
  if (Test-Path $fallback) { return $fallback }
  throw "VS Code CLI not found."
}
function Ensure-NpmInstall {
  Write-Host "Installing dependencies (ci with fallback)..." -ForegroundColor Cyan
  npm ci
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "npm ci failed; falling back to npm install to sync lockfile."
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed." }
  }
}

if (-not (Test-Command node)) { throw "Missing Node.js. Install from https://nodejs.org/" }
if (-not (Test-Command npm)) { throw "Missing npm. Install Node.js which includes npm." }
$VSCodeCmd = Resolve-CodeCmd -Cmd $VSCodeCmd

Ensure-NpmInstall

Write-Host "Packaging VS Code extension (.vsix)..." -ForegroundColor Cyan
npm run clean | Out-Null
npm run package
if ($LASTEXITCODE -ne 0) { throw "Packaging failed." }

$vsix = Get-ChildItem -File -Filter "*.vsix" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $vsix) { throw "No .vsix produced." }
Write-Host ("VSIX created: {0}" -f $vsix.FullName) -ForegroundColor Green

if ($Install) {
  Write-Host "Installing into VS Code..." -ForegroundColor Cyan
  & $VSCodeCmd --install-extension $vsix.FullName --force | Out-Null
  Write-Host "Installed. Consider disabling Marketplace auto-update while testing." -ForegroundColor Yellow
}

