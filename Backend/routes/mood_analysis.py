"""
Mood Analysis API Routes with Prisma
Store and retrieve emotion detection results
"""
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from middleware.supabase_auth import get_current_user
from database import db
from datetime import datetime, timedelta
import logging

router = APIRouter(prefix="/api/mood", tags=["mood-analysis"])
logger = logging.getLogger(__name__)

# Request Models
class StoreMoodAnalysisRequest(BaseModel):
    detected_mood: str
    confidence: float
    voice_emotion: Optional[str] = None
    voice_confidence: Optional[float] = None
    face_emotion: Optional[str] = None
    face_confidence: Optional[float] = None
    valence_score: Optional[float] = None
    arousal_score: Optional[float] = None
    agreement: Optional[str] = None
    analysis_type: str  # "voice", "face", or "multimodal"


def _safe_float(value: Optional[str]) -> Optional[float]:
    try:
        return float(value) if value is not None else None
    except (TypeError, ValueError):
        return None

@router.post("/", status_code=status.HTTP_201_CREATED)
async def store_mood_analysis(
    request: StoreMoodAnalysisRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Store mood analysis result in database"""
    try:
        analysis = await db.moodanalysis.create(
            data={
                "user_id": user["sub"],
                "detected_mood": request.detected_mood,
                "confidence": request.confidence,
                "voice_emotion": request.voice_emotion,
                "voice_confidence": request.voice_confidence,
                "face_emotion": request.face_emotion,
                "face_confidence": request.face_confidence,
                "agreement": request.agreement,
                "analysis_type": request.analysis_type,
                "valence_score": str(request.valence_score) if request.valence_score is not None else None,
                "arousal_score": str(request.arousal_score) if request.arousal_score is not None else None,
            }
        )
        
        logger.info(f"📝 Stored mood analysis: {request.detected_mood} ({request.analysis_type}) for user {user['sub']}")
        
        return {
            "success": True,
            "analysis": {
                "id": analysis.id,
                "detected_mood": analysis.detected_mood,
                "confidence": analysis.confidence,
                "analysis_type": analysis.analysis_type,
                "valence_score": _safe_float(analysis.valence_score),
                "arousal_score": _safe_float(analysis.arousal_score),
                "created_at": analysis.created_at.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to store mood analysis: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to store mood analysis: {str(e)}"
        )

@router.get("/history")
async def get_mood_history(
    limit: int = 50,
    offset: int = 0,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Get user's mood detection history"""
    try:
        analyses = await db.moodanalysis.find_many(
            where={"user_id": user["sub"]},
            order={"created_at": "desc"},
            take=limit,
            skip=offset
        )
        
        total = await db.moodanalysis.count(
            where={"user_id": user["sub"]}
        )
        
        return {
            "success": True,
            "total": total,
            "analyses": [
                {
                    "id": a.id,
                    "detected_mood": a.detected_mood,
                    "confidence": a.confidence,
                    "voice_emotion": a.voice_emotion,
                    "voice_confidence": a.voice_confidence,
                    "face_emotion": a.face_emotion,
                    "face_confidence": a.face_confidence,
                    "agreement": a.agreement,
                    "analysis_type": a.analysis_type,
                    "valence_score": _safe_float(a.valence_score),
                    "arousal_score": _safe_float(a.arousal_score),
                    "created_at": a.created_at.isoformat()
                }
                for a in analyses
            ]
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to fetch mood history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch mood history: {str(e)}"
        )

@router.get("/stats")
async def get_mood_stats(
    days: int = 30,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Get mood detection statistics"""
    try:
        since = datetime.utcnow() - timedelta(days=days)
        
        analyses = await db.moodanalysis.find_many(
            where={
                "user_id": user["sub"],
                "created_at": {"gte": since}
            }
        )
        
        # Calculate mood distribution
        mood_counts = {}
        for analysis in analyses:
            mood = analysis.detected_mood
            mood_counts[mood] = mood_counts.get(mood, 0) + 1
        
        # Calculate average confidence by mood
        mood_confidence = {}
        for analysis in analyses:
            mood = analysis.detected_mood
            if mood not in mood_confidence:
                mood_confidence[mood] = []
            mood_confidence[mood].append(analysis.confidence)
        
        avg_confidence = {
            mood: sum(confidences) / len(confidences)
            for mood, confidences in mood_confidence.items()
        }
        
        return {
            "success": True,
            "period_days": days,
            "stats": {
                "total_analyses": len(analyses),
                "mood_distribution": mood_counts,
                "average_confidence": avg_confidence,
                "analysis_types": {
                    "voice": sum(1 for a in analyses if a.analysis_type == "voice"),
                    "face": sum(1 for a in analyses if a.analysis_type == "face"),
                    "multimodal": sum(1 for a in analyses if a.analysis_type == "multimodal")
                }
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to fetch mood stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch mood stats: {str(e)}"
        )

@router.get("/latest")
async def get_latest_mood(
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Get user's most recent mood analysis"""
    try:
        analysis = await db.moodanalysis.find_first(
            where={"user_id": user["sub"]},
            order={"created_at": "desc"}
        )
        
        if not analysis:
            return {
                "success": True,
                "analysis": None
            }
        
        return {
            "success": True,
            "analysis": {
                "id": analysis.id,
                "detected_mood": analysis.detected_mood,
                "confidence": analysis.confidence,
                "analysis_type": analysis.analysis_type,
                "valence_score": _safe_float(analysis.valence_score),
                "arousal_score": _safe_float(analysis.arousal_score),
                "created_at": analysis.created_at.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to fetch latest mood: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch latest mood: {str(e)}"
        )

@router.delete("/")
async def clear_mood_history(
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Clear user's mood analysis history"""
    try:
        result = await db.moodanalysis.delete_many(
            where={"user_id": user["sub"]}
        )
        
        logger.info(f"🗑️ Cleared {result} mood analyses for user {user['sub']}")
        
        return {
            "success": True,
            "message": f"Cleared {result} mood analyses"
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to clear mood history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear mood history: {str(e)}"
        )
