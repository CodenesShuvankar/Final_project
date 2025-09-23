@echo off
title Setup Voice API Environment
echo ========================================
echo   Voice API Environment Setup
echo ========================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ and try again
    pause
    exit /b 1
)

echo Current Python version:
python --version
echo.

REM Create virtual environment
if exist "venv" (
    echo Virtual environment already exists. Removing old one...
    rmdir /s /q venv
)

echo [1/3] Creating virtual environment...
python -m venv venv
if errorlevel 1 (
    echo ERROR: Failed to create virtual environment
    pause
    exit /b 1
)

echo [2/3] Activating virtual environment...
call venv\Scripts\activate.bat

echo [3/3] Installing requirements...
echo This may take a few minutes...
echo.

REM Upgrade pip first
python -m pip install --upgrade pip

REM Install requirements
pip install -r requirements.txt
if errorlevel 1 (
    echo.
    echo WARNING: Some packages failed to install via requirements.txt
    echo Trying manual installation of core packages...
    pip install fastapi uvicorn python-multipart
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
    pip install transformers librosa joblib numpy scipy scikit-learn pandas
)

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo To start the API server, run:
echo   start_api.bat
echo.
echo To manually activate the environment:
echo   venv\Scripts\activate.bat
echo.
pause