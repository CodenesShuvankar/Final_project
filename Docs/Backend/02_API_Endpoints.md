# API Endpoints Documentation

## Base URL
```
http://localhost:8000
```

## CORS Configuration
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 1. Health Check

### `GET /`
Check if the API server is running.

**Request:**
```bash
curl http://localhost:8000/
```

**Response:**
```json
{
  "message": "VibeTune API is running!"
}
```

**Status Codes:**
- `200 OK` - Server is running

**Used By:** Frontend health monitoring, deployment checks

---

## 2. Voice-Only Analysis

### `POST /analyze-voice`
Analyze emotion from audio file only.

**Request:**
```bash
curl -X POST http://localhost:8000/analyze-voice \
  -F "audio_file=@recording.wav"
```

**Form Data:**
- `audio_file` (required): Audio file upload
  - Formats: `.wav`, `.mp3`, `.m4a`, `.flac`, `.opus`, `.webm`, `.ogg`
  - Max size: 50MB
  - Recommended: 16kHz mono WAV

**Response:**
```json
{
  "success": true,
  "prediction": {
    "emotion": "happy",
    "confidence": 0.87,
    "all_emotions": {
      "happy": 0.87,
      "sad": 0.05,
      "angry": 0.03,
      "fear": 0.02,
      "surprise": 0.01,
      "disgust": 0.01,
      "neutral": 0.01
    }
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Unsupported audio format. Allowed: .wav, .mp3, .m4a, .flac, .opus, .webm, .ogg"
}
```

**Status Codes:**
- `200 OK` - Analysis successful
- `400 Bad Request` - Invalid file format
- `500 Internal Server Error` - Processing error

**Called From:**
- `voice_api.analyze_audio_upload(audio_file, model_path)`

**Used By:** Voice-only fallback scenarios, testing

---

## 3. Face-Only Analysis

### `POST /analyze-face`
Analyze emotion from image file only.

**Request:**
```bash
curl -X POST http://localhost:8000/analyze-face \
  -F "image_file=@selfie.jpg"
```

**Form Data:**
- `image_file` (required): Image file upload
  - Formats: `.jpg`, `.jpeg`, `.png`
  - Max size: 50MB
  - Recommended: 640x480 or higher

**Response:**
```json
{
  "success": true,
  "emotion": "sad",
  "confidence": 0.76,
  "all_emotions": {
    "sad": 0.76,
    "neutral": 0.12,
    "angry": 0.05,
    "fear": 0.04,
    "happy": 0.02,
    "disgust": 0.01,
    "surprise": 0.00
  }
}
```

**Fallback Response (No Face Detected):**
```json
{
  "success": true,
  "emotion": "neutral",
  "confidence": 0.3,
  "all_emotions": {
    "neutral": 0.3
  },
  "warning": "Face detection failed, using neutral fallback"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Unsupported image format. Allowed: .jpg, .jpeg, .png"
}
```

**Status Codes:**
- `200 OK` - Analysis successful (includes fallback cases)
- `400 Bad Request` - Invalid file format
- `500 Internal Server Error` - Processing error

**Called From:**
- `face_expression.detect_expression(temp_path)`

**Used By:** Face-only testing, debugging

---

## 4. Multimodal Analysis (Primary Endpoint)

### `POST /analyze-voice-and-face`
Analyze emotion using both voice and facial expression, then merge predictions.

**Request:**
```bash
curl -X POST http://localhost:8000/analyze-voice-and-face \
  -F "audio_file=@recording.wav" \
  -F "image_file=@selfie.jpg" \
  -F "limit=20"
```

**Form Data:**
- `audio_file` (required): Audio file
  - Formats: `.wav`, `.mp3`, `.m4a`, `.flac`, `.opus`, `.webm`, `.ogg`
  - Recommended: 7 seconds of speech
- `image_file` (required): Image file
  - Formats: `.jpg`, `.jpeg`, `.png`
  - Recommended: Clear frontal face
- `limit` (optional): Number of music recommendations
  - Default: 20
  - Range: 1-50

**Response:**
```json
{
  "success": true,
  "analysis": {
    "merged_emotion": "happy",
    "merged_confidence": 0.85,
    "agreement": "strong",
    "voice_weight": 0.6,
    "face_weight": 0.4,
    "voice_prediction": {
      "emotion": "happy",
      "confidence": 0.87,
      "all_emotions": {
        "happy": 0.87,
        "sad": 0.05,
        "neutral": 0.03,
        "angry": 0.02,
        "surprise": 0.01,
        "fear": 0.01,
        "disgust": 0.01
      }
    },
    "face_prediction": {
      "emotion": "happy",
      "confidence": 0.78,
      "all_emotions": {
        "happy": 0.78,
        "neutral": 0.12,
        "surprise": 0.05,
        "sad": 0.03,
        "angry": 0.01,
        "fear": 0.01,
        "disgust": 0.00
      }
    },
    "all_combined_emotions": {
      "happy": 0.834,
      "neutral": 0.066,
      "sad": 0.042,
      "surprise": 0.026,
      "angry": 0.016,
      "fear": 0.010,
      "disgust": 0.006
    },
    "summary": "Strong agreement: Both voice and face indicate happy with high confidence",
    "explanation": "Voice and face predictions agree strongly on happy emotion. The high confidence from both modalities (voice: 87%, face: 78%) results in a robust merged prediction of happy with 85% confidence."
  },
  "recommendations": [
    {
      "id": "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
      "name": "Mr. Brightside",
      "artists": ["The Killers"],
      "album": "Hot Fuss",
      "image": "https://i.scdn.co/image/ab67616d0000b273...",
      "preview_url": "https://p.scdn.co/mp3-preview/...",
      "uri": "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
      "external_url": "https://open.spotify.com/track/..."
    }
    // ... 19 more tracks
  ]
}
```

**Processing Flow:**
```
1. Validate file types
2. Analyze voice → voice_result
3. Analyze face → face_result (with fallback)
4. Merge predictions → merged_result
5. Map to Spotify mood → recommendation_emotion
6. Get music recommendations → track_list
7. Return complete analysis + recommendations
```

**Agreement Types:**
- `strong`: Exact same emotion (e.g., happy + happy)
- `moderate`: Compatible emotions (e.g., sad + fear)
- `weak`: Partially related (e.g., neutral + happy)
- `conflict`: Incompatible emotions (e.g., happy + sad)

**Voice-Only Mode Response (No Camera):**
```json
{
  "success": true,
  "analysis": {
    "merged_emotion": "sad",
    "merged_confidence": 0.80,
    "agreement": "weak",
    "voice_weight": 0.85,
    "face_weight": 0.15,
    "voice_prediction": {
      "emotion": "sad",
      "confidence": 0.89
    },
    "face_prediction": {
      "emotion": "neutral",
      "confidence": 0.3,
      "warning": "No camera available, using neutral fallback"
    },
    "summary": "Voice-driven prediction: sad emotion detected with high confidence",
    "explanation": "Face detection unavailable (neutral fallback). Result weighted heavily toward voice analysis (85%)."
  },
  "recommendations": [...]
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Unsupported audio format. Allowed: .wav, .mp3, .m4a, .flac, .opus, .webm, .ogg"
}
```

**Status Codes:**
- `200 OK` - Analysis successful
- `400 Bad Request` - Invalid file format or parameters
- `500 Internal Server Error` - Processing error

**Called From:**
- `voice_api.analyze_audio_upload()`
- `face_expression.detect_expression()`
- `emotion_fusion.merge_emotions()`
- `spotify_service.get_mood_recommendations()`

**Used By:** 
- Frontend `MoodDetectorPanel` component (primary use case)
- Auto mood detection on homepage
- Manual mood detection on mood page

---

## 5. Mood-Based Recommendations

### `GET /mood-recommendations/{mood}`
Get Spotify track recommendations based on mood.

**Request:**
```bash
curl "http://localhost:8000/mood-recommendations/happy?limit=20"
```

**Path Parameters:**
- `mood` (required): Emotion category
  - Values: `happy`, `sad`, `angry`, `calm`, `energetic`, `neutral`

**Query Parameters:**
- `limit` (optional): Number of tracks
  - Default: 20
  - Range: 1-50

**Response:**
```json
{
  "success": true,
  "mood": "happy",
  "tracks": [
    {
      "id": "spotify:track:...",
      "name": "Happy Song",
      "artists": ["Artist Name"],
      "album": "Album Name",
      "image": "https://i.scdn.co/image/...",
      "preview_url": "https://p.scdn.co/mp3-preview/...",
      "uri": "spotify:track:...",
      "external_url": "https://open.spotify.com/track/..."
    }
    // ... more tracks
  ]
}
```

**Mood Mapping:**
| Mood      | Spotify Features                                |
|-----------|-------------------------------------------------|
| happy     | High valence (0.6-1.0), high energy, danceable  |
| sad       | Low valence (0.0-0.4), low energy, acoustic     |
| angry     | Low valence, very high energy, loud             |
| calm      | Neutral valence, very low energy, instrumental  |
| energetic | Very high energy, fast tempo (120-180 BPM)      |
| neutral   | Balanced features, chill genres                 |

**Error Response:**
```json
{
  "success": false,
  "error": "Failed to get mood recommendations: Invalid mood category"
}
```

**Status Codes:**
- `200 OK` - Recommendations fetched
- `400 Bad Request` - Invalid mood
- `401 Unauthorized` - Spotify authentication failed
- `500 Internal Server Error` - Spotify API error

**Called From:**
- `spotify_service.get_mood_recommendations(mood, limit)`

**Used By:**
- Homepage mood-based sections
- Playlist generation
- Post-detection recommendations
- Mood page browsing

---

## 6. Search

### `GET /search`
Search for tracks, artists, or albums on Spotify.

**Request:**
```bash
curl "http://localhost:8000/search?query=taylor%20swift&type=track,artist&limit=10"
```

**Query Parameters:**
- `query` (required): Search query string
- `type` (optional): Content types to search
  - Values: `track`, `artist`, `album` (comma-separated)
  - Default: `track,artist`
- `limit` (optional): Results per type
  - Default: 10
  - Range: 1-50

**Response:**
```json
{
  "success": true,
  "results": {
    "tracks": [
      {
        "id": "spotify:track:...",
        "name": "Shake It Off",
        "artists": ["Taylor Swift"],
        "album": "1989",
        "image": "https://i.scdn.co/image/...",
        "preview_url": "https://p.scdn.co/mp3-preview/...",
        "uri": "spotify:track:..."
      }
      // ... more tracks
    ],
    "artists": [
      {
        "id": "spotify:artist:...",
        "name": "Taylor Swift",
        "genres": ["pop", "country"],
        "image": "https://i.scdn.co/image/...",
        "followers": 95000000,
        "uri": "spotify:artist:..."
      }
      // ... more artists
    ]
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Search query cannot be empty"
}
```

**Status Codes:**
- `200 OK` - Search successful
- `400 Bad Request` - Missing or invalid query
- `401 Unauthorized` - Spotify authentication failed
- `500 Internal Server Error` - Spotify API error

**Called From:**
- `spotify_service.search(query, types, limit)`

**Used By:**
- Search page
- Suggest page (searching for refinement)
- Manual track selection

---

## Request/Response Examples

### Example 1: Successful Multimodal Analysis

**Request:**
```javascript
const formData = new FormData();
formData.append('audio_file', audioBlob, 'recording.wav');
formData.append('image_file', imageBlob, 'selfie.jpg');
formData.append('limit', '20');

const response = await fetch('http://localhost:8000/analyze-voice-and-face', {
  method: 'POST',
  body: formData
});

const data = await response.json();
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "merged_emotion": "happy",
    "merged_confidence": 0.85,
    "agreement": "strong",
    "voice_weight": 0.6,
    "face_weight": 0.4,
    "summary": "Strong agreement: Both voice and face indicate happy"
  },
  "recommendations": [/* 20 tracks */]
}
```

### Example 2: Voice-Only (No Camera)

**Request:** Same as above, but `image_file` is a placeholder

**Response:**
```json
{
  "success": true,
  "analysis": {
    "merged_emotion": "sad",
    "merged_confidence": 0.80,
    "agreement": "weak",
    "voice_weight": 0.85,
    "face_weight": 0.15,
    "face_prediction": {
      "warning": "No camera available, using neutral fallback"
    }
  },
  "recommendations": [/* sad music */]
}
```

### Example 3: Conflict Resolution

**Request:** Voice says "happy" (0.88), Face says "sad" (0.42)

**Response:**
```json
{
  "success": true,
  "analysis": {
    "merged_emotion": "happy",
    "merged_confidence": 0.76,
    "agreement": "conflict",
    "voice_weight": 0.75,
    "face_weight": 0.25,
    "explanation": "High confidence voice prediction (happy) chosen over low confidence face (sad)"
  },
  "recommendations": [/* happy music */]
}
```

---

## Testing the API

### Using cURL

```bash
# Health check
curl http://localhost:8000/

# Voice analysis
curl -X POST http://localhost:8000/analyze-voice \
  -F "audio_file=@test.wav"

# Face analysis
curl -X POST http://localhost:8000/analyze-face \
  -F "image_file=@test.jpg"

# Multimodal analysis
curl -X POST http://localhost:8000/analyze-voice-and-face \
  -F "audio_file=@test.wav" \
  -F "image_file=@test.jpg" \
  -F "limit=20"

# Mood recommendations
curl "http://localhost:8000/mood-recommendations/happy?limit=10"

# Search
curl "http://localhost:8000/search?query=drake&type=track&limit=5"
```

### Using Python

```python
import requests

# Multimodal analysis
files = {
    'audio_file': open('test.wav', 'rb'),
    'image_file': open('test.jpg', 'rb')
}
data = {'limit': 20}

response = requests.post(
    'http://localhost:8000/analyze-voice-and-face',
    files=files,
    data=data
)

result = response.json()
print(f"Detected mood: {result['analysis']['merged_emotion']}")
print(f"Confidence: {result['analysis']['merged_confidence']:.2%}")
```

### Using JavaScript/Fetch

```javascript
// Multimodal analysis
const formData = new FormData();
formData.append('audio_file', audioBlob, 'audio.wav');
formData.append('image_file', imageBlob, 'image.jpg');
formData.append('limit', '20');

const response = await fetch('http://localhost:8000/analyze-voice-and-face', {
  method: 'POST',
  body: formData
});

const data = await response.json();
console.log('Mood:', data.analysis.merged_emotion);
console.log('Confidence:', data.analysis.merged_confidence);
```

---

## Rate Limiting

Currently no rate limiting is implemented. For production:

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/analyze-voice-and-face")
@limiter.limit("10/minute")
async def analyze_voice_and_face(...):
    ...
```

---

## Error Codes Reference

| Status Code | Meaning               | Common Causes                           |
|-------------|-----------------------|-----------------------------------------|
| 200         | Success               | Request processed successfully          |
| 400         | Bad Request           | Invalid file format, missing parameters |
| 401         | Unauthorized          | Spotify API credentials invalid         | 
| 413         | Payload Too Large     | File exceeds 50MB limit                 |
| 422         | Unprocessable Entity  | Invalid form data structure             |
| 429         | Too Many Requests     | Rate limit exceeded (if implemented)    |
| 500         | Internal Server Error | Model error, processing failure         |
| 503         | Service Unavailable   | Server overloaded or down               |

---

## Next Steps

- **[Voice Model Details](./03_Voice_Model.md)** - Voice emotion detection
- **[Face Model Details](./04_Face_Model.md)** - Facial expression detection
- **[Emotion Fusion](./05_Emotion_Fusion.md)** - How predictions merge
- **[Complete Flow](./07_Complete_Flow.md)** - End-to-end request journey
