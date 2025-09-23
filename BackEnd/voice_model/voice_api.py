"""
FastAPI backend service for voice emotion detection - Clean implementation
Follows the exact same logic as test.py
"""

import os
import torch
import librosa
import numpy as np
import joblib
import tempfile
import io
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict
from transformers import Wav2Vec2ForSequenceClassification, Wav2Vec2Processor
from contextlib import asynccontextmanager
from pydub import AudioSegment
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import Spotify service
from spotify_service import spotify_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
MODEL_PATH = r"D:\My_Projects\Final_year\BackEnd\Voice model\wav2vec2-emotion-model"
SAMPLE_RATE = 16000

# Global model variables
model = None
processor = None
label_encoder = None

# Pydantic models
class EmotionPrediction(BaseModel):
    emotion: str
    confidence: float
    all_scores: Dict[str, float]
    timestamp: str

class VoiceAnalysisResponse(BaseModel):
    success: bool
    prediction: Optional[EmotionPrediction] = None
    error: Optional[str] = None

class RawAudioData(BaseModel):
    audio_data: list  # Raw audio samples as float array
    sample_rate: int = 16000  # Sample rate

def predict_emotion_from_audio(audio_path: str) -> Optional[EmotionPrediction]:
    """
    Predict emotion for audio file - EXACT same logic as test.py
    """
    global model, processor, label_encoder
    
    try:
        logger.info(f"🎵 Predicting emotion for: {audio_path}")
        
        # Try multiple methods to load audio (handle web audio formats)
        audio_array = None
        sample_rate = None
        
        # Method 1: Try direct WAV file reading (if frontend sends proper WAV)
        try:
            # Check if this is a proper WAV file by reading bytes
            with open(audio_path, 'rb') as f:
                file_header = f.read(12)
            
            if file_header[:4] == b'RIFF' and file_header[8:12] == b'WAVE':
                # This is a proper WAV file, use librosa directly
                audio_array, sample_rate = librosa.load(audio_path, sr=16000)
                logger.info(f"   ✅ Audio loaded as WAV with librosa: {len(audio_array)} samples")
            else:
                raise Exception("Not a proper WAV file")
                
        except Exception as wav_error:
            logger.info(f"   ℹ️ Not a standard WAV file: {wav_error}")
            
            # Method 2: Try with pydub (for other formats like WebM)
            try:
                from pydub import AudioSegment
                import io
                
                # Load with pydub (handles more formats)
                audio_segment = AudioSegment.from_file(audio_path)
                
                # Convert to mono and set sample rate
                audio_segment = audio_segment.set_channels(1).set_frame_rate(16000)
                
                # Convert to numpy array 
                samples = audio_segment.get_array_of_samples()
                audio_array = np.array(samples, dtype=np.float32)
                
                # Normalize to [-1, 1] range
                if audio_segment.sample_width == 2:  # 16-bit
                    audio_array = audio_array / 32768.0
                elif audio_segment.sample_width == 4:  # 32-bit  
                    audio_array = audio_array / 2147483648.0
                else:
                    audio_array = audio_array / (2 ** (audio_segment.sample_width * 8 - 1))
                    
                sample_rate = 16000
                logger.info(f"   ✅ Audio loaded with pydub: {len(audio_array)} samples")
                
            except Exception as pydub_error:
                logger.warning(f"   ⚠️ pydub failed (may need ffmpeg): {pydub_error}")
                
                # Method 3: Try reading raw audio data (assume WebM audio is actually PCM)
                try:
                    # Read raw bytes and try to interpret as audio
                    with open(audio_path, 'rb') as f:
                        raw_bytes = f.read()
                    
                    # Skip any header and try to find audio data
                    # For WebM, try different offsets
                    for offset in [0, 44, 100, 200]:
                        try:
                            if offset >= len(raw_bytes):
                                continue
                                
                            audio_data = raw_bytes[offset:]
                            
                            # Try interpreting as 16-bit PCM
                            if len(audio_data) % 2 == 0:
                                audio_array = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0
                            else:
                                audio_array = np.frombuffer(audio_data[:-1], dtype=np.int16).astype(np.float32) / 32768.0
                            
                            # Check if we got reasonable audio data
                            if len(audio_array) > 1000 and np.std(audio_array) > 0.001:
                                sample_rate = 16000  # Assume 16kHz
                                logger.info(f"   ✅ Audio loaded as raw PCM (offset {offset}): {len(audio_array)} samples")
                                break
                                
                        except Exception:
                            continue
                    
                    if audio_array is None:
                        raise Exception("Could not interpret as audio data")
                        
                except Exception as raw_error:
                    logger.error(f"   ❌ All methods failed!")
                    logger.error(f"   WAV error: {wav_error}")
                    logger.error(f"   pydub error: {pydub_error}")
                    logger.error(f"   raw audio error: {raw_error}")
                    return None
        
        # Validate audio data
        if audio_array is None or len(audio_array) == 0:
            logger.error("   ❌ No audio data loaded")
            return None
            
        # Ensure minimum length (1 second)
        if len(audio_array) < 16000:
            padding = 16000 - len(audio_array)
            audio_array = np.pad(audio_array, (0, padding), mode='constant')
            logger.info(f"   📏 Padded audio to minimum length: {len(audio_array)} samples")
        
        # Process audio - EXACT same as test.py
        inputs = processor(
            audio_array,
            sampling_rate=16000,
            return_tensors="pt",
            padding=True,
            truncation=False
        )
        
        # Make prediction - EXACT same as test.py
        with torch.no_grad():
            logits = model(**inputs).logits
            probabilities = torch.softmax(logits, dim=-1)
            predicted_class_id = logits.argmax().item()
            predicted_emotion = label_encoder.inverse_transform([predicted_class_id])[0]
            confidence = probabilities.max().item()
        
        # Get all class probabilities - EXACT same as test.py
        all_probs = probabilities.squeeze().numpy()
        emotion_probs = {
            emotion: float(prob) for emotion, prob in zip(label_encoder.classes_, all_probs)
        }
        
        logger.info(f"   🎯 Predicted: {predicted_emotion}")
        logger.info(f"   📊 Confidence: {confidence:.4f}")
        
        return EmotionPrediction(
            emotion=predicted_emotion,
            confidence=confidence,
            all_scores=emotion_probs,
            timestamp=str(np.datetime64('now'))
        )
        
    except Exception as e:
        logger.error(f"❌ Error processing audio: {str(e)}")
        return None

def load_model():
    """Load the voice emotion model - same as test.py logic"""
    global model, processor, label_encoder
    
    try:
        logger.info("Loading voice emotion model...")
        
        # Load model and processor - same as test.py
        model = Wav2Vec2ForSequenceClassification.from_pretrained(MODEL_PATH)
        processor = Wav2Vec2Processor.from_pretrained(MODEL_PATH)
        label_encoder = joblib.load(os.path.join(MODEL_PATH, 'label_encoder.pkl'))
        
        logger.info(f"✅ Model loaded successfully!")
        logger.info(f"Available emotions: {list(label_encoder.classes_)}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to load model: {str(e)}")
        return False

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize model on startup"""
    success = load_model()
    if not success:
        logger.error("Failed to initialize voice emotion model")
    yield

# Create FastAPI app
app = FastAPI(title="Voice Emotion Detection API", version="1.0.0", lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Voice Emotion Detection API", "status": "running"}

@app.get("/health")
async def health_check():
    """Detailed health check"""
    model_loaded = model is not None and processor is not None and label_encoder is not None
    return {
        "status": "healthy" if model_loaded else "unhealthy",
        "model_loaded": model_loaded,
        "available_emotions": list(label_encoder.classes_) if label_encoder else [],
    }

@app.post("/analyze-voice", response_model=VoiceAnalysisResponse)
async def analyze_voice(audio_file: UploadFile = File(...)):
    """
    Analyze voice emotion from uploaded audio file
    Simple approach: save file, process with test.py logic, return result
    """
    if model is None or processor is None or label_encoder is None:
        raise HTTPException(status_code=503, detail="Voice emotion model not loaded")
    
    try:
        # Validate file type
        if not audio_file.content_type or not audio_file.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="Invalid file type. Please upload an audio file.")
        
        # Read audio file and save temporarily
        audio_bytes = await audio_file.read()
        
        if len(audio_bytes) == 0:
            raise ValueError("Audio file appears to be empty")
        
        logger.info(f"📁 Received audio file: {len(audio_bytes)} bytes, content_type: {audio_file.content_type}")
        
        # Determine file extension based on content type
        if 'wav' in audio_file.content_type.lower():
            suffix = '.wav'
        elif 'mp3' in audio_file.content_type.lower():
            suffix = '.mp3'
        elif 'webm' in audio_file.content_type.lower():
            suffix = '.webm'
        elif 'ogg' in audio_file.content_type.lower():
            suffix = '.ogg'
        elif 'mp4' in audio_file.content_type.lower():
            suffix = '.mp4'
        else:
            suffix = '.wav'  # Default to WAV
        
        # Create temporary file with appropriate extension
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(audio_bytes)
            temp_audio_path = temp_file.name
            
        logger.info(f"💾 Saved temporary file: {temp_audio_path}")
        
        try:
            # Use the exact same logic as test.py
            prediction = predict_emotion_from_audio(temp_audio_path)
            
            if prediction:
                return VoiceAnalysisResponse(success=True, prediction=prediction)
            else:
                return VoiceAnalysisResponse(success=False, error="Failed to analyze audio")
                
        finally:
            # Clean up temporary file
            os.unlink(temp_audio_path)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Voice analysis error: {str(e)}")
        return VoiceAnalysisResponse(success=False, error=f"Analysis failed: {str(e)}")

@app.post("/analyze-voice-raw", response_model=VoiceAnalysisResponse)
async def analyze_voice_raw(raw_audio: RawAudioData):
    """
    Analyze voice emotion from raw audio data array
    DIRECT approach - no file conversion, straight to model
    """
    if model is None or processor is None or label_encoder is None:
        raise HTTPException(status_code=503, detail="Voice emotion model not loaded")
    
    try:
        logger.info(f"🎵 Processing raw audio: {len(raw_audio.audio_data)} samples at {raw_audio.sample_rate}Hz")
        
        # Convert list to numpy array
        audio_array = np.array(raw_audio.audio_data, dtype=np.float32)
        
        # Resample if needed
        if raw_audio.sample_rate != 16000:
            import librosa
            audio_array = librosa.resample(audio_array, orig_sr=raw_audio.sample_rate, target_sr=16000)
            logger.info(f"   🔄 Resampled from {raw_audio.sample_rate}Hz to 16000Hz")
        
        # Ensure minimum length (1 second)
        if len(audio_array) < 16000:
            padding = 16000 - len(audio_array)
            audio_array = np.pad(audio_array, (0, padding), mode='constant')
            logger.info(f"   📏 Padded audio to minimum length: {len(audio_array)} samples")
        
        # Process audio - EXACT same as test.py
        inputs = processor(
            audio_array,
            sampling_rate=16000,
            return_tensors="pt",
            padding=True,
            truncation=False
        )
        
        # Make prediction - EXACT same as test.py
        with torch.no_grad():
            logits = model(**inputs).logits
            probabilities = torch.softmax(logits, dim=-1)
            predicted_class_id = logits.argmax().item()
            predicted_emotion = label_encoder.inverse_transform([predicted_class_id])[0]
            confidence = probabilities.max().item()
        
        # Get all class probabilities - EXACT same as test.py
        all_probs = probabilities.squeeze().numpy()
        emotion_probs = {
            emotion: float(prob) for emotion, prob in zip(label_encoder.classes_, all_probs)
        }
        
        logger.info(f"   🎯 Predicted: {predicted_emotion}")
        logger.info(f"   📊 Confidence: {confidence:.4f}")
        
        prediction = EmotionPrediction(
            emotion=predicted_emotion,
            confidence=confidence,
            all_scores=emotion_probs,
            timestamp=str(np.datetime64('now'))
        )
        
        return VoiceAnalysisResponse(success=True, prediction=prediction)
            
    except Exception as e:
        logger.error(f"Raw audio analysis error: {str(e)}")
        return VoiceAnalysisResponse(success=False, error=str(e))

# Spotify API Endpoints
@app.get("/spotify/search")
async def search_spotify_music(query: str, limit: int = 20):
    """Search for music on Spotify"""
    try:
        results = spotify_service.search_tracks(query, limit)
        return {"success": True, "results": results}
    except Exception as e:
        logger.error(f"Spotify search error: {str(e)}")
        return {"success": False, "error": str(e)}

@app.get("/spotify/mood-recommendations")
async def get_mood_recommendations(mood: str, limit: int = 20):
    """Get music recommendations based on detected mood (query parameter)"""
    try:
        recommendations = spotify_service.get_mood_based_recommendations(mood, limit)
        return {"success": True, "recommendations": recommendations}
    except Exception as e:
        logger.error(f"Spotify mood recommendations error: {str(e)}")
        return {"success": False, "error": str(e)}

@app.get("/spotify/mood-recommendations/{mood}")
async def get_mood_recommendations_by_path(mood: str, limit: int = 20):
    """Get music recommendations based on detected mood (path parameter)"""
    try:
        logger.info(f"🎵 Getting recommendations for mood: {mood} (limit: {limit})")
        recommendations = spotify_service.get_mood_based_recommendations(mood, limit)
        return {"success": True, "recommendations": recommendations}
    except Exception as e:
        logger.error(f"Spotify mood recommendations error: {str(e)}")
        return {"success": False, "error": str(e)}

@app.post("/analyze-voice-and-recommend")
async def analyze_voice_and_recommend(audio_file: UploadFile = File(...), music_limit: int = 10):
    """
    Analyze voice emotion and get music recommendations in one call
    """
    # First analyze the voice
    voice_result = await analyze_voice(audio_file)
    
    if not voice_result.success or not voice_result.prediction:
        return {
            "success": False,
            "error": "Failed to analyze voice",
            "voice_analysis": voice_result
        }
    
    # Get music recommendations based on detected mood
    try:
        mood = voice_result.prediction.emotion
        recommendations = spotify_service.get_recommendations_by_mood(mood, music_limit)
        
        return {
            "success": True,
            "voice_analysis": voice_result,
            "music_recommendations": recommendations,
            "detected_mood": mood,
            "confidence": voice_result.prediction.confidence
        }
        
    except Exception as e:
        logger.error(f"Combined analysis error: {str(e)}")
        return {
            "success": False,
            "voice_analysis": voice_result,
            "music_error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)