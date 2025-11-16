"""
Listening History API Routes with Prisma
Track user's listening activity
"""
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from middleware.supabase_auth import get_current_user
from database import db
from datetime import datetime, timedelta
import logging

router = APIRouter(prefix="/api/history", tags=["history"])
logger = logging.getLogger(__name__)

# Request Models
class AddHistoryRequest(BaseModel):
    song_id: str
    song_name: str
    artist_name: str
    album_name: Optional[str] = None
    image_url: Optional[str] = None
    spotify_url: Optional[str] = None
    duration_ms: Optional[int] = None
    completed: Optional[bool] = False
    mood_detected: Optional[str] = None

@router.post("/", status_code=status.HTTP_201_CREATED)
async def add_to_history(
    request: AddHistoryRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Add a song to user's listening history"""
    try:
        history_entry = await db.listeninghistory.create(
            data={
                "user_id": user["sub"],
                "song_id": request.song_id,
                "song_name": request.song_name,
                "artist_name": request.artist_name,
                "album_name": request.album_name,
                "image_url": request.image_url,
                "spotify_url": request.spotify_url,
                "duration_ms": request.duration_ms,
                "completed": request.completed or False,
                "mood_detected": request.mood_detected
            }
        )
        
        logger.info(f"📝 Added '{history_entry.song_name}' to history for user {user['sub']}")
        
        return {
            "success": True,
            "history": {
                "id": history_entry.id,
                "song_name": history_entry.song_name,
                "artist_name": history_entry.artist_name,
                "played_at": history_entry.played_at.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to add to history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add to history: {str(e)}"
        )

@router.get("/")
async def get_listening_history(
    limit: int = 50,
    offset: int = 0,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Get user's listening history"""
    try:
        history = await db.listeninghistory.find_many(
            where={"user_id": user["sub"]},
            order={"played_at": "desc"},
            take=limit,
            skip=offset
        )
        
        total = await db.listeninghistory.count(
            where={"user_id": user["sub"]}
        )
        
        return {
            "success": True,
            "total": total,
            "history": [
                {
                    "id": h.id,
                    "song_id": h.song_id,
                    "song_name": h.song_name,
                    "artist_name": h.artist_name,
                    "album_name": h.album_name,
                    "image_url": h.image_url,
                    "spotify_url": h.spotify_url,
                    "duration_ms": h.duration_ms,
                    "completed": h.completed,
                    "mood_detected": h.mood_detected,
                    "played_at": h.played_at.isoformat()
                }
                for h in history
            ]
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to fetch history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch history: {str(e)}"
        )

@router.get("/recent")
async def get_recent_history(
    limit: int = 10,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Get user's recently played songs"""
    try:
        # Get songs from last 24 hours
        since = datetime.utcnow() - timedelta(days=1)
        
        history = await db.listeninghistory.find_many(
            where={
                "user_id": user["sub"],
                "played_at": {"gte": since}
            },
            order={"played_at": "desc"},
            take=limit
        )
        
        return {
            "success": True,
            "count": len(history),
            "recent": [
                {
                    "id": h.id,
                    "song_name": h.song_name,
                    "artist_name": h.artist_name,
                    "image_url": h.image_url,
                    "played_at": h.played_at.isoformat()
                }
                for h in history
            ]
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to fetch recent history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch recent history: {str(e)}"
        )

@router.get("/stats")
async def get_listening_stats(
    days: int = 30,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Get user's listening statistics"""
    try:
        since = datetime.utcnow() - timedelta(days=days)
        
        # Total plays
        total_plays = await db.listeninghistory.count(
            where={
                "user_id": user["sub"],
                "played_at": {"gte": since}
            }
        )
        
        # Get all history for analysis
        history = await db.listeninghistory.find_many(
            where={
                "user_id": user["sub"],
                "played_at": {"gte": since}
            }
        )
        
        # Top artists
        artist_counts = {}
        for h in history:
            artist_counts[h.artist_name] = artist_counts.get(h.artist_name, 0) + 1
        
        top_artists = sorted(
            [{"name": k, "plays": v} for k, v in artist_counts.items()],
            key=lambda x: x["plays"],
            reverse=True
        )[:10]
        
        # Mood distribution
        mood_counts = {}
        for h in history:
            if h.mood_detected:
                mood_counts[h.mood_detected] = mood_counts.get(h.mood_detected, 0) + 1
        
        return {
            "success": True,
            "period_days": days,
            "stats": {
                "total_plays": total_plays,
                "unique_songs": len(set(h.song_id for h in history)),
                "unique_artists": len(artist_counts),
                "top_artists": top_artists,
                "mood_distribution": mood_counts
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to fetch stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch stats: {str(e)}"
        )

@router.delete("/")
async def clear_history(
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Clear user's listening history"""
    try:
        result = await db.listeninghistory.delete_many(
            where={"user_id": user["sub"]}
        )
        
        logger.info(f"🗑️ Cleared {result} history entries for user {user['sub']}")
        
        return {
            "success": True,
            "message": f"Cleared {result} history entries"
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to clear history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear history: {str(e)}"
        )

@router.delete("/{history_id}")
async def delete_history_entry(
    history_id: str,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete a specific history entry"""
    try:
        # Verify ownership
        entry = await db.listeninghistory.find_unique(where={"id": history_id})
        if not entry or entry.user_id != user["sub"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="History entry not found"
            )
        
        await db.listeninghistory.delete(where={"id": history_id})
        
        return {
            "success": True,
            "message": "History entry deleted"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to delete history entry: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete history entry: {str(e)}"
        )
