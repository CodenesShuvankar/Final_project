"""
Emotion Fusion Service
Intelligently merges predictions from voice and face emotion detection models
"""

import logging
from typing import Dict, Tuple, Optional

logger = logging.getLogger(__name__)


class EmotionFusionService:
    """
    Service for fusing voice and facial emotion predictions
    Handles cases where models disagree and provides confidence-weighted results
    """
    
    # Emotion mapping between different model outputs
    # Maps face emotions to voice emotions (7-class)
    EMOTION_MAPPING = {
        # DeepFace emotions -> Voice model emotions
        'angry': 'angry',
        'disgust': 'disgust',
        'fear': 'fear',
        'happy': 'happy',
        'sad': 'sad',
        'surprise': 'surprise',
        'neutral': 'neutral'
    }
    
    # Emotion compatibility matrix (how well emotions align)
    # Higher score = more compatible/similar emotions
    EMOTION_COMPATIBILITY = {
        'angry': {'angry': 1.0, 'disgust': 0.6, 'fear': 0.3, 'happy': 0.0, 'neutral': 0.2, 'sad': 0.4, 'surprise': 0.3},
        'disgust': {'angry': 0.6, 'disgust': 1.0, 'fear': 0.4, 'happy': 0.0, 'neutral': 0.2, 'sad': 0.3, 'surprise': 0.2},
        'fear': {'angry': 0.3, 'disgust': 0.4, 'fear': 1.0, 'happy': 0.0, 'neutral': 0.2, 'sad': 0.5, 'surprise': 0.7},
        'happy': {'angry': 0.0, 'disgust': 0.0, 'fear': 0.0, 'happy': 1.0, 'neutral': 0.4, 'sad': 0.0, 'surprise': 0.5},
        'neutral': {'angry': 0.2, 'disgust': 0.2, 'fear': 0.2, 'happy': 0.4, 'neutral': 1.0, 'sad': 0.3, 'surprise': 0.3},
        'sad': {'angry': 0.4, 'disgust': 0.3, 'fear': 0.5, 'happy': 0.0, 'neutral': 0.3, 'sad': 1.0, 'surprise': 0.2},
        'surprise': {'angry': 0.3, 'disgust': 0.2, 'fear': 0.7, 'happy': 0.5, 'neutral': 0.3, 'sad': 0.2, 'surprise': 1.0}
    }
    
    # Weights for different modalities (can be adjusted based on model reliability)
    DEFAULT_VOICE_WEIGHT = 0.6  # Voice model tends to be more reliable for sustained emotions
    DEFAULT_FACE_WEIGHT = 0.4   # Face captures instant expressions
    
    def __init__(self, voice_weight: float = None, face_weight: float = None):
        """
        Initialize the emotion fusion service
        
        Args:
            voice_weight: Weight for voice predictions (default: 0.6)
            face_weight: Weight for face predictions (default: 0.4)
        """
        self.voice_weight = voice_weight or self.DEFAULT_VOICE_WEIGHT
        self.face_weight = face_weight or self.DEFAULT_FACE_WEIGHT
        
        # Normalize weights
        total = self.voice_weight + self.face_weight
        self.voice_weight /= total
        self.face_weight /= total
        
        logger.info(f"Emotion Fusion initialized (voice: {self.voice_weight:.2f}, face: {self.face_weight:.2f})")
    
    def normalize_emotion(self, emotion: str) -> str:
        """Normalize emotion name to lowercase"""
        return emotion.lower().strip()
    
    def get_compatibility(self, emotion1: str, emotion2: str) -> float:
        """
        Get compatibility score between two emotions
        
        Args:
            emotion1: First emotion
            emotion2: Second emotion
            
        Returns:
            Compatibility score (0.0 to 1.0)
        """
        emotion1 = self.normalize_emotion(emotion1)
        emotion2 = self.normalize_emotion(emotion2)
        
        if emotion1 in self.EMOTION_COMPATIBILITY and emotion2 in self.EMOTION_COMPATIBILITY[emotion1]:
            return self.EMOTION_COMPATIBILITY[emotion1][emotion2]
        return 0.0
    
    def merge_emotions(
        self,
        voice_emotion: str,
        voice_confidence: float,
        voice_all_emotions: Dict[str, float],
        face_emotion: str,
        face_confidence: float = 1.0,
        face_all_emotions: Optional[Dict[str, float]] = None
    ) -> Dict:
        """
        Merge voice and face emotion predictions
        
        Args:
            voice_emotion: Predicted emotion from voice model
            voice_confidence: Confidence score for voice prediction
            voice_all_emotions: All emotion probabilities from voice model
            face_emotion: Predicted emotion from face model
            face_confidence: Confidence score for face prediction (default: 1.0)
            face_all_emotions: All emotion probabilities from face model (optional)
            
        Returns:
            Dictionary with merged prediction results
        """
        voice_emotion = self.normalize_emotion(voice_emotion)
        face_emotion = self.normalize_emotion(face_emotion)
        
        logger.info(f"Merging emotions - Voice: {voice_emotion} ({voice_confidence:.2%}), Face: {face_emotion}")
        
        # Check if emotions match
        emotions_match = (voice_emotion == face_emotion)
        compatibility = self.get_compatibility(voice_emotion, face_emotion)
        
        # Calculate weighted scores for all emotions
        merged_emotions = {}
        
        # Use voice emotion probabilities
        for emotion, prob in voice_all_emotions.items():
            emotion_norm = self.normalize_emotion(emotion)
            merged_emotions[emotion_norm] = prob * self.voice_weight
        
        # Add face contribution
        if face_all_emotions:
            for emotion, prob in face_all_emotions.items():
                emotion_norm = self.normalize_emotion(emotion)
                if emotion_norm in merged_emotions:
                    merged_emotions[emotion_norm] += prob * self.face_weight
                else:
                    merged_emotions[emotion_norm] = prob * self.face_weight
        else:
            # If no probability distribution, give full weight to detected emotion
            if face_emotion in merged_emotions:
                merged_emotions[face_emotion] += face_confidence * self.face_weight
            else:
                merged_emotions[face_emotion] = face_confidence * self.face_weight
        
        # Find final predicted emotion
        final_emotion = max(merged_emotions.items(), key=lambda x: x[1])
        final_emotion_name = final_emotion[0]
        final_confidence = final_emotion[1]
        
        # Determine agreement level
        if emotions_match:
            agreement = "strong"
            agreement_score = 1.0
            explanation = f"Both voice and face models strongly agree on '{final_emotion_name}'"
        elif compatibility >= 0.6:
            agreement = "moderate"
            agreement_score = compatibility
            explanation = f"Voice detected '{voice_emotion}' and face detected '{face_emotion}' - related emotions"
        elif compatibility >= 0.3:
            agreement = "weak"
            agreement_score = compatibility
            explanation = f"Voice detected '{voice_emotion}' and face detected '{face_emotion}' - partially related"
        else:
            agreement = "conflict"
            agreement_score = compatibility
            explanation = f"Voice detected '{voice_emotion}' but face detected '{face_emotion}' - conflicting emotions"
        
        # Build detailed result
        result = {
            "final_emotion": final_emotion_name,
            "final_confidence": float(final_confidence),
            "agreement": agreement,
            "agreement_score": float(agreement_score),
            "explanation": explanation,
            "voice_prediction": {
                "emotion": voice_emotion,
                "confidence": float(voice_confidence),
                "all_emotions": voice_all_emotions
            },
            "face_prediction": {
                "emotion": face_emotion,
                "confidence": float(face_confidence),
                "all_emotions": face_all_emotions if face_all_emotions else {face_emotion: face_confidence}
            },
            "merged_probabilities": {k: float(v) for k, v in sorted(merged_emotions.items(), key=lambda x: x[1], reverse=True)},
            "emotions_match": emotions_match,
            "compatibility": float(compatibility)
        }
        
        logger.info(f"Merged result: {final_emotion_name} ({final_confidence:.2%}) - {agreement} agreement")
        
        return result
    
    def get_recommendation_emotion(self, merged_result: Dict) -> str:
        """
        Get the best emotion to use for music recommendations
        
        Args:
            merged_result: Result from merge_emotions()
            
        Returns:
            Emotion name to use for recommendations
        """
        # Use final merged emotion
        final_emotion = merged_result["final_emotion"]
        
        # If agreement is weak or conflict, consider using a neutral fallback
        agreement = merged_result["agreement"]
        if agreement == "conflict" and merged_result["final_confidence"] < 0.4:
            logger.info("Low confidence with conflicting predictions, using neutral")
            return "neutral"
        
        return final_emotion
    
    def get_fusion_summary(self, merged_result: Dict) -> str:
        """
        Get a human-readable summary of the fusion result
        
        Args:
            merged_result: Result from merge_emotions()
            
        Returns:
            Human-readable summary string
        """
        voice_pred = merged_result["voice_prediction"]
        face_pred = merged_result["face_prediction"]
        
        if merged_result["emotions_match"]:
            return (f"✅ Both models agree: {merged_result['final_emotion'].upper()} "
                   f"(confidence: {merged_result['final_confidence']:.1%})")
        
        agreement = merged_result["agreement"]
        if agreement == "moderate":
            return (f"🔀 Models show related emotions: Voice={voice_pred['emotion']}, "
                   f"Face={face_pred['emotion']} → Final: {merged_result['final_emotion'].upper()} "
                   f"(confidence: {merged_result['final_confidence']:.1%})")
        elif agreement == "weak":
            return (f"⚠️ Models show partially related emotions: Voice={voice_pred['emotion']}, "
                   f"Face={face_pred['emotion']} → Final: {merged_result['final_emotion'].upper()} "
                   f"(confidence: {merged_result['final_confidence']:.1%})")
        else:  # conflict
            return (f"⚡ Models show conflicting emotions: Voice={voice_pred['emotion']} "
                   f"({voice_pred['confidence']:.1%}), Face={face_pred['emotion']} "
                   f"→ Final: {merged_result['final_emotion'].upper()} "
                   f"(confidence: {merged_result['final_confidence']:.1%})")


# Create a singleton instance
emotion_fusion = EmotionFusionService()
