param(
  [string]$VSCodeCmd = "",
  [switch]$InstallLaTeXWorkshop = $false,
  [switch]$CreateSample = $true,
  [string]$Workspace = "",
  [switch]$RunInlineCommand = $true,
  [switch]$UseInsiders = $false
)

$ErrorActionPreference = 'Continue'

function Test-Command {
  param([string]$Name)
  try { Get-Command $Name -ErrorAction Stop | Out-Null; return $true } catch { return $false }
}

function Resolve-CodeCmd {
  param([string]$Cmd, [switch]$PreferInsiders)
  # If explicit command supplied and found, use it
  if ($Cmd -and (Test-Command $Cmd)) { return $Cmd }
  # Try insiders first if preferred
  if ($PreferInsiders) {
    if (Test-Command 'code-insiders') { return 'code-insiders' }
    $ci = Join-Path $Env:LocalAppData 'Programs\Microsoft VS Code Insiders\bin\code-insiders.cmd'
    if (Test-Path $ci) { return $ci }
  }
  # Try stable
  if (Test-Command 'code') { return 'code' }
  $c = Join-Path $Env:LocalAppData 'Programs\Microsoft VS Code\bin\code.cmd'
  if (Test-Path $c) { return $c }
  # Fallback to insiders if found (even if not preferred)
  if (Test-Command 'code-insiders') { return 'code-insiders' }
  $ci2 = Join-Path $Env:LocalAppData 'Programs\Microsoft VS Code Insiders\bin\code-insiders.cmd'
  if (Test-Path $ci2) { return $ci2 }
  throw "VS Code CLI not found. Install VS Code and ensure 'code' or 'code-insiders' is on PATH."
}

# Try to detect whether this terminal is hosted by Insiders or Stable
function Get-HostingVSCodeVariant {
  try {
    $pp = Get-CimInstance Win32_Process -Filter "ProcessId=$PID"
    $limit = 0
    while ($pp -and $limit -lt 25) {
      $parent = Get-CimInstance Win32_Process -Filter "ProcessId=$($pp.ParentProcessId)"
      if (-not $parent) { break }
      if ($parent.Name -match '^Code - Insiders(\.exe)?$') { return 'insiders' }
      if ($parent.Name -match '^Code(\.exe)?$') { return 'stable' }
      $pp = $parent
      $limit++
    }
  } catch { }
  # Fallback to env heuristic
  if ($env:VSCODE_IPC_HOOK -and $env:VSCODE_IPC_HOOK -match 'insiders') { return 'insiders' }
  if ($env:VSCODE_CWD) { return 'stable' }
  return 'unknown'
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

# 1) Check tools
if (-not (Test-Command node)) { throw "Missing Node.js. Install from https://nodejs.org/" }
if (-not (Test-Command npm)) { throw "Missing npm. Install Node.js which includes npm." }
$preferInsiders = $UseInsiders
if (-not $PSBoundParameters.ContainsKey('UseInsiders')) {
  $variant = Get-HostingVSCodeVariant
  if ($variant -eq 'insiders') { $preferInsiders = $true }
}
$VSCodeCmd = Resolve-CodeCmd -Cmd $VSCodeCmd -PreferInsiders:$preferInsiders
Write-Host "Using VS Code CLI: $VSCodeCmd" -ForegroundColor DarkGray

# 2) Install deps
Ensure-NpmInstall

# 3) Build dist
Write-Host "Building extension/webview..." -ForegroundColor Cyan
npm run clean | Out-Null
npm run build
if ($LASTEXITCODE -ne 0) { throw "Build failed." }

# 4) Prepare workspace
if ([string]::IsNullOrWhiteSpace($Workspace)) {
  if ($CreateSample) {
    $Workspace = Join-Path (Get-Location) 'sample-inline-tex'
    New-Item -ItemType Directory -Force -Path $Workspace | Out-Null
    $mainTex = @"
% Sample inline TikZ test file
\documentclass{article}
\usepackage{tikz}
\begin{document}

Some text before.

\begin{tikzpicture}
  \node[draw,circle] (A) at (0,0) {A};
  \node[draw,circle] (B) at (2,0) {B};
  \draw (A) to (B);
\end{tikzpicture}

Some text after.

\end{document}
"@
    Set-Content -Path (Join-Path $Workspace 'main.tex') -Value $mainTex -Encoding UTF8
  } else {
    $Workspace = (Get-Location).Path
  }
}

# 5) Optional LaTeX Workshop
if ($InstallLaTeXWorkshop) {
  Write-Host "Ensuring LaTeX Workshop is installed..." -ForegroundColor Cyan
  $installed = & $VSCodeCmd --list-extensions | Select-String -Pattern 'James-Yu.latex-workshop' -Quiet
  if (-not $installed) { & $VSCodeCmd --install-extension James-Yu.latex-workshop | Out-Null }
}

# 6) Launch Dev Host
Write-Host "Launching VS Code Extension Development Host..." -ForegroundColor Cyan
$args = @('--new-window', $Workspace, '--extensionDevelopmentPath', (Get-Location).Path)
if ($CreateSample) { $args += @('-g', (Join-Path $Workspace 'main.tex') + ':8') }
if ($RunInlineCommand) { $args += @('--command','vstikzit.openInlineTikz') }
Write-Host ("Command: {0} {1}" -f $VSCodeCmd, ($args -join ' ')) -ForegroundColor DarkGray
try {
  & $VSCodeCmd @args | Out-Null
} catch {
  Write-Warning "Failed to launch with '&'. Retrying with Start-Process..."
  Start-Process -FilePath $VSCodeCmd -ArgumentList $args | Out-Null
}

Write-Host "Dev Host launched. In the window, you can run 'TikZiT: Open Inline TikZ Block' to verify." -ForegroundColor Green
