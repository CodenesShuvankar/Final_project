# Error Handling & Troubleshooting

## Overview
Comprehensive error handling strategies across all backend components, common issues, and their solutions.

---

## Error Categories

### 1. Input Validation Errors
**When:** User uploads invalid files
**Status Code:** 400 Bad Request

### 2. Model Errors
**When:** ML models fail during inference
**Status Code:** 500 Internal Server Error

### 3. External API Errors
**When:** Spotify API fails
**Status Code:** 502 Bad Gateway

### 4. System Errors
**When:** Out of memory, GPU unavailable
**Status Code:** 503 Service Unavailable

---

## Input Validation

### File Type Validation

```python
# Location: BackEnd/server_api.py

ALLOWED_AUDIO = ['.wav', '.mp3', '.m4a', '.ogg', '.flac', '.aac']
ALLOWED_IMAGES = ['.jpg', '.jpeg', '.png', '.bmp', '.webp']

def validate_audio_file(file: UploadFile) -> tuple[bool, str]:
    """
    Validate audio file
    
    Checks:
    1. File extension
    2. File size (max 10MB)
    3. MIME type
    
    Returns: (is_valid, error_message)
    """
    # Check extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_AUDIO:
        return False, f"Unsupported audio format: {ext}. Allowed: {ALLOWED_AUDIO}"
    
    # Check size
    file.file.seek(0, 2)  # Seek to end
    size = file.file.tell()
    file.file.seek(0)  # Reset
    
    MAX_SIZE = 10 * 1024 * 1024  # 10MB
    if size > MAX_SIZE:
        return False, f"Audio file too large: {size/1024/1024:.1f}MB (max 10MB)"
    
    if size < 1000:  # Less than 1KB
        return False, "Audio file too small, likely corrupted"
    
    # Check MIME type
    if file.content_type and not file.content_type.startswith('audio/'):
        return False, f"Invalid MIME type: {file.content_type}"
    
    return True, ""


def validate_image_file(file: UploadFile) -> tuple[bool, str]:
    """
    Validate image file
    
    Checks:
    1. File extension
    2. File size (max 5MB)
    3. MIME type
    
    Returns: (is_valid, error_message)
    """
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_IMAGES:
        return False, f"Unsupported image format: {ext}. Allowed: {ALLOWED_IMAGES}"
    
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    
    MAX_SIZE = 5 * 1024 * 1024  # 5MB
    if size > MAX_SIZE:
        return False, f"Image too large: {size/1024/1024:.1f}MB (max 5MB)"
    
    if size < 500:
        return False, "Image too small, likely corrupted"
    
    if file.content_type and not file.content_type.startswith('image/'):
        return False, f"Invalid MIME type: {file.content_type}"
    
    return True, ""
```

### Usage in Endpoint

```python
@app.post("/analyze-voice-and-face")
async def analyze_voice_and_face(
    audio_file: UploadFile = File(...),
    image_file: UploadFile = File(...),
    limit: int = 20
):
    # Validate audio
    valid, error = validate_audio_file(audio_file)
    if not valid:
        logger.error(f"Audio validation failed: {error}")
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": error}
        )
    
    # Validate image
    valid, error = validate_image_file(image_file)
    if not valid:
        logger.error(f"Image validation failed: {error}")
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": error}
        )
    
    # Continue with processing...
```

---

## Voice Model Errors

### Error 1: Audio Loading Failed

**Symptom:** `soundfile` or `librosa` can't read audio

```python
# Location: BackEnd/voice_model/voice_api.py

def preprocess_audio(audio_path: str, target_sr: int = 16000) -> np.ndarray:
    try:
        audio, sr = sf.read(audio_path)
    except Exception as e:
        logger.error(f"Failed to load audio from {audio_path}: {e}")
        
        # Try alternative loader
        try:
            audio, sr = librosa.load(audio_path, sr=None)
            logger.info("Loaded audio using librosa fallback")
        except Exception as e2:
            logger.error(f"Librosa fallback also failed: {e2}")
            raise ValueError(f"Unable to load audio file. File may be corrupted or in unsupported format.")
    
    # Rest of preprocessing...
```

**Common Causes:**
- Corrupted file
- Unsupported codec (rare format)
- Empty file

**Solution:**
- Try alternative loader (librosa)
- Ask user to re-record
- Validate file before upload

---

### Error 2: Audio Too Short

**Symptom:** Less than 1 second of audio

```python
def preprocess_audio(audio_path: str, target_sr: int = 16000) -> np.ndarray:
    audio, sr = sf.read(audio_path)
    
    # Check duration
    duration = len(audio) / sr
    if duration < 1.0:
        raise ValueError(f"Audio too short: {duration:.2f}s (minimum 1s required)")
    
    # Pad if needed for model input (optional)
    min_samples = target_sr * 2  # 2 seconds minimum
    if len(audio) < min_samples:
        logger.warning(f"Padding audio from {duration:.2f}s to 2s")
        audio = np.pad(audio, (0, min_samples - len(audio)), mode='constant')
    
    # Continue...
```

**Solution:**
- Reject with clear error message
- Frontend should enforce minimum recording time

---

### Error 3: GPU Out of Memory

**Symptom:** `RuntimeError: CUDA out of memory`

```python
# Location: BackEnd/voice_model/voice_api.py

def analyze_audio_upload(audio_file, model_path):
    try:
        # Normal GPU inference
        input_values = inputs.input_values.to(device)
        with torch.no_grad():
            logits = model(input_values).logits
    
    except RuntimeError as e:
        if "out of memory" in str(e):
            logger.error("GPU OOM, falling back to CPU")
            
            # Clear GPU cache
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            
            # Retry on CPU
            try:
                device_cpu = torch.device('cpu')
                model_cpu = model.to(device_cpu)
                input_values_cpu = inputs.input_values.to(device_cpu)
                
                with torch.no_grad():
                    logits = model_cpu(input_values_cpu).logits
                
                logger.info("Successfully processed on CPU")
            except Exception as e2:
                logger.error(f"CPU fallback failed: {e2}")
                raise HTTPException(
                    status_code=503,
                    detail="Server overloaded. Please try again in a moment."
                )
        else:
            raise
```

**Prevention:**
- Limit concurrent requests
- Use smaller batch sizes
- Monitor GPU memory usage

---

### Error 4: Model Not Found

**Symptom:** Model files missing

```python
def load_model(model_path: str = "./BackEnd/voice_model/final_voice_model"):
    if not os.path.exists(model_path):
        logger.error(f"Model not found at {model_path}")
        raise FileNotFoundError(
            f"Voice model not found at {model_path}. "
            f"Please download from [model source] and place in {model_path}"
        )
    
    # Check required files
    required_files = ['config.json', 'model.safetensors', 'preprocessor_config.json']
    missing = [f for f in required_files if not os.path.exists(os.path.join(model_path, f))]
    
    if missing:
        raise FileNotFoundError(
            f"Model incomplete. Missing files: {missing}"
        )
    
    # Load model
    try:
        processor = Wav2Vec2Processor.from_pretrained(model_path)
        model = Wav2Vec2ForSequenceClassification.from_pretrained(model_path)
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise RuntimeError(f"Model loading failed. Files may be corrupted: {e}")
```

---

## Face Model Errors

### Error 1: No Face Detected

**Handled by three-tier strategy:**

```python
# Location: BackEnd/video_model/face_expression.py

def detect_expression(image_path: str) -> dict:
    # Tier 1: Strict detection
    try:
        results = DeepFace.analyze(
            img_path=image_path,
            actions=['emotion'],
            enforce_detection=True,  # Strict
            detector_backend='opencv'
        )
        logger.info("✅ Tier 1: Face detected with strict mode")
        return process_results(results)
    
    except ValueError as e:
        logger.warning(f"⚠️ Tier 1 failed: {e}")
        
        # Tier 2: Lenient detection
        try:
            results = DeepFace.analyze(
                img_path=image_path,
                actions=['emotion'],
                enforce_detection=False,  # Lenient
                detector_backend='opencv'
            )
            logger.info("✅ Tier 2: Face detected with lenient mode")
            return process_results(results)
        
        except Exception as e2:
            logger.warning(f"⚠️ Tier 2 failed: {e2}")
            
            # Tier 3: Neutral fallback
            logger.info("⚠️ Tier 3: Using neutral fallback")
            return {
                "success": True,
                "emotion": "neutral",
                "confidence": 0.3,
                "all_emotions": {
                    "neutral": 0.3,
                    "happy": 0.1,
                    "sad": 0.1,
                    "angry": 0.1,
                    "fear": 0.1,
                    "surprise": 0.1,
                    "disgust": 0.1
                },
                "fallback": True,
                "reason": "No face detected in image"
            }
```

**Logs:**
```
2024-01-15 10:30:45 - WARNING - ⚠️ Tier 1 failed: Face could not be detected
2024-01-15 10:30:46 - INFO - ✅ Tier 2: Face detected with lenient mode
```

---

### Error 2: Placeholder Image Detected

```python
def detect_expression(image_path: str) -> dict:
    img = cv2.imread(image_path)
    
    if img is None:
        raise ValueError("Failed to load image. File may be corrupted.")
    
    # Check if placeholder (uniform color)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    std_dev = gray.std()
    
    if std_dev < 10:
        logger.info(f"🎭 Placeholder detected (std_dev={std_dev:.2f}), using neutral")
        return {
            "success": True,
            "emotion": "neutral",
            "confidence": 0.3,
            "all_emotions": {...},
            "placeholder": True,
            "reason": "No camera available"
        }
    
    # Continue with face detection...
```

**Frontend Handling:**
```javascript
// front end/src/components/mood/MoodDetectorPanelIntegrated.tsx

if (result.analysis.face_prediction.placeholder) {
    console.warn('⚠️ No camera detected, face analysis unavailable');
    // Still show results but indicate voice-only
}
```

---

### Error 3: Image Corrupted

```python
def detect_expression(image_path: str) -> dict:
    try:
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError("cv2.imread returned None")
        
        # Verify image has content
        if img.size == 0:
            raise ValueError("Image has zero size")
        
        # Verify dimensions
        if img.shape[0] < 50 or img.shape[1] < 50:
            raise ValueError(f"Image too small: {img.shape[1]}x{img.shape[0]} (min 50x50)")
    
    except Exception as e:
        logger.error(f"Image load failed: {e}")
        raise HTTPException(
            status_code=400,
            detail=f"Image file corrupted or invalid: {e}"
        )
```

---

## Emotion Fusion Errors

### Error 1: Missing Emotions in Dictionary

```python
# Location: BackEnd/services/emotion_fusion.py

def merge_emotions(voice_emotion, voice_confidence, voice_all_emotions,
                   face_emotion, face_confidence, face_all_emotions):
    
    # Validate inputs
    if not voice_emotion or not face_emotion:
        raise ValueError("Both voice and face emotions are required")
    
    # Ensure all emotions exist in dictionaries
    all_emotion_keys = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise']
    
    for emotion in all_emotion_keys:
        if emotion not in voice_all_emotions:
            logger.warning(f"Missing {emotion} in voice_all_emotions, setting to 0")
            voice_all_emotions[emotion] = 0.0
        
        if emotion not in face_all_emotions:
            logger.warning(f"Missing {emotion} in face_all_emotions, setting to 0")
            face_all_emotions[emotion] = 0.0
    
    # Continue with merge...
```

---

### Error 2: Confidence Out of Range

```python
def merge_emotions(...):
    # Validate confidences
    if not (0 <= voice_confidence <= 1):
        logger.warning(f"Invalid voice confidence: {voice_confidence}, clamping")
        voice_confidence = max(0.0, min(1.0, voice_confidence))
    
    if not (0 <= face_confidence <= 1):
        logger.warning(f"Invalid face confidence: {face_confidence}, clamping")
        face_confidence = max(0.0, min(1.0, face_confidence))
    
    # Continue...
```

---

## Spotify API Errors

### Error 1: Authentication Failed

```python
# Location: BackEnd/services/spotify_service.py

def get_access_token(self):
    try:
        response = requests.post(auth_url, headers=headers, data=data, timeout=10)
        response.raise_for_status()
    
    except requests.exceptions.HTTPError as e:
        if response.status_code == 401:
            logger.error("Spotify authentication failed. Check credentials.")
            raise ValueError(
                "Spotify authentication failed. "
                "Please verify SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env"
            )
        else:
            logger.error(f"Spotify auth error {response.status_code}: {e}")
            raise
    
    except requests.exceptions.Timeout:
        logger.error("Spotify authentication timeout")
        raise TimeoutError("Spotify authentication timed out. Check network.")
    
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error during Spotify auth: {e}")
        raise ConnectionError(f"Failed to connect to Spotify: {e}")
```

---

### Error 2: Rate Limiting

```python
def get_mood_recommendations(self, mood: str, limit: int = 20) -> list:
    token = self.get_access_token()
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
    
    except requests.exceptions.HTTPError as e:
        if response.status_code == 429:
            # Rate limited
            retry_after = int(response.headers.get('Retry-After', 60))
            logger.warning(f"Spotify rate limit hit. Retry after {retry_after}s")
            
            # Option 1: Wait and retry (blocking)
            if retry_after < 5:
                time.sleep(retry_after + 1)
                return self.get_mood_recommendations(mood, limit)
            
            # Option 2: Return empty recommendations
            raise HTTPException(
                status_code=429,
                detail=f"Spotify rate limit exceeded. Try again in {retry_after}s"
            )
        else:
            raise
```

---

### Error 3: No Recommendations Found

```python
def get_mood_recommendations(self, mood: str, limit: int = 20) -> list:
    response = requests.get(url, headers=headers, params=params)
    data = response.json()
    
    tracks = data.get('tracks', [])
    
    if not tracks:
        logger.warning(f"No Spotify recommendations for mood: {mood}")
        # Return empty list rather than error
        return []
    
    # Format tracks...
    return tracks


# Usage in server_api.py
recommendations = spotify_service.get_mood_recommendations(mood, limit)

if not recommendations:
    logger.warning("No recommendations from Spotify, continuing without music")

return {
    "success": True,
    "analysis": {...},
    "recommendations": recommendations  # May be empty
}
```

**Frontend Handling:**
```javascript
if (result.recommendations && result.recommendations.length > 0) {
    displayRecommendations(result.recommendations);
} else {
    console.warn('No music recommendations available');
    showMessage('Mood detected but no music available');
}
```

---

## System Errors

### Error 1: Out of Memory (RAM)

```python
# Location: BackEnd/server_api.py

import psutil

def check_system_resources():
    """Check if system has enough resources"""
    mem = psutil.virtual_memory()
    
    if mem.percent > 90:
        logger.error(f"System memory critical: {mem.percent}% used")
        raise HTTPException(
            status_code=503,
            detail="Server overloaded. Please try again later."
        )
    
    if mem.available < 500 * 1024 * 1024:  # Less than 500MB
        logger.warning(f"Low memory: {mem.available / 1024 / 1024:.0f}MB available")


@app.post("/analyze-voice-and-face")
async def analyze_voice_and_face(...):
    check_system_resources()
    
    # Continue with processing...
```

---

### Error 2: Temporary File Cleanup

```python
@app.post("/analyze-voice-and-face")
async def analyze_voice_and_face(...):
    audio_temp = None
    image_temp = None
    
    try:
        # Create temporary files
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp:
            content = await audio_file.read()
            tmp.write(content)
            audio_temp = tmp.name
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
            await image_file.seek(0)
            content = await image_file.read()
            tmp.write(content)
            image_temp = tmp.name
        
        # Process...
        voice_result = voice_api.analyze_audio_upload(audio_file, model_path)
        face_result = face_expression.detect_expression(image_temp)
        
        # ... rest of processing ...
        
    finally:
        # Always cleanup, even if error
        if audio_temp:
            try:
                os.unlink(audio_temp)
                logger.debug(f"Cleaned up audio temp: {audio_temp}")
            except Exception as e:
                logger.warning(f"Failed to delete audio temp: {e}")
        
        if image_temp:
            try:
                os.unlink(image_temp)
                logger.debug(f"Cleaned up image temp: {image_temp}")
            except Exception as e:
                logger.warning(f"Failed to delete image temp: {e}")
```

---

## Logging Strategy

### Log Levels

```python
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/backend.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Usage:
logger.debug("Detailed info for debugging")  # Development only
logger.info("✅ Voice analysis complete")     # Normal operations
logger.warning("⚠️ No face detected, trying lenient mode")  # Recoverable issues
logger.error("❌ Failed to load model")       # Errors that need attention
logger.critical("🚨 System out of memory")   # Critical failures
```

### What to Log

**DO log:**
- ✅ Request IDs for tracing
- ✅ Processing times
- ✅ Model predictions and confidences
- ✅ Errors with stack traces
- ✅ Fallback activations

**DON'T log:**
- ❌ User audio/image data (privacy)
- ❌ Spotify API tokens
- ❌ Full file contents
- ❌ Sensitive user information

---

## Error Response Format

### Standard Error Response

```python
{
    "success": False,
    "error": "Human-readable error message",
    "error_code": "VOICE_MODEL_FAILURE",  # Machine-readable
    "details": {  # Optional, for debugging
        "file": "voice_api.py",
        "line": 42,
        "exception": "RuntimeError: CUDA out of memory"
    },
    "request_id": "abc123",  # For support
    "timestamp": "2024-01-15T10:30:45Z"
}
```

### Error Codes

| Code | Meaning | Status | Action |
|------|---------|--------|--------|
| `INVALID_AUDIO_FORMAT` | Unsupported audio file | 400 | Re-upload correct format |
| `INVALID_IMAGE_FORMAT` | Unsupported image file | 400 | Re-upload correct format |
| `FILE_TOO_LARGE` | File exceeds size limit | 400 | Compress file |
| `AUDIO_TOO_SHORT` | Recording < 1s | 400 | Record longer audio |
| `VOICE_MODEL_FAILURE` | Voice analysis failed | 500 | Retry or contact support |
| `FACE_MODEL_FAILURE` | Face analysis failed | 500 | Retry or contact support |
| `SPOTIFY_AUTH_FAILURE` | Spotify credentials invalid | 502 | Check .env config |
| `SPOTIFY_RATE_LIMIT` | Too many Spotify requests | 429 | Wait and retry |
| `GPU_OOM` | GPU out of memory | 503 | Retry later |
| `SYSTEM_OVERLOAD` | Server overloaded | 503 | Retry later |

---

## Common Issues & Solutions

### Issue 1: "No module named 'torch'"

**Cause:** PyTorch not installed
**Solution:**
```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

---

### Issue 2: "CUDA out of memory"

**Cause:** GPU memory exhausted
**Solutions:**
1. Reduce concurrent requests
2. Use CPU fallback (slower)
3. Upgrade GPU
4. Use model quantization

```python
# Enable CPU fallback
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
```

---

### Issue 3: "Face could not be detected"

**Cause:** Poor lighting, angle, or no face
**Solutions:**
1. System automatically tries lenient mode
2. Falls back to neutral if both fail
3. User should:
   - Improve lighting
   - Face camera directly
   - Remove obstructions

---

### Issue 4: "Spotify authentication failed"

**Cause:** Missing or invalid credentials
**Solution:**
```bash
# Check .env file
cat .env | grep SPOTIFY

# Should see:
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret

# Get credentials from: https://developer.spotify.com/dashboard
```

---

### Issue 5: Slow Response Times

**Causes & Solutions:**

| Cause | Time | Solution |
|-------|------|----------|
| No GPU | +8s | Use GPU-enabled server |
| Large audio file | +2s | Enforce max 10s recording |
| Spotify timeout | +5s | Increase timeout, cache results |
| Network latency | +1s | Use CDN, optimize uploads |

---

## Monitoring & Alerts

### Health Check Endpoint

```python
@app.get("/")
async def health_check():
    """
    Health check endpoint
    
    Returns system status
    """
    # Check GPU
    gpu_available = torch.cuda.is_available()
    gpu_memory = torch.cuda.get_device_properties(0).total_memory if gpu_available else 0
    
    # Check models loaded
    models_loaded = (model is not None) and (processor is not None)
    
    # Check Spotify
    spotify_ok = False
    try:
        spotify_service.get_access_token()
        spotify_ok = True
    except:
        pass
    
    return {
        "status": "healthy" if models_loaded and spotify_ok else "degraded",
        "gpu_available": gpu_available,
        "gpu_memory_mb": gpu_memory / 1024 / 1024,
        "models_loaded": models_loaded,
        "spotify_connected": spotify_ok,
        "version": "1.0.0"
    }
```

### Alerts to Configure

1. **Error rate > 10%** for 5 minutes → Alert
2. **Latency P95 > 10s** → Alert
3. **GPU memory > 90%** → Warning
4. **Spotify auth failures** → Alert
5. **No requests for 1 hour** → Service may be down

---

## Testing Error Handling

### Unit Tests

```python
# tests/test_error_handling.py

def test_invalid_audio_format():
    response = client.post(
        "/analyze-voice",
        files={"audio_file": ("test.txt", b"not audio", "text/plain")}
    )
    assert response.status_code == 400
    assert "Unsupported audio format" in response.json()['error']


def test_file_too_large():
    large_file = b"x" * (11 * 1024 * 1024)  # 11MB
    response = client.post(
        "/analyze-voice",
        files={"audio_file": ("test.wav", large_file, "audio/wav")}
    )
    assert response.status_code == 400
    assert "too large" in response.json()['error']


def test_gpu_oom_fallback():
    # Mock GPU OOM
    with patch('torch.cuda.is_available', return_value=True):
        with patch('model', side_effect=RuntimeError("CUDA out of memory")):
            response = client.post(...)
            # Should fallback to CPU or return 503
            assert response.status_code in [200, 503]
```

---

## Next Steps

- **[Deployment](./10_Deployment.md)** - Running in production
- **[Model Evaluation](./08_Model_Evaluation.md)** - Performance metrics
- **[Overview](./01_Overview.md)** - Back to overview
