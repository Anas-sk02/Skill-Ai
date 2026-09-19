@echo off
title SkillGap.ai Dev Server
echo ===================================================
echo   Starting SkillGap.ai (Backend + Frontend)
echo ===================================================

cd /d "%~dp0"

:: 1. Launch FastAPI Backend in a new terminal window
start "SkillGap Backend (Port 8000)" cmd /k "cd /d "%~dp0backend" && if exist venv\Scripts\activate.bat (call venv\Scripts\activate.bat) && uvicorn main:app --reload --port 8000"

:: 2. Launch Next.js Frontend in a new terminal window
start "SkillGap Frontend (Port 3000)" cmd /k "cd /d "%~dp0" && pnpm dev || npm run dev"

echo.
echo Both servers are starting up:
echo  - Backend API:  http://localhost:8000
echo  - Web App:      http://localhost:3000
echo.
echo You can minimize this window.
timeout /t 3 >nul
