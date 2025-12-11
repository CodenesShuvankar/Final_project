import cv2
import logging
import numpy as np
import torch
from hsemotion.facial_emotions import HSEmotionRecognizer

logger = logging.getLogger(__name__)

# Patch torch.load to allow trusted checkpoints (bypass weights_only strict mode)
original_load = torch.load
def safe_load_wrapper(*args, **kwargs):
    if 'weights_only' not in kwargs:
        kwargs['weights_only'] = False
    return original_load(*args, **kwargs)
torch.load = safe_load_wrapper

# Map HSEmotion output to standard 7-emotion labels
EMOTION_MAPPING = {
    "happiness": "happy",
    "happy": "happy",
    "anger": "angry",
    "angry": "angry",
    "disgust": "disgust",
    "fear": "fear",
    "sadness": "sad",
    "sad": "sad",
    "surprise": "surprise",
    "neutral": "neutral"
}

# Lazy singleton to avoid reloading weights repeatedly
_hse_recognizer = None


def _get_recognizer():
    global _hse_recognizer
    if _hse_recognizer is None:
        try:
            _hse_recognizer = HSEmotionRecognizer(model_name="enet_b0_8_best_vgaf", device="cpu")
            logger.info("✅ HSEmotion face model loaded (enet_b0_8_best_vgaf)")
        except Exception as e:
            logger.error("Failed to load HSEmotion model: %s", e)
            raise
    return _hse_recognizer

def detect_expression(image_path):
    """
    Detect facial expression from image
    
    Args:
        image_path: Path to image file or UploadFile object
        
    Returns:
        Dictionary with emotion detection results
    """
    logger.info("Its True")
    try:
        # Check if image is a placeholder (no camera available)
        img = cv2.imread(image_path)
        if img is None:
            logger.warning("Could not read image file")
            return {
                "success": True,
                "emotion": "neutral",
                "confidence": 0.3,
                "all_emotions": {"neutral": 0.3},
                "warning": "Could not read image, using neutral fallback"
            }
        
        # Check if image is mostly uniform (placeholder detection)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        std_dev = gray.std()
        if std_dev < 10:  # Very low variance indicates placeholder
            logger.info("Detected placeholder image (no camera), using neutral emotion")
            return {
                "success": True,
                "emotion": "neutral",
                "confidence": 0.3,
                "all_emotions": {"neutral": 0.3},
                "warning": "No camera available, using neutral fallback"
            }
        
        # HSEmotion inference (RGB expected)
        try:
            recognizer = _get_recognizer()
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            emotion, scores = recognizer.predict_emotions(img_rgb, logits=False)

            if isinstance(scores, dict):
                # Map HSEmotion keys to standard emotions
                all_emotions = {}
                for k, v in scores.items():
                    normalized_key = EMOTION_MAPPING.get(k.lower(), k.lower())
                    all_emotions[normalized_key] = float(v)
            elif isinstance(scores, (list, tuple, np.ndarray)):
                # If scores is array-like aligned with recognizer.emotions
                labels = getattr(recognizer, "emotions", ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"])
                all_emotions = {}
                for i, lbl in enumerate(labels):
                    normalized_label = EMOTION_MAPPING.get(lbl.lower(), lbl.lower())
                    all_emotions[normalized_label] = float(scores[i])
            else:
                all_emotions = {"neutral": 0.3}

            # Normalize emotion name
            raw_emotion = emotion.lower() if isinstance(emotion, str) else max(all_emotions, key=all_emotions.get)
            detected_emotion = EMOTION_MAPPING.get(raw_emotion, raw_emotion)
            confidence = all_emotions.get(detected_emotion, 0.0)

            logger.info(f"Face emotion detected (HSE): {detected_emotion} (confidence: {confidence:.2%})")

            return {
                "success": True,
                "emotion": detected_emotion,
                "confidence": confidence,
                "all_emotions": all_emotions
            }
        except Exception as e2:
            logger.warning(f"HSEmotion failed, using neutral fallback: {e2}")
            return {
                "success": True,
                "emotion": "neutral",
                "confidence": 0.3,
                "all_emotions": {"neutral": 0.3},
                "warning": "Face detection failed, using neutral fallback"
            }
        
    except Exception as e:
        logger.error(f"Error detecting facial expression: {e}")
        return {
            "success": True,
            "error": str(e),
            "emotion": "neutral",  # Fallback to neutral if detection fails
            "confidence": 0.3,
            "all_emotions": {"neutral": 0.3},
            "warning": f"Face detection error: {str(e)}"
        }


