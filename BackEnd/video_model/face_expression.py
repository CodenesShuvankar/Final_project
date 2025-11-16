from deepface import DeepFace
import cv2
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
        
        # Try with face detection first
        try:
            results = DeepFace.analyze(
                img_path=image_path, 
                actions=['emotion'],
                enforce_detection=True,
                detector_backend='opencv'
            )
        except ValueError as face_error:
            # If no face detected, retry with enforce_detection=False
            logger.warning(f"No face detected with strict mode, retrying with lenient mode: {face_error}")
            try:
                results = DeepFace.analyze(
                    img_path=image_path, 
                    actions=['emotion'],
                    enforce_detection=False,
                    detector_backend='opencv'
                )
            except Exception as e2:
                # If both fail, return neutral fallback
                logger.warning(f"Both detection modes failed: {str(e2)}")
                return {
                    "success": True,
                    "emotion": "neutral",
                    "confidence": 0.3,
                    "all_emotions": {"neutral": 0.3},
                    "warning": "Face detection failed, using neutral fallback"
                }
        
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
            "success": True,
            "error": str(e),
            "emotion": "neutral",  # Fallback to neutral if detection fails
            "confidence": 0.3,
            "all_emotions": {"neutral": 0.3},
            "warning": f"Face detection error: {str(e)}"
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
