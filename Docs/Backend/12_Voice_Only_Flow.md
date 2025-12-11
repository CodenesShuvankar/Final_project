# Voice-Only Analysis Flow Documentation

## Complete Flow: Audio-Only Input Processing

This document traces the complete execution path when **only audio/voice** is sent as input (no video/face data).

---

## 📋 Flow Overview

```
Frontend → Backend API → Voice Model → Database → Response
```

---

## 🔄 Detailed Step-by-Step Flow

### **1. FRONTEND - Auto Mood Detection Service**
**File**: `Frontend/src/lib/services/autoMoodDetection.ts`

#### Entry Point: `autoDetectMood()`
- **Lines 46-120**: Captures media (camera + microphone)
- **Lines 165-190**: Records audio for 10 seconds
  - Creates `MediaRecorder` with `audio/webm` format
  - Converts WebM to WAV format (16kHz, mono)
  - Creates `audioBlob` (Blob object)

#### Audio Analysis Call
- **Line 221**: Calls `analyzeAudio(audioBlob)` when only audio is available
  ```typescript
  result = await this.voiceService.analyzeAudio(audioBlob);
  ```

---

### **2. FRONTEND - Voice Emotion Service**
**File**: `Frontend/src/lib/services/voiceEmotion.ts`

#### Method: `analyzeAudio(audioBlob)`
- **Line 259-290**: Audio-only analysis wrapper
  ```typescript
  async analyzeAudio(audioBlob: Blob): Promise<MultimodalResult> {
    const voiceResult = await this.analyzeVoiceEmotion(audioBlob)
    // Creates minimal multimodal analysis from voice-only data
  }
  ```

#### Method: `analyzeVoiceEmotion(audioBlob)`
- **Lines 56-125**: Makes HTTP POST request to backend
  - **Endpoint**: `POST http://localhost:8000/analyze-voice`
  - **FormData**: 
    - Key: `audio_file`
    - Value: `audioBlob` (Blob)
    - Filename: `recording.wav`
  - **Headers**: 
    - `Authorization: Bearer <token>` (if authenticated)
  - **Content-Type**: `multipart/form-data`

```typescript
const formData = new FormData()
formData.append('audio_file', audioBlob, 'recording.wav')

const response = await fetch(`${apiUrl}/analyze-voice`, {
  method: 'POST',
  headers,
  body: formData,
})
```

---

### **3. BACKEND - API Endpoint**
**File**: `Backend/server_api.py`

#### Endpoint: `/analyze-voice`
- **Line 217**: Route definition
  ```python
  @app.post("/analyze-voice")
  async def analyze_voice(
      audio_file: UploadFile = File(...),
      authorization: Optional[str] = Header(None)
  ):
  ```

#### Authentication (Optional)
- **Lines 232-240**: Extracts and verifies JWT token
  ```python
  if authorization and authorization.startswith('Bearer '):
      token = authorization.split(' ')[1]
      user_data = verify_supabase_token(token)
      user_id = user_data.get('sub')
  ```

#### File Validation
- **Lines 242-249**: Validates audio file extension
  - Allowed: `.wav`, `.mp3`, `.m4a`, `.flac`, `.opus`, `.webm`, `.ogg`
  ```python
  allowed_extensions = ['.wav', '.mp3', '.m4a', '.flac', '.opus', '.webm', '.ogg']
  file_ext = Path(audio_file.filename).suffix.lower()
  ```

#### Voice Analysis Call
- **Line 253**: Calls voice model wrapper
  ```python
  result = voice_api.analyze_audio_upload(
      audio_file, 
      model_path, 
      checkpoint_path=None
  )
  ```
  - `model_path` = `"Backend/voice_model/final_voice_model"` (Wav2Vec2 model)
  - `checkpoint_path` = `None` (no fusion checkpoint needed)

#### Database Storage (If Authenticated)
- **Lines 256-275**: Stores result in `moodanalysis` table
  ```python
  await db.moodanalysis.create(
      data={
          "user_id": user_id,
          "detected_mood": emotion,
          "confidence": confidence,
          "voice_emotion": emotion,
          "voice_confidence": confidence,
          "analysis_type": "voice",
          "created_at": datetime.utcnow()
      }
  )
  ```

---

### **4. BACKEND - Voice Model API**
**File**: `Backend/voice_model/voice_api.py`

#### Function: `analyze_audio_upload(upload_file, model_path, checkpoint_path)`
- **Line 422**: Entry point for audio analysis
  ```python
  def analyze_audio_upload(upload_file, model_path_or_repo: str, 
                           checkpoint_path: Optional[str] = None) -> Dict:
  ```

#### Step 4.1: Load Model
- **Line 435**: Calls `load_model()`
  ```python
  model, processor = load_model(model_path_or_repo, checkpoint_path)
  ```

**Function: `load_model(model_path, checkpoint_path)`**
- **Lines 43-98**: Loads Wav2Vec2ForSequenceClassification model
  - Uses cached model if available (`_model_cache`)
  - Loads from `"Backend/voice_model/final_voice_model"`
    - `config.json`
    - `model.safetensors` (Wav2Vec2 weights)
    - `preprocessor_config.json`
  - **NO FUSION CHECKPOINT** loaded (checkpoint_path=None)
  
  ```python
  model = Wav2Vec2ForSequenceClassification.from_pretrained(
      model_path_or_repo,
      num_labels=7,  # 7 emotions
      problem_type="single_label_classification"
  )
  processor = Wav2Vec2Processor.from_pretrained(model_path_or_repo)
  ```

#### Step 4.2: Load Audio from Upload
- **Line 438**: Calls `load_audio_from_upload()`
  ```python
  audio_data = load_audio_from_upload(upload_file)
  ```

**Function: `load_audio_from_upload(upload_file)`**
- **Lines 186-225**: Processes uploaded file
  1. **Line 199**: Reads file bytes (`upload_file.file.read()`)
     - Your case: 79,437 bytes from `recording.wav` (audio/webm)
  2. **Lines 207-209**: Saves to temporary file
     ```python
     with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
         tmp_file.write(content)
         tmp_path = tmp_file.name
     ```
     - Your case: `C:\Users\shuva\AppData\Local\Temp\tmp2mnvyr_l.wav`
  3. **Line 213**: Loads audio via `load_audio_file(tmp_path)`

**Function: `load_audio_file(file_path)`**
- **Lines 133-151**: Loads and processes audio
  ```python
  audio_data, sample_rate = librosa.load(file_path, sr=16000, mono=True)
  audio_data = process_audio(audio_data, sample_rate)
  ```
  - Uses `librosa` to load audio
  - Converts to 16kHz mono
  - Your case: 78,720 samples (4.92 seconds of audio)

**Function: `process_audio(audio_data, sample_rate)`**
- **Lines 104-122**: Audio preprocessing
  ```python
  # Convert stereo → mono
  if len(audio_data.shape) > 1:
      audio_data = np.mean(audio_data, axis=1)
  
  # Resample to 16kHz
  if sample_rate != 16000:
      audio_data = librosa.resample(audio_data, orig_sr=sample_rate, target_sr=16000)
  
  # Normalize amplitude
  audio_data = librosa.util.normalize(audio_data)
  ```

#### Step 4.3: Predict Emotion
- **Line 441**: Calls `predict_emotion()`
  ```python
  emotion, confidence, all_emotions, quality = predict_emotion(
      audio_data, model, processor
  )
  ```

**Function: `predict_emotion(audio_data, model, processor)`**
- **Lines 252-330**: Core emotion prediction logic

1. **Audio Length Check** (Lines 268-276)
   ```python
   if len(audio_data) < sr * 0.25:  # < 250ms
       return "neutral", 0.2, {...}, {...}
   ```
   - Your case: 78,720 samples = 4.92s ✅ (passed)

2. **Audio Quality Assessment** (Lines 278-284)
   ```python
   quality = assess_audio_quality(audio_data, sr=16000)
   ```
   - Your results:
     - `rms=0.0888` (amplitude strength)
     - `peak=1.0000` (max amplitude)
     - `zcr=0.100` (zero crossing rate)
     - `centroid=1351.6Hz` (spectral centroid)
     - `speech_ratio=0.96` (energy in 85-4000Hz band)

**Function: `assess_audio_quality(audio_data, sr)`**
- **Lines 229-251**: Calculates audio metrics
  ```python
  rms = np.sqrt(np.mean(audio_data ** 2))
  peak = np.max(np.abs(audio_data))
  zcr = librosa.feature.zero_crossing_rate(audio_data)[0].mean()
  centroid = librosa.feature.spectral_centroid(y=audio_data, sr=sr)[0].mean()
  
  # Energy in speech band (85-4000 Hz)
  spectrum = np.abs(np.fft.rfft(audio_data))
  freqs = np.fft.rfftfreq(len(audio_data), 1.0 / sr)
  speech_band = (freqs >= 85) & (freqs <= 4000)
  speech_ratio = spectrum[speech_band].sum() / spectrum.sum()
  ```

3. **Low-Information Check** (Lines 286-299)
   ```python
   # Relaxed thresholds (updated to allow emotional speech)
   too_quiet = quality["rms"] < 0.05 or quality["peak"] < 0.15
   low_speech_band = quality["speech_ratio"] < 0.05
   no_variation = quality["zcr"] < 0.01 or quality["centroid"] < 80.0
   
   if too_quiet or low_speech_band or no_variation:
       logger.warning("Audio flagged as low-information; returning neutral fallback")
       return "neutral", 0.25, {...}, quality
   ```
   - Your case: **PASSED** ✅ (rms=0.0888 > 0.05, peak=1.0 > 0.15, speech_ratio=0.96 > 0.05)

4. **Model Inference** (Lines 301-315)
   ```python
   # Prepare inputs
   inputs = processor(
       audio_data,
       sampling_rate=16000,
       return_tensors="pt",
       padding=True,
       max_length=160000,
       truncation=True
   )
   
   # Run Wav2Vec2 model
   with torch.no_grad():
       outputs = model(**inputs)
       logits = outputs.logits
       probs = torch.nn.functional.softmax(logits, dim=-1)[0]
   ```

5. **Extract Predictions** (Lines 320-328)
   ```python
   predicted_id = np.argmax(probs)
   predicted_emotion = model.config.id2label[predicted_id]
   confidence = float(probs[predicted_id])
   
   all_emotions = {
       model.config.id2label[i]: float(probs[i]) 
       for i in range(len(probs))
   }
   ```
   - Your result: `emotion="happy"`, `confidence=0.1481` (14.81%)

#### Step 4.4: Return Result
- **Lines 443-457**: Package result dictionary
  ```python
  return {
      "success": True,
      "prediction": {
          "emotion": emotion,              # "happy"
          "confidence": confidence,        # 0.1481
          "all_emotions": all_emotions,    # {happy: 0.1481, sad: 0.12, ...}
          "emoji": get_emotion_emoji(emotion),        # "😊"
          "color": get_emotion_color(emotion),        # "#10B981"
          "description": get_emotion_description(emotion),
          "quality": quality               # {rms, peak, zcr, centroid, speech_ratio}
      }
  }
  ```

---

### **5. BACKEND - Database Storage**
**File**: `Backend/server_api.py`

- **Lines 256-275**: Stores in `moodanalysis` table via Prisma
  ```python
  await db.moodanalysis.create(
      data={
          "user_id": "b5439da3-ef27-4100-a505-28bc1c806723",
          "detected_mood": "happy",
          "confidence": 0.1481,
          "voice_emotion": "happy",
          "voice_confidence": 0.1481,
          "analysis_type": "voice",
          "created_at": datetime.utcnow()
      }
  )
  ```

- **Log Output**:
  ```
  INFO:server_api:📝 Stored voice mood analysis for user b5439da3-...: happy (14.81%)
  ```

---

### **6. BACKEND - Response**
**File**: `Backend/server_api.py`

- **Line 277**: Returns result to frontend
  ```python
  return result  # Same dict from voice_api.analyze_audio_upload()
  ```

**Response JSON**:
```json
{
  "success": true,
  "prediction": {
    "emotion": "happy",
    "confidence": 0.1481,
    "all_emotions": {
      "happy": 0.1481,
      "sad": 0.12,
      "neutral": 0.18,
      "angry": 0.10,
      "fear": 0.09,
      "disgust": 0.08,
      "surprise": 0.11
    },
    "emoji": "😊",
    "color": "#10B981",
    "description": "Feeling positive and cheerful",
    "quality": {
      "rms": 0.0888,
      "peak": 1.0000,
      "zcr": 0.100,
      "centroid": 1351.6,
      "speech_ratio": 0.96
    }
  }
}
```

---

### **7. FRONTEND - Process Response**
**File**: `Frontend/src/lib/services/voiceEmotion.ts`

#### Method: `analyzeVoiceEmotion()` - Lines 75-125
```typescript
const data = await response.json()

if (!response.ok) {
  throw new Error(data.error || `Backend returned ${response.status}`)
}

return {
  success: data.success,
  prediction: data.prediction,
  analysisId: data.analysisId,
}
```

#### Method: `analyzeAudio()` - Lines 259-290
- Wraps voice result into multimodal format
```typescript
const analysis: MultimodalAnalysis = {
  merged_emotion: "happy",
  merged_confidence: 0.1481,
  agreement: 'strong',
  summary: "Voice-only analysis detected happy emotion",
  explanation: "Analysis based on voice characteristics only. No video data available.",
  voice_prediction: voiceResult.prediction,
  face_prediction: { emotion: 'unknown', confidence: 0 },
  fusion_used: false,
}

return {
  success: true,
  prediction: voiceResult.prediction,
  analysisId: voiceResult.analysisId,
  analysis,
  recommendations: generateRecommendations('happy'),
}
```

---

### **8. FRONTEND - Display Result**
**File**: `Frontend/src/components/mood/AutoMoodDetector.tsx`

- **Lines 82-97**: Updates UI state
  ```typescript
  if (result.success && result.mood) {
    setDetectedMood('happy')
    
    // Create audio URL for playback
    if (result.audioBlob) {
      const url = URL.createObjectURL(result.audioBlob)
      setAudioUrl(url)
    }
    
    // Dispatch event to other components
    window.dispatchEvent(new CustomEvent('moodUpdated', { 
      detail: { mood: 'happy' } 
    }))
  }
  ```

- **Lines 270-311**: Renders notification card
  - Shows emoji: 😊
  - Shows text: "You seem happy!"
  - Shows audio player with recorded audio

---

## 🎯 Key Points Summary

### Models Used (Voice-Only Path)
1. ✅ **Wav2Vec2ForSequenceClassification** - Voice emotion detection
   - Location: `Backend/voice_model/final_voice_model/model.safetensors`
   - Input: 16kHz mono WAV audio
   - Output: 7-class emotion probabilities

2. ❌ **NeuroSyncFusion** - NOT used in voice-only path
   - Location: `Backend/voice_model/last_checkpoint.pth`
   - Only used when both video AND audio are present
   - Requires face landmarks + audio features

### Audio Quality Checks
- **RMS threshold**: > 0.05 (your audio: 0.0888 ✅)
- **Peak threshold**: > 0.15 (your audio: 1.0000 ✅)
- **Speech ratio**: > 0.05 (your audio: 0.96 ✅)
- **Zero crossing rate**: > 0.01 (your audio: 0.100 ✅)
- **Spectral centroid**: > 80Hz (your audio: 1351.6Hz ✅)

### Database Fields (Voice-Only)
```sql
INSERT INTO moodanalysis (
  user_id,
  detected_mood,        -- "happy"
  confidence,           -- 0.1481
  voice_emotion,        -- "happy"
  voice_confidence,     -- 0.1481
  face_emotion,         -- NULL (no face data)
  face_confidence,      -- NULL
  analysis_type,        -- "voice"
  created_at
)
```

### No Fusion Model in Voice-Only
- `checkpoint_path=None` passed to `load_model()`
- Only loads Wav2Vec2 model from `final_voice_model/`
- Fusion model (`last_checkpoint.pth`) is only loaded when both audio AND video are present
- Endpoint used: `/analyze-voice` (not `/analyze-voice-and-face` or `/analyze`)

---

## 📊 Your Log Output Analysis

```
INFO:voice_model.voice_api:Processing uploaded file: recording.wav, type: audio/webm
```
→ Frontend sent WebM audio (browser recording format)

```
INFO:voice_model.voice_api:Read 79437 bytes from upload
```
→ ~79KB audio file

```
INFO:voice_model.voice_api:Saved to temporary file: C:\Users\shuva\AppData\Local\Temp\tmp2mnvyr_l.wav
```
→ Saved to temp location for librosa processing

```
INFO:voice_model.voice_api:Audio uploaded successfully: recording.wav, shape: (78720,)
```
→ 78,720 samples at 16kHz = 4.92 seconds of audio

```
INFO:voice_model.voice_api:Audio quality → rms=0.0888 peak=1.0000 zcr=0.100 centroid=1351.6Hz speech_ratio=0.96
```
→ Passed all quality checks (speech_ratio=0.96 is excellent!)

```
INFO:voice_model.voice_api:Emotion predicted: happy (confidence: 0.1481)
```
→ Wav2Vec2 model predicted "happy" with 14.81% confidence

```
INFO:server_api:📝 Stored voice mood analysis for user b5439da3-...: happy (14.81%)
```
→ Result saved to database successfully

---

## 🔧 File Function Call Chain

```
Frontend/src/lib/services/autoMoodDetection.ts
  └─ autoDetectMood()
       └─ voiceService.analyzeAudio(audioBlob)

Frontend/src/lib/services/voiceEmotion.ts
  └─ analyzeAudio(audioBlob)
       └─ analyzeVoiceEmotion(audioBlob)
            └─ fetch('POST /analyze-voice', formData)

Backend/server_api.py
  └─ @app.post("/analyze-voice")
       └─ voice_api.analyze_audio_upload(upload_file, model_path, checkpoint_path=None)

Backend/voice_model/voice_api.py
  └─ analyze_audio_upload(upload_file, model_path, checkpoint_path)
       ├─ load_model(model_path, checkpoint_path=None)
       │    └─ Wav2Vec2ForSequenceClassification.from_pretrained()
       ├─ load_audio_from_upload(upload_file)
       │    ├─ upload_file.file.read()
       │    ├─ save to tempfile
       │    ├─ load_audio_file(tmp_path)
       │    │    ├─ librosa.load(file_path, sr=16000, mono=True)
       │    │    └─ process_audio(audio_data, sample_rate)
       │    │         ├─ convert to mono
       │    │         ├─ resample to 16kHz
       │    │         └─ normalize amplitude
       │    └─ return numpy array
       └─ predict_emotion(audio_data, model, processor)
            ├─ assess_audio_quality(audio_data)
            │    ├─ calculate RMS, peak, ZCR, centroid
            │    └─ calculate speech_ratio (85-4000Hz energy)
            ├─ quality checks (too_quiet, low_speech_band, no_variation)
            ├─ processor(audio_data, sampling_rate=16000)
            ├─ model(**inputs) → Wav2Vec2 inference
            ├─ softmax(logits) → probabilities
            └─ return (emotion, confidence, all_emotions, quality)

Backend/server_api.py
  └─ db.moodanalysis.create(data={...})
       └─ Store in PostgreSQL via Prisma

Frontend/src/lib/services/voiceEmotion.ts
  └─ Return result to autoMoodDetection.ts

Frontend/src/components/mood/AutoMoodDetector.tsx
  └─ Display notification with mood and audio player
```

---

## ✅ Conclusion

**Voice-only flow is working correctly:**
- ✅ Only Wav2Vec2 model is used (no fusion model)
- ✅ Audio quality checks pass (speech_ratio=0.96)
- ✅ Emotion prediction works (happy detected)
- ✅ Database storage succeeds
- ✅ Frontend displays result with audio playback

**The fusion model (`last_checkpoint.pth`) is NOT involved in audio-only analysis.**
