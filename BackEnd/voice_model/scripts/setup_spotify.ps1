# Spotify API Setup Script for Voice Emotion Detection Project

Write-Host "🎵 Setting up Spotify API Integration..." -ForegroundColor Green
Write-Host "========================================"

# Activate virtual environment
Write-Host "[1/4] Activating virtual environment..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

# Install Spotify dependencies
Write-Host "[2/4] Installing Spotify API dependencies..." -ForegroundColor Yellow
pip install spotipy==2.23.0 python-dotenv==1.0.0

# Create .env file if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "[3/4] Creating .env file..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ Created .env file from template" -ForegroundColor Green
    Write-Host "⚠️  Please edit .env file with your Spotify credentials" -ForegroundColor Yellow
} else {
    Write-Host "[3/4] .env file already exists" -ForegroundColor Yellow
}

Write-Host "[4/4] Spotify integration setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🔑 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Go to https://developer.spotify.com/dashboard/applications"
Write-Host "2. Create a new app or use existing one"
Write-Host "3. Copy Client ID and Client Secret"
Write-Host "4. Edit .env file with your credentials"
Write-Host "5. Add redirect URI: http://localhost:3000/callback"
Write-Host ""
Write-Host "🚀 Then restart your API server with: python voice_api.py" -ForegroundColor Green