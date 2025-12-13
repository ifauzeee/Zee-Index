#!/usr/bin/env pwsh
# Usage: .\scan.ps1 [-Fast] [-Clean]

param (
    [switch]$Fast,
    [switch]$Clean
)

$ErrorActionPreference = "Stop"
$sw = [System.Diagnostics.Stopwatch]::StartNew()

# --- Helpers ---
function Write-Header { param($Msg) Write-Host "`n==== $Msg ====" -ForegroundColor Cyan }
function Write-Success { param($Msg) Write-Host "[OK] $Msg" -ForegroundColor Green }
function Write-Error { param($Msg) Write-Host "[ERR] $Msg" -ForegroundColor Red }
function Write-Warning { param($Msg) Write-Host "[WARN] $Msg" -ForegroundColor Yellow }
function Write-Info { param($Msg) Write-Host "[INFO] $Msg" -ForegroundColor Gray }
function Write-Action { param($Msg) Write-Host "🛠  $Msg" -ForegroundColor Magenta }

Clear-Host
Write-Host "🚀 Starting Code Quality Scan..." -ForegroundColor Yellow

# --- 1. Clean Up ---
if ($Clean) {
    Write-Header "Cleaning Cache"
    $paths = @(".next", "node_modules/.cache", "dist", "build", "out")
    foreach ($p in $paths) { 
        if (Test-Path $p) { Remove-Item $p -Recurse -Force -ErrorAction SilentlyContinue; Write-Info "Removed $p" } 
    }
}

# --- 2. Detect Package Manager ---
$pm = "npm"; $run = "npm run"; $exec = "npx"; $install = "npm install -D"
if (Test-Path "pnpm-lock.yaml") { 
    $pm = "pnpm"; $run = "pnpm"; $exec = "pnpm exec"; $install = "pnpm add -D" 
} elseif (Test-Path "yarn.lock") { 
    $pm = "yarn"; $run = "yarn"; $exec = "yarn run"; $install = "yarn add -D" 
}
Write-Info "Using: $pm"

# --- 3. Env & Config Check ---
if (-not (Test-Path ".env") -and -not (Test-Path ".env.local")) { Write-Warning "No .env found!" }
if (-not (Test-Path "package.json")) { Write-Error "No package.json"; exit 1 }

$pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
$s = $pkg.scripts

# --- 4. Auto-Install Missing Tools ---
$required = @("prettier", "eslint")
if (Test-Path "tsconfig.json") { $required += "typescript" }

$installed = @{}
if ($pkg.dependencies) { $pkg.dependencies.PSObject.Properties | ForEach-Object { $installed[$_.Name] = $_.Value } }
if ($pkg.devDependencies) { $pkg.devDependencies.PSObject.Properties | ForEach-Object { $installed[$_.Name] = $_.Value } }

$missing = $required | Where-Object { -not $installed.ContainsKey($_) }

if ($missing.Count -gt 0) {
    Write-Header "Installing Missing Tools"
    Write-Action "Installing: $($missing -join ', ')"
    $cmdInstall = "$install $($missing -join ' ')"
    
    if ($PSVersionTable.PSVersion.Major -ge 7) {
        $p = Start-Process -FilePath "cmd" -ArgumentList "/c $cmdInstall" -PassThru -NoNewWindow -Wait
        if ($p.ExitCode -ne 0) { Write-Error "Install failed"; exit 1 }
    } else {
        cmd /c $cmdInstall
        if ($LASTEXITCODE -ne 0) { Write-Error "Install failed"; exit 1 }
    }
    Write-Success "Installed."
    $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json # Reload config
}

# --- 5. Build Steps ---
$steps = @()

# Format
if ($s.'format:fix') { $steps += @{Name="format:fix"; Cmd="$run format:fix"} } 
elseif ($s.format)   { $steps += @{Name="format"; Cmd="$run format"} }
else                 { $steps += @{Name="prettier fix"; Cmd="$exec prettier --write ."} }

# Lint
if ($s.'lint:fix')   { $steps += @{Name="lint:fix"; Cmd="$run lint:fix"} } 
elseif ($s.lint)     { $steps += @{Name="lint"; Cmd="$run lint"} }
else                 { $steps += @{Name="eslint check"; Cmd="$exec eslint ."} }

# TypeScript
if ($s.typecheck) { 
    $steps += @{Name="typecheck"; Cmd="$run typecheck"} 
} elseif (Test-Path "tsconfig.json") {
    $steps += @{Name="tsc check"; Cmd="$exec tsc --noEmit"}
}

# Build
if (-not $Fast) {
    if ($s.build) { $steps += @{Name="build"; Cmd="$run build"} }
} else { Write-Info "Fast mode: Skipping build" }

# --- 6. Execute ---
$hasError = $false
foreach ($step in $steps) {
    Write-Header "Running: $($step.Name)"
    try {
        if ($PSVersionTable.PSVersion.Major -ge 7) {
            $p = Start-Process -FilePath "cmd" -ArgumentList "/c $($step.Cmd)" -PassThru -NoNewWindow -Wait
            if ($p.ExitCode -ne 0) { throw }
        } else {
            cmd /c $step.Cmd
            if ($LASTEXITCODE -ne 0) { throw }
        }
        Write-Success "$($step.Name) passed"
    } catch {
        Write-Error "Failed: $($step.Name)"
        $hasError = $true; [System.Console]::Beep(500, 500); break
    }
}

$sw.Stop(); $t = [math]::Round($sw.Elapsed.TotalSeconds, 2); Write-Host ""

if ($hasError) { Write-Error "FAILED ($t s)."; exit 1 }

# --- 7. Success & Git ---
Write-Success "ALL PASSED ($t s)."
[System.Console]::Beep(1000, 200)

if (Test-Path ".git") {
    if ((Read-Host "`n[?] Git commit now? (y/n)") -eq 'y') {
        $m = Read-Host "[?] Message"
        if ($m) { 
            git add .
            git commit -m "$m"
            Write-Success "Committed!" 
        }
    }
}