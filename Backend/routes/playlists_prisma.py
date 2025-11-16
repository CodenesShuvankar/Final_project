"""
Playlist API Routes with Prisma ORM
Handles playlist CRUD operations with proper user auth
"""
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from middleware.supabase_auth import get_current_user
from database import db
import logging

router = APIRouter(prefix="/api/playlists", tags=["playlists"])
logger = logging.getLogger(__name__)

# Request/Response Models
class CreatePlaylistRequest(BaseModel):
    name: str
    description: Optional[str] = None
    cover_url: Optional[str] = None
    is_public: Optional[bool] = False

class UpdatePlaylistRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None
    is_public: Optional[bool] = None

class AddSongRequest(BaseModel):
    song_id: str
    song_name: str
    artist_name: str
    album_name: Optional[str] = None
    duration_ms: Optional[int] = None
    image_url: Optional[str] = None
    spotify_url: Optional[str] = None
    preview_url: Optional[str] = None
    position: Optional[int] = 0

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_playlist(
    request: CreatePlaylistRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a new playlist for the authenticated user"""
    try:
        logger.info(f"🎵 Creating playlist '{request.name}' for user {user['sub']}")
        logger.info(f"📋 Request data: name={request.name}, description={request.description}")
        
        playlist = await db.playlist.create(
            data={
                "user_id": user["sub"],
                "name": request.name,
                "description": request.description,
                "cover_url": request.cover_url,
                "is_public": request.is_public or False
            }
        )
        
        logger.info(f"✅ Created playlist '{playlist.name}' (ID: {playlist.id}) for user {user['sub']}")
        
        return {
            "success": True,
            "playlist": {
                "id": playlist.id,
                "name": playlist.name,
                "description": playlist.description,
                "cover_url": playlist.cover_url,
                "is_public": playlist.is_public,
                "created_at": playlist.created_at.isoformat(),
                "updated_at": playlist.updated_at.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to create playlist: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create playlist: {str(e)}"
        )

@router.get("/my")
async def get_user_playlists(
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Get all playlists for the authenticated user"""
    try:
        playlists = await db.playlist.find_many(
            where={"user_id": user["sub"]},
            order={"created_at": "desc"},
            include={"songs": True}
        )
        
        return {
            "success": True,
            "playlists": [
                {
                    "id": p.id,
                    "name": p.name,
                    "description": p.description,
                    "cover_url": p.cover_url,
                    "is_public": p.is_public,
                    "song_count": len(p.songs) if p.songs else 0,
                    "total_duration": sum(song.duration_ms or 0 for song in (p.songs or [])) // 1000,  # Convert to seconds
                    "created_at": p.created_at.isoformat(),
                    "updated_at": p.updated_at.isoformat()
                }
                for p in playlists
            ]
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to fetch playlists: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch playlists: {str(e)}"
        )

@router.get("/{playlist_id}")
async def get_playlist(
    playlist_id: str,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Get a specific playlist with songs"""
    try:
        playlist = await db.playlist.find_unique(
            where={"id": playlist_id},
            include={
                "songs": {
                    "order_by": {"position": "asc"}
                }
            }
        )
        
        if not playlist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Playlist not found"
            )
        
        # Verify ownership
        if playlist.user_id != user["sub"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        return {
            "success": True,
            "playlist": {
                "id": playlist.id,
                "name": playlist.name,
                "description": playlist.description,
                "cover_url": playlist.cover_url,
                "is_public": playlist.is_public,
                "created_at": playlist.created_at.isoformat(),
                "updated_at": playlist.updated_at.isoformat(),
                "songs": [
                    {
                        "id": s.id,
                        "song_id": s.song_id,
                        "song_name": s.song_name,
                        "artist_name": s.artist_name,
                        "album_name": s.album_name,
                        "duration_ms": s.duration_ms,
                        "image_url": s.image_url,
                        "spotify_url": s.spotify_url,
                        "preview_url": s.preview_url,
                        "position": s.position,
                        "added_at": s.added_at.isoformat()
                    }
                    for s in (playlist.songs or [])
                ]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to fetch playlist: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch playlist: {str(e)}"
        )

@router.put("/{playlist_id}")
async def update_playlist(
    playlist_id: str,
    request: UpdatePlaylistRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Update playlist details"""
    try:
        # Verify ownership
        playlist = await db.playlist.find_unique(where={"id": playlist_id})
        if not playlist or playlist.user_id != user["sub"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Playlist not found"
            )
        
        # Build update data
        update_data = {}
        if request.name is not None:
            update_data["name"] = request.name
        if request.description is not None:
            update_data["description"] = request.description
        if request.cover_url is not None:
            update_data["cover_url"] = request.cover_url
        if request.is_public is not None:
            update_data["is_public"] = request.is_public
        
        updated_playlist = await db.playlist.update(
            where={"id": playlist_id},
            data=update_data
        )
        
        return {
            "success": True,
            "playlist": {
                "id": updated_playlist.id,
                "name": updated_playlist.name,
                "description": updated_playlist.description,
                "cover_url": updated_playlist.cover_url,
                "is_public": updated_playlist.is_public,
                "updated_at": updated_playlist.updated_at.isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to update playlist: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update playlist: {str(e)}"
        )

@router.delete("/{playlist_id}")
async def delete_playlist(
    playlist_id: str,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete a playlist"""
    try:
        # Verify ownership
        playlist = await db.playlist.find_unique(where={"id": playlist_id})
        if not playlist or playlist.user_id != user["sub"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Playlist not found"
            )
        
        await db.playlist.delete(where={"id": playlist_id})
        
        logger.info(f"🗑️ Deleted playlist {playlist_id}")
        
        return {
            "success": True,
            "message": "Playlist deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to delete playlist: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete playlist: {str(e)}"
        )

@router.post("/{playlist_id}/songs")
async def add_song_to_playlist(
    playlist_id: str,
    request: AddSongRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Add a song to a playlist"""
    try:
        # Verify ownership
        playlist = await db.playlist.find_unique(where={"id": playlist_id})
        if not playlist or playlist.user_id != user["sub"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Playlist not found"
            )
        
        # Add song
        song = await db.playlistsong.create(
            data={
                "playlist_id": playlist_id,
                "song_id": request.song_id,
                "song_name": request.song_name,
                "artist_name": request.artist_name,
                "album_name": request.album_name,
                "duration_ms": request.duration_ms,
                "image_url": request.image_url,
                "spotify_url": request.spotify_url,
                "preview_url": request.preview_url,
                "position": request.position or 0
            }
        )
        
        logger.info(f"➕ Added song '{song.song_name}' to playlist {playlist_id}")
        
        return {
            "success": True,
            "song": {
                "id": song.id,
                "song_id": song.song_id,
                "song_name": song.song_name,
                "artist_name": song.artist_name,
                "added_at": song.added_at.isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to add song: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add song: {str(e)}"
        )

@router.delete("/{playlist_id}/songs/{song_id}")
async def remove_song_from_playlist(
    playlist_id: str,
    song_id: str,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Remove a song from a playlist"""
    try:
        # Verify playlist ownership
        playlist = await db.playlist.find_unique(where={"id": playlist_id})
        if not playlist or playlist.user_id != user["sub"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Playlist not found"
            )
        
        # Remove song
        await db.playlistsong.delete(where={"id": song_id})
        
        logger.info(f"➖ Removed song {song_id} from playlist {playlist_id}")
        
        return {
            "success": True,
            "message": "Song removed successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to remove song: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove song: {str(e)}"
        )
