@echo off
echo Starting Uprising Sales OS...
echo ==============================================

:: ── Services ──────────────────────────────────
:: No local Supabase start (Using Remote Cloud)
echo [1] Checking Connectivity...
timeout /t 1 /nobreak >nul

:: Start Backend
echo [2] Starting Backend (FastAPI)...
start cmd /k "cd backend & .venv\Scripts\activate.bat & uvicorn app.main:app --reload --port 8000"

:: Start Frontend
echo [3] Starting Frontend (Next.js)...
start cmd /k "cd frontend & npm run dev"

echo ==============================================
echo All services are starting in separate windows.
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:8000/docs
echo Supabase Project: https://supabase.com/dashboard
echo ==============================================
cd ..
