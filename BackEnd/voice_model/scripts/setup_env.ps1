# Voice Emotion Detection API - Environment Setup
# PowerShell script for setting up the virtual environment

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Voice API Environment Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is available
try {
    $pythonVersion = python --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Python found: $pythonVersion" -ForegroundColor Green
    } else {
        throw "Python not found"
    }
} catch {
    Write-Host "✗ ERROR: Python is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Python 3.8+ and try again" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Remove existing virtual environment
if (Test-Path "venv") {
    Write-Host "[0/3] Removing existing virtual environment..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "venv"
}

# Create virtual environment
Write-Host "[1/3] Creating virtual environment..." -ForegroundColor Blue
python -m venv venv
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ ERROR: Failed to create virtual environment" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✓ Virtual environment created" -ForegroundColor Green

# Activate virtual environment
Write-Host "[2/3] Activating virtual environment..." -ForegroundColor Blue
& "venv\Scripts\Activate.ps1"

# Install requirements
Write-Host "[3/3] Installing requirements..." -ForegroundColor Blue
Write-Host "This may take a few minutes..." -ForegroundColor Yellow
Write-Host ""

# Upgrade pip
python -m pip install --upgrade pip --quiet

# Install from requirements.txt
Write-Host "Installing packages from requirements.txt..." -ForegroundColor Blue
pip install -r requirements.txt

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠ Some packages failed via requirements.txt" -ForegroundColor Yellow
    Write-Host "Trying manual installation..." -ForegroundColor Blue
    
    # Core packages
    pip install fastapi uvicorn python-multipart
    
    # PyTorch (CPU version for compatibility)
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
    
    # ML and audio packages
    pip install transformers librosa joblib numpy scipy scikit-learn pandas soundfile
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start the API server:" -ForegroundColor White
Write-Host "  .\start_api.bat" -ForegroundColor Yellow
Write-Host ""
Write-Host "To manually activate the environment:" -ForegroundColor White
Write-Host "  .\venv\Scripts\Activate.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "To test the installation:" -ForegroundColor White
Write-Host "  python test_api.py" -ForegroundColor Yellow
Write-Host ""

Read-Host "Press Enter to exit"