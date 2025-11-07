from deepface import DeepFace
import logging

logger = logging.getLogger(__name__)

def detect_expression(image_path):
    """
    Detect facial expression from image
    
    Args:
        image_path: Path to image file or UploadFile object
        
    Returns:
        Dictionary with emotion detection results
    """
    try:
        results = DeepFace.analyze(img_path=image_path, actions=['emotion'])
        detected_emotion = results[0]['dominant_emotion']
        all_emotions = results[0]['emotion']
        
        # Normalize emotion names to lowercase
        all_emotions = {k.lower(): v/100.0 for k, v in all_emotions.items()}
        
        # Get confidence (as a decimal, not percentage)
        confidence = all_emotions.get(detected_emotion.lower(), 0.0)
        
        logger.info(f"Face emotion detected: {detected_emotion} (confidence: {confidence:.2%})")
        
        return {
            "success": True,
            "emotion": detected_emotion.lower(),
            "confidence": confidence,
            "all_emotions": all_emotions
        }
        
    except Exception as e:
        logger.error(f"Error detecting facial expression: {e}")
        return {
            "success": False,
            "error": str(e)
        }


# def detect_expression_simple(image_path):
#     """
#     Simple version that returns just the emotion string (for backward compatibility)
    
#     Args:
#         image_path: Path to image file
        
#     Returns:
#         String with detected emotion name
#     """
#     try:
#         results = DeepFace.analyze(img_path=image_path, actions=['emotion'])
#         detected_emotion = results[0]['dominant_emotion']
#         return detected_emotion.lower()
#     except Exception as e:
#         logger.error(f"Error detecting facial expression: {e}")
#         raise
