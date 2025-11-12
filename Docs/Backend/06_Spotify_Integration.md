# Spotify Integration Documentation

## Overview
Spotify service handles authentication, mood-to-music mapping, and recommendation fetching from Spotify Web API.

## File Location
```
BackEnd/services/
├── __init__.py
└── spotify_service.py
```

---

## SpotifyService Class

### Initialization

```python
class SpotifyService:
    def __init__(self):
        self.client_id = os.getenv("SPOTIFY_CLIENT_ID")
        self.client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
        self.token = None
        self.token_expires = 0  # Unix timestamp
```

**Environment Variables Required:**
```bash
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
```

---

## Authentication

### get_access_token() → str

```python
def get_access_token(self):
    """
    Get or refresh Spotify access token
    
    Flow:
    1. Check if token exists and not expired
       if self.token and time.time() < self.token_expires:
           return self.token
    
    2. If expired/missing, request new token:
       - POST to https://accounts.spotify.com/api/token
       - Grant type: client_credentials
       - Authorization: Base64(client_id:client_secret)
    
    3. Parse response:
       - Extract access_token
       - Calculate expiry (current_time + expires_in)
    
    4. Cache token
       self.token = access_token
       self.token_expires = expiry_time
    
    5. Return token
    
    Returns: Access token string
    """
    current_time = time.time()
    
    # Return cached token if valid
    if self.token and current_time < self.token_expires:
        return self.token
    
    # Request new token
    auth_url = "https://accounts.spotify.com/api/token"
    auth_header = base64.b64encode(
        f"{self.client_id}:{self.client_secret}".encode()
    ).decode()
    
    headers = {
        "Authorization": f"Basic {auth_header}",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    data = {"grant_type": "client_credentials"}
    
    response = requests.post(auth_url, headers=headers, data=data)
    response_data = response.json()
    
    # Cache token
    self.token = response_data['access_token']
    self.token_expires = current_time + response_data['expires_in']
    
    return self.token
```

**Token Lifetime:** Typically 1 hour (3600 seconds)

---

## Mood to Audio Features Mapping

### MOOD_TO_AUDIO_FEATURES Dictionary

```python
MOOD_TO_AUDIO_FEATURES = {
    'happy': {
        'valence': (0.6, 1.0),      # Positivity (60-100%)
        'energy': (0.6, 1.0),        # High energy (60-100%)
        'danceability': (0.5, 1.0),  # Danceable (50-100%)
        'tempo': (110, 150),         # BPM (moderate to fast)
        'genres': ['pop', 'dance', 'party', 'happy']
    },
    
    'sad': {
        'valence': (0.0, 0.4),       # Negativity (0-40%)
        'energy': (0.0, 0.5),        # Low energy (0-50%)
        'acousticness': (0.3, 1.0),  # Acoustic instruments
        'tempo': (60, 90),           # BPM (slow)
        'genres': ['acoustic', 'sad', 'piano', 'blues']
    },
    
    'angry': {
        'valence': (0.0, 0.4),       # Negative (0-40%)
        'energy': (0.7, 1.0),        # Very high energy (70-100%)
        'loudness': (0.7, 1.0),      # Loud (70-100%)
        'tempo': (120, 180),         # BPM (fast to very fast)
        'genres': ['metal', 'rock', 'hard-rock', 'punk']
    },
    
    'calm': {
        'valence': (0.4, 0.6),       # Neutral (40-60%)
        'energy': (0.0, 0.4),        # Very low energy (0-40%)
        'instrumentalness': (0.3, 1.0),  # Instrumental
        'acousticness': (0.5, 1.0),  # Acoustic
        'tempo': (60, 100),          # BPM (slow to moderate)
        'genres': ['ambient', 'chill', 'meditation', 'classical']
    },
    
    'energetic': {
        'energy': (0.7, 1.0),        # Very high (70-100%)
        'valence': (0.5, 1.0),       # Positive (50-100%)
        'tempo': (120, 180),         # BPM (fast)
        'danceability': (0.6, 1.0),  # Danceable (60-100%)
        'genres': ['edm', 'electronic', 'workout', 'dance']
    },
    
    'neutral': {
        'valence': (0.4, 0.6),       # Balanced (40-60%)
        'energy': (0.3, 0.7),        # Moderate (30-70%)
        'genres': ['chill', 'indie', 'alternative', 'pop']
    }
}
```

### Audio Features Explained

| Feature               | Range       | Description                         |
|-----------------------|-------------|-------------------------------------|
| **valence**           | 0.0-1.0     | Musical positivity (happy vs sad)   |
| **energy**            | 0.0-1.0     | Intensity and activity level        |
| **danceability**      | 0.0-1.0     | How suitable for dancing            |
| **acousticness**      | 0.0-1.0     | Confidence of acoustic vs electronic|
| **instrumentalness**  | 0.0-1.0     | Likelihood of no vocals             |
| **loudness**          | -60 to 0 dB | Overall loudness                    |
| **tempo**             | 0-250 BPM   | Beats per minute                    |

---

## Get Mood Recommendations

### get_mood_recommendations(mood, limit) → list

```python
def get_mood_recommendations(self, mood: str, limit: int = 20) -> list:
    """
    Get Spotify track recommendations based on mood
    
    Flow:
    1. Get valid access token
    2. Map mood to audio features
    3. Build seed genres (up to 5)
    4. Construct API request:
       - URL: https://api.spotify.com/v1/recommendations
       - Parameters:
         * seed_genres: comma-separated genres
         * target_valence: mood-specific value
         * target_energy: mood-specific value
         * limit: number of tracks
    5. Make request with auth header
    6. Parse response:
       - Extract track details
       - Get artist names
       - Get album images
       - Get preview URLs
    7. Return formatted track list
    
    Returns: [
        {
            "id": "spotify:track:...",
            "name": "Song Name",
            "artists": ["Artist 1", "Artist 2"],
            "album": "Album Name",
            "image": "https://i.scdn.co/image/...",
            "preview_url": "https://p.scdn.co/mp3-preview/...",
            "uri": "spotify:track:...",
            "external_url": "https://open.spotify.com/track/..."
        },
        ...
    ]
    """
    token = self.get_access_token()
    
    # Get mood mapping
    mood_features = MOOD_TO_AUDIO_FEATURES.get(mood.lower(), {})
    genres = mood_features.get('genres', ['pop'])
    
    # Build parameters
    params = {
        'seed_genres': ','.join(genres[:5]),  # Max 5 genres
        'limit': min(limit, 100)  # Max 100 tracks
    }
    
    # Add audio feature targets
    if 'valence' in mood_features:
        target = sum(mood_features['valence']) / 2
        params['target_valence'] = target
    
    if 'energy' in mood_features:
        target = sum(mood_features['energy']) / 2
        params['target_energy'] = target
    
    if 'tempo' in mood_features:
        target = sum(mood_features['tempo']) / 2
        params['target_tempo'] = target
    
    # Make request
    url = "https://api.spotify.com/v1/recommendations"
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(url, headers=headers, params=params)
    data = response.json()
    
    # Format tracks
    tracks = []
    for track in data.get('tracks', []):
        tracks.append({
            "id": track['id'],
            "name": track['name'],
            "artists": [artist['name'] for artist in track['artists']],
            "album": track['album']['name'],
            "image": track['album']['images'][0]['url'] if track['album']['images'] else None,
            "preview_url": track['preview_url'],
            "uri": track['uri'],
            "external_url": track['external_urls']['spotify']
        })
    
    return tracks
```

---

## Search Function

### search(query, types, limit) → dict

```python
def search(self, query: str, types: list = ['track', 'artist'], limit: int = 10) -> dict:
    """
    Search Spotify for tracks, artists, or albums
    
    Flow:
    1. Get valid access token
    2. URL encode query string
    3. Construct API request:
       - URL: https://api.spotify.com/v1/search
       - Parameters:
         * q: search query
         * type: comma-separated types
         * limit: results per type
    4. Make request with auth header
    5. Parse results by type
    6. Format and return
    
    Returns: {
        "tracks": [...],
        "artists": [...],
        "albums": [...]
    }
    """
    token = self.get_access_token()
    
    # Build parameters
    params = {
        'q': query,
        'type': ','.join(types),
        'limit': limit
    }
    
    # Make request
    url = "https://api.spotify.com/v1/search"
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(url, headers=headers, params=params)
    data = response.json()
    
    # Format results
    results = {}
    
    if 'tracks' in data:
        results['tracks'] = [
            {
                "id": track['id'],
                "name": track['name'],
                "artists": [a['name'] for a in track['artists']],
                "album": track['album']['name'],
                "image": track['album']['images'][0]['url'] if track['album']['images'] else None,
                "uri": track['uri']
            }
            for track in data['tracks']['items']
        ]
    
    if 'artists' in data:
        results['artists'] = [
            {
                "id": artist['id'],
                "name": artist['name'],
                "genres": artist['genres'],
                "image": artist['images'][0]['url'] if artist['images'] else None,
                "uri": artist['uri']
            }
            for artist in data['artists']['items']
        ]
    
    return results
```

---

## API Endpoints Used

### 1. Token Endpoint
```
POST https://accounts.spotify.com/api/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic <base64(client_id:client_secret)>

Body: grant_type=client_credentials
```

### 2. Recommendations Endpoint
```
GET https://api.spotify.com/v1/recommendations
Authorization: Bearer <access_token>

Params:
- seed_genres: pop,dance,happy
- target_valence: 0.8
- target_energy: 0.75
- limit: 20
```

### 3. Search Endpoint
```
GET https://api.spotify.com/v1/search
Authorization: Bearer <access_token>

Params:
- q: taylor swift
- type: track,artist
- limit: 10
```

---

## Called By

### server_api.py

```python
# Initialize service
spotify_service = SpotifyService()

# Called from mood recommendations endpoint
@app.get("/mood-recommendations/{mood}")
async def mood_recommendations(mood: str, limit: int = 20):
    tracks = spotify_service.get_mood_recommendations(mood, limit)
    return {"success": True, "mood": mood, "tracks": tracks}

# Called from multimodal analysis
@app.post("/analyze-voice-and-face")
async def analyze_voice_and_face(...):
    # ... emotion detection ...
    recommendation_emotion = emotion_fusion.get_recommendation_emotion(merged_result)
    recommendations = spotify_service.get_mood_recommendations(recommendation_emotion, limit)
    return {"analysis": ..., "recommendations": recommendations}

# Called from search endpoint
@app.get("/search")
async def search(query: str, type: str = "track,artist", limit: int = 10):
    types = type.split(',')
    results = spotify_service.search(query, types, limit)
    return {"success": True, "results": results}
```

---

## Error Handling

### Common Errors

**1. Authentication Failure**
```python
if response.status_code == 401:
    raise Exception("Spotify authentication failed. Check credentials.")
```

**2. Rate Limiting**
```python
if response.status_code == 429:
    retry_after = response.headers.get('Retry-After', 60)
    time.sleep(int(retry_after))
    # Retry request
```

**3. No Results**
```python
if not data.get('tracks'):
    logger.warning(f"No recommendations found for mood: {mood}")
    return []
```

**4. Invalid Mood**
```python
if mood not in MOOD_TO_AUDIO_FEATURES:
    logger.warning(f"Unknown mood: {mood}, using neutral")
    mood = 'neutral'
```

---

## Usage Examples

### Example 1: Get Happy Music

```python
spotify = SpotifyService()
tracks = spotify.get_mood_recommendations('happy', limit=10)

# Returns:
[
    {
        "id": "3n3Ppam7vgaVa1iaRUc9Lp",
        "name": "Mr. Brightside",
        "artists": ["The Killers"],
        "album": "Hot Fuss",
        "image": "https://...",
        "preview_url": "https://...",
        "uri": "spotify:track:...",
        "external_url": "https://open.spotify.com/track/..."
    },
    ...
]
```

### Example 2: Search for Artist

```python
results = spotify.search('taylor swift', types=['track', 'artist'], limit=5)

# Returns:
{
    "tracks": [
        {"name": "Shake It Off", "artists": ["Taylor Swift"], ...},
        ...
    ],
    "artists": [
        {"name": "Taylor Swift", "genres": ["pop"], ...}
    ]
}
```

---

## Performance

| Operation                 | Time   | Notes                    |
|---------------------------|--------|--------------------------|
| Get token                 | ~200ms | Cached for 1 hour        |
| Get recommendations       | ~400ms | Network dependent        |
| Search                    | ~300ms | Network dependent        |
| **Total (first call)**    | ~600ms | Token + recommendations  |
| **Total (cached token)**  | ~400ms | Just recommendations     |

---

## Next Steps

- **[Complete Flow](./07_Complete_Flow.md)** - End-to-end request journey
- **[Deployment](./10_Deployment.md)** - Running in production
