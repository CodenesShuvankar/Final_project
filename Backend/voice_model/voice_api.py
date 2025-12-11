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
import subprocess
from typing import Tuple, Dict, Union, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cache for model (simple in-memory cache)
_model_cache = {}

# ===================================================================
# MODEL LOADING
# ===================================================================

def _clean_state_dict_keys(state_dict: Dict[str, torch.Tensor]) -> Dict[str, torch.Tensor]:
    """Remove common wrappers (module./model.) from checkpoint keys."""
    cleaned = {}
    for k, v in state_dict.items():
        if k.startswith("module."):
            new_key = k[len("module."):]
        elif k.startswith("model."):
            new_key = k[len("model."):]
        else:
            new_key = k
        cleaned[new_key] = v
    return cleaned


def load_model(model_path_or_repo: str, checkpoint_path: Optional[str] = None):
    """
    Load the trained 7-class model and processor.

    If a Torch checkpoint is provided, try to load it into the base model while
    keeping the Hugging Face config from ``model_path_or_repo``.
    """
    checkpoint_mtime = None
    checkpoint_path = str(checkpoint_path) if checkpoint_path else None
    if checkpoint_path and Path(checkpoint_path).exists():
        checkpoint_mtime = Path(checkpoint_path).stat().st_mtime

    cache_key = (model_path_or_repo, checkpoint_mtime)

    # Check cache first
    if cache_key in _model_cache:
        return _model_cache[cache_key]
    
    try:
        model = Wav2Vec2ForSequenceClassification.from_pretrained(model_path_or_repo)
        processor = Wav2Vec2FeatureExtractor.from_pretrained(model_path_or_repo)

        # Optionally load improved weights from checkpoint
        if checkpoint_path and Path(checkpoint_path).exists():
            try:
                state = torch.load(checkpoint_path, map_location=torch.device("cpu"))
                if isinstance(state, dict):
                    if "state_dict" in state:
                        state = state["state_dict"]
                    elif "model_state_dict" in state:
                        state = state["model_state_dict"]
                if isinstance(state, dict):
                    state = _clean_state_dict_keys(state)

                    # Only load keys that match the current architecture; skip mismatched checkpoints
                    model_state = model.state_dict()
                    matched = {k: v for k, v in state.items() if k in model_state and model_state[k].shape == v.shape}

                    if not matched:
                        logger.warning(
                            "Checkpoint at %s is incompatible with this model; skipping load to avoid corrupt weights",
                            checkpoint_path,
                        )
                    else:
                        missing, unexpected = model.load_state_dict(matched, strict=False)
                        if missing:
                            logger.warning(f"Checkpoint missing keys (ignored): {missing}")
                        if unexpected:
                            logger.warning(f"Checkpoint had unexpected keys (ignored): {unexpected}")
                        logger.info(f"Loaded checkpoint weights from {checkpoint_path} with {len(matched)} matching keys")
                else:
                    logger.warning(f"Checkpoint at {checkpoint_path} not a state dict; skipping")
            except Exception as ckpt_error:
                logger.warning(f"Failed to load checkpoint at {checkpoint_path}: {ckpt_error}")
        
        # Cache the loaded model
        _model_cache[cache_key] = (model, processor)
        
        logger.info(f"Model loaded successfully from {model_path_or_repo}")
        return model, processor
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        raise Exception(f"Failed to load model: {e}")

# ===================================================================
# Load Audio and AUDIO PROCESSING
# ===================================================================
def load_audio_file(file_path: str, sr: int = 16000) -> np.ndarray:
    """
    Load audio from file path and return audio data
    
    Args:
        file_path: Path to audio file on disk
        sr: Target sample rate (default: 16000)
        
    Returns:
        Processed audio data as numpy array
    """
    try:
        logger.info(f"Loading audio file: {file_path}")
        
        # Load audio with librosa - already converts to mono and resamples to target sr
        audio_data, sample_rate = librosa.load(file_path, sr=sr, mono=True)
        
        # Normalize amplitude
        audio_data = librosa.util.normalize(audio_data)
        
        logger.info(f"Audio file loaded successfully: {file_path}, shape: {audio_data.shape}")
        return audio_data
        
    except Exception as e:
        logger.error(f"Error loading audio file: {e}", exc_info=True)
        raise Exception(f"Failed to load audio file: {e}")

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
            
            # Reject suspiciously small files (< 1KB likely corrupted)
            if len(content) < 1000:
                logger.warning(f"Suspiciously small audio file: {len(content)} bytes")
                raise Exception(f"Audio file too small ({len(content)} bytes). Likely corrupted or silent.")
                
            tmp_file.write(content)
            tmp_path = tmp_file.name
        
        logger.info(f"Saved to temporary file: {tmp_path}")

        # Try loading with librosa first
        try:
            audio_data, sample_rate = librosa.load(tmp_path, sr=16000, mono=True)
        except Exception as librosa_error:
            logger.warning(f"Librosa failed, trying pydub/FFmpeg: {librosa_error}")
            # Fallback to pydub which uses FFmpeg
            try:
                from pydub import AudioSegment
                import numpy as np
                
                # Load with pydub
                audio = AudioSegment.from_file(tmp_path)
                
                # Convert to mono
                if audio.channels > 1:
                    audio = audio.set_channels(1)
                
                # Resample to 16kHz
                audio = audio.set_frame_rate(16000)
                
                # Convert to numpy array
                samples = np.array(audio.get_array_of_samples(), dtype=np.float32)
                audio_data = samples / (2**15)  # Normalize int16 to float32
                
            except ImportError:
                raise Exception("Failed to load audio. Install FFmpeg: https://ffmpeg.org/download.html")
            except Exception as pydub_error:
                raise Exception(f"Audio file appears corrupted or invalid format: {pydub_error}")
        
        # Normalize amplitude
        audio_data = librosa.util.normalize(audio_data)
        
        # Clean up temporary file
        try:
            os.unlink(tmp_path)
        except:
            pass
        
        logger.info(f"Audio loaded: {upload_file.filename}, shape: {audio_data.shape}")
        return audio_data
        
    except Exception as e:
        logger.error(f"Error loading audio: {e}")
        raise Exception(f"Failed to load audio: {str(e)}")


def assess_audio_quality(audio_data: np.ndarray, sr: int = 16000) -> Dict[str, float]:
    """Lightweight heuristics to flag silence, hum, or low-information audio."""
    rms = float(np.sqrt(np.mean(audio_data ** 2)))
    peak = float(np.max(np.abs(audio_data)))
    zcr = float(librosa.feature.zero_crossing_rate(audio_data, frame_length=1024, hop_length=512)[0].mean())
    centroid = float(librosa.feature.spectral_centroid(y=audio_data, sr=sr)[0].mean())

    # Energy concentration inside the typical speech band (85-4000 Hz)
    spectrum = np.abs(np.fft.rfft(audio_data))
    freqs = np.fft.rfftfreq(len(audio_data), 1.0 / sr)
    speech_band = (freqs >= 85) & (freqs <= 4000)
    speech_energy = float(spectrum[speech_band].sum())
    total_energy = float(spectrum.sum() + 1e-8)
    speech_ratio = speech_energy / total_energy

    return {
        "rms": rms,
        "peak": peak,
        "zcr": zcr,
        "centroid": centroid,
        "speech_ratio": speech_ratio
    }


def predict_emotion(audio_data, model, processor, sr: int = 16000) -> Tuple[str, float, Dict[str, float], Dict[str, float]]:
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
        if len(audio_data) < sr * 0.25:  # shorter than ~250ms
            logger.warning("Audio clip too short for reliable prediction; returning neutral")
            return "neutral", 0.2, {
                "neutral": 0.2,
                "happy": 0.15,
                "sad": 0.15,
                "angry": 0.1,
                "fear": 0.1,
                "disgust": 0.1,
                "surprise": 0.1
            }, {"rms": 0.0, "peak": 0.0, "zcr": 0.0, "centroid": 0.0, "speech_ratio": 0.0}

        quality = assess_audio_quality(audio_data, sr=sr)
        logger.info(
            "Audio quality → rms=%.4f peak=%.4f zcr=%.3f centroid=%.1fHz speech_ratio=%.2f",
            quality["rms"], quality["peak"], quality["zcr"], quality["centroid"], quality["speech_ratio"],
        )

        # Guard rails for silence/low-frequency hum/noise-only input
        # Relaxed thresholds to allow emotional speech with softer volume
        too_quiet = quality["rms"] < 0.05 or quality["peak"] < 0.15
        low_speech_band = quality["speech_ratio"] < 0.05
        no_variation = quality["zcr"] < 0.01 or quality["centroid"] < 80.0

        if too_quiet or low_speech_band or no_variation:
            logger.warning("Audio flagged as low-information; returning neutral fallback")
            return "neutral", 0.25, {
                "neutral": 0.25,
                "happy": 0.15,
                "sad": 0.15,
                "angry": 0.1,
                "fear": 0.1,
                "disgust": 0.1,
                "surprise": 0.1
            }, quality
        
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
            
            # DEBUG: Log raw logits to see if model is uncertain
            logits_np = logits[0].cpu().numpy()
            logits_str = ", ".join(f"{model.config.id2label[i]}={logits_np[i]:.3f}" for i in range(len(logits_np)))
            logger.info(f"Voice raw logits: {logits_str}")
            
            probs = probs.cpu().numpy()
        
        # Get predictions
        predicted_id = np.argmax(probs)
        predicted_emotion = model.config.id2label[predicted_id]
        confidence = float(probs[predicted_id])
        
        # Get all emotion probabilities
        all_emotions = {model.config.id2label[i]: float(probs[i]) for i in range(len(probs))}
        
        # Log ALL probabilities to diagnose low confidence
        sorted_emotions = sorted(all_emotions.items(), key=lambda x: x[1], reverse=True)
        probs_str = ", ".join(f"{emo}={prob:.2%}" for emo, prob in sorted_emotions)
        logger.info(f"Emotion predicted: {predicted_emotion} (confidence: {confidence:.4f})")
        logger.info(f"All emotion probabilities: {probs_str}")
        return predicted_emotion, confidence, all_emotions, quality
        
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

def analyze_audio_file(file_path: str, model_path_or_repo: str, checkpoint_path: Optional[str] = None) -> Dict:
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
        model, processor = load_model(model_path_or_repo, checkpoint_path)
        
        # Load and process audio from file path
        audio_data = load_audio_file(file_path)
        
        # Predict emotion
        emotion, confidence, all_emotions, quality = predict_emotion(audio_data, model, processor)
        
        return {
            "success": True,
            "prediction": {
                "emotion": emotion,
                "confidence": confidence,
                "all_emotions": all_emotions,
                "emoji": get_emotion_emoji(emotion),
                "color": get_emotion_color(emotion),
                "description": get_emotion_description(emotion),
                "quality": quality
            }
        }
        
    except Exception as e:
        logger.error(f"Error analyzing audio file: {e}")
        return {
            "success": False,
            "error": str(e)
        }

def analyze_audio_upload(upload_file, model_path_or_repo: str, checkpoint_path: Optional[str] = None) -> Dict:
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
        model, processor = load_model(model_path_or_repo, checkpoint_path)
        
        # Load and process audio from upload
        audio_data = load_audio_from_upload(upload_file)
        
        # Predict emotion
        emotion, confidence, all_emotions, quality = predict_emotion(audio_data, model, processor)
        
        return {
            "success": True,
            "prediction": {
                "emotion": emotion,
                "confidence": confidence,
                "all_emotions": all_emotions,
                "emoji": get_emotion_emoji(emotion),
                "color": get_emotion_color(emotion),
                "description": get_emotion_description(emotion),
                "quality": quality
            }
        }
        
    except Exception as e:
        logger.error(f"Error analyzing audio upload: {e}")
        return {
            "success": False,
            "error": str(e)
        }