"""
Lightweight backend server for development - Spotify integration only
Bypasses heavy ML model loading for faster development
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, List
import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import spotify service (if available)
try:
    from spotify_service import SpotifyService
    SPOTIFY_AVAILABLE = True
    print("✅ Spotify service imported successfully")
except ImportError as e:
    print(f"⚠️ Spotify service not available: {e}")
    SPOTIFY_AVAILABLE = False

# Response models
class VoiceAnalysisResponse(BaseModel):
    emotion: str
    confidence: float
    message: str

class RawAudioData(BaseModel):
    audio_data: str
    sample_rate: int = 16000

# FastAPI app
app = FastAPI(
    title="Mood Music API (Development Mode)",
    description="Development version with mock emotion detection and Spotify integration",
    version="1.0.0-dev"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Spotify service if available
spotify_service = None
if SPOTIFY_AVAILABLE:
    try:
        spotify_service = SpotifyService()
        print("✅ Spotify service initialized")
    except Exception as e:
        print(f"⚠️ Failed to initialize Spotify service: {e}")

@app.get("/")
async def root():
    return {
        "message": "Mood Music API (Development Mode)",
        "status": "running",
        "spotify_available": spotify_service is not None,
        "mode": "development"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "spotify_integration": spotify_service is not None,
        "mode": "development_mode"
    }

# Mock voice analysis endpoints
@app.post("/analyze-voice", response_model=VoiceAnalysisResponse)
async def analyze_voice(audio_file: UploadFile = File(...)):
    """Mock voice analysis - returns random emotion for development"""
    import random
    
    emotions = ["happy", "sad", "angry", "neutral", "excited", "calm"]
    emotion = random.choice(emotions)
    confidence = round(random.uniform(0.7, 0.95), 2)
    
    return VoiceAnalysisResponse(
        emotion=emotion,
        confidence=confidence,
        message=f"Mock analysis: Detected {emotion} with {confidence} confidence"
    )

@app.post("/analyze-voice-raw", response_model=VoiceAnalysisResponse)
async def analyze_voice_raw(raw_audio: RawAudioData):
    """Mock voice analysis for raw audio data"""
    import random
    
    emotions = ["happy", "sad", "angry", "neutral", "excited", "calm"]
    emotion = random.choice(emotions)
    confidence = round(random.uniform(0.7, 0.95), 2)
    
    return VoiceAnalysisResponse(
        emotion=emotion,
        confidence=confidence,
        message=f"Mock analysis of raw audio: {emotion}"
    )

# Spotify API Endpoints (if available)
if spotify_service:
    @app.get("/spotify/search")
    async def search_spotify_music(query: str, limit: int = 20):
        """Search for music on Spotify"""
        try:
            results = spotify_service.search_tracks(query, limit)
            return {"success": True, "results": results}
        except Exception as e:
            print(f"Spotify search error: {str(e)}")
            return {"success": False, "error": str(e)}

    @app.get("/spotify/mood-recommendations")
    async def get_mood_recommendations(mood: str, limit: int = 20):
        """Get music recommendations based on detected mood (query parameter)"""
        try:
            recommendations = spotify_service.get_mood_based_recommendations(mood, limit)
            return {"success": True, "recommendations": recommendations}
        except Exception as e:
            print(f"Spotify mood recommendations error: {str(e)}")
            return {"success": False, "error": str(e)}

    @app.get("/spotify/mood-recommendations/{mood}")
    async def get_mood_recommendations_by_path(mood: str, limit: int = 20):
        """Get music recommendations based on detected mood (path parameter)"""
        try:
            recommendations = spotify_service.get_mood_based_recommendations(mood, limit)
            return {"success": True, "recommendations": recommendations}
        except Exception as e:
            print(f"Spotify mood recommendations error: {str(e)}")
            return {"success": False, "error": str(e)}

else:
    # Mock Spotify endpoints when service is not available
    @app.get("/spotify/search")
    async def mock_search_spotify_music(query: str, limit: int = 20):
        """Mock Spotify search for development"""
        return {
            "success": True,
            "results": {
                "tracks": [
                    {
                        "id": "1",
                        "name": f"Mock Song for '{query}'",
                        "artists": ["Mock Artist"],
                        "album": "Mock Album",
                        "duration_ms": 210000,
                        "preview_url": None,
                        "external_urls": {"spotify": "https://open.spotify.com/track/1"},
                        "image_url": "https://via.placeholder.com/300x300?text=Mock+Song"
                    }
                ],
                "total": 1
            }
        }

    @app.get("/spotify/mood-recommendations")
    async def mock_mood_recommendations(mood: str, limit: int = 20):
        """Mock mood recommendations for development"""
        return {
            "success": True,
            "recommendations": {
                "tracks": [
                    {
                        "id": "1",
                        "name": f"Mock {mood.capitalize()} Song",
                        "artists": ["Mock Artist"],
                        "album": "Mock Album",
                        "duration_ms": 210000,
                        "preview_url": None,
                        "external_urls": {"spotify": "https://open.spotify.com/track/1"},
                        "image_url": "https://via.placeholder.com/300x300?text=Mock+Song"
                    }
                ],
                "total": 1
            }
        }

@app.post("/analyze-voice-and-recommend")
async def analyze_voice_and_recommend_music(audio_file: UploadFile = File(...), music_limit: int = 10):
    """Mock combined voice analysis and music recommendation"""
    import random
    
    # Mock emotion detection
    emotions = ["happy", "sad", "angry", "neutral", "excited", "calm"]
    emotion = random.choice(emotions)
    confidence = round(random.uniform(0.7, 0.95), 2)
    
    # Mock music recommendations
    if spotify_service:
        try:
            recommendations = spotify_service.get_mood_based_recommendations(emotion, music_limit)
            music_results = recommendations
        except:
            music_results = {"tracks": [], "total": 0}
    else:
        music_results = {
            "tracks": [
                {
                    "id": "1",
                    "name": f"Mock {emotion.capitalize()} Song",
                    "artists": ["Mock Artist"],
                    "album": "Mock Album",
                    "duration_ms": 210000,
                    "preview_url": None,
                    "external_urls": {"spotify": "https://open.spotify.com/track/1"},
                    "image_url": "https://via.placeholder.com/300x300?text=Mock+Song"
                }
            ],
            "total": 1
        }
    
    return {
        "voice_analysis": {
            "emotion": emotion,
            "confidence": confidence,
            "message": f"Mock analysis: Detected {emotion}"
        },
        "music_recommendations": music_results
    }

if __name__ == "__main__":
    print("🚀 Starting Development Backend Server...")
    print("📍 Server URL: http://localhost:8001")
    print("📊 Features:")
    print("   ✅ Mock voice emotion detection")
    print(f"   {'✅' if spotify_service else '⚠️'} Spotify integration {'(Active)' if spotify_service else '(Mock mode)'}")
    print("   ✅ CORS enabled for frontend")
    print("   ✅ FastAPI documentation at /docs")
    print()
    
    uvicorn.run(app, host="127.0.0.1", port=8001, reload=True)