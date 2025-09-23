# Voice Emotion Detection API

This API provides voice emotion detection using a fine-tuned wav2vec2 model.

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)
```bash
# Run setup script to create virtual environment and install dependencies
setup_env.bat    # Windows Command Prompt
# OR
.\setup_env.ps1  # PowerShell
```

### Option 2: Manual Setup
```bash
# Create virtual environment
python -m venv venv

# Activate environment
venv\Scripts\activate.bat    # Windows CMD
# OR
venv\Scripts\Activate.ps1    # PowerShell

# Install dependencies
pip install -r requirements.txt
```

## 🏃‍♂️ Running the API

### Start the Server
```bash
# Automated start (creates env if needed)
start_api.bat

# OR manual start (after environment setup)
activate.bat
python voice_api.py
```

The API will be available at:
- **Server**: `http://localhost:8000`
- **Interactive docs**: `http://localhost:8000/docs`
- **Health check**: `http://localhost:8000/health`

## 📁 Project Structure

```
Voice model/
├── voice_api.py           # Main FastAPI application
├── test.py               # Original model test script
├── requirements.txt      # Python dependencies
├── setup_env.bat        # Environment setup (Windows CMD)
├── setup_env.ps1        # Environment setup (PowerShell)
├── start_api.bat        # Start server with auto-setup
├── activate.bat         # Quick environment activation
├── test_api.py          # API testing script
└── wav2vec2-emotion-model/  # Model files directory
    ├── config.json
    ├── pytorch_model.bin
    └── label_encoder.pkl
```

## 🔧 Configuration

### Model Paths
Update paths in `voice_api.py` if your model is in a different location:
```python
MODEL_PATH = r"D:\My_Projects\Final_year\Voice model\wav2vec2-emotion-model"
ENCODER_PATH = r"D:\My_Projects\Final_year\Voice model\wav2vec2-emotion-model\label_encoder.pkl"
```

### Environment Variables
```bash
# Optional: Custom API port
export PORT=8000

# Optional: Enable CUDA
export CUDA_VISIBLE_DEVICES=0
```

## 🧪 Testing

```bash
# Test API health and functionality
python test_api.py

# Manual testing with curl
curl -X GET http://localhost:8000/health
```

## 📡 API Endpoints

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "available_emotions": ["happy", "sad", "angry", "neutral"],
  "device": "cpu"
}
```

### Voice Analysis
```http
POST /analyze-voice
Content-Type: multipart/form-data
```

**Request:** Upload audio file (WAV, MP3, M4A, FLAC)

**Response:**
```json
{
  "success": true,
  "prediction": {
    "emotion": "happy",
    "confidence": 0.85,
    "all_scores": {
      "happy": 0.85,
      "sad": 0.10,
      "angry": 0.05
    },
    "timestamp": "2025-09-19T10:30:00"
  }
}
```

### Voice Stream Analysis
```http
POST /analyze-voice-stream
Content-Type: application/octet-stream
```

For real-time audio streaming applications.

## 🛠️ Development

### Dependencies
See `requirements.txt` for complete list. Key packages:
- **FastAPI**: Web framework
- **PyTorch**: ML framework
- **Transformers**: Hugging Face models
- **Librosa**: Audio processing
- **Uvicorn**: ASGI server

### Adding New Features
1. Modify `voice_api.py` for new endpoints
2. Update `requirements.txt` for new dependencies
3. Test with `test_api.py`

## 🐛 Troubleshooting

### Common Issues

**"Model not found" error:**
- Check `MODEL_PATH` and `ENCODER_PATH` in `voice_api.py`
- Ensure model files exist in the specified directory

**"Virtual environment creation failed":**
- Ensure Python 3.8+ is installed
- Check if you have write permissions in the directory

**"Package installation failed":**
- Try manual installation: `pip install torch --index-url https://download.pytorch.org/whl/cpu`
- For CUDA: Use appropriate PyTorch version for your CUDA version

**"API not accessible from frontend":**
- Check CORS settings in `voice_api.py`
- Verify the API is running on the correct port
- Ensure firewall allows the connection

### Getting Help
1. Check the health endpoint: `http://localhost:8000/health`
2. Review logs in the terminal where the API is running
3. Test with `python test_api.py`