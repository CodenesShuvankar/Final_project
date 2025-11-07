# API Endpoints Documentation

## 📍 Endpoints Overview

### 1️⃣ General Recommendations (Home Page)
**Purpose:** Get popular music recommendations for the home page without any mood

```http
GET /recommendations?limit=20
```

**Parameters:**
- `limit` (optional, default=20): Number of recommendations to return

**Response:**
```json
{
  "success": true,
  "count": 20,
  "recommendations": [
    {
      "id": "spotify_track_id",
      "name": "Song Name",
      "artists": ["Artist Name"],
      "album": "Album Name",
      "duration_ms": 240000,
      "preview_url": "https://...",
      "external_url": "https://open.spotify.com/track/...",
      "image_url": "https://i.scdn.co/image/...",
      "popularity": 85
    }
  ]
}
```

**Example:**
```bash
# Get 20 general recommendations
curl http://localhost:8000/recommendations

# Get 50 recommendations
curl http://localhost:8000/recommendations?limit=50
```

---

### 2️⃣ Mood-Based Recommendations
**Purpose:** Get music recommendations based on detected emotion/mood

```http
GET /recommendations/mood/{mood}?limit=20
```

**Parameters:**
- `mood` (required, path parameter): The detected emotion
  - Supported: `happy`, `sad`, `angry`, `neutral`, `fear`, `disgust`, `surprise`, `calm`, `excited`
- `limit` (optional, default=20): Number of recommendations to return

**Response:**
```json
{
  "success": true,
  "mood": "happy",
  "count": 20,
  "recommendations": [
    {
      "id": "spotify_track_id",
      "name": "Happy Song",
      "artists": ["Artist Name"],
      "album": "Album Name",
      "duration_ms": 240000,
      "preview_url": "https://...",
      "external_url": "https://open.spotify.com/track/...",
      "image_url": "https://i.scdn.co/image/...",
      "popularity": 85,
      "mood": "happy"
    }
  ]
}
```

**Examples:**
```bash
# Get recommendations for happy mood
curl http://localhost:8000/recommendations/mood/happy

# Get recommendations for sad mood with custom limit
curl http://localhost:8000/recommendations/mood/sad?limit=30

# Get recommendations for calm mood
curl http://localhost:8000/recommendations/mood/calm?limit=15
```

---

### 3️⃣ Search Music
**Purpose:** Search for specific songs on Spotify

```http
GET /spotify/search?query=search_term&limit=20
```

**Parameters:**
- `query` (required): Search term (song name, artist, etc.)
- `limit` (optional, default=20): Number of results to return

**Response:**
```json
{
  "success": true,
  "query": "happy songs",
  "count": 20,
  "results": [...]
}
```

**Example:**
```bash
curl "http://localhost:8000/spotify/search?query=happy%20songs&limit=10"
```

---

### 4️⃣ Facial Expression Detection
**Purpose:** Detect emotion from an image

```http
GET /detect_facical_expression?image_path=/path/to/image
```

**Parameters:**
- `image_path` (required): Path to the image file

**Response:**
```json
{
  "success": true,
  "emotion": "happy"
}
```

---

### 5️⃣ Voice Emotion Analysis
**Purpose:** Analyze emotion from audio file

```http
POST /analyze-voice
Content-Type: multipart/form-data
```

**Body:**
- `audio_file` (required): Audio file upload

**Response:**
```json
{
  "success": true,
  "prediction": {
    "emotion": "happy",
    "confidence": 0.85,
    "all_emotions": {
      "happy": 0.85,
      "sad": 0.05,
      "angry": 0.03,
      "neutral": 0.04,
      "fear": 0.01,
      "disgust": 0.01,
      "surprise": 0.01
    }
  }
}
```

---

### 6️⃣ Combined Voice Analysis + Recommendations
**Purpose:** Analyze voice and get music recommendations in one call

```http
POST /analyze-voice-and-recommend
Content-Type: multipart/form-data
```

**Body:**
- `audio_file` (required): Audio file upload
- `limit` (optional, default=20): Number of music recommendations

**Response:**
```json
{
  "success": true,
  "emotion": "happy",
  "confidence": 0.85,
  "all_emotions": {...},
  "recommendations": [...]
}
```

---

## 🎯 Usage Flow

### For Home Page:
```javascript
// Fetch general recommendations
fetch('http://localhost:8000/recommendations?limit=20')
  .then(res => res.json())
  .then(data => {
    console.log(data.recommendations);
  });
```

### After Emotion Detection:
```javascript
// User's emotion detected as "happy"
const emotion = "happy";

// Fetch mood-based recommendations
fetch(`http://localhost:8000/recommendations/mood/${emotion}?limit=20`)
  .then(res => res.json())
  .then(data => {
    console.log(`Recommendations for ${data.mood}:`, data.recommendations);
  });
```

---

## 🎵 Emotion Mapping

| Emotion   | Music Characteristics                          |
|-----------|-----------------------------------------------|
| happy     | Upbeat, positive, high energy (pop, dance)    |
| sad       | Slow, melancholic, low energy (acoustic, blues)|
| angry     | Intense, high energy (rock, metal)            |
| calm      | Relaxing, ambient, chill                      |
| excited   | Very energetic, danceable (electronic, dance) |
| neutral   | Balanced (indie, alternative)                 |
| fear      | Dark, atmospheric (ambient, industrial)       |
| surprise  | Dynamic, funky (electronic, funk)             |
| disgust   | Aggressive (punk, grunge)                     |

---

## 🔧 Error Handling

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

**Common Errors:**
- `Spotify credentials not found` - Set up `.env` file with credentials
- `Unknown mood` - Use supported mood names
- `Rate limit exceeded` - Wait before making more requests

---

## 🧪 Testing

### Interactive API Documentation
```bash
python -m uvicorn server_api:app --reload
```
Then visit: **http://localhost:8000/docs**

### Test with curl:
```bash
# Health check
curl http://localhost:8000/

# General recommendations
curl http://localhost:8000/recommendations?limit=10

# Mood recommendations
curl http://localhost:8000/recommendations/mood/happy?limit=15

# Search
curl "http://localhost:8000/spotify/search?query=chill&limit=5"
```

---

## 🔑 Setup Required

1. **Get Spotify Credentials:**
   - https://developer.spotify.com/dashboard
   - Create app, get Client ID & Secret

2. **Create `.env` file:**
   ```env
   SPOTIFY_CLIENT_ID=your_client_id
   SPOTIFY_CLIENT_SECRET=your_client_secret
   ```

3. **Test:**
   ```bash
   python test_spotify.py
   ```

---

## 📱 Frontend Integration

### React/Next.js Example:

```typescript
// General recommendations for home page
const fetchHomeRecommendations = async () => {
  const response = await fetch('http://localhost:8000/recommendations?limit=20');
  const data = await response.json();
  return data.recommendations;
};

// Mood-based recommendations after emotion detection
const fetchMoodRecommendations = async (mood: string) => {
  const response = await fetch(
    `http://localhost:8000/recommendations/mood/${mood}?limit=20`
  );
  const data = await response.json();
  return data.recommendations;
};

// Usage
const HomeComponent = () => {
  useEffect(() => {
    fetchHomeRecommendations().then(songs => setSongs(songs));
  }, []);
};

const MoodComponent = ({ detectedMood }) => {
  useEffect(() => {
    if (detectedMood) {
      fetchMoodRecommendations(detectedMood).then(songs => setSongs(songs));
    }
  }, [detectedMood]);
};
```

---

**🎉 That's it! Your API is clean and simple to use!**
