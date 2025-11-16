"""
Liked Songs Routes
Handles user's liked songs with Supabase direct queries
"""
from fastapi import APIRouter, HTTPException, Depends, Form
from typing import List, Optional
from pydantic import BaseModel
import logging
from middleware.supabase_auth import get_current_user
from database import supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/liked-songs", tags=["Liked Songs"])


class LikedSong(BaseModel):
    """Liked song model"""
    id: str
    user_id: str
    song_id: str
    song_name: str
    artist_name: str
    album_name: Optional[str] = None
    image_url: Optional[str] = None
    spotify_url: Optional[str] = None
    duration_ms: Optional[int] = None
    liked_at: str


class LikedSongResponse(BaseModel):
    """Response model for liked songs"""
    song_id: str
    song_name: str
    artist_name: str
    album_name: Optional[str] = None
    image_url: Optional[str] = None
    spotify_url: Optional[str] = None
    duration_ms: Optional[int] = None
    liked_at: str


@router.get("", response_model=List[LikedSongResponse])
async def get_liked_songs(
    limit: int = 50,
    user_data: dict = Depends(get_current_user)
):
    """
    Get user's liked songs
    """
    try:
        user_id = user_data.get('sub')
        logger.info(f"📖 Fetching liked songs for user: {user_id[:8]}...")
        
        # Query liked songs from Supabase
        response = supabase.table('liked_songs') \
            .select('*') \
            .eq('user_id', user_id) \
            .order('liked_at', desc=True) \
            .limit(limit) \
            .execute()
        
        if not response.data:
            logger.info(f"No liked songs found for user {user_id[:8]}")
            return []
        
        logger.info(f"✅ Found {len(response.data)} liked songs")
        return response.data
        
    except Exception as e:
        logger.error(f"❌ Error fetching liked songs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch liked songs: {str(e)}")


@router.post("")
async def like_song(
    song_id: str = Form(...),
    song_name: str = Form(...),
    artist_name: str = Form(...),
    album_name: Optional[str] = Form(None),
    image_url: Optional[str] = Form(None),
    spotify_url: Optional[str] = Form(None),
    duration_ms: Optional[int] = Form(None),
    user_data: dict = Depends(get_current_user)
):
    """
    Add a song to liked songs
    """
    try:
        user_id = user_data.get('sub')
        logger.info(f"❤️ Adding liked song: {song_name} by {artist_name} for user {user_id[:8]}")
        
        # Check if already liked
        existing = supabase.table('liked_songs') \
            .select('id') \
            .eq('user_id', user_id) \
            .eq('song_id', song_id) \
            .execute()
        
        if existing.data and len(existing.data) > 0:
            logger.info(f"Song {song_id} already liked by user {user_id[:8]}")
            return {
                "success": True,
                "message": "Song already in liked songs",
                "already_liked": True
            }
        
        # Insert liked song
        response = supabase.table('liked_songs').insert({
            'user_id': user_id,
            'song_id': song_id,
            'song_name': song_name,
            'artist_name': artist_name,
            'album_name': album_name,
            'image_url': image_url,
            'spotify_url': spotify_url,
            'duration_ms': duration_ms
        }).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to like song")
        
        logger.info(f"✅ Song liked successfully: {song_id}")
        return {
            "success": True,
            "message": "Song liked successfully",
            "already_liked": False
        }
        
    except Exception as e:
        logger.error(f"❌ Error liking song: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to like song: {str(e)}")


@router.delete("/{song_id}")
async def unlike_song(
    song_id: str,
    user_data: dict = Depends(get_current_user)
):
    """
    Remove a song from liked songs
    """
    try:
        user_id = user_data.get('sub')
        logger.info(f"💔 Unliking song: {song_id} for user {user_id[:8]}")
        
        # Delete liked song
        response = supabase.table('liked_songs') \
            .delete() \
            .eq('user_id', user_id) \
            .eq('song_id', song_id) \
            .execute()
        
        logger.info(f"✅ Song unliked successfully: {song_id}")
        return {
            "success": True,
            "message": "Song unliked successfully"
        }
        
    except Exception as e:
        logger.error(f"❌ Error unliking song: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to unlike song: {str(e)}")


@router.get("/check/{song_id}")
async def check_if_liked(
    song_id: str,
    user_data: dict = Depends(get_current_user)
):
    """
    Check if a song is liked by the user
    """
    try:
        user_id = user_data.get('sub')
        response = supabase.table('liked_songs') \
            .select('id') \
            .eq('user_id', user_id) \
            .eq('song_id', song_id) \
            .execute()
        
        is_liked = response.data and len(response.data) > 0
        
        return {
            "song_id": song_id,
            "is_liked": is_liked
        }
        
    except Exception as e:
        logger.error(f"❌ Error checking liked status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to check liked status: {str(e)}")
