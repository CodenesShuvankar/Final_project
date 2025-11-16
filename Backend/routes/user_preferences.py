"""
User Preferences API Routes
Handles user settings, interests, and profile management
"""
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from middleware.supabase_auth import get_current_user
from database import supabase
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
        logger.info(f"📖 Fetching preferences for user: {user_id[:8]}...")
        
        # Query user preferences from Supabase
        response = supabase.table('user_preferences') \
            .select('*') \
            .eq('user_id', user_id) \
            .execute()
        
        if not response.data or len(response.data) == 0:
            # Create default preferences if none exist
            default_prefs = {
                'user_id': user_id,
                'theme': 'system',
                'auto_mood_detection': False,
                'explicit_content': True,
                'preferred_genres': [],
                'language_priorities': ['English']  # Default language
            }
            
            create_response = supabase.table('user_preferences').insert(default_prefs).execute()
            
            if create_response.data:
                logger.info(f"✅ Created default preferences for user {user_id[:8]}")
                return {
                    "success": True,
                    "preferences": create_response.data[0]
                }
        
        logger.info(f"✅ Fetched preferences for user {user_id[:8]}")
        return {
            "success": True,
            "preferences": response.data[0]
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
        
        # Check if preferences exist
        check_response = supabase.table('user_preferences') \
            .select('id') \
            .eq('user_id', user_id) \
            .execute()
        
        if not check_response.data or len(check_response.data) == 0:
            # Create new preferences
            insert_data = {
                'user_id': user_id,
                'preferred_genres': request.interests,
                'theme': 'system',
                'auto_mood_detection': False,
                'explicit_content': True
            }
            response = supabase.table('user_preferences').insert(insert_data).execute()
        else:
            # Update existing preferences
            response = supabase.table('user_preferences') \
                .update({'preferred_genres': request.interests}) \
                .eq('user_id', user_id) \
                .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update interests"
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
        
        # Check if preferences exist
        check_response = supabase.table('user_preferences') \
            .select('id') \
            .eq('user_id', user_id) \
            .execute()
        
        if not check_response.data or len(check_response.data) == 0:
            # Create new preferences
            insert_data = {
                'user_id': user_id,
                'language_priorities': request.language_priorities,
                'theme': 'system',
                'auto_mood_detection': False,
                'explicit_content': True,
                'preferred_genres': []
            }
            response = supabase.table('user_preferences').insert(insert_data).execute()
        else:
            # Update existing preferences
            response = supabase.table('user_preferences') \
                .update({'language_priorities': request.language_priorities}) \
                .eq('user_id', user_id) \
                .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update language priorities"
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
