"""
Spotify Service using RapidAPI
"""
import os
import requests
from dotenv import load_dotenv
import logging
from typing import List, Dict, Optional

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class SpotifyService:
    """Service class for Spotify API integration via RapidAPI"""
    
    # Emotion to search query mapping
    EMOTION_TO_QUERY = {
        'happy': 'happy upbeat songs',
        'sad': 'sad emotional songs',
        'angry': 'angry rock metal songs',
        'neutral': 'chill indie songs',
        'fear': 'dark ambient songs',
        'disgust': 'punk grunge songs',
        'surprise': 'exciting uplifting songs',
    }
    
    def __init__(self):
        """Initialize Spotify service with RapidAPI credentials"""
        self.api_key = os.getenv('RAPIDAPI_KEY')
        self.api_host = os.getenv('RAPIDAPI_HOST', 'spotify81.p.rapidapi.com')
        self.api_url = os.getenv('RAPIDAPI_URL', 'https://spotify81.p.rapidapi.com')
        
        if not self.api_key:
            logger.warning("RapidAPI key not found in environment variables!")
            logger.warning("Please set RAPIDAPI_KEY in .env file")
        else:
            logger.info("✓ RapidAPI Spotify service initialized successfully")
    
    def _check_api_key(self):
        """Check if API key is set"""
        if not self.api_key:
            raise Exception(
                "RapidAPI key not initialized. "
                "Please set RAPIDAPI_KEY in .env file"
            )
    
    def _make_request(self, query: str, limit: int = 20) -> Dict:
        """
        Make request to RapidAPI Spotify endpoint
        
        Args:
            query: Search query
            limit: Number of results
            
        Returns:
            API response as dictionary
        """
        self._check_api_key()
        
        url = f"{self.api_url}/search"
        
        querystring = {
            "q": query,
            "type": "multi",
            "offset": "0",
            "limit": str(limit),
            "numberOfTopResults": "5"
        }
        
        headers = {
            "X-RapidAPI-Key": self.api_key,
            "X-RapidAPI-Host": self.api_host
        }
        
        # Retry logic for timeout errors
        max_retries = 3
        for attempt in range(max_retries):
            try:
                logger.info(f"Making request to RapidAPI (attempt {attempt + 1}/{max_retries})")
                response = requests.get(url, headers=headers, params=querystring, timeout=30)
                response.raise_for_status()
                return response.json()
            except requests.exceptions.Timeout as e:
                logger.warning(f"Request timeout on attempt {attempt + 1}: {e}")
                if attempt == max_retries - 1:
                    raise Exception(f"Failed to fetch from Spotify API after {max_retries} attempts: Request timed out")
            except requests.exceptions.RequestException as e:
                logger.error(f"RapidAPI request failed: {e}")
                raise Exception(f"Failed to fetch from Spotify API: {e}")
    
    def _parse_tracks(self, response_data: Dict, mood: str = None) -> List[Dict]:
        """
        Parse tracks from API response
        
        Args:
            response_data: Raw API response
            mood: Optional mood/emotion tag
            
        Returns:
            List of formatted track information
        """
        tracks = []
        
        try:
            # RapidAPI Spotify returns tracks in 'tracks' key
            if 'tracks' in response_data and 'items' in response_data['tracks']:
                items = response_data['tracks']['items']
            elif 'tracks' in response_data:
                items = response_data['tracks']
            else:
                logger.warning("Unexpected response format")
                return tracks
            
            for item in items:
                try:
                    # Extract track data
                    data = item.get('data', item)
                    
                    # Get Spotify URI and convert to URL
                    spotify_uri = data.get('uri', '')
                    spotify_url = spotify_uri.replace('spotify:track:', 'https://open.spotify.com/track/') if spotify_uri else ''
                    
                    track_info = {
                        'id': data.get('id', ''),
                        'name': data.get('name', 'Unknown'),
                        'artists': [artist.get('profile', {}).get('name', 'Unknown') 
                                   for artist in data.get('artists', {}).get('items', [])],
                        'album': data.get('albumOfTrack', {}).get('name', 'Unknown'),
                        'duration_ms': data.get('duration', {}).get('totalMilliseconds', 0),
                        'preview_url': None,  # RapidAPI doesn't provide preview audio URLs
                        'external_urls': {
                            'spotify': spotify_url
                        },
                        'image_url': data.get('albumOfTrack', {}).get('coverArt', {}).get('sources', [{}])[0].get('url', None),
                        'popularity': 0  # RapidAPI doesn't provide popularity
                    }
                    
                    if mood:
                        track_info['mood'] = mood
                    
                    tracks.append(track_info)
                    
                except Exception as e:
                    logger.warning(f"Error parsing track: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"Error parsing response: {e}")
        
        return tracks
    
    def get_general_recommendations(self, limit: int = 20, language: str = None) -> List[Dict]:
        """
        Get general music recommendations for home page
        
        Args:
            limit: Maximum number of recommendations
            language: Optional language preference (e.g., 'Bengali', 'Hindi', 'English')
            
        Returns:
            List of recommended track information
        """
        try:
            # Search for popular/trending songs with language preference
            if language and language.lower() != 'english':
                query = f"trending {language} songs 2025"
                logger.info(f"Searching for trending songs in {language}")
            else:
                query = "top hits 2025"
            
            response_data = self._make_request(query, limit)
            tracks = self._parse_tracks(response_data)
            
            logger.info(f"Generated {len(tracks)} general recommendations (language: {language or 'default'})")
            return tracks
            
        except Exception as e:
            logger.error(f"Error getting general recommendations: {e}")
            raise
    
    def get_mood_recommendations(self, mood: str, limit: int = 20) -> List[Dict]:
        """
        Get music recommendations based on detected mood/emotion
        
        Args:
            mood: Detected emotion (e.g., 'happy', 'sad', 'angry')
            limit: Maximum number of recommendations
            
        Returns:
            List of recommended track information
        """
        try:
            mood_lower = mood.lower()
            
            # Get search query for this mood
            query = self.EMOTION_TO_QUERY.get(mood_lower, f"{mood} songs")
            
            logger.info(f"Searching for mood '{mood}' with query: '{query}'")
            
            response_data = self._make_request(query, limit)
            tracks = self._parse_tracks(response_data, mood)
            
            logger.info(f"Generated {len(tracks)} recommendations for mood: {mood}")
            return tracks
            
        except Exception as e:
            logger.error(f"Error getting mood-based recommendations: {e}")
            raise
    
    def search_tracks(self, query: str, limit: int = 20) -> List[Dict]:
        """
        Search for tracks on Spotify
        
        Args:
            query: Search query string
            limit: Maximum number of results (default 20)
            
        Returns:
            List of track information dictionaries
        """
        try:
            response_data = self._make_request(query, limit)
            tracks = self._parse_tracks(response_data)
            
            logger.info(f"Found {len(tracks)} tracks for query: {query}")
            return tracks
            
        except Exception as e:
            logger.error(f"Error searching tracks: {e}")
            raise
