from fastapi import FastAPI, HTTPException, UploadFile, File, Header, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
import logging
from pathlib import Path
import tempfile
import video_model.face_expression as face_expression
import voice_model.voice_api as voice_api
from services.spotify_service import SpotifyService
from services.emotion_fusion import emotion_fusion
from routes import playlists_prisma as playlists
from routes import history
from routes import mood_analysis
from routes import liked_songs
from routes import user_preferences
from database import connect_db, disconnect_db, db
from middleware.supabase_auth import verify_supabase_token, get_current_user
from contextlib import asynccontextmanager
from typing import Optional

# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_db()
    logger.info("🚀 Application started")
    yield
    # Shutdown
    await disconnect_db()
    logger.info("👋 Application shutdown")

# Initialize FastAPI app with lifespan
app = FastAPI(
    title="VibeTune Emotion Detection API",
    version="2.0.0",
    description="AI-powered music recommendation with emotion detection and Prisma ORM",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Model path (use raw string for Windows paths)
model_path = Path(__file__).parent / "voice_model" / "final_voice_model"

# Initialize Spotify service
spotify_service = SpotifyService()

# Register routes
app.include_router(playlists.router)
app.include_router(history.router)
app.include_router(mood_analysis.router)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "VibeTune API v2.0",
        "status": "running",
        "features": [
            "Voice emotion detection",
            "Facial expression analysis",
            "Multimodal mood detection",
            "Music recommendations",
            "User playlists (Prisma)",
            "Listening history (Prisma)"
        ]
    }


#===============================================
#Facial Expression detection
#===============================================

@app.post("/detect-facial-expression")
async def detect_facial_expression(image_file: UploadFile = File(...)):
    """
    Detect facial expression from uploaded image
    Supports: JPG, JPEG, PNG formats
    """
    try:
        # Validate file type
        allowed_extensions = ['.jpg', '.jpeg', '.png']
        file_ext = Path(image_file.filename).suffix.lower()
        
        if file_ext not in allowed_extensions:
            return {
                "success": False,
                "error": f"Unsupported file format. Allowed: {', '.join(allowed_extensions)}"
            }
        
        # Create temporary file for image
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
            content = await image_file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name
        
        # Detect expression
        result = face_expression.detect_expression(tmp_path)
        
        # Clean up temporary file
        import os
        os.unlink(tmp_path)
        
        return result
        
    except Exception as e:
        logger.error(f"Facial expression detection error: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

# =============================================
# MOOD HISTORY ENDPOINT
# =============================================
@app.get("/mood-history")
async def get_mood_history(
    limit: int = 100,
    days: int = 30,
    authorization: str = Header(None)
):
    """
    Get user's mood detection history
    
    Args:
        limit: Maximum number of records to return
        days: Number of days to look back (default: 30)
    """
    from middleware.supabase_auth import verify_supabase_token
    from datetime import datetime, timedelta
    
    # Verify authentication
    user_id = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        payload = verify_supabase_token(token)
        if payload:
            user_id = payload.get("sub")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    try:
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        logger.info(f"📅 Fetching mood history for user {user_id[:8]}... from {start_date.date()} to {end_date.date()}")
        
        # Fetch mood history from database within date range
        mood_history = await db.moodanalysis.find_many(
            where={
                "user_id": user_id,
                "created_at": {
                    "gte": start_date,
                    "lte": end_date
                }
            },
            order={"created_at": "desc"},
            take=limit
        )
        
        return {
            "success": True,
            "history": [
                {
                    "id": mood.id,
                    "detected_mood": mood.detected_mood,
                    "confidence": mood.confidence,
                    "voice_emotion": mood.voice_emotion,
                    "voice_confidence": mood.voice_confidence,
                    "face_emotion": mood.face_emotion,
                    "face_confidence": mood.face_confidence,
                    "agreement": mood.agreement,
                    "analysis_type": mood.analysis_type,
                    "created_at": mood.created_at.isoformat() if mood.created_at else None
                }
                for mood in mood_history
            ],
            "count": len(mood_history)
        }
    except Exception as e:
        logger.error(f"Failed to fetch mood history: {e}")
        return {
            "success": False,
            "error": str(e),
            "history": [],
            "count": 0
        }


# # Backward compatibility endpoint
# @app.get("/detect_facical_expression")
# async def get_facial_expression(image_path: str):
#     try:
#         detected_expression = face_expression.detect_expression_simple(image_path)
#         return {"success": True, "emotion": detected_expression}
#     except Exception as e:
#         logger.error(f"Facial expression detection error: {str(e)}")
#         raise HTTPException(status_code=500, detail=str(e))

#===============================================
#Voice emotion detection
#==============================================
@app.post("/analyze-voice")
async def analyze_voice(
    audio_file: UploadFile = File(...),
    authorization: Optional[str] = Header(None)
):
    """
    Analyze emotion from uploaded audio file
    Supports: WAV, MP3, M4A, FLAC, WebM, OGG formats
    
    Optional: Include Authorization header to auto-save results to database
    """
    user_id = None
    
    # Try to get user from authorization header (optional)
    if authorization and authorization.startswith('Bearer '):
        try:
            token = authorization.split(' ')[1]
            user_data = verify_supabase_token(token)
            user_id = user_data.get('sub')
            logger.info(f"✅ Authenticated user: {user_id}")
        except Exception as e:
            logger.warning(f"⚠️ Auth token invalid or expired: {e}")
            # Continue without auth - endpoint works for non-authenticated users too
    
    try:
        # Validate file type - include webm for browser recordings
        allowed_extensions = ['.wav', '.mp3', '.m4a', '.flac', '.opus', '.webm', '.ogg']
        file_ext = Path(audio_file.filename).suffix.lower()
        
        if file_ext not in allowed_extensions:
            return {
                "success": False,
                "error": f"Unsupported file format. Allowed: {', '.join(allowed_extensions)}"
            }
        
        
        # Use the convenient wrapper function
        result = voice_api.analyze_audio_upload(audio_file, model_path)
        
        # Store mood analysis in database if user is authenticated and analysis succeeded
        if user_id and result.get("success"):
            try:
                from datetime import datetime
                await db.moodanalysis.create(
                    data={
                        "user_id": user_id,
                        "detected_mood": result["emotion"],
                        "confidence": result["confidence"],
                        "voice_emotion": result["emotion"],
                        "voice_confidence": result["confidence"],
                        "analysis_type": "voice",
                        "created_at": datetime.utcnow()
                    }
                )
                logger.info(f"📝 Stored voice mood analysis for user {user_id}")
            except Exception as db_error:
                logger.error(f"❌ Failed to store mood analysis: {db_error}")
                # Don't fail the request if database storage fails
        
        return result
        
    except Exception as e:
        logger.error(f"Voice emotion analysis error: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

#===============================================
# Spotify API Endpoints
#===============================================

@app.get("/recommendations")
async def get_recommendations(limit: int = 20, language: str = None):
    """
    Get general music recommendations for home page
    No mood required - returns popular/trending tracks
    
    Args:
        limit: Number of recommendations
        language: Optional language preference (e.g., 'Bengali', 'Hindi', 'English')
    """
    try:
        recommendations = spotify_service.get_general_recommendations(limit, language)
        return {
            "success": True,
            "count": len(recommendations),
            "recommendations": recommendations,
            "language": language
        }
    except Exception as e:
        logger.error(f"Recommendations error: {str(e)}")
        return {"success": False, "error": str(e)}


@app.get("/recommendations/mood/{mood}")
async def get_mood_recommendations(mood: str, limit: int = 20, language: str = None):
    """
    Get music recommendations based on detected mood/emotion with optional language preference
    
    Supported moods: happy, sad, angry, neutral, fear, disgust, surprise
    
    Example: /recommendations/mood/happy?limit=20&language=Hindi
    """
    try:
        # Combine mood with language for better results
        search_mood = f"{mood} {language}" if language else mood
        logger.info(f"🎵 Getting recommendations for mood: {mood} with language: {language} (search: {search_mood}, limit: {limit})")
        recommendations = spotify_service.get_mood_recommendations(search_mood, limit)
        return {
            "success": True,
            "mood": mood,
            "language": language,
            "count": len(recommendations),
            "recommendations": recommendations
        }
    except Exception as e:
        logger.error(f"Mood recommendations error: {str(e)}")
        return {"success": False, "error": str(e)}


@app.get("/spotify/search")
async def search_spotify_music(query: str, limit: int = 20):
    """Search for music on Spotify by query string"""
    try:
        results = spotify_service.search_tracks(query, limit)
        return {
            "success": True,
            "query": query,
            "count": len(results),
            "results": results
        }
    except Exception as e:
        logger.error(f"Spotify search error: {str(e)}")
        return {"success": False, "error": str(e)}


@app.post("/analyze-voice-and-face")
async def analyze_voice_and_face(
    audio_file: UploadFile = File(...), 
    image_file: UploadFile = File(...), 
    limit: int = 20,
    authorization: Optional[str] = Header(None)
):
    """
    Analyze both voice emotion and facial expression, then merge predictions
    
    Upload an audio file and an image, get:
    1. Voice emotion analysis
    2. Facial expression analysis
    3. Merged emotion prediction (intelligently combines both)
    4. Music recommendations based on merged emotion
    
    Optional: Include Authorization header to auto-save results to database
    
    Handles cases where models disagree:
    - Strong agreement: Both models predict same emotion
    - Moderate agreement: Models predict related emotions (e.g., fear + sad)
    - Weak agreement: Models predict partially related emotions
    - Conflict: Models predict conflicting emotions (uses weighted merge)
    """
    user_id = None
    
    # Try to get user from authorization header (optional)
    if authorization and authorization.startswith('Bearer '):
        try:
            token = authorization.split(' ')[1]
            user_data = verify_supabase_token(token)
            user_id = user_data.get('sub')
            logger.info(f"✅ Authenticated user: {user_id}")
        except Exception as e:
            logger.warning(f"⚠️ Auth token invalid or expired: {e}")
            # Continue without auth - endpoint works for non-authenticated users too
    
    try:
        # Validate audio file type - include webm for browser recordings
        allowed_audio_ext = ['.wav', '.mp3', '.m4a', '.flac', '.opus', '.webm', '.ogg']
        audio_ext = Path(audio_file.filename).suffix.lower()
        
        if audio_ext not in allowed_audio_ext:
            return {
                "success": False,
                "error": f"Unsupported audio format. Allowed: {', '.join(allowed_audio_ext)}"
            }
        
        # Validate image file type
        allowed_image_ext = ['.jpg', '.jpeg', '.png']
        image_ext = Path(image_file.filename).suffix.lower()
        
        if image_ext not in allowed_image_ext:
            return {
                "success": False,
                "error": f"Unsupported image format. Allowed: {', '.join(allowed_image_ext)}"
            }
        
        logger.info("🎭 Starting multimodal emotion analysis...")
        
        # Analyze voice emotion
        logger.info("🎤 Analyzing voice emotion...")
        voice_result = voice_api.analyze_audio_upload(audio_file, model_path)
        
        if not voice_result.get("success"):
            return voice_result
        
        # Analyze facial expression
        logger.info("📸 Analyzing facial expression...")
        
        # Create temporary file for image
        import os
        with tempfile.NamedTemporaryFile(delete=False, suffix=image_ext) as tmp_file:
            # Reset file pointer to beginning
            await image_file.seek(0)
            content = await image_file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name
        
        try:
            face_result = face_expression.detect_expression(tmp_path)
        finally:
            # Always clean up temporary file
            try:
                os.unlink(tmp_path)
            except:
                pass
        
        # Check if face detection failed
        if not face_result.get("success"):
            logger.warning(f"Face detection failed: {face_result.get('error')}")
            # Continue with voice-only analysis but note the failure
            face_result = {
                "success": True,
                "emotion": "neutral",
                "confidence": 0.3,
                "all_emotions": {"neutral": 0.3},
                "warning": "Face detection failed, using neutral fallback"
            }
        
        # Merge predictions using emotion fusion service
        logger.info("🔀 Merging voice and face predictions...")
        
        voice_pred = voice_result["prediction"]
        
        merged_result = emotion_fusion.merge_emotions(
            voice_emotion=voice_pred["emotion"],
            voice_confidence=voice_pred["confidence"],
            voice_all_emotions=voice_pred["all_emotions"],
            face_emotion=face_result["emotion"],
            face_confidence=face_result["confidence"],
            face_all_emotions=face_result.get("all_emotions")
        )
        
        # Get fusion summary
        summary = emotion_fusion.get_fusion_summary(merged_result)
        logger.info(f"📊 {summary}")
        
        # Get emotion for recommendations
        recommendation_emotion = emotion_fusion.get_recommendation_emotion(merged_result)
        
        # Get music recommendations based on merged emotion
        logger.info(f"🎵 Getting recommendations for: {recommendation_emotion}")
        
        try:
            recommendations = spotify_service.get_mood_recommendations(
                recommendation_emotion, 
                limit=limit
            )
            
            # Store mood analysis in database if user is authenticated
            if user_id:
                try:
                    from datetime import datetime
                    await db.moodanalysis.create(
                        data={
                            "user_id": user_id,
                            "detected_mood": merged_result["final_emotion"],
                            "confidence": merged_result["final_confidence"],
                            "voice_emotion": voice_pred["emotion"],
                            "voice_confidence": voice_pred["confidence"],
                            "face_emotion": face_result["emotion"],
                            "face_confidence": face_result["confidence"],
                            "agreement": merged_result["agreement"],
                            "analysis_type": "multimodal",
                            "created_at": datetime.utcnow()
                        }
                    )
                    logger.info(f"📝 Stored multimodal mood analysis for user {user_id}")
                except Exception as db_error:
                    logger.error(f"❌ Failed to store mood analysis: {db_error}")
                    # Don't fail the request if database storage fails
            
            return {
                "success": True,
                "analysis": {
                    "merged_emotion": merged_result["final_emotion"],
                    "merged_confidence": merged_result["final_confidence"],
                    "agreement": merged_result["agreement"],
                    "agreement_score": merged_result["agreement_score"],
                    "explanation": merged_result["explanation"],
                    "summary": summary,
                    "voice_prediction": merged_result["voice_prediction"],
                    "face_prediction": merged_result["face_prediction"],
                    "merged_probabilities": merged_result["merged_probabilities"],
                    "emotions_match": merged_result["emotions_match"],
                    "compatibility": merged_result["compatibility"]
                },
                "recommendation_emotion": recommendation_emotion,
                "recommendations": recommendations,
                "recommendation_count": len(recommendations)
            }
            
        except Exception as rec_error:
            logger.error(f"Error getting recommendations: {rec_error}")
            # Return analysis even if recommendations fail
            return {
                "success": True,
                "analysis": {
                    "merged_emotion": merged_result["final_emotion"],
                    "merged_confidence": merged_result["final_confidence"],
                    "agreement": merged_result["agreement"],
                    "agreement_score": merged_result["agreement_score"],
                    "explanation": merged_result["explanation"],
                    "summary": summary,
                    "voice_prediction": merged_result["voice_prediction"],
                    "face_prediction": merged_result["face_prediction"],
                    "merged_probabilities": merged_result["merged_probabilities"],
                    "emotions_match": merged_result["emotions_match"],
                    "compatibility": merged_result["compatibility"]
                },
                "recommendation_emotion": recommendation_emotion,
                "recommendations": [],
                "recommendation_count": 0,
                "recommendation_error": str(rec_error)
            }
        
    except Exception as e:
        logger.error(f"Multimodal analysis error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return {
            "success": False,
            "error": str(e)
        }

@app.get("/listening-history")
async def get_listening_history(
    limit: int = 20,
    user: dict = Depends(get_current_user)
):
    """Get user's listening history from database"""
    try:
        user_id = user["sub"]
        logger.info(f"📜 Fetching listening history for user {user_id} (limit: {limit})")
        
        # Fetch from database
        history = await db.listeninghistory.find_many(
            where={"user_id": user_id},
            order={"played_at": "desc"},
            take=limit
        )
        
        logger.info(f"✅ Fetched {len(history)} listening history records")
        
        return {
            "success": True,
            "history": [
                {
                    "id": h.id,
                    "song_id": h.song_id,
                    "song_name": h.song_name,
                    "artist_name": h.artist_name,
                    "album_name": h.album_name,
                    "image_url": h.image_url,
                    "spotify_url": h.spotify_url,
                    "played_at": h.played_at.isoformat(),
                    "duration_ms": h.duration_ms,
                    "completed": h.completed,
                    "mood_detected": h.mood_detected
                }
                for h in history
            ]
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to fetch listening history: {e}")
        return {
            "success": False,
            "error": str(e),
            "history": []
        }

@app.post("/listening-history")
async def add_listening_history(
    song_id: str = Form(...),
    song_name: str = Form(...),
    artist_name: str = Form(...),
    album_name: str = Form(None),
    image_url: str = Form(None),
    spotify_url: str = Form(None),
    duration_ms: int = Form(None),
    completed: bool = Form(False),
    mood_detected: str = Form(None),
    user: dict = Depends(get_current_user)
):
    """Add a song to user's listening history"""
    try:
        user_id = user["sub"]
        logger.info(f"📝 Adding to listening history: {song_name} by {artist_name}")
        
        from datetime import datetime
        
        # Add to database
        history_entry = await db.listeninghistory.create(
            data={
                "user_id": user_id,
                "song_id": song_id,
                "song_name": song_name,
                "artist_name": artist_name,
                "album_name": album_name,
                "image_url": image_url,
                "spotify_url": spotify_url,
                "duration_ms": duration_ms,
                "completed": completed,
                "mood_detected": mood_detected,
                "played_at": datetime.utcnow()
            }
        )
        
        logger.info(f"✅ Added to listening history: {history_entry.id}")
        
        return {
            "success": True,
            "id": history_entry.id
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to add listening history: {e}")
        return {
            "success": False,
            "error": str(e)
        }


# Include routers for modular routes
app.include_router(playlists.router)
app.include_router(liked_songs.router, prefix="/api")
app.include_router(history.router)
app.include_router(user_preferences.router)
app.include_router(user_preferences.router)
