@echo off
REM Quick activation script for the voice API environment

if not exist "venv" (
    echo Virtual environment not found!
    echo Run setup_env.bat first to create the environment
    pause
    exit /b 1
)

echo Activating voice API environment...
call venv\Scripts\activate.bat

echo.
echo ========================================
echo   Voice API Environment Activated
echo ========================================
echo.
echo Available commands:
echo   python voice_api.py    - Start the API server
echo   python test_api.py     - Test the API
echo   pip list              - Show installed packages
echo   deactivate            - Exit the environment
echo.
cmd /k