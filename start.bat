@echo off
echo Starting Uprising Sales OS...
echo ==============================================

:: Start Supabase logically (Assuming local instance)
echo [1] Starting Database (Supabase)...
cd backend
start cmd /k "supabase start"

:: Wait for a few seconds to let Supabase start up
timeout /t 5 /nobreak >nul

:: Start Backend
echo [2] Starting Backend (FastAPI)...
start cmd /k "cd .venv\Scripts & activate.bat & cd ..\.. & uvicorn app.main:app --reload --port 8000"

:: Start Frontend
echo [3] Starting Frontend (Next.js)...
cd ..\frontend
start cmd /k "npm run dev"

echo ==============================================
echo All services are starting in separate windows.
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:8000/docs
echo Supabase Studio: http://localhost:54323
echo ==============================================
cd ..
