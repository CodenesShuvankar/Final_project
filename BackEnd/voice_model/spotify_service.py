"""
Spotify API Integration Service
Handles music search, playlist creation, and mood-based recommendations
"""

import os
import base64
import requests
from typing import Dict, List, Optional, Any
import logging
from fastapi import HTTPException
from pydantic import BaseModel
import json

logger = logging.getLogger(__name__)

# Pydantic models for Spotify API responses
class SpotifyTrack(BaseModel):
    id: str
    name: str
    artists: List[str]
    album: str
    duration_ms: int
    preview_url: Optional[str]
    external_urls: Dict[str, str]
    image_url: Optional[str] = None

class SpotifyPlaylist(BaseModel):
    id: str
    name: str
    description: str
    tracks: List[SpotifyTrack]
    total_tracks: int
    image_url: Optional[str] = None

class SpotifySearchResult(BaseModel):
    tracks: List[SpotifyTrack]
    total: int

class MoodMusicMapping(BaseModel):
    genres: List[str]
    search_terms: List[str]
    energy_range: tuple[float, float]  # 0.0 to 1.0
    valence_range: tuple[float, float]  # 0.0 to 1.0 (sadness to happiness)

class SpotifyService:
    def __init__(self):
        self.client_id = os.getenv('SPOTIFY_CLIENT_ID')
        self.client_secret = os.getenv('SPOTIFY_CLIENT_SECRET')
        self.redirect_uri = os.getenv('SPOTIFY_REDIRECT_URI', 'http://localhost:3000/callback')
        self.access_token = None
        self.refresh_token = None
        
        # Mood to music mapping
        self.mood_mappings = {
            'Happy': MoodMusicMapping(
                genres=['pop', 'dance', 'funk', 'disco', 'electronic'],
                search_terms=['happy', 'upbeat', 'cheerful', 'positive', 'energetic'],
                energy_range=(0.6, 1.0),
                valence_range=(0.7, 1.0)
            ),
            'Sad': MoodMusicMapping(
                genres=['indie', 'alternative', 'blues', 'folk', 'acoustic'],
                search_terms=['sad', 'melancholy', 'emotional', 'heartbreak', 'slow'],
                energy_range=(0.0, 0.4),
                valence_range=(0.0, 0.3)
            ),
            'Angry': MoodMusicMapping(
                genres=['rock', 'metal', 'punk', 'hardcore', 'rap'],
                search_terms=['angry', 'aggressive', 'intense', 'powerful', 'loud'],
                energy_range=(0.7, 1.0),
                valence_range=(0.0, 0.4)
            ),
            'Calm': MoodMusicMapping(
                genres=['ambient', 'classical', 'jazz', 'lofi', 'acoustic'],
                search_terms=['calm', 'peaceful', 'relaxing', 'meditation', 'chill'],
                energy_range=(0.0, 0.5),
                valence_range=(0.4, 0.8)
            ),
            'Energetic': MoodMusicMapping(
                genres=['electronic', 'dance', 'house', 'techno', 'pop'],
                search_terms=['energetic', 'upbeat', 'dance', 'workout', 'party'],
                energy_range=(0.8, 1.0),
                valence_range=(0.6, 1.0)
            ),
            'Neutral': MoodMusicMapping(
                genres=['pop', 'indie', 'alternative', 'rock'],
                search_terms=['popular', 'mainstream', 'current', 'trending'],
                energy_range=(0.4, 0.7),
                valence_range=(0.4, 0.7)
            )
        }

    def get_client_credentials_token(self) -> bool:
        """Get access token using client credentials flow (for app-only requests)"""
        if not self.client_id or not self.client_secret:
            logger.error("Spotify client credentials not found in environment variables")
            return False
        
        auth_string = f"{self.client_id}:{self.client_secret}"
        auth_bytes = auth_string.encode("utf-8")
        auth_base64 = base64.b64encode(auth_bytes).decode("utf-8")
        
        url = "https://accounts.spotify.com/api/token"
        headers = {
            "Authorization": f"Basic {auth_base64}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        data = {"grant_type": "client_credentials"}
        
        try:
            response = requests.post(url, headers=headers, data=data)
            response.raise_for_status()
            
            token_data = response.json()
            self.access_token = token_data["access_token"]
            logger.info("Successfully obtained Spotify access token")
            return True
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to get Spotify token: {str(e)}")
            return False

    def get_auth_headers(self) -> Dict[str, str]:
        """Get authorization headers for Spotify API requests"""
        if not self.access_token:
            if not self.get_client_credentials_token():
                raise HTTPException(status_code=500, detail="Unable to authenticate with Spotify")
        
        return {"Authorization": f"Bearer {self.access_token}"}

    def search_tracks(self, query: str, limit: int = 20) -> SpotifySearchResult:
        """Search for tracks on Spotify"""
        url = "https://api.spotify.com/v1/search"
        params = {
            "q": query,
            "type": "track",
            "limit": limit
        }
        
        try:
            response = requests.get(url, headers=self.get_auth_headers(), params=params)
            response.raise_for_status()
            
            data = response.json()
            tracks = []
            
            for item in data["tracks"]["items"]:
                track = SpotifyTrack(
                    id=item["id"],
                    name=item["name"],
                    artists=[artist["name"] for artist in item["artists"]],
                    album=item["album"]["name"],
                    duration_ms=item["duration_ms"],
                    preview_url=item.get("preview_url"),
                    external_urls=item["external_urls"],
                    image_url=item["album"]["images"][0]["url"] if item["album"]["images"] else None
                )
                tracks.append(track)
            
            return SpotifySearchResult(
                tracks=tracks,
                total=data["tracks"]["total"]
            )
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Spotify search failed: {str(e)}")
            raise HTTPException(status_code=500, detail="Spotify search failed")

    def get_mood_based_recommendations(self, mood: str, limit: int = 20) -> SpotifySearchResult:
        """Get music recommendations based on detected mood"""
        # Make mood case-insensitive by capitalizing first letter
        mood_key = mood.capitalize()
        if mood_key not in self.mood_mappings:
            # Default to neutral if mood not recognized
            mood_key = 'Neutral'
        
        mapping = self.mood_mappings[mood_key]
        
        # Create search query with search terms (genres are often too restrictive)
        search_terms = mapping.search_terms[:3]  # Use first 3 search terms
        
        # Use search terms that are more likely to return results
        query = " ".join(search_terms)
        
        logger.info(f"Searching for {mood_key} music with query: {query}")
        return self.search_tracks(query, limit)

    def get_recommendations_by_audio_features(self, mood: str, limit: int = 20) -> SpotifySearchResult:
        """Get recommendations using Spotify's audio features"""
        if mood not in self.mood_mappings:
            mood = 'Neutral'
        
        mapping = self.mood_mappings[mood]
        
        url = "https://api.spotify.com/v1/recommendations"
        params = {
            "limit": limit,
            "seed_genres": ",".join(mapping.genres[:5]),  # Max 5 seed genres
            "min_energy": mapping.energy_range[0],
            "max_energy": mapping.energy_range[1],
            "min_valence": mapping.valence_range[0],
            "max_valence": mapping.valence_range[1],
        }
        
        try:
            response = requests.get(url, headers=self.get_auth_headers(), params=params)
            response.raise_for_status()
            
            data = response.json()
            tracks = []
            
            for item in data["tracks"]:
                track = SpotifyTrack(
                    id=item["id"],
                    name=item["name"],
                    artists=[artist["name"] for artist in item["artists"]],
                    album=item["album"]["name"],
                    duration_ms=item["duration_ms"],
                    preview_url=item.get("preview_url"),
                    external_urls=item["external_urls"],
                    image_url=item["album"]["images"][0]["url"] if item["album"]["images"] else None
                )
                tracks.append(track)
            
            return SpotifySearchResult(
                tracks=tracks,
                total=len(tracks)
            )
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Spotify recommendations failed: {str(e)}")
            # Fallback to search-based recommendations
            return self.get_mood_based_recommendations(mood, limit)

    def get_playlist_by_id(self, playlist_id: str) -> SpotifyPlaylist:
        """Get a specific playlist by ID"""
        url = f"https://api.spotify.com/v1/playlists/{playlist_id}"
        
        try:
            response = requests.get(url, headers=self.get_auth_headers())
            response.raise_for_status()
            
            data = response.json()
            tracks = []
            
            for item in data["tracks"]["items"]:
                if item["track"]:  # Some tracks might be None
                    track_data = item["track"]
                    track = SpotifyTrack(
                        id=track_data["id"],
                        name=track_data["name"],
                        artists=[artist["name"] for artist in track_data["artists"]],
                        album=track_data["album"]["name"],
                        duration_ms=track_data["duration_ms"],
                        preview_url=track_data.get("preview_url"),
                        external_urls=track_data["external_urls"],
                        image_url=track_data["album"]["images"][0]["url"] if track_data["album"]["images"] else None
                    )
                    tracks.append(track)
            
            return SpotifyPlaylist(
                id=data["id"],
                name=data["name"],
                description=data["description"],
                tracks=tracks,
                total_tracks=data["tracks"]["total"],
                image_url=data["images"][0]["url"] if data["images"] else None
            )
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to get playlist: {str(e)}")
            raise HTTPException(status_code=404, detail="Playlist not found")

# Singleton instance
spotify_service = SpotifyService()