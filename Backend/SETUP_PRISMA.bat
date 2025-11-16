@echo off
echo ========================================
echo VibeTune Prisma Setup
echo ========================================
echo.

cd BackEnd

echo Step 1: Installing Prisma dependencies...
pip install prisma==0.15.0 pyjwt==2.10.1
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed
echo.

echo Step 2: Generating Prisma client...
prisma generate --schema=prisma/schema.prisma
if %errorlevel% neq 0 (
    echo ❌ Failed to generate Prisma client
    echo.
    echo Make sure your DATABASE_URL is set in .env file:
    echo DATABASE_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"
    pause
    exit /b 1
)
echo ✅ Prisma client generated
echo.

echo ========================================
echo Setup Complete! 🎉
echo ========================================
echo.
echo Next steps:
echo 1. Run the migration SQL in Supabase Dashboard
echo    File: BackEnd/prisma/migration.sql
echo.
echo 2. Update your .env file with:
echo    DATABASE_URL="your-database-connection-string"
echo    SUPABASE_SERVICE_KEY="your-service-role-key"
echo.
echo 3. Start the server:
echo    python start_server.py
echo.
pause
