from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import logging
from pathlib import Path
import tempfile
import video_model.face_expression as face_expression
import voice_model.voice_api as voice_api
from services.spotify_service import SpotifyService
from services.emotion_fusion import emotion_fusion

# Initialize FastAPI app
app = FastAPI(title="Emotion Detection API", version="1.0.0")

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
model_path = r"G:\My_Projects\Final_year\BackEnd\voice_model\final_voice_model"

# Initialize Spotify service
spotify_service = SpotifyService()

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Voice Emotion Detection API", "status": "running"}


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
async def analyze_voice(audio_file: UploadFile = File(...)):
    """
    Analyze emotion from uploaded audio file
    Supports: WAV, MP3, M4A, FLAC, WebM, OGG formats
    """
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
async def get_mood_recommendations(mood: str, limit: int = 20):
    """
    Get music recommendations based on detected mood/emotion
    
    Supported moods: happy, sad, angry, neutral, fear, disgust, surprise, calm, excited
    
    Example: /recommendations/mood/happy?limit=20
    """
    try:
        logger.info(f"🎵 Getting recommendations for mood: {mood} (limit: {limit})")
        recommendations = spotify_service.get_mood_recommendations(mood, limit)
        return {
            "success": True,
            "mood": mood,
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
async def analyze_voice_and_face(audio_file: UploadFile = File(...), image_file: UploadFile = File(...), limit: int = 20):
    """
    Analyze both voice emotion and facial expression, then merge predictions
    
    Upload an audio file and an image, get:
    1. Voice emotion analysis
    2. Facial expression analysis
    3. Merged emotion prediction (intelligently combines both)
    4. Music recommendations based on merged emotion
    
    Handles cases where models disagree:
    - Strong agreement: Both models predict same emotion
    - Moderate agreement: Models predict related emotions (e.g., fear + sad)
    - Weak agreement: Models predict partially related emotions
    - Conflict: Models predict conflicting emotions (uses weighted merge)
    """
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

