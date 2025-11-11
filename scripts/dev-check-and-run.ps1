param(
  [switch]$SkipInstall = $false,
  [switch]$SkipPackage = $false,
  [string]$VSCodeCmd = "code",
  [switch]$InstallLaTeXWorkshop = $false,
  [switch]$OpenSample = $true
)

function Test-Command {
  param([string]$Name)
  try { Get-Command $Name -ErrorAction Stop | Out-Null; return $true } catch { return $false }
}

function Assert-Command {
  param([string]$Name, [string]$Help)
  if (-not (Test-Command $Name)) {
    Write-Error "Missing dependency: $Name. $Help" -ErrorAction Stop
  }
}

Write-Host "[1/6] Checking required tools..." -ForegroundColor Cyan
Assert-Command node "Install Node.js from https://nodejs.org/"
Assert-Command npm "Install Node.js which bundles npm"
if (-not (Test-Command $VSCodeCmd)) {
  # Try typical Windows install location
  $fallback = "$Env:LocalAppData\Programs\Microsoft VS Code\bin\code.cmd"
  if (Test-Path $fallback) { $VSCodeCmd = $fallback } else { Assert-Command $VSCodeCmd "Install VS Code and add 'code' to PATH" }
}

# Optional tools for build/preview
$hasPdfLaTeX = Test-Command pdflatex
$hasDviSvgm = Test-Command dvisvgm
if (-not $hasPdfLaTeX) { Write-Warning "pdflatex not found. PDF builds will not work." }
if (-not $hasDviSvgm) { Write-Warning "dvisvgm not found. SVG builds will not work." }

Write-Host "[2/6] Installing dependencies (npm ci)..." -ForegroundColor Cyan
if (-not $SkipInstall) {
  npm ci | Write-Output
} else {
  Write-Host "Skipped dependency install." -ForegroundColor Yellow
}

Write-Host "[3/6] Building/Packaging extension..." -ForegroundColor Cyan
if ($SkipPackage) {
  npm run build | Write-Output
} else {
  npm run package | Write-Output
}

# Find latest VSIX produced
$vsix = Get-ChildItem -File -Filter "*.vsix" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $vsix) { Write-Error "No .vsix produced. Ensure 'npm run package' succeeded." -ErrorAction Stop }
Write-Host "Using VSIX: $($vsix.FullName)" -ForegroundColor Green

Write-Host "[4/6] Installing extension into VS Code..." -ForegroundColor Cyan
& $VSCodeCmd --install-extension $vsix.FullName --force | Write-Output

# Ensure LaTeX Workshop if requested
if ($InstallLaTeXWorkshop) {
  Write-Host "Ensuring LaTeX Workshop is installed..." -ForegroundColor Cyan
  $installed = & $VSCodeCmd --list-extensions | Select-String -Pattern "James-Yu.latex-workshop" -Quiet
  if (-not $installed) {
    & $VSCodeCmd --install-extension James-Yu.latex-workshop | Write-Output
  }
}

Write-Host "[5/6] Preparing sample inline-tex workspace..." -ForegroundColor Cyan
$sampleDir = Join-Path (Get-Location) "sample-inline-tex"
New-Item -ItemType Directory -Force -Path $sampleDir | Out-Null
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
Set-Content -Path (Join-Path $sampleDir "main.tex") -Value $mainTex -Encoding UTF8

Write-Host "[6/6] Launching VS Code with sample." -ForegroundColor Cyan
if ($OpenSample) {
  # Try to run the inline command on startup (supported in newer VS Code)
  try {
    & $VSCodeCmd $sampleDir -g (Join-Path $sampleDir "main.tex"):8 --command vstikzit.openInlineTikz | Write-Output
  } catch {
    & $VSCodeCmd $sampleDir -g (Join-Path $sampleDir "main.tex"):8 | Write-Output
  }
}

Write-Host "Done. In VS Code, run: 'TikZiT: Open Inline TikZ Block' (Ctrl+Alt+I) in main.tex to test the split-view editor." -ForegroundColor Green

