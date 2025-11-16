@echo off
echo ========================================
echo VibeTune - Quick Start Script
echo ========================================
echo.

echo [1/5] Checking Supabase credentials...
findstr /C:"YOUR_ACTUAL_PASSWORD" .env >nul
if %errorlevel% equ 0 (
    echo ❌ ERROR: DATABASE_URL still has placeholder password!
    echo.
    echo Please update BackEnd\.env with:
    echo 1. Real database password from Supabase
    echo 2. Real SUPABASE_SERVICE_KEY from Supabase
    echo.
    echo Get credentials from: https://supabase.com/dashboard
    echo.
    pause
    exit /b 1
)

echo ✅ Credentials look configured
echo.

echo [2/5] Testing database connection...
python test_connection.py
if %errorlevel% neq 0 (
    echo.
    echo ❌ Database connection failed!
    echo.
    echo Troubleshooting steps:
    echo 1. Check DATABASE_URL in .env file
    echo 2. Run migration.sql in Supabase SQL Editor
    echo 3. Verify Supabase project is not paused
    echo.
    pause
    exit /b 1
)

echo.
echo [3/5] Checking Prisma client...
python -c "from prisma import Prisma; print('✅ Prisma client OK')" 2>nul
if %errorlevel% neq 0 (
    echo ❌ Prisma client not generated
    echo Running: prisma generate
    prisma generate
)

echo.
echo [4/5] Installing any missing dependencies...
python -m pip install -q -r requirements.txt

echo.
echo [5/5] Starting backend server...
echo.
echo ========================================
echo Backend will start on http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo ========================================
echo.

python -m uvicorn server_api:app --reload
