import torch
import torchaudio
import librosa
import numpy as np
from transformers import Wav2Vec2ForSequenceClassification, Wav2Vec2FeatureExtractor
import io
from pathlib import Path
import tempfile
import os
import logging
from typing import Tuple, Dict, Union

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cache for model (simple in-memory cache)
_model_cache = {}

# ===================================================================
# MODEL LOADING
# ===================================================================

def load_model(model_path_or_repo):
    """Load the trained 7-class model and processor"""
    # Check cache first
    if model_path_or_repo in _model_cache:
        return _model_cache[model_path_or_repo]
    
    try:
        model = Wav2Vec2ForSequenceClassification.from_pretrained(model_path_or_repo)
        processor = Wav2Vec2FeatureExtractor.from_pretrained(model_path_or_repo)
        
        # Cache the loaded model
        _model_cache[model_path_or_repo] = (model, processor)
        
        logger.info(f"Model loaded successfully from {model_path_or_repo}")
        return model, processor
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        raise Exception(f"Failed to load model: {e}")

# ===================================================================
# AUDIO PROCESSING
# ===================================================================

def process_audio(audio_data, sample_rate=16000):
    """Process audio data for model input"""
    try:
        # Convert to mono if stereo
        if len(audio_data.shape) > 1:
            audio_data = np.mean(audio_data, axis=1)
        
        # Resample if needed
        if sample_rate != 16000:
            audio_data = librosa.resample(audio_data, orig_sr=sample_rate, target_sr=16000)
        
        # Normalize
        audio_data = librosa.util.normalize(audio_data)
        
        logger.info("Audio processed successfully")
        return audio_data
    except Exception as e:
        logger.error(f"Error processing audio: {e}")
        raise Exception(f"Failed to process audio: {e}")

def load_audio_file(file_path: str, sr: int = 16000) -> np.ndarray:
    """
    Load audio file from path and return audio data
    Frontend sends WAV files directly, so this is straightforward
    
    Args:
        file_path: Path to audio file
        sr: Target sample rate (default: 16000)
        
    Returns:
        Processed audio data as numpy array
    """
    try:
        logger.info(f"Loading audio file: {file_path}")
        
        # Load audio with librosa (supports WAV, MP3, etc.)
        audio_data, sample_rate = librosa.load(file_path, sr=sr, mono=True)
        audio_data = process_audio(audio_data, sample_rate)
        
        logger.info(f"Audio file loaded successfully: {file_path}")
        return audio_data
        
    except Exception as e:
        logger.error(f"Error loading audio file: {e}", exc_info=True)
        raise Exception(f"Failed to load audio file: {e}")

def load_audio_from_bytes(audio_bytes: bytes, sr: int = 16000) -> np.ndarray:
    """
    Load audio from bytes (e.g., from uploaded file) and return audio data
    
    Args:
        audio_bytes: Audio data as bytes
        sr: Target sample rate (default: 16000)
        
    Returns:
        Processed audio data as numpy array
    """
    try:
        # Save to temporary file since librosa handles file paths better
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
            tmp_file.write(audio_bytes)
            tmp_path = tmp_file.name
        
        # Load audio from temporary file
        audio_data, sample_rate = librosa.load(tmp_path, sr=sr)
        audio_data = process_audio(audio_data, sample_rate)
        
        # Clean up
        os.unlink(tmp_path)
        
        logger.info("Audio loaded from bytes successfully")
        return audio_data
    except Exception as e:
        logger.error(f"Error loading audio from bytes: {e}")
        raise Exception(f"Failed to load audio from bytes: {e}")

def load_audio_from_upload(upload_file) -> np.ndarray:
    """
    Load audio from FastAPI UploadFile and return audio data
    Frontend sends WAV files, so this is straightforward
    
    Args:
        upload_file: FastAPI UploadFile object
        
    Returns:
        Processed audio data as numpy array
    """
    try:
        # Get file extension from filename
        file_ext = Path(upload_file.filename).suffix if upload_file.filename else '.wav'
        logger.info(f"Processing uploaded file: {upload_file.filename}, type: {upload_file.content_type}")
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
            # Read and write the uploaded file
            content = upload_file.file.read()
            logger.info(f"Read {len(content)} bytes from upload")
            
            if len(content) == 0:
                raise Exception("Empty audio file received")
                
            tmp_file.write(content)
            tmp_path = tmp_file.name
        
        logger.info(f"Saved to temporary file: {tmp_path}")
        
        # Load audio from temporary file
        audio_data = load_audio_file(tmp_path)
        
        # Clean up temporary file
        try:
            os.unlink(tmp_path)
        except:
            pass  # Ignore cleanup errors
        
        logger.info(f"Audio uploaded successfully: {upload_file.filename}, shape: {audio_data.shape}")
        return audio_data
        
    except Exception as e:
        logger.error(f"Error loading audio from upload: {e}", exc_info=True)
        raise Exception(f"Failed to load audio from upload: {e}")


def predict_emotion(audio_data, model, processor) -> Tuple[str, float, Dict[str, float]]:
    """
    Predict emotion from audio
    
    Args:
        audio_data: Processed audio as numpy array
        model: Loaded Wav2Vec2 model
        processor: Loaded feature extractor
        
    Returns:
        Tuple of (predicted_emotion, confidence, all_emotions_dict)
    """
    try:
        # Prepare inputs
        inputs = processor(
            audio_data,
            sampling_rate=16000,
            return_tensors="pt",
            padding=True,
            max_length=160000,
            truncation=True
        )
        
        # Predict
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            probs = torch.nn.functional.softmax(logits, dim=-1)[0]
            probs = probs.cpu().numpy()
        
        # Get predictions
        predicted_id = np.argmax(probs)
        predicted_emotion = model.config.id2label[predicted_id]
        confidence = float(probs[predicted_id])
        
        # Get all emotion probabilities
        all_emotions = {model.config.id2label[i]: float(probs[i]) for i in range(len(probs))}
        
        logger.info(f"Emotion predicted: {predicted_emotion} (confidence: {confidence:.4f})")
        return predicted_emotion, confidence, all_emotions
        
    except Exception as e:
        logger.error(f"Error predicting emotion: {e}")
        raise Exception(f"Failed to predict emotion: {e}")

# ===================================================================
# HELPER FUNCTIONS FOR EMOTION MAPPING
# ===================================================================

def get_emotion_emoji(emotion: str) -> str:
    """Get emoji for each of 7 emotions"""
    emoji_map = {
        'angry': '😠',
        'disgust': '🤢',
        'fear': '😨',
        'happy': '😊',
        'neutral': '😐',
        'sad': '😢',
        'surprise': '😲'
    }
    return emoji_map.get(emotion.lower(), '🎭')

def get_emotion_color(emotion: str) -> str:
    """Get color code for each of 7 emotions"""
    color_map = {
        'angry': '#EF4444',      # Red
        'disgust': '#8B5CF6',    # Purple
        'fear': '#F59E0B',       # Orange
        'happy': '#10B981',      # Green
        'neutral': '#6B7280',    # Gray
        'sad': '#3B82F6',        # Blue
        'surprise': '#EC4899'    # Pink
    }
    return color_map.get(emotion.lower(), '#6B7280')

def get_emotion_description(emotion: str) -> str:
    """Get description for each of 7 emotions"""
    description_map = {
        'angry': 'Displeasure, frustration',
        'disgust': 'Revulsion, disapproval',
        'fear': 'Anxiety, apprehension',
        'happy': 'Joy, contentment',
        'neutral': 'Baseline state',
        'sad': 'Sorrow, melancholy',
        'surprise': 'Astonishment'
    }
    return description_map.get(emotion.lower(), 'Unknown emotion')

# ===================================================================
# CONVENIENCE FUNCTION FOR END-TO-END PREDICTION
# ===================================================================

def analyze_audio_file(file_path: str, model_path_or_repo: str) -> Dict:
    """
    End-to-end audio emotion analysis from file path
    
    Args:
        file_path: Path to audio file
        model_path_or_repo: Path to model or HuggingFace repo
        
    Returns:
        Dictionary with prediction results
    """
    try:
        # Load model
        model, processor = load_model(model_path_or_repo)
        
        # Load and process audio
        audio_data = load_audio_file(file_path)
        
        # Predict emotion
        emotion, confidence, all_emotions = predict_emotion(audio_data, model, processor)
        
        return {
            "success": True,
            "prediction": {
                "emotion": emotion,
                "confidence": confidence,
                "all_emotions": all_emotions,
                "emoji": get_emotion_emoji(emotion),
                "color": get_emotion_color(emotion),
                "description": get_emotion_description(emotion)
            }
        }
        
    except Exception as e:
        logger.error(f"Error analyzing audio file: {e}")
        return {
            "success": False,
            "error": str(e)
        }

def analyze_audio_upload(upload_file, model_path_or_repo: str) -> Dict:
    """
    End-to-end audio emotion analysis from uploaded file
    
    Args:
        upload_file: FastAPI UploadFile object
        model_path_or_repo: Path to model or HuggingFace repo
        
    Returns:
        Dictionary with prediction results
    """
    try:
        # Load model
        model, processor = load_model(model_path_or_repo)
        
        # Load and process audio from upload
        audio_data = load_audio_from_upload(upload_file)
        
        # Predict emotion
        emotion, confidence, all_emotions = predict_emotion(audio_data, model, processor)
        
        return {
            "success": True,
            "prediction": {
                "emotion": emotion,
                "confidence": confidence,
                "all_emotions": all_emotions,
                "emoji": get_emotion_emoji(emotion),
                "color": get_emotion_color(emotion),
                "description": get_emotion_description(emotion)
            }
        }
        
    except Exception as e:
        logger.error(f"Error analyzing audio upload: {e}")
        return {
            "success": False,
            "error": str(e)
        }