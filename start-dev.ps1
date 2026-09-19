# SkillGap.ai Startup Script (PowerShell)
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "   Starting SkillGap.ai (Backend + Frontend)" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $rootDir "backend"

# Start Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$backendDir'; if (Test-Path '.\venv\Scripts\Activate.ps1') { . .\venv\Scripts\Activate.ps1 }; uvicorn main:app --reload --port 8000"

# Start Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir'; if (Get-Command pnpm -ErrorAction SilentlyContinue) { pnpm dev } else { npm run dev }"

Write-Host "`nBoth services are launching in separate windows:" -ForegroundColor Green
Write-Host " - Backend API:  http://localhost:8000" -ForegroundColor Yellow
Write-Host " - Web App:      http://localhost:3000" -ForegroundColor Yellow
