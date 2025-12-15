"""
Liked Songs Routes
Handles user's liked songs with Prisma ORM
"""
from fastapi import APIRouter, HTTPException, Depends, Form
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import logging
from middleware.supabase_auth import get_current_user
from database import db

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
    Get user's liked songs using Prisma
    """
    try:
        user_id = user_data.get('sub')
        
        # Query liked songs using Prisma
        liked_songs = await db.likedsong.find_many(
            where={'user_id': user_id},
            order={'liked_at': 'desc'},
            take=limit
        )
        
        if not liked_songs:
            return []
        
        # Convert to response format
        return [
            LikedSongResponse(
                song_id=song.song_id,
                song_name=song.song_name,
                artist_name=song.artist_name,
                album_name=song.album_name,
                image_url=song.image_url,
                spotify_url=song.spotify_url,
                duration_ms=song.duration_ms,
                liked_at=song.liked_at.isoformat()
            )
            for song in liked_songs
        ]
        
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
    Add a song to liked songs using Prisma
    """
    try:
        user_id = user_data.get('sub')
        
        # Check if already liked
        existing = await db.likedsong.find_first(
            where={
                'user_id': user_id,
                'song_id': song_id
            }
        )
        
        if existing:
            return {
                "success": True,
                "message": "Song already in liked songs",
                "already_liked": True
            }
        
        # Insert liked song
        await db.likedsong.create(
            data={
                'user_id': user_id,
                'song_id': song_id,
                'song_name': song_name,
                'artist_name': artist_name,
                'album_name': album_name,
                'image_url': image_url,
                'spotify_url': spotify_url,
                'duration_ms': duration_ms
            }
        )
        
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
    Remove a song from liked songs using Prisma
    """
    try:
        user_id = user_data.get('sub')
        
        # Delete liked song
        await db.likedsong.delete_many(
            where={
                'user_id': user_id,
                'song_id': song_id
            }
        )
        
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
    Check if a song is liked by the user using Prisma
    """
    try:
        user_id = user_data.get('sub')
        
        liked_song = await db.likedsong.find_first(
            where={
                'user_id': user_id,
                'song_id': song_id
            }
        )
        
        is_liked = liked_song is not None
        
        return {
            "song_id": song_id,
            "is_liked": is_liked
        }
        
    except Exception as e:
        logger.error(f"❌ Error checking liked status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to check liked status: {str(e)}")
