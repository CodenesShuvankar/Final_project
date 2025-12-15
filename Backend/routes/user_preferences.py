"""
User Preferences API Routes
Handles user settings, interests, and profile management
"""
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from middleware.supabase_auth import get_current_user
from database import db
import logging
import os

router = APIRouter(prefix="/api/user-preferences", tags=["user_preferences"])
logger = logging.getLogger(__name__)

# Request Models
class UpdateInterestsRequest(BaseModel):
    interests: List[str]

class UpdateLanguagesRequest(BaseModel):
    language_priorities: List[str]

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@router.get("/")
async def get_user_preferences(
    user_data: dict = Depends(get_current_user)
):
    """Get user preferences including interests and profile photo"""
    try:
        user_id = user_data.get('sub')
        
        # Query user preferences using Prisma (bypasses RLS issues)
        preferences = await db.userpreference.find_first(
            where={"user_id": user_id}
        )
        
        if not preferences:
            # Create default preferences if none exist
            preferences = await db.userpreference.create(
                data={
                    "user_id": user_id,
                    "theme": "system",
                    "auto_mood_detection": False,
                    "explicit_content": True,
                    "preferred_genres": [],
                }
            )
        
        return {
            "success": True,
            "preferences": {
                "id": preferences.id,
                "user_id": preferences.user_id,
                "theme": preferences.theme,
                "auto_mood_detection": preferences.auto_mood_detection,
                "explicit_content": preferences.explicit_content,
                "preferred_genres": preferences.preferred_genres or [],
                "language_priorities": preferences.language_priorities or ["English"],
                "profile_photo_url": preferences.profile_photo_url,
                "created_at": preferences.created_at.isoformat(),
                "updated_at": preferences.updated_at.isoformat(),
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Error fetching preferences: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch preferences: {str(e)}"
        )


@router.post("/interests")
async def update_interests(
    request: UpdateInterestsRequest,
    user_data: dict = Depends(get_current_user)
):
    """Update user's music genre interests"""
    try:
        user_id = user_data.get('sub')
        logger.info(f"🎵 Updating interests for user: {user_id[:8]}...")
        logger.info(f"New interests: {request.interests}")
        
        # Check if preferences exist using Prisma
        preferences = await db.userpreference.find_first(
            where={"user_id": user_id}
        )
        
        if not preferences:
            # Create new preferences
            preferences = await db.userpreference.create(
                data={
                    "user_id": user_id,
                    "preferred_genres": request.interests,
                    "theme": "system",
                    "auto_mood_detection": False,
                    "explicit_content": True
                }
            )
        else:
            # Update existing preferences
            preferences = await db.userpreference.update(
                where={"user_id": user_id},
                data={"preferred_genres": request.interests}
            )
        
        logger.info(f"✅ Updated interests for user {user_id[:8]}")
        return {
            "success": True,
            "message": "Interests updated successfully",
            "interests": request.interests
        }
        
    except Exception as e:
        logger.error(f"❌ Error updating interests: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update interests: {str(e)}"
        )


@router.post("/languages")
async def update_language_priorities(
    request: UpdateLanguagesRequest,
    user_data: dict = Depends(get_current_user)
):
    """Update user's language preferences with priority order"""
    try:
        user_id = user_data.get('sub')
        logger.info(f"🌐 Updating language priorities for user: {user_id[:8]}...")
        logger.info(f"New language priorities: {request.language_priorities}")
        
        # Check if preferences exist using Prisma
        preferences = await db.userpreference.find_first(
            where={"user_id": user_id}
        )
        
        if not preferences:
            # Create new preferences
            preferences = await db.userpreference.create(
                data={
                    "user_id": user_id,
                    "language_priorities": request.language_priorities,
                    "theme": "system",
                    "auto_mood_detection": False,
                    "explicit_content": True,
                    "preferred_genres": []
                }
            )
        else:
            # Update existing preferences
            preferences = await db.userpreference.update(
                where={"user_id": user_id},
                data={"language_priorities": request.language_priorities}
            )
        
        logger.info(f"✅ Updated language priorities for user {user_id[:8]}")
        return {
            "success": True,
            "message": "Language preferences updated successfully",
            "language_priorities": request.language_priorities
        }
        
    except Exception as e:
        logger.error(f"❌ Error updating language priorities: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update language priorities: {str(e)}"
        )


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    user_data: dict = Depends(get_current_user)
):
    """Change user password via Supabase Auth"""
    try:
        user_id = user_data.get('sub')
        logger.info(f"🔒 Changing password for user: {user_id[:8]}...")
        
        # Use Supabase Admin API to update password
        from supabase import create_client
        
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
        
        if not supabase_url or not supabase_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Supabase configuration missing"
            )
        
        admin_client = create_client(supabase_url, supabase_key)
        
        # Update user password
        response = admin_client.auth.admin.update_user_by_id(
            user_id,
            {"password": request.new_password}
        )
        
        logger.info(f"✅ Password changed for user {user_id[:8]}")
        return {
            "success": True,
            "message": "Password changed successfully"
        }
        
    except Exception as e:
        logger.error(f"❌ Error changing password: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to change password: {str(e)}"
        )
