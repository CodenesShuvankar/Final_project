# Complete Request Flow

## End-to-End Journey: Multimodal Mood Detection

This document traces a complete request from frontend to backend and back, showing every function call, data transformation, and decision point.

---

## User Action → Final Response

### Timeline

```
T+0.0s  : User clicks "Detect Mood" button
T+0.1s  : Frontend records audio (7 seconds)
T+7.1s  : Audio recording complete
T+7.2s  : Frontend captures image from camera
T+7.3s  : Frontend sends POST request
T+7.4s  : Backend receives request
T+7.5s  : Voice analysis begins
T+8.7s  : Voice analysis complete
T+8.8s  : Face analysis begins
T+9.6s  : Face analysis complete
T+9.7s  : Emotion fusion
T+9.8s  : Spotify recommendation request
T+10.3s : Spotify recommendations received
T+10.4s : Backend sends response
T+10.5s : Frontend displays results
```

**Total Time:** ~10.5 seconds (7s recording + 3.5s processing)

---

## Step-by-Step Flow

### Step 1: Frontend Preparation (T+0.0s - T+7.3s)

#### User Action
```
User → MoodDetectorPanel → "Detect Mood" button clicked
```

#### Frontend Code
```javascript
// Location: front end/src/components/mood/MoodDetectorPanelIntegrated.tsx

const handleDetectMood = async () => {
    setIsDetecting(true);
    
    // Step 1.1: Record audio (7 seconds)
    const audioBlob = await recordAudio(7000);
    // Result: Blob (WebM format, ~100-300KB)
    // Converts to WAV in browser (16kHz mono)
    
    // Step 1.2: Capture image
    const imageBlob = await captureImage();
    // Result: Blob (JPEG format, ~50-150KB, 640x480)
    // Or placeholder if no camera
    
    // Step 1.3: Create FormData
    const formData = new FormData();
    formData.append('audio_file', audioBlob, 'audio.wav');
    formData.append('image_file', imageBlob, 'image.jpg');
    formData.append('limit', '20');
    
    // Step 1.4: Send to backend
    const response = await voiceService.analyzeMultimodal(audioBlob, imageBlob, 20);
}
```

#### HTTP Request
```http
POST http://localhost:8000/analyze-voice-and-face HTTP/1.1
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...
Content-Length: 450000

------WebKitFormBoundary...
Content-Disposition: form-data; name="audio_file"; filename="audio.wav"
Content-Type: audio/wav

<binary audio data ~100-300KB>
------WebKitFormBoundary...
Content-Disposition: form-data; name="image_file"; filename="image.jpg"
Content-Type: image/jpeg

<binary image data ~50-150KB>
------WebKitFormBoundary...
Content-Disposition: form-data; name="limit"

20
------WebKitFormBoundary...--
```

---

### Step 2: Backend Receives Request (T+7.4s)

#### FastAPI Endpoint
```python
# Location: BackEnd/server_api.py

@app.post("/analyze-voice-and-face")
async def analyze_voice_and_face(
    audio_file: UploadFile = File(...),
    image_file: UploadFile = File(...),
    limit: int = 20
):
    logger.info("🎭 Starting multimodal emotion analysis...")
    
    # Validate file types
    audio_ext = Path(audio_file.filename).suffix.lower()
    if audio_ext not in ['.wav', '.mp3', '.m4a', ...]:
        return {"success": False, "error": "Unsupported audio format"}
    
    image_ext = Path(image_file.filename).suffix.lower()
    if image_ext not in ['.jpg', '.jpeg', '.png']:
        return {"success": False, "error": "Unsupported image format"}
    
    # Continue to voice analysis...
```

---

### Step 3: Voice Analysis (T+7.5s - T+8.7s)

#### Function Call Chain
```
server_api.py → voice_api.analyze_audio_upload()
    ↓
voice_api.py → preprocess_audio()
    ↓
soundfile.read() → Load audio
librosa.resample() → 16kHz
Wav2Vec2Processor → Tokenize
Wav2Vec2Model → Inference
torch.softmax() → Probabilities
```

#### Detailed Execution

**Step 3.1: Create Temporary File**
```python
# server_api.py
logger.info("🎤 Analyzing voice emotion...")
voice_result = voice_api.analyze_audio_upload(audio_file, model_path)
```

**Step 3.2: Preprocess Audio**
```python
# voice_api.py → analyze_audio_upload()
import tempfile
with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp:
    content = await audio_file.read()
    tmp.write(content)
    temp_path = tmp.name
# temp_path: '/tmp/tmpxyz123.wav'

# Preprocess
audio = preprocess_audio(temp_path)
# audio: numpy array, shape (112000,), dtype float32
# 7 seconds * 16000 Hz = 112000 samples
```

**Step 3.3: Tokenize**
```python
inputs = processor(
    audio,
    sampling_rate=16000,
    return_tensors="pt",
    padding=True
)
input_values = inputs.input_values.to(device)
# input_values: torch.Tensor, shape (1, 112000)
```

**Step 3.4: Model Inference**
```python
with torch.no_grad():
    logits = model(input_values).logits
# logits: torch.Tensor, shape (1, 7)
# Raw scores: [-2.1, 0.5, -1.3, 3.2, -0.8, -1.5, -2.0]
```

**Step 3.5: Get Probabilities**
```python
probabilities = F.softmax(logits, dim=-1)[0].cpu().numpy()
# probabilities: [0.01, 0.05, 0.03, 0.87, 0.01, 0.01, 0.02]
# Sum to 1.0

emotion_labels = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise']
predicted_idx = probabilities.argmax()  # 3
predicted_emotion = emotion_labels[predicted_idx]  # 'happy'
confidence = probabilities[predicted_idx]  # 0.87
```

**Step 3.6: Return Result**
```python
return {
    "success": True,
    "prediction": {
        "emotion": "happy",
        "confidence": 0.87,
        "all_emotions": {
            "angry": 0.01,
            "disgust": 0.05,
            "fear": 0.03,
            "happy": 0.87,
            "neutral": 0.01,
            "sad": 0.01,
            "surprise": 0.02
        }
    }
}
```

**Voice Analysis Complete:** 1.2 seconds

---

### Step 4: Face Analysis (T+8.8s - T+9.6s)

#### Function Call Chain
```
server_api.py → face_expression.detect_expression()
    ↓
cv2.imread() → Load image
cv2.cvtColor() → Grayscale
img.std() → Check placeholder
DeepFace.analyze() → Tier 1 (strict)
    ↓ (if fails)
DeepFace.analyze() → Tier 2 (lenient)
    ↓ (if fails)
Return neutral fallback
```

#### Detailed Execution

**Step 4.1: Create Temporary Image File**
```python
# server_api.py
logger.info("📸 Analyzing facial expression...")

with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
    await image_file.seek(0)
    content = await image_file.read()
    tmp.write(content)
    temp_path = tmp.name
# temp_path: '/tmp/tmpimg456.jpg'
```

**Step 4.2: Read and Check Image**
```python
# face_expression.py → detect_expression()
img = cv2.imread(temp_path)
# img: numpy array, shape (480, 640, 3), dtype uint8

# Check if placeholder (no camera)
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
std_dev = gray.std()
# std_dev: 85.3 (complex image, not placeholder)

if std_dev < 10:
    # Would return neutral fallback, but std_dev is 85.3
    pass
```

**Step 4.3: Tier 1 - Strict Detection**
```python
try:
    results = DeepFace.analyze(
        img_path=temp_path,
        actions=['emotion'],
        enforce_detection=True,
        detector_backend='opencv'
    )
    # Success! Face detected
except ValueError:
    # Would try Tier 2, but succeeded
    pass
```

**Step 4.4: Process Results**
```python
# results structure
[{
    'emotion': {
        'angry': 12.5,
        'disgust': 2.1,
        'fear': 5.3,
        'happy': 78.0,
        'neutral': 1.2,
        'sad': 0.5,
        'surprise': 0.4
    },
    'dominant_emotion': 'happy',
    'region': {'x': 120, 'y': 80, 'w': 200, 'h': 200}
}]

# Extract and normalize
emotions = results[0]['emotion']
total = sum(emotions.values())  # 100.0
all_emotions = {k.lower(): v/total for k, v in emotions.items()}
# Result:
{
    'happy': 0.78,
    'angry': 0.125,
    'fear': 0.053,
    'disgust': 0.021,
    'neutral': 0.012,
    'sad': 0.005,
    'surprise': 0.004
}

dominant = results[0]['dominant_emotion'].lower()  # 'happy'
confidence = all_emotions[dominant]  # 0.78
```

**Step 4.5: Cleanup and Return**
```python
# server_api.py
finally:
    try:
        os.unlink(temp_path)
    except:
        pass

# face_expression.py returns
return {
    "success": True,
    "emotion": "happy",
    "confidence": 0.78,
    "all_emotions": {
        "happy": 0.78,
        "angry": 0.125,
        "fear": 0.053,
        "disgust": 0.021,
        "neutral": 0.012,
        "sad": 0.005,
        "surprise": 0.004
    }
}
```

**Face Analysis Complete:** 0.8 seconds

---

### Step 5: Emotion Fusion (T+9.7s)

#### Function Call Chain
```
server_api.py → emotion_fusion.merge_emotions()
    ↓
get_emotion_agreement() → "strong"
get_confidence_weights() → (0.55, 0.45)
Choose final emotion → "happy"
Combine all emotions → weighted average
Generate explanation
```

#### Detailed Execution

**Step 5.1: Call Merge Function**
```python
# server_api.py
logger.info("🔀 Merging voice and face predictions...")

merged_result = emotion_fusion.merge_emotions(
    voice_emotion="happy",
    voice_confidence=0.87,
    voice_all_emotions={
        "happy": 0.87, "disgust": 0.05, "fear": 0.03,
        "surprise": 0.02, "angry": 0.01, "neutral": 0.01, "sad": 0.01
    },
    face_emotion="happy",
    face_confidence=0.78,
    face_all_emotions={
        "happy": 0.78, "angry": 0.125, "fear": 0.053,
        "disgust": 0.021, "neutral": 0.012, "sad": 0.005, "surprise": 0.004
    }
)
```

**Step 5.2: Determine Agreement**
```python
# emotion_fusion.py → get_emotion_agreement()
if voice_emotion == face_emotion:
    agreement = "strong"
# Result: "strong" (both say "happy")
```

**Step 5.3: Calculate Weights**
```python
# emotion_fusion.py → get_confidence_weights()
voice_weight = 0.6  # Base
face_weight = 0.4

# Adjustment: Strong agreement → balance more evenly
if agreement == "strong":
    voice_weight = 0.55
    face_weight = 0.45

# Result: (0.55, 0.45)
```

**Step 5.4: Choose Final Emotion**
```python
# Strong agreement case
final_emotion = voice_emotion  # "happy"
final_confidence = (voice_confidence + face_confidence) / 2
# final_confidence = (0.87 + 0.78) / 2 = 0.825
```

**Step 5.5: Combine All Emotions**
```python
combined_emotions = {}
for emotion in all_emotion_keys:
    voice_score = voice_all_emotions.get(emotion, 0)
    face_score = face_all_emotions.get(emotion, 0)
    
    combined_emotions[emotion] = (
        voice_score * 0.55 +
        face_score * 0.45
    )

# Result:
{
    "happy": (0.87 * 0.55) + (0.78 * 0.45) = 0.8295,
    "angry": (0.01 * 0.55) + (0.125 * 0.45) = 0.0618,
    "disgust": (0.05 * 0.55) + (0.021 * 0.45) = 0.0370,
    "fear": (0.03 * 0.55) + (0.053 * 0.45) = 0.0404,
    ...
}
# Normalized to sum to 1.0
```

**Step 5.6: Generate Explanation**
```python
explanation = "Voice and face predictions agree strongly on happy emotion. " \
              "The high confidence from both modalities (voice: 87%, face: 78%) " \
              "results in a robust merged prediction of happy with 82.5% confidence."
```

**Step 5.7: Return Merged Result**
```python
return {
    "final_emotion": "happy",
    "confidence": 0.825,
    "agreement": "strong",
    "voice_weight": 0.55,
    "face_weight": 0.45,
    "all_combined_emotions": {...},
    "voice_prediction": {...},
    "face_prediction": {...},
    "explanation": explanation
}
```

**Fusion Complete:** 0.1 seconds

---

### Step 6: Get Summary (T+9.8s)

```python
# server_api.py
summary = emotion_fusion.get_fusion_summary(merged_result)
# Result: "Strong agreement: Both voice and face indicate happy with high confidence"
```

---

### Step 7: Map to Spotify Mood (T+9.8s)

```python
# server_api.py
recommendation_emotion = emotion_fusion.get_recommendation_emotion(merged_result)
# Input: "happy"
# Output: "happy" (direct mapping)

# Mappings:
# happy → happy
# sad → sad
# angry → angry
# fear → calm (opposite for soothing)
# surprise → energetic
# disgust → neutral
# neutral → neutral
```

---

### Step 8: Get Spotify Recommendations (T+9.8s - T+10.3s)

#### Function Call Chain
```
server_api.py → spotify_service.get_mood_recommendations()
    ↓
get_access_token() → Check cache or request new
requests.get() → Spotify recommendations API
Parse response → Format tracks
```

#### Detailed Execution

**Step 8.1: Call Spotify Service**
```python
# server_api.py
logger.info(f"🎵 Getting recommendations for: {recommendation_emotion}")

recommendations = spotify_service.get_mood_recommendations(
    recommendation_emotion,
    limit=20
)
```

**Step 8.2: Get Access Token**
```python
# spotify_service.py → get_access_token()
current_time = time.time()
if self.token and current_time < self.token_expires:
    return self.token  # Use cached token (instant)

# If expired, request new token
# POST to https://accounts.spotify.com/api/token
# Result: New token cached (~200ms)
```

**Step 8.3: Build API Request**
```python
# spotify_service.py → get_mood_recommendations()
mood_features = MOOD_TO_AUDIO_FEATURES['happy']
# {
#     'valence': (0.6, 1.0),
#     'energy': (0.6, 1.0),
#     'danceability': (0.5, 1.0),
#     'genres': ['pop', 'dance', 'party', 'happy']
# }

params = {
    'seed_genres': 'pop,dance,party,happy',
    'target_valence': 0.8,  # Average of (0.6, 1.0)
    'target_energy': 0.8,
    'target_danceability': 0.75,
    'limit': 20
}

headers = {"Authorization": f"Bearer {self.token}"}
url = "https://api.spotify.com/v1/recommendations"

response = requests.get(url, headers=headers, params=params)
```

**Step 8.4: Parse Response**
```python
data = response.json()
# data['tracks']: Array of 20 tracks

tracks = []
for track in data['tracks']:
    tracks.append({
        "id": track['id'],
        "name": track['name'],
        "artists": [artist['name'] for artist in track['artists']],
        "album": track['album']['name'],
        "image": track['album']['images'][0]['url'],
        "preview_url": track['preview_url'],
        "uri": track['uri'],
        "external_url": track['external_urls']['spotify']
    })

return tracks
```

**Spotify Request Complete:** 0.5 seconds

---

### Step 9: Build Final Response (T+10.3s)

```python
# server_api.py
return {
    "success": True,
    "analysis": {
        "merged_emotion": merged_result['final_emotion'],  # "happy"
        "merged_confidence": merged_result['confidence'],  # 0.825
        "agreement": merged_result['agreement'],  # "strong"
        "voice_weight": merged_result['voice_weight'],  # 0.55
        "face_weight": merged_result['face_weight'],  # 0.45
        "voice_prediction": {
            "emotion": "happy",
            "confidence": 0.87,
            "all_emotions": {...}
        },
        "face_prediction": {
            "emotion": "happy",
            "confidence": 0.78,
            "all_emotions": {...}
        },
        "all_combined_emotions": merged_result['all_combined_emotions'],
        "summary": summary,
        "explanation": merged_result['explanation']
    },
    "recommendations": recommendations  # 20 tracks
}
```

---

### Step 10: Frontend Displays Results (T+10.4s - T+10.5s)

```javascript
// front end/src/components/mood/MoodDetectorPanelIntegrated.tsx

if (result.success && result.analysis) {
    // Set analysis state
    setAnalysis(result.analysis);
    // Display: 😊 HAPPY (82.5% confident, STRONG agreement)
    
    // Set recommendations
    setRecommendations(result.recommendations);
    // Display: Grid of 20 songs with play buttons
    
    // Call parent callback
    onMoodDetected?.(result.analysis.merged_emotion, result.analysis);
    
    // Log success
    console.log('✅ Analysis complete:', result.analysis.summary);
}
```

---

## Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (React/Next.js)                                         │
│ ┌─────────────┐   ┌──────────────┐   ┌─────────────────────┐   │
│ │ User clicks │ → │ Record audio │ → │ Capture image       │   │
│ │ "Detect"    │   │ 7 seconds    │   │ from camera/create  │   │
│ │             │   │ (16kHz WAV)  │   │ placeholder         │   │
│ └─────────────┘   └──────────────┘   └─────────────────────┘   │
│                                                 ↓                 │
│                                   ┌─────────────────────────┐   │
│                                   │ FormData with:          │   │
│                                   │ - audio_file (Blob)     │   │
│                                   │ - image_file (Blob)     │   │
│                                   │ - limit (20)            │   │
│                                   └─────────────────────────┘   │
└────────────────────────────────────────┬────────────────────────┘
                                         │ HTTP POST
                                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND (FastAPI/Python)                                         │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ server_api.py: /analyze-voice-and-face endpoint            │  │
│ │ 1. Validate file types                                      │  │
│ │ 2. Create temp files                                        │  │
│ └────────────┬────────────────────────┬──────────────────────┘  │
│              ↓                        ↓                          │
│    ┌──────────────────┐     ┌──────────────────┐               │
│    │ VOICE ANALYSIS   │     │ FACE ANALYSIS    │               │
│    │ voice_api.py     │     │ face_expression  │               │
│    │                  │     │                  │               │
│    │ 1. Load audio    │     │ 1. Load image    │               │
│    │ 2. Resample      │     │ 2. Check placeholder              │
│    │ 3. Tokenize      │     │ 3. Detect face   │               │
│    │ 4. Wav2Vec2      │     │ 4. DeepFace      │               │
│    │ 5. Softmax       │     │ 5. Normalize     │               │
│    │                  │     │                  │               │
│    │ Result: happy    │     │ Result: happy    │               │
│    │ (0.87)           │     │ (0.78)           │               │
│    └──────────┬───────┘     └────────┬─────────┘               │
│               └──────────┬───────────┘                          │
│                          ↓                                       │
│              ┌──────────────────────┐                           │
│              │ EMOTION FUSION       │                           │
│              │ emotion_fusion.py    │                           │
│              │                      │                           │
│              │ 1. Get agreement     │ → "strong"                │
│              │ 2. Calc weights      │ → (0.55, 0.45)            │
│              │ 3. Choose emotion    │ → "happy"                 │
│              │ 4. Combine scores    │ → weighted avg            │
│              │ 5. Explain           │ → summary                 │
│              │                      │                           │
│              │ Result: happy (0.825)│                           │
│              └──────────┬───────────┘                           │
│                         ↓                                        │
│              ┌──────────────────────┐                           │
│              │ SPOTIFY SERVICE      │                           │
│              │ spotify_service.py   │                           │
│              │                      │                           │
│              │ 1. Get token         │                           │
│              │ 2. Map mood → params │ → valence, energy, etc.   │
│              │ 3. API request       │ → /recommendations        │
│              │ 4. Parse tracks      │ → 20 tracks               │
│              │                      │                           │
│              │ Result: [20 tracks]  │                           │
│              └──────────┬───────────┘                           │
│                         ↓                                        │
│              ┌──────────────────────┐                           │
│              │ BUILD RESPONSE       │                           │
│              │ {                    │                           │
│              │   success: true,     │                           │
│              │   analysis: {...},   │                           │
│              │   recommendations:.. │                           │
│              │ }                    │                           │
│              └──────────┬───────────┘                           │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP Response (JSON)
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (React/Next.js)                                         │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ Display Results:                                          │   │
│ │ - Emoji: 😊                                               │   │
│ │ - Emotion: HAPPY                                          │   │
│ │ - Confidence: 82.5%                                       │   │
│ │ - Agreement: STRONG                                       │   │
│ │ - Voice: happy (87%)                                      │   │
│ │ - Face: happy (78%)                                       │   │
│ │ - Music: Grid of 20 songs with play buttons              │   │
│ └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Alternative Scenarios

### Scenario 1: No Camera (Placeholder)

**Changes in Flow:**
- Step 1: Frontend creates placeholder image
- Step 4.2: `std_dev < 10` → Return neutral (0.3)
- Step 5.2: Agreement = "weak"
- Step 5.3: Weights = (0.85, 0.15) - voice dominant

**Result:** Voice-driven emotion with neutral face support

---

### Scenario 2: Conflict (Voice happy, Face sad)

**Changes in Flow:**
- Step 5.2: Agreement = "conflict"
- Step 5.3: Weights = (0.7, 0.3) if voice higher confidence
- Step 5.4: Choose higher confidence emotion
- Step 5.6: Explanation mentions conflict resolution

**Result:** Higher confidence emotion wins, slight penalty

---

### Scenario 3: Both Low Confidence

**Changes in Flow:**
- Voice: 0.55, Face: 0.48
- Step 5.3: Weights remain base (0.6, 0.4)
- Step 5.4: Voice chosen (slightly higher)
- Final confidence: ~0.52 (lower overall)

**Result:** System still returns result but with lower confidence

---



**Key Insight:** 67% of time is user recording, 32% is processing

---

## Next Steps

- **[Model Evaluation](./08_Model_Evaluation.md)** - Performance metrics
- **[Error Handling](./09_Error_Handling.md)** - Error management
- **[Deployment](./10_Deployment.md)** - Running in production
