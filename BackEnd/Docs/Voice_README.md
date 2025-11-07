# Voice Emotion Recognition API

## Overview
This module provides a comprehensive API for 7-class speech emotion recognition using the Wav2Vec2-XLSR-53 model fine-tuned on multiple emotion datasets.

## Supported Emotions (7-Class)
- 😠 **Angry** - Displeasure, frustration
- 🤢 **Disgust** - Revulsion, disapproval  
- 😨 **Fear** - Anxiety, apprehension
- 😊 **Happy** - Joy, contentment
- 😐 **Neutral** - Baseline state
- 😢 **Sad** - Sorrow, melancholy
- 😲 **Surprise** - Astonishment

## Model Information
- **Model:** Wav2Vec2-XLSR-53  
- **Parameters:** 315.7M  
- **Classes:** 7 emotions  
- **Languages:** English, German, Bengali  
- **Training Data:** 18,769 samples  
- **Datasets:** RAVDESS, CREMA-D, SAVEE, EmoDB, BANSpEmo, BanglaSER, SUBESCO

## Installation

### Requirements
```bash
pip install torch torchaudio librosa numpy transformers
```

### Model Setup
The model should be located at:
```
BackEnd/voice_model/final_voice_model/
├── config.json
├── model.safetensors
├── preprocessor_config.json
└── training_args.bin
```

## API Reference

### Core Functions

#### 1. `load_model(model_path_or_repo)`
Load the trained 7-class model and processor.

**Parameters:**
- `model_path_or_repo` (str): Local path to model or HuggingFace repository name

**Returns:**
- `tuple`: (model, processor)

**Example:**
```python
from voice_model import voice_api

model, processor = voice_api.load_model("path/to/model")
```

---

#### 2. `process_audio(audio_data, sample_rate=16000)`
Process audio data for model input (resampling, mono conversion, normalization).

**Parameters:**
- `audio_data` (np.ndarray): Audio signal
- `sample_rate` (int): Current sample rate (default: 16000)

**Returns:**
- `np.ndarray`: Processed audio data

---

#### 3. `predict_emotion(audio_data, model, processor)`
Predict emotion from processed audio data.

**Parameters:**
- `audio_data` (np.ndarray): Processed audio signal
- `model`: Loaded Wav2Vec2 model
- `processor`: Loaded feature extractor

**Returns:**
- `tuple`: (predicted_emotion, confidence, all_emotions_dict)

**Example:**
```python
emotion, confidence, all_emotions = voice_api.predict_emotion(audio_data, model, processor)
print(f"Detected: {emotion} (confidence: {confidence:.2%})")
```

---

### Audio Loading Functions

#### 4. `load_audio_file(file_path, sr=16000)`
Load audio from file path.

**Parameters:**
- `file_path` (str): Path to audio file
- `sr` (int): Target sample rate (default: 16000)

**Returns:**
- `np.ndarray`: Processed audio data

**Supported Formats:** WAV, MP3, M4A, FLAC

---

#### 5. `load_audio_from_bytes(audio_bytes, sr=16000)`
Load audio from bytes (e.g., from uploaded file).

**Parameters:**
- `audio_bytes` (bytes): Audio data as bytes
- `sr` (int): Target sample rate (default: 16000)

**Returns:**
- `np.ndarray`: Processed audio data

---

#### 6. `load_audio_from_upload(upload_file)`
Load audio from FastAPI UploadFile object.

**Parameters:**
- `upload_file`: FastAPI UploadFile object

**Returns:**
- `np.ndarray`: Processed audio data

---

### Helper Functions

#### 7. `get_emotion_emoji(emotion)`
Get emoji representation for emotion.

**Example:**
```python
emoji = voice_api.get_emotion_emoji('happy')  # Returns '😊'
```

---

#### 8. `get_emotion_color(emotion)`
Get color code for emotion.

**Example:**
```python
color = voice_api.get_emotion_color('happy')  # Returns '#10B981'
```

---

#### 9. `get_emotion_description(emotion)`
Get description for emotion.

---

### Convenience Functions

#### 10. `analyze_audio_file(file_path, model_path_or_repo)`
End-to-end analysis from file path.

**Parameters:**
- `file_path` (str): Path to audio file
- `model_path_or_repo` (str): Path to model or HuggingFace repo

**Returns:**
- `dict`: Complete analysis results

**Example:**
```python
result = voice_api.analyze_audio_file("audio.wav", "path/to/model")

if result["success"]:
    pred = result["prediction"]
    print(f"{pred['emoji']} {pred['emotion']} - {pred['confidence']:.2%}")
    print(f"All emotions: {pred['all_emotions']}")
```

---

#### 11. `analyze_audio_upload(upload_file, model_path_or_repo)`
End-to-end analysis from uploaded file.

**Parameters:**
- `upload_file`: FastAPI UploadFile object
- `model_path_or_repo` (str): Path to model or HuggingFace repo

**Returns:**
- `dict`: Complete analysis results

---

## Usage Examples

### Basic Usage

```python
from voice_model import voice_api

# Load model
model_path = "voice_model/final_voice_model"
model, processor = voice_api.load_model(model_path)

# Load and process audio
audio_data = voice_api.load_audio_file("sample.wav")

# Predict emotion
emotion, confidence, all_emotions = voice_api.predict_emotion(
    audio_data, model, processor
)

print(f"Detected: {emotion} ({confidence:.2%})")
for emotion_name, prob in all_emotions.items():
    print(f"  {emotion_name}: {prob:.2%}")
```

### FastAPI Integration

```python
from fastapi import FastAPI, UploadFile, File
from voice_model import voice_api

app = FastAPI()
MODEL_PATH = "voice_model/final_voice_model"

@app.post("/analyze-voice")
async def analyze_voice(audio_file: UploadFile = File(...)):
    result = voice_api.analyze_audio_upload(audio_file, MODEL_PATH)
    return result
```

### Using Convenience Function

```python
from voice_model import voice_api

# Analyze audio file
result = voice_api.analyze_audio_file(
    "sample.wav",
    "voice_model/final_voice_model"
)

if result["success"]:
    pred = result["prediction"]
    print(f"{pred['emoji']} Emotion: {pred['emotion']}")
    print(f"Confidence: {pred['confidence']:.2%}")
    print(f"Description: {pred['description']}")
    print(f"Color: {pred['color']}")
```

## Response Format

The `analyze_audio_*` functions return a dictionary with this structure:

```json
{
  "success": true,
  "prediction": {
    "emotion": "happy",
    "confidence": 0.89,
    "all_emotions": {
      "angry": 0.02,
      "disgust": 0.01,
      "fear": 0.03,
      "happy": 0.89,
      "neutral": 0.02,
      "sad": 0.01,
      "surprise": 0.02
    },
    "emoji": "😊",
    "color": "#10B981",
    "description": "Joy, contentment"
  }
}
```

On error:
```json
{
  "success": false,
  "error": "Error message"
}
```

## Testing

Run the test suite:

```bash
cd BackEnd
python test_voice_api.py
```

The test suite checks:
1. Model loading
2. Helper functions (emoji, colors, descriptions)
3. Audio file analysis (if sample files exist)

## Error Handling

All functions include proper error handling and logging. Errors are:
- Logged using Python's logging module
- Raised as exceptions with descriptive messages
- Returned as structured error responses in convenience functions

## Performance Notes

- **Model Caching:** The model is cached in memory after first load
- **Audio Processing:** Automatic resampling to 16kHz
- **Batch Processing:** For multiple files, reuse the loaded model
- **GPU Support:** Automatically uses GPU if available

## Troubleshooting

### Model Loading Issues
```python
# Check if model files exist
from pathlib import Path
model_path = Path("voice_model/final_voice_model")
print(f"Model exists: {model_path.exists()}")
print(f"Files: {list(model_path.glob('*'))}")
```

### Audio Loading Issues
```python
# Verify audio file format
import librosa
audio, sr = librosa.load("audio.wav", sr=None)
print(f"Sample rate: {sr}, Duration: {len(audio)/sr:.2f}s")
```

### Memory Issues
```python
# Clear model cache
import voice_model.voice_api as voice_api
voice_api._model_cache.clear()
```

## License
This module uses the Wav2Vec2-XLSR-53 model which is licensed under Apache 2.0.

## References
- [Wav2Vec2 Paper](https://arxiv.org/abs/2006.11477)
- [XLSR-53 Model](https://huggingface.co/facebook/wav2vec2-large-xlsr-53)
- [Transformers Library](https://huggingface.co/docs/transformers)
