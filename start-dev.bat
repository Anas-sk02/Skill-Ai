@echo off
title SkillGap.ai Dev Server
echo ===================================================
echo   Starting SkillGap.ai (Backend + Frontend)
echo ===================================================

cd /d "%~dp0"

:: 1. Launch FastAPI Backend (create venv and install requirements if missing)
start "SkillGap Backend (Port 8000)" cmd /k "cd /d "%~dp0backend" && if not exist venv\Scripts\activate.bat (echo Setting up Python venv... && python -m venv venv && call venv\Scripts\activate.bat && pip install -r requirements.txt) else (call venv\Scripts\activate.bat) && uvicorn main:app --reload --port 8000"

:: 2. Launch Next.js Frontend (install node_modules if missing)
start "SkillGap Frontend (Port 3000)" cmd /k "cd /d "%~dp0" && if not exist node_modules (echo Installing packages... && (pnpm install || npm install)) && (pnpm dev || npm run dev)"

echo.
echo Both servers are starting up:
echo  - Backend API:  http://localhost:8000
echo  - Web App:      http://localhost:3000
echo.
timeout /t 3 >nul
