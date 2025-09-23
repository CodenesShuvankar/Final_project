from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn

app = FastAPI(title="Mock Spotify API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MockTrack(BaseModel):
    id: str
    name: str
    artists: List[str]
    album: str
    duration_ms: int
    preview_url: Optional[str]
    external_urls: Dict[str, str]
    image_url: Optional[str] = None

class MockSearchResult(BaseModel):
    tracks: List[MockTrack]
    total: int

# Mock data with sample preview URLs
MOCK_TRACKS = [
    {
        "id": "1",
        "name": "Happy Song",
        "artists": ["Happy Artist"],
        "album": "Happy Album",
        "duration_ms": 210000,
        "preview_url": "https://www.soundjay.com/misc/sounds/success-1.mp3",
        "external_urls": {"spotify": "https://open.spotify.com/track/1"},
        "image_url": "https://via.placeholder.com/300x300?text=Happy+Song"
    },
    {
        "id": "2", 
        "name": "Upbeat Track",
        "artists": ["Upbeat Artist"],
        "album": "Upbeat Album", 
        "duration_ms": 180000,
        "preview_url": "https://www.soundjay.com/misc/sounds/success-2.mp3",
        "external_urls": {"spotify": "https://open.spotify.com/track/2"},
        "image_url": "https://via.placeholder.com/300x300?text=Upbeat+Track"
    },
    {
        "id": "3",
        "name": "Chill Vibes",
        "artists": ["Chill Artist"],
        "album": "Chill Album",
        "duration_ms": 240000,
        "preview_url": None,  # This one has no preview to test fallback
        "external_urls": {"spotify": "https://open.spotify.com/track/3"},
        "image_url": "https://via.placeholder.com/300x300?text=Chill+Vibes"
    }
]

@app.get("/")
async def root():
    return {"message": "Mock Spotify API is running"}

@app.get("/spotify/search")
async def search_music(q: str):
    """Mock search endpoint that returns tracks with preview URLs"""
    print(f"🔍 Mock search request: '{q}'")
    
    # Filter mock tracks based on query (simple contains check)
    filtered_tracks = []
    for track_data in MOCK_TRACKS:
        if (q.lower() in track_data["name"].lower() or 
            any(q.lower() in artist.lower() for artist in track_data["artists"]) or
            q.lower() in track_data["album"].lower()):
            filtered_tracks.append(MockTrack(**track_data))
    
    # If no matches, return all tracks for demo purposes
    if not filtered_tracks:
        filtered_tracks = [MockTrack(**track_data) for track_data in MOCK_TRACKS]
    
    result = MockSearchResult(
        tracks=filtered_tracks,
        total=len(filtered_tracks)
    )
    
    print(f"✅ Returning {len(filtered_tracks)} tracks")
    for track in filtered_tracks:
        print(f"   - {track.name} by {', '.join(track.artists)} (preview: {'Yes' if track.preview_url else 'No'})")
    
    return result

@app.get("/spotify/mood-recommendations/{mood}")
async def get_mood_recommendations(mood: str):
    """Mock mood recommendations endpoint"""
    print(f"🎵 Mock mood recommendation request: '{mood}'")
    
    # Return mock tracks for any mood
    tracks = [MockTrack(**track_data) for track_data in MOCK_TRACKS]
    
    result = MockSearchResult(
        tracks=tracks,
        total=len(tracks)
    )
    
    print(f"✅ Returning {len(tracks)} mood-based tracks for '{mood}'")
    return result

if __name__ == "__main__":
    print("🚀 Starting Mock Spotify API server...")
    print("📍 Server will be available at: http://localhost:8001")
    print("🔗 Test endpoints:")
    print("   - GET / (health check)")
    print("   - GET /spotify/search?q=happy (search music)")
    print("   - GET /spotify/mood-recommendations/happy (mood recommendations)")
    
    uvicorn.run(app, host="127.0.0.1", port=8001)