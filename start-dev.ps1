# SkillGap.ai Startup Script (PowerShell)
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "   Starting SkillGap.ai (Backend + Frontend)" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $rootDir "backend"

# 1. Start Backend with auto-setup
$backendCmd = @"
Set-Location '$backendDir'
if (-not (Test-Path '.\venv\Scripts\Activate.ps1')) {
    Write-Host 'Creating Python virtual environment...' -ForegroundColor Cyan
    python -m venv venv
}
. .\venv\Scripts\Activate.ps1
Write-Host 'Ensuring backend packages are installed...' -ForegroundColor Cyan
pip install -r requirements.txt
Write-Host 'Starting FastAPI Backend on port 8000...' -ForegroundColor Green
uvicorn main:app --reload --port 8000
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd

# 2. Start Frontend with auto-setup
$frontendCmd = @"
Set-Location '$rootDir'
if (-not (Test-Path '.\node_modules')) {
    Write-Host 'Installing frontend packages (this may take a minute)...' -ForegroundColor Cyan
    if (Get-Command pnpm -ErrorAction SilentlyContinue) { pnpm install } else { npm install }
}
Write-Host 'Starting Next.js Frontend on port 3000...' -ForegroundColor Green
if (Get-Command pnpm -ErrorAction SilentlyContinue) { pnpm dev } else { npm run dev }
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Write-Host "`nBoth services are starting in separate windows:" -ForegroundColor Green
Write-Host " - Backend API:  http://localhost:8000" -ForegroundColor Yellow
Write-Host " - Web App:      http://localhost:3000" -ForegroundColor Yellow
