#!/bin/bash
# Spotify API Setup Script for Voice Emotion Detection Project

echo "🎵 Setting up Spotify API Integration..."
echo "========================================"

# Activate virtual environment
echo "[1/4] Activating virtual environment..."
source venv/Scripts/activate

# Install Spotify dependencies
echo "[2/4] Installing Spotify API dependencies..."
pip install spotipy==2.23.0 python-dotenv==1.0.0

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "[3/4] Creating .env file..."
    cp .env.example .env
    echo "✅ Created .env file from template"
    echo "⚠️  Please edit .env file with your Spotify credentials"
else
    echo "[3/4] .env file already exists"
fi

echo "[4/4] Spotify integration setup complete!"
echo ""
echo "🔑 Next Steps:"
echo "1. Go to https://developer.spotify.com/dashboard/applications"
echo "2. Create a new app or use existing one"
echo "3. Copy Client ID and Client Secret"
echo "4. Edit .env file with your credentials"
echo "5. Add redirect URI: http://localhost:3000/callback"
echo ""
echo "🚀 Then restart your API server with: python voice_api.py"