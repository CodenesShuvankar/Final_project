# Backend API - Emotion Detection System

This backend provides emotion detection capabilities through facial expression and voice analysis, along with **Spotify music recommendations** based on detected emotions.

## 🚀 Quick Start

### 1. Install Requirements

```powershell
# Navigate to Backend directory
cd BackEnd

# Run the setup script (installs and verifies everything)
python setup.py
```

**OR** install manually:

```powershell
pip install -r requirements.txt
```

### 2. Configure Spotify API (Required for Music Recommendations)

1. **Get Spotify Credentials:**
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Create a new app
   - Copy your Client ID and Client Secret

2. **Set up environment variables:**
   ```powershell
   # Copy the example file
   copy .env.example .env
   
   # Edit .env and add your credentials
   notepad .env
   ```

3. **Add your credentials to `.env`:**
   ```env
   SPOTIFY_CLIENT_ID=your_client_id_here
   SPOTIFY_CLIENT_SECRET=your_client_secret_here
   ```

📖 **For detailed Spotify setup**, see [SPOTIFY_SETUP.md](SPOTIFY_SETUP.md)

### 3. Verify Installation

Check if all packages are installed correctly:

```powershell
# Run the main setup test
python test_backend.py

# Test Spotify integration
python test_spotify.py
```

### 4. Run the Server

```powershell
# Development mode (with auto-reload)
python -m uvicorn server_api:app --reload

# Production mode
python -m uvicorn server_api:app --host 0.0.0.0 --port 8000
```

The API will be available at: `http://localhost:8000`

## 📋 Requirements

### System Requirements
- **Python**: 3.8 or higher
- **RAM**: 8GB minimum (16GB recommended for ML models)
- **Disk Space**: ~5GB for all dependencies and models

### Core Dependencies
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `torch` - Deep learning framework
- `transformers` - Hugging Face models
- `librosa` - Audio processing
- `deepface` - Face emotion detection
- `opencv-python` - Computer vision
- `tensorflow` - Deep learning backend

## 🛠️ API Endpoints

### Health Check
```
GET /
Returns: API status
```

### Facial Expression Detection
```
GET /detect_facical_expression?image_path=<path>
Parameters: image_path (string)
Returns: Detected emotion
```

### Voice Emotion Analysis
```
POST /analyze-voice
Body: audio_file (multipart/form-data)
Returns: Emotion, confidence, and probability distribution
```

### Spotify Integration
```
GET /spotify/search?query=<search_term>&limit=20
GET /spotify/mood-recommendations?mood=<mood>&limit=20
GET /spotify/mood-recommendations/{mood}?limit=20
```

**Example:**
```bash
curl "http://localhost:8000/spotify/mood-recommendations/happy?limit=10"
```

### Combined Analysis
```
POST /analyze-voice-and-recommend
Body: audio_file (multipart/form-data)
Returns: Voice analysis + music recommendations
```

## 📁 Project Structure

```
BackEnd/
├── server_api.py              # Main FastAPI application
├── requirements.txt           # Python dependencies
├── setup.py                  # Setup and verification script
├── test_backend.py           # Backend functionality tests
├── test_spotify.py           # Spotify integration tests
├── README.md                 # This file
├── SPOTIFY_SETUP.md          # Detailed Spotify setup guide
├── .env.example              # Example environment variables
├── .env                      # Your credentials (DO NOT COMMIT)
├── .gitignore               # Git ignore file
├── services/
│   ├── __init__.py
│   └── spotify_service.py    # Spotify API integration
├── video_model/
│   ├── __init__.py
│   └── face_expression.py    # Facial emotion detection
└── voice_model/
    ├── __init__.py
    ├── voice_api.py          # Voice emotion detection
    └── speech-emotion-recognition-7class/
        ├── final_model/      # Trained model files
        │   ├── config.json
        │   ├── model.safetensors
        │   └── preprocessor_config.json
        └── checkpoints/      # Training checkpoints
```

## 🔧 Troubleshooting

### Import Errors
If you get import errors, make sure all packages are installed:
```powershell
python setup.py
```

### Spotify "Credentials not found"
1. Make sure `.env` file exists in `BackEnd/` directory
2. Check credentials are properly set (no extra spaces)
3. See [SPOTIFY_SETUP.md](SPOTIFY_SETUP.md) for detailed setup

### Model Loading Issues
Ensure model files exist in:
```
BackEnd\voice_model\speech-emotion-recognition-7class\final_model\
```

### CUDA/GPU Issues
If you don't have a GPU, PyTorch will automatically use CPU. To explicitly install CPU-only version:
```powershell
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
```

### Port Already in Use
If port 8000 is busy, use a different port:
```powershell
uvicorn server_api:app --port 8001
```

## 🧪 Testing

Test if the API is running:
```powershell
curl http://localhost:8000/
```

Or open in browser: `http://localhost:8000/docs` for interactive API documentation.

## 📝 Notes

- The voice emotion model supports 7 emotion classes
- Face detection uses DeepFace with multiple backend models
- Audio files should be in common formats (WAV, MP3, etc.)
- **Spotify integration uses Client Credentials flow** (no user auth required for basic features)
- Emotion-to-music mapping is customizable in `services/spotify_service.py`

## 🎵 Spotify Features

### Emotion Mapping
The system intelligently maps emotions to music characteristics:
- **Happy** → Upbeat, high energy, positive songs
- **Sad** → Slower, acoustic, melancholic tracks
- **Angry** → High energy, intense rock/metal
- **Calm** → Ambient, chill, relaxing music
- And more...

### Supported Emotions
happy, sad, angry, neutral, fear, disgust, surprise, calm, excited

See [SPOTIFY_SETUP.md](SPOTIFY_SETUP.md) for customization details.

## 🐛 Common Issues Fixed

✅ FastAPI app initialization
✅ Missing imports (UploadFile, File, logging)
✅ Async/sync function calls
✅ Windows path handling
✅ Streamlit dependencies removed
✅ Proper error handling and logging

## 📞 Support

For issues or questions, check:
1. Error logs in console
2. API documentation at `/docs`
3. Verify all model files are present
