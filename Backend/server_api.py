from fastapi import FastAPI, HTTPException, UploadFile, File, Header, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
import logging
from pathlib import Path
import tempfile
import subprocess
import os
import cv2
import video_model.face_expression as face_expression
import voice_model.voice_api as voice_api
from services.spotify_service import SpotifyService
from services.emotion_fusion import emotion_fusion
from services.fusion_model import get_fusion_predictor
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

# Model paths (local, absolute)
model_path = Path(__file__).parent / "voice_model" / "final_voice_model"
voice_checkpoint_path = Path(__file__).parent / "voice_model" / "last_checkpoint.pth"

# Optional learned fusion model (audio + video) using last_checkpoint.pth
fusion_predictor = get_fusion_predictor(voice_checkpoint_path)

# Face detector (used for server-side cropping)
face_detector = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

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

@app.get("/debug/fusion-status")
async def fusion_status():
    """Debug endpoint to check fusion model status"""
    return {
        "fusion_model_available": fusion_predictor.available if fusion_predictor else False,
        "fusion_model_loaded": fusion_predictor.model is not None if fusion_predictor else False,
        "checkpoint_path": str(voice_checkpoint_path),
        "checkpoint_exists": voice_checkpoint_path.exists(),
        "checkpoint_size_mb": round(voice_checkpoint_path.stat().st_size / (1024**2), 2) if voice_checkpoint_path.exists() else 0
    }




# # =============================================
# # MOOD HISTORY ENDPOINT
# # =============================================
@app.get("/mood-history")
async def get_mood_history(
    limit: int = 20,
    authorization: str = Header(None)
):
    """Get user's mood detection history"""
    from middleware.supabase_auth import verify_supabase_token
    
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
        # Fetch mood history from database
        mood_history = await db.moodanalysis.find_many(
            where={"user_id": user_id},
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
        result = voice_api.analyze_audio_upload(audio_file, model_path, checkpoint_path=None)
        
        # Store mood analysis in database if user is authenticated and analysis succeeded
        if user_id and result.get("success"):
            try:
                from datetime import datetime
                prediction = result.get("prediction", {})
                emotion = prediction.get("emotion", "unknown")
                confidence = prediction.get("confidence", 0.0)
                
                await db.moodanalysis.create(
                    data={
                        "user_id": user_id,
                        "detected_mood": emotion,
                        "confidence": confidence,
                        "voice_emotion": emotion,
                        "voice_confidence": confidence,
                        "analysis_type": "voice",
                        "created_at": datetime.utcnow()
                    }
                )
                logger.info(f"📝 Stored voice mood analysis for user {user_id}: {emotion} ({confidence:.2%})")
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
# Video upload: extract audio + crop face + fuse
#===============================================
@app.post("/analyze")
async def analyze_video_upload(
    file: UploadFile = File(...),
    limit: int = 20,
    authorization: Optional[str] = Header(None)
):
    """
    Accept a recorded video (e.g., WebM with audio), extract audio, crop face frames,
    run voice + face emotion models, fuse, and return music recommendations.
    """
    user_id = None
    if authorization and authorization.startswith("Bearer "):
        try:
            token = authorization.split(" ")[1]
            user_data = verify_supabase_token(token)
            user_id = user_data.get("sub")
        except Exception as e:
            logger.warning(f"⚠️ Auth token invalid or expired: {e}")

    # Validate file type
    allowed_video_ext = ['.webm', '.mp4', '.mkv', '.mov', '.avi']
    ext = Path(file.filename).suffix.lower()
    if ext not in allowed_video_ext:
        return {"success": False, "error": f"Unsupported video format. Allowed: {', '.join(allowed_video_ext)}"}

    tmp_video = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
    tmp_audio = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    tmp_face = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
    tmp_video_path = tmp_video.name
    tmp_audio_path = tmp_audio.name
    tmp_face_path = tmp_face.name
    tmp_video.close(); tmp_audio.close(); tmp_face.close()

    try:
        # Save upload to disk
        content = await file.read()
        with open(tmp_video_path, "wb") as f:
            f.write(content)

        # Extract audio
        audio_available = extract_audio_with_ffmpeg(tmp_video_path, tmp_audio_path)

        # Analyze voice with built-in quality guard (if audio available)
        voice_result = None
        voice_pred = None
        if audio_available and os.path.exists(tmp_audio_path):
            voice_result = voice_api.analyze_audio_file(tmp_audio_path, model_path, checkpoint_path=None)
            if voice_result.get("success"):
                voice_pred = voice_result["prediction"]

        # Sample frames and crop faces
        cap = cv2.VideoCapture(tmp_video_path)
        frames = []
        frame_idx = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            frame_idx += 1
            if frame_idx % 10 != 0:
                continue
            cropped = crop_face_bgr(frame)
            frames.append(cropped)
        cap.release()

        if not frames:
            if not voice_pred:
                return {"success": False, "error": "No audio or video data extracted from upload"}
            # Voice-only fallback
            return {
                "success": True,
                "mode": "voice-only",
                "analysis": {
                    "merged_emotion": voice_pred["emotion"],
                    "merged_confidence": voice_pred["confidence"],
                    "voice_prediction": voice_pred,
                    "note": "No video frames; voice-only result"
                },
                "recommendation_emotion": voice_pred["emotion"],
                "recommendations": spotify_service.get_mood_recommendations(voice_pred["emotion"], limit),
                "recommendation_count": limit
            }

        # Use middle frame for face emotion detection
        face_frame = frames[len(frames)//2]
        cv2.imwrite(tmp_face_path, face_frame)
        face_result = face_expression.detect_expression(tmp_face_path)
        if not face_result.get("success") or face_result.get("warning"):
            face_result = {
                "success": True,
                "emotion": "neutral",
                "confidence": 0.3,
                "all_emotions": {"neutral": 0.3},
                "warning": face_result.get("error", "Face detection failed, using neutral")
            }

        # If no voice, use face-only
        if not voice_pred:
            return {
                "success": True,
                "mode": "face-only",
                "analysis": {
                    "merged_emotion": face_result["emotion"],
                    "merged_confidence": face_result["confidence"],
                    "face_prediction": face_result,
                    "note": "No audio; face-only result"
                },
                "recommendation_emotion": face_result["emotion"],
                "recommendations": spotify_service.get_mood_recommendations(face_result["emotion"], limit),
                "recommendation_count": limit
            }

        # Try learned fusion model (NeuroSyncFusion) if available
        fusion_prediction = None
        use_fusion = False
        if fusion_predictor and fusion_predictor.available and audio_available and len(frames) > 0:
            fusion_prediction = fusion_predictor.predict(tmp_audio_path, frames)
            use_fusion = fusion_prediction and fusion_prediction.get("success")
            if use_fusion:
                logger.info("✅ Fusion: %s (%.1f%%)", fusion_prediction["emotion"], fusion_prediction["confidence"] * 100)

        if use_fusion:
            final_emotion = fusion_prediction["emotion"]
            final_confidence = fusion_prediction["confidence"]
            recommendation_emotion = final_emotion
            summary = f"🔮 Fusion model: {final_emotion} ({final_confidence:.1%})"
            merged_probabilities = fusion_prediction.get("all_emotions", {})
            agreement = "fusion"
            agreement_score = final_confidence
            explanation = "Learned NeuroSyncFusion model jointly encoded audio + video."
        else:
            # Fallback to rule-based merge
            merged_result = emotion_fusion.merge_emotions(
                voice_emotion=voice_pred["emotion"],
                voice_confidence=voice_pred["confidence"],
                voice_all_emotions=voice_pred["all_emotions"],
                face_emotion=face_result["emotion"],
                face_confidence=face_result["confidence"],
                face_all_emotions=face_result.get("all_emotions")
            )
            summary = emotion_fusion.get_fusion_summary(merged_result)
            recommendation_emotion = emotion_fusion.get_recommendation_emotion(merged_result)
            final_emotion = merged_result["final_emotion"]
            final_confidence = merged_result["final_confidence"]
            agreement = merged_result["agreement"]
            agreement_score = merged_result["agreement_score"]
            explanation = merged_result["explanation"]
            merged_probabilities = merged_result["merged_probabilities"]

        recommendations = spotify_service.get_mood_recommendations(recommendation_emotion, limit)

        if user_id:
            try:
                from datetime import datetime
                await db.moodanalysis.create(
                    data={
                        "user_id": user_id,
                        "detected_mood": final_emotion,
                        "confidence": final_confidence,
                        "voice_emotion": voice_pred["emotion"],
                        "voice_confidence": voice_pred["confidence"],
                        "face_emotion": face_result["emotion"],
                        "face_confidence": face_result["confidence"],
                        "agreement": agreement,
                        "analysis_type": "fusion" if use_fusion else "multimodal",
                        "created_at": datetime.utcnow()
                    }
                )
            except Exception as db_error:
                logger.error(f"Failed to store mood analysis: {db_error}")

        analysis_payload = {
            "merged_emotion": final_emotion,
            "merged_confidence": final_confidence,
            "agreement": agreement,
            "agreement_score": agreement_score,
            "explanation": explanation,
            "summary": summary,
            "voice_prediction": voice_pred,
            "face_prediction": face_result,
            "fusion_prediction": fusion_prediction,
            "merged_probabilities": merged_probabilities,
        }
        if not use_fusion:
            # Add rule-based merge details when not using fusion
            if 'merged_result' in locals():
                analysis_payload["emotions_match"] = merged_result.get("emotions_match")
                analysis_payload["compatibility"] = merged_result.get("compatibility")

        return {
            "success": True,
            "mode": "fusion" if use_fusion else "multimodal",
            "analysis": analysis_payload,
            "recommendation_emotion": recommendation_emotion,
            "recommendations": recommendations,
            "recommendation_count": len(recommendations)
        }

    except Exception as e:
        logger.error(f"/analyze error: {e}")
        return {"success": False, "error": str(e)}
    finally:
        for path in [tmp_video_path, tmp_audio_path, tmp_face_path]:
            try:
                os.unlink(path)
            except Exception:
                pass

#===============================================
# Spotify API Endpoints
#===============================================

@app.get("/recommendations")
async def get_recommendations(limit: int = 20):
    """
    Get general music recommendations for home page
    No mood required - returns popular/trending tracks
    """
    try:
        recommendations = spotify_service.get_general_recommendations(limit)
        return {
            "success": True,
            "count": len(recommendations),
            "recommendations": recommendations
        }
    except Exception as e:
        logger.error(f"Recommendations error: {str(e)}")
        return {"success": False, "error": str(e)}


@app.get("/recommendations/mood/{mood}")
async def get_mood_recommendations(mood: str, limit: int = 20, language: str = None):
    """
    Get music recommendations based on detected mood/emotion with optional language preference
    
    Supported moods: happy, sad, angry, neutral, fear, disgust, surprise, calm, excited
    
    Example: /recommendations/mood/happy?limit=20&language=Hindi
    """
    try:
        # Combine mood with language for better results
        search_mood = f"{mood} {language}" if language else mood
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
    audio_file: UploadFile = File(None), 
    image_file: UploadFile = File(None), 
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
        except Exception as e:
            logger.warning(f"⚠️ Auth token invalid or expired: {e}")
            # Continue without auth - endpoint works for non-authenticated users too
    
    try:
        if not audio_file and not image_file:
            return {
                "success": False,
                "error": "Provide at least one of audio_file or image_file"
            }

        allowed_audio_ext = ['.wav', '.mp3', '.m4a', '.flac', '.opus', '.webm', '.ogg']
        allowed_image_ext = ['.jpg', '.jpeg', '.png']

        voice_result = None
        face_result = None

        # --- Voice branch (optional) ---
        if audio_file:
            audio_ext = Path(audio_file.filename).suffix.lower()
            if audio_ext not in allowed_audio_ext:
                return {
                    "success": False,
                    "error": f"Unsupported audio format. Allowed: {', '.join(allowed_audio_ext)}"
                }

            voice_result = voice_api.analyze_audio_upload(audio_file, model_path, checkpoint_path=None)

        # --- Face branch (optional) ---
        if image_file:
            image_ext = Path(image_file.filename).suffix.lower()
            if image_ext not in allowed_image_ext:
                return {
                    "success": False,
                    "error": f"Unsupported image format. Allowed: {', '.join(allowed_image_ext)}"
                }

            logger.info("📸 Analyzing facial expression...")
            import os
            with tempfile.NamedTemporaryFile(delete=False, suffix=image_ext) as tmp_file:
                await image_file.seek(0)
                content = await image_file.read()
                tmp_file.write(content)
                tmp_path = tmp_file.name

            try:
                face_result = face_expression.detect_expression(tmp_path)
            finally:
                try:
                    os.unlink(tmp_path)
                except:
                    pass

            if not face_result.get("success"):
                logger.warning(f"Face detection failed: {face_result.get('error')}")
                face_result = {
                    "success": True,
                    "emotion": "neutral",
                    "confidence": 0.3,
                    "all_emotions": {"neutral": 0.3},
                    "warning": "Face detection failed, using neutral fallback"
                }

        has_voice = voice_result is not None and voice_result.get("success")
        has_face = face_result is not None and face_result.get("success")

        if not has_voice and not has_face:
            return {
                "success": False,
                "error": "Could not analyze any modality",
                "voice_error": voice_result,
                "face_error": face_result
            }

        # Voice-only path
        if has_voice and not has_face:
            voice_pred = voice_result["prediction"]
            recommendation_emotion = voice_pred["emotion"]
            recommendations = spotify_service.get_mood_recommendations(recommendation_emotion, limit)

            if user_id:
                try:
                    from datetime import datetime
                    await db.moodanalysis.create(
                        data={
                            "user_id": user_id,
                            "detected_mood": voice_pred["emotion"],
                            "confidence": voice_pred["confidence"],
                            "voice_emotion": voice_pred["emotion"],
                            "voice_confidence": voice_pred["confidence"],
                            "analysis_type": "voice",
                            "created_at": datetime.utcnow()
                        }
                    )
                except Exception as db_error:
                    logger.error(f"❌ Failed to store mood analysis: {db_error}")

            return {
                "success": True,
                "mode": "voice-only",
                "analysis": {
                    "voice_prediction": voice_pred,
                    "note": "Face input missing or unusable; returning voice-only result"
                },
                "recommendation_emotion": recommendation_emotion,
                "recommendations": recommendations,
                "recommendation_count": len(recommendations)
            }

        # Face-only path
        if has_face and not has_voice:
            recommendation_emotion = face_result["emotion"]
            recommendations = spotify_service.get_mood_recommendations(recommendation_emotion, limit)

            if user_id:
                try:
                    from datetime import datetime
                    await db.moodanalysis.create(
                        data={
                            "user_id": user_id,
                            "detected_mood": face_result["emotion"],
                            "confidence": face_result["confidence"],
                            "face_emotion": face_result["emotion"],
                            "face_confidence": face_result["confidence"],
                            "analysis_type": "face",
                            "created_at": datetime.utcnow()
                        }
                    )
                except Exception as db_error:
                    logger.error(f"❌ Failed to store mood analysis: {db_error}")

            return {
                "success": True,
                "mode": "face-only",
                "analysis": {
                    "face_prediction": face_result,
                    "note": "Audio input missing or unusable; returning face-only result"
                },
                "recommendation_emotion": recommendation_emotion,
                "recommendations": recommendations,
                "recommendation_count": len(recommendations)
            }

        # Both modalities present → try fusion first
        logger.info("🎭 Starting multimodal emotion analysis...")
        
        voice_pred = voice_result["prediction"]
        
        # Try learned fusion model if available and we have the image file
        fusion_prediction = None
        use_fusion = False
        
        if fusion_predictor and fusion_predictor.available and image_file:
            try:
                # Reload the image as BGR frame for fusion model
                await image_file.seek(0)
                image_content = await image_file.read()
                import cv2
                import numpy as np
                nparr = np.frombuffer(image_content, np.uint8)
                frame_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if frame_bgr is not None:
                    # Create temp audio file for fusion model
                    await audio_file.seek(0)
                    audio_content = await audio_file.read()
                    with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_audio:
                        tmp_audio.write(audio_content)
                        tmp_audio_path = tmp_audio.name
                    
                    # Replicate frame 16 times to match fusion model's expected input
                    frames = [frame_bgr] * 16
                    fusion_prediction = fusion_predictor.predict(tmp_audio_path, frames)
                    
                    # Cleanup temp audio
                    try:
                        os.unlink(tmp_audio_path)
                    except:
                        pass
                    
                    use_fusion = fusion_prediction and fusion_prediction.get("success")
                    if use_fusion:
                        logger.info("✅ Fusion model succeeded: %s (%.1f%%)", fusion_prediction["emotion"], fusion_prediction["confidence"] * 100)
                    else:
                        logger.warning("Fusion model failed: %s", fusion_prediction.get("error") if fusion_prediction else "N/A")
            except Exception as fusion_error:
                logger.warning(f"Fusion model error: {fusion_error}")
                use_fusion = False
        
        if use_fusion:
            # Use fusion model result
            final_emotion = fusion_prediction["emotion"]
            final_confidence = fusion_prediction["confidence"]
            recommendation_emotion = final_emotion
            summary = f"🔮 Fusion model: {final_emotion} ({final_confidence:.1%})"
            merged_probabilities = fusion_prediction.get("all_emotions", {})
            agreement = "fusion"
            agreement_score = final_confidence
            explanation = "Learned NeuroSyncFusion model jointly encoded audio + single image frame."
            
            logger.info(f"📊 {summary}")
            recommendation_emotion_final = recommendation_emotion
        else:
            # Fallback to rule-based merge
            logger.info("🔀 Using rule-based emotion fusion (voice + face)")
            
            merged_result = emotion_fusion.merge_emotions(
            voice_emotion=voice_pred["emotion"],
            voice_confidence=voice_pred["confidence"],
            voice_all_emotions=voice_pred["all_emotions"],
            face_emotion=face_result["emotion"],
            face_confidence=face_result["confidence"],
            face_all_emotions=face_result.get("all_emotions")
            )

            summary = emotion_fusion.get_fusion_summary(merged_result)
            logger.info(f"📊 {summary}")

            recommendation_emotion_final = emotion_fusion.get_recommendation_emotion(merged_result)
            
            # Use rule-based merge results
            final_emotion = merged_result["final_emotion"]
            final_confidence = merged_result["final_confidence"]
            agreement = merged_result["agreement"]
            agreement_score = merged_result["agreement_score"]
            explanation = merged_result["explanation"]
            merged_probabilities = merged_result["merged_probabilities"]

        logger.info(f"🎵 Getting recommendations for: {recommendation_emotion_final}")

        try:
            recommendations = spotify_service.get_mood_recommendations(
                recommendation_emotion_final, 
                limit=limit
            )
            
            if user_id:
                try:
                    from datetime import datetime
                    await db.moodanalysis.create(
                        data={
                            "user_id": user_id,
                            "detected_mood": final_emotion,
                            "confidence": final_confidence,
                            "voice_emotion": voice_pred["emotion"],
                            "voice_confidence": voice_pred["confidence"],
                            "face_emotion": face_result["emotion"],
                            "face_confidence": face_result["confidence"],
                            "agreement": agreement,
                            "analysis_type": "fusion" if use_fusion else "multimodal",
                            "created_at": datetime.utcnow()
                        }
                    )
                    logger.info(f"📝 Stored multimodal mood analysis for user {user_id}")
                except Exception as db_error:
                    logger.error(f"❌ Failed to store mood analysis: {db_error}")
                    # Don't fail the request if database storage fails
            
            analysis_data = {
                "merged_emotion": final_emotion,
                "merged_confidence": final_confidence,
                "agreement": agreement,
                "agreement_score": agreement_score,
                "explanation": explanation,
                "summary": summary,
                "merged_probabilities": merged_probabilities,
            }
            
            # Add rule-based merge details if not using fusion
            if not use_fusion:
                analysis_data.update({
                    "voice_prediction": merged_result["voice_prediction"],
                    "face_prediction": merged_result["face_prediction"],
                    "emotions_match": merged_result["emotions_match"],
                    "compatibility": merged_result["compatibility"]
                })
            else:
                analysis_data.update({
                    "voice_prediction": {"emotion": voice_pred["emotion"], "confidence": voice_pred["confidence"]},
                    "face_prediction": {"emotion": face_result["emotion"], "confidence": face_result["confidence"]},
                    "fusion_used": True
                })
            
            return {
                "success": True,
                "mode": "fusion" if use_fusion else "voice-and-face",
                "analysis": analysis_data,
                "recommendation_emotion": recommendation_emotion_final,
                "recommendations": recommendations,
                "recommendation_count": len(recommendations)
            }
            
        except Exception as rec_error:
            logger.error(f"Error getting recommendations: {rec_error}")
            
            analysis_data = {
                "merged_emotion": final_emotion,
                "merged_confidence": final_confidence,
                "agreement": agreement,
                "agreement_score": agreement_score,
                "explanation": explanation,
                "summary": summary,
                "merged_probabilities": merged_probabilities,
            }
            
            if not use_fusion:
                analysis_data.update({
                    "voice_prediction": merged_result["voice_prediction"],
                    "face_prediction": merged_result["face_prediction"],
                    "emotions_match": merged_result["emotions_match"],
                    "compatibility": merged_result["compatibility"]
                })
            else:
                analysis_data.update({
                    "voice_prediction": {"emotion": voice_pred["emotion"], "confidence": voice_pred["confidence"]},
                    "face_prediction": {"emotion": face_result["emotion"], "confidence": face_result["confidence"]},
                    "fusion_used": True
                })
            
            return {
                "success": True,
                "mode": "fusion" if use_fusion else "voice-and-face",
                "analysis": analysis_data,
                "recommendation_emotion": recommendation_emotion_final,
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


# =============================================
# Helper utilities for /analyze (video upload)
# =============================================

def check_video_has_audio(input_path: str) -> bool:
    """Check if video file contains an audio stream using ffprobe."""
    command = [
        "ffprobe",
        "-v", "error",
        "-select_streams", "a:0",
        "-show_entries", "stream=codec_type",
        "-of", "default=noprint_wrappers=1:nokey=1",
        input_path
    ]
    try:
        result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=5)
        output = result.stdout.decode('utf-8', errors='ignore').strip()
        has_audio = output == "audio"
        if not has_audio:
            logger.info("Video file has no audio stream (camera-only recording)")
        return has_audio
    except Exception as e:
        logger.warning(f"Failed to probe video for audio: {e}. Assuming audio exists.")
        return True  # Assume audio exists if probe fails


def extract_audio_with_ffmpeg(input_path: str, output_path: str) -> bool:
    """Extract mono 16k WAV using ffmpeg. Returns True on success."""
    # First check if video has audio stream
    if not check_video_has_audio(input_path):
        logger.info("Skipping audio extraction - video has no audio stream")
        return False
    
    command = [
        "ffmpeg",
        "-y",
        "-i", input_path,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        output_path,
    ]
    try:
        result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if result.returncode != 0:
            logger.error(f"FFmpeg error: {result.stderr.decode('utf-8', errors='ignore')}")
            return False
        return True
    except Exception as e:
        logger.error(f"FFmpeg invocation failed: {e}")
        return False


def crop_face_bgr(frame_bgr):
    """Detect and crop the largest face with a small margin. Returns cropped BGR frame."""
    try:
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        faces = face_detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))
        if len(faces) == 0:
            return frame_bgr
        # Pick largest face
        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
        margin = 0.25
        x0 = max(0, int(x - w * margin))
        y0 = max(0, int(y - h * margin))
        x1 = min(frame_bgr.shape[1], int(x + w * (1 + margin)))
        y1 = min(frame_bgr.shape[0], int(y + h * (1 + margin)))
        return frame_bgr[y0:y1, x0:x1]
    except Exception as e:
        return frame_bgr

