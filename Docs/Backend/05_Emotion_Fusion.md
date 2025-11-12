# Emotion Fusion Documentation

## Overview
The emotion fusion service intelligently combines voice and face predictions into a single, robust emotion result using context-aware weighting and compatibility analysis.

## File Location

```
BackEnd/services/
├── __init__.py
└── emotion_fusion.py
```

---

## Core Concepts

### Why Fusion?

**Problem:** Voice and face don't always agree
- Voice says "happy", Face says "sad" → Conflict
- Voice 0.88 confidence, Face 0.42 confidence → Trust voice more
- Both say "happy" → Strong agreement, boost confidence

**Solution:** Intelligent merging algorithm that:
1. Detects agreement level
2. Adjusts weights based on confidence
3. Resolves conflicts intelligently
4. Generates human-readable explanations

---

## Compatibility Matrix

### Emotion Relationships

```python
COMPATIBILITY_MATRIX = {
    'happy': ['happy', 'surprise', 'neutral'],
    # Happy is compatible with surprise (joy → amazement)
    # and neutral (calm happiness)
    
    'sad': ['sad', 'fear', 'neutral'],
    # Sad relates to fear (worry) and neutral (subdued sadness)
    
    'angry': ['angry', 'disgust', 'fear'],
    # Anger can co-occur with disgust (repulsion)
    # and fear (defensive anger)
    
    'fear': ['fear', 'sad', 'surprise', 'angry'],
    # Fear is complex, relates to many emotions
    
    'surprise': ['surprise', 'happy', 'fear'],
    # Surprise can be pleasant (happy) or unpleasant (fear)
    
    'disgust': ['disgust', 'angry', 'sad'],
    # Disgust often accompanies anger or sadness
    
    'neutral': ['neutral', 'happy', 'sad', 'surprise']
    # Neutral is baseline, can lean toward any emotion
}
```

**Purpose:** Determines which emotion combinations are reasonable vs conflicting

---

## Agreement Detection

### get_emotion_agreement(voice_emotion, face_emotion)

```python
def get_emotion_agreement(voice_emotion: str, face_emotion: str) -> str:
    """
    Determine how well voice and face predictions align
    
    Returns: "strong", "moderate", "weak", or "conflict"
    """
    
    # Case 1: Exact match
    if voice_emotion == face_emotion:
        return "strong"
        # Both say "happy" → Strong agreement
    
    # Case 2: Face emotion in voice's compatible list
    if face_emotion in COMPATIBILITY_MATRIX.get(voice_emotion, []):
        return "moderate"
        # Voice: sad, Face: fear → Moderate (compatible)
    
    # Case 3: Voice emotion in face's compatible list
    if voice_emotion in COMPATIBILITY_MATRIX.get(face_emotion, []):
        return "weak"
        # Voice: neutral, Face: happy → Weak (one-way compatible)
    
    # Case 4: No compatibility
    return "conflict"
    # Voice: happy, Face: sad → Conflict
```

### Agreement Levels

| Level         | Meaning               | Example           | Confidence Adjustment |
|---------------|-----------------------|-------------------|-----------------------|
| **Strong**    | Exact same emotion    | happy + happy     | Average both          |
| **Moderate**  | Compatible emotions   | sad + fear        | Use higher confidence |
| **Weak**      | Partially related     | neutral + happy   | Weight toward higher  |
| **Conflict**  | Incompatible          | happy + sad       | Heavy weight on higher|

---

## Confidence-Based Weighting

### get_confidence_weights(voice_conf, face_conf, agreement)

```python
def get_confidence_weights(voice_conf, face_conf, agreement):
    """
    Dynamically adjust weights based on confidence and agreement
    
    Base: Voice 60%, Face 40% (voice is primary)
    Adjustments applied based on multiple factors
    """
    
    # Base weights (voice-dominant)
    voice_weight = 0.6
    face_weight = 0.4
    
    # Factor 1: Low face confidence
    if face_conf < 0.5:
        voice_weight += 0.15  # → 0.75
        face_weight -= 0.15   # → 0.25
        # Don't trust low-confidence face prediction
    
    # Factor 2: Large confidence difference
    conf_diff = abs(voice_conf - face_conf)
    if conf_diff > 0.3:
        if voice_conf > face_conf:
            voice_weight += 0.1  # → 0.70-0.85
            face_weight -= 0.1   # → 0.30-0.15
        else:
            voice_weight -= 0.1  # → 0.50
            face_weight += 0.1   # → 0.50
        # Trust the more confident prediction
    
    # Factor 3: Agreement level
    if agreement == "strong":
        # Both agree, balance more evenly
        voice_weight = 0.55
        face_weight = 0.45
    elif agreement == "conflict":
        # Conflict, trust higher confidence more
        if voice_conf > face_conf:
            voice_weight = 0.7
            face_weight = 0.3
        else:
            voice_weight = 0.3
            face_weight = 0.7
    
    # Ensure weights sum to 1.0
    total = voice_weight + face_weight
    voice_weight /= total
    face_weight /= total
    
    return voice_weight, face_weight
```

### Weight Examples

| Scenario   | Voice Conf | Face Conf | Agreement | Voice Weight | Face Weight |
|------------|------------|-----------|-----------|--------------|-------------|
| Normal     | 0.87       | 0.78      | strong    | 55%          | 45%         |
| Low face   | 0.89       | 0.42      | conflict  | 75%          | 25%         |
| No camera  | 0.89       | 0.30      | weak      | 85%          | 15%         |
| High face  | 0.65       | 0.92      | strong    | 45%          | 55%         |
| Equal high | 0.88       | 0.85      | strong    | 55%          | 45%         |

---

## Main Merge Function

### merge_emotions(...) → dict

```python
def merge_emotions(
    voice_emotion: str,
    voice_confidence: float,
    voice_all_emotions: dict,
    face_emotion: str,
    face_confidence: float,
    face_all_emotions: dict
) -> dict:
    """
    Core merging algorithm
    
    Flow:
    1. Determine agreement level
    2. Calculate confidence weights
    3. Choose final emotion
    4. Combine all emotion scores
    5. Calculate final confidence
    6. Generate explanation
    
    Returns: Complete merged result
    """
```

### Step 1: Determine Agreement

```python
agreement = get_emotion_agreement(voice_emotion, face_emotion)
# Result: "strong", "moderate", "weak", or "conflict"
```

### Step 2: Calculate Weights

```python
voice_weight, face_weight = get_confidence_weights(
    voice_confidence,
    face_confidence,
    agreement
)
# Result: (0.6, 0.4) or adjusted weights
```

### Step 3: Choose Final Emotion

```python
# Case A: Strong agreement (same emotion)
if agreement == "strong":
    final_emotion = voice_emotion
    final_confidence = (voice_confidence + face_confidence) / 2
    # Average confidences

# Case B: Moderate/Weak agreement (compatible)
elif agreement in ["moderate", "weak"]:
    if voice_confidence >= face_confidence:
        final_emotion = voice_emotion
        final_confidence = voice_confidence * 1.05  # Small boost
    else:
        final_emotion = face_emotion
        final_confidence = face_confidence * 1.05
    # Use higher confidence, apply agreement bonus

# Case C: Conflict (incompatible emotions)
else:  # conflict
    if voice_confidence > face_confidence + 0.2:
        # Voice much more confident
        final_emotion = voice_emotion
        final_confidence = voice_confidence * 0.9
    elif face_confidence > voice_confidence + 0.2:
        # Face much more confident
        final_emotion = face_emotion
        final_confidence = face_confidence * 0.9
    else:
        # Similar confidence, use weighted choice
        if voice_weight > face_weight:
            final_emotion = voice_emotion
            final_confidence = voice_confidence * voice_weight
        else:
            final_emotion = face_emotion
            final_confidence = face_confidence * face_weight
    # Resolve conflict, slight penalty for disagreement
```

### Step 4: Combine All Emotions

```python
# Weighted average of all emotion scores
combined_emotions = {}
all_emotions = set(voice_all_emotions.keys()) | set(face_all_emotions.keys())

for emotion in all_emotions:
    voice_score = voice_all_emotions.get(emotion, 0)
    face_score = face_all_emotions.get(emotion, 0)
    
    combined_emotions[emotion] = (
        voice_score * voice_weight +
        face_score * face_weight
    )

# Normalize to sum to 1.0
total = sum(combined_emotions.values())
combined_emotions = {k: v/total for k, v in combined_emotions.items()}
```

### Step 5: Generate Explanation

```python
if agreement == "strong":
    explanation = f"Voice and face predictions agree strongly on {final_emotion} emotion."
elif agreement == "moderate":
    explanation = f"Voice ({voice_emotion}) and face ({face_emotion}) show compatible emotions."
elif agreement == "weak":
    explanation = f"Weak agreement between voice ({voice_emotion}) and face ({face_emotion})."
else:
    explanation = f"Conflict: High confidence {final_emotion} chosen over {'voice' if final_emotion == face_emotion else 'face'}."
```

### Step 6: Return Result

```python
return {
    "final_emotion": final_emotion,
    "confidence": final_confidence,
    "agreement": agreement,
    "voice_weight": voice_weight,
    "face_weight": face_weight,
    "all_combined_emotions": combined_emotions,
    "voice_prediction": {
        "emotion": voice_emotion,
        "confidence": voice_confidence,
        "all_emotions": voice_all_emotions
    },
    "face_prediction": {
        "emotion": face_emotion,
        "confidence": face_confidence,
        "all_emotions": face_all_emotions
    },
    "explanation": explanation
}
```

---

## Merge Examples

### Example 1: Strong Agreement

**Input:**
```python
Voice: happy (0.87)
Face: happy (0.78)
```

**Process:**
```python
# Step 1: Agreement
agreement = "strong"  # Same emotion

# Step 2: Weights
voice_weight = 0.55  # Balanced for strong agreement
face_weight = 0.45

# Step 3: Final emotion
final_emotion = "happy"
final_confidence = (0.87 + 0.78) / 2 = 0.825

# Step 4: Combined emotions
{
    "happy": (0.87 * 0.55) + (0.78 * 0.45) = 0.829,
    "sad": (0.05 * 0.55) + (0.02 * 0.45) = 0.036,
    ...
}
# Normalized to sum to 1.0
```

**Output:**
```json
{
  "final_emotion": "happy",
  "confidence": 0.825,
  "agreement": "strong",
  "voice_weight": 0.55,
  "face_weight": 0.45,
  "explanation": "Voice and face predictions agree strongly on happy emotion."
}
```

---

### Example 2: Moderate Agreement

**Input:**
```python
Voice: sad (0.85)
Face: fear (0.65)
```

**Process:**
```python
# Step 1: Agreement
agreement = "moderate"  # fear in COMPATIBILITY_MATRIX['sad']

# Step 2: Weights
voice_weight = 0.6  # Base weights
face_weight = 0.4

# Step 3: Final emotion
final_emotion = "sad"  # Higher confidence (0.85 > 0.65)
final_confidence = 0.85 * 1.05 = 0.8925  # Agreement bonus

# Step 4: Combined emotions
{
    "sad": (0.85 * 0.6) + (0.05 * 0.4) = 0.530,
    "fear": (0.02 * 0.6) + (0.65 * 0.4) = 0.272,
    ...
}
```

**Output:**
```json
{
  "final_emotion": "sad",
  "confidence": 0.89,
  "agreement": "moderate",
  "voice_weight": 0.6,
  "face_weight": 0.4,
  "explanation": "Voice (sad) and face (fear) show compatible emotions. Sad chosen with high confidence."
}
```

---

### Example 3: Conflict Resolution

**Input:**
```python
Voice: happy (0.88)
Face: sad (0.42)
```

**Process:**
```python
# Step 1: Agreement
agreement = "conflict"  # happy and sad incompatible

# Step 2: Weights
# Face confidence < 0.5 → increase voice weight
voice_weight = 0.75  # 0.6 + 0.15
face_weight = 0.25   # 0.4 - 0.15

# Conflict → further adjust
voice_weight = 0.7  # Trust higher confidence
face_weight = 0.3

# Step 3: Final emotion
final_emotion = "happy"  # Voice much more confident
final_confidence = 0.88 * 0.9 = 0.792  # Conflict penalty

# Step 4: Combined emotions
{
    "happy": (0.88 * 0.7) + (0.02 * 0.3) = 0.622,
    "sad": (0.05 * 0.7) + (0.42 * 0.3) = 0.161,
    ...
}
```

**Output:**
```json
{
  "final_emotion": "happy",
  "confidence": 0.79,
  "agreement": "conflict",
  "voice_weight": 0.7,
  "face_weight": 0.3,
  "explanation": "Conflict: High confidence voice prediction (happy) chosen over low confidence face (sad)."
}
```

---

### Example 4: No Camera (Placeholder)

**Input:**
```python
Voice: sad (0.89)
Face: neutral (0.30)  # Placeholder fallback
```

**Process:**
```python
# Step 1: Agreement
agreement = "weak"  # neutral in COMPATIBILITY_MATRIX['sad']

# Step 2: Weights
# Face confidence < 0.5 → heavily increase voice weight
voice_weight = 0.85  # 0.6 + 0.15 + extra for very low face conf
face_weight = 0.15

# Step 3: Final emotion
final_emotion = "sad"  # Voice drives result
final_confidence = 0.89 * 1.02 = 0.908  # Slight boost

# Step 4: Combined emotions
{
    "sad": (0.89 * 0.85) + (0.0 * 0.15) = 0.757,
    "neutral": (0.01 * 0.85) + (0.30 * 0.15) = 0.054,
    ...
}
```

**Output:**
```json
{
  "final_emotion": "sad",
  "confidence": 0.91,
  "agreement": "weak",
  "voice_weight": 0.85,
  "face_weight": 0.15,
  "explanation": "Voice-driven prediction (sad) with weak face support (neutral fallback).",
  "face_prediction": {
    "warning": "No camera available, using neutral fallback"
  }
}
```

---

## Helper Functions

### get_fusion_summary(merged_result)

```python
def get_fusion_summary(merged_result: dict) -> str:
    """
    Generate human-readable summary
    
    Returns: User-friendly description
    """
    emotion = merged_result['final_emotion']
    confidence = merged_result['confidence']
    agreement = merged_result['agreement']
    voice_emotion = merged_result['voice_prediction']['emotion']
    face_emotion = merged_result['face_prediction']['emotion']
    
    if agreement == "strong":
        return f"Strong agreement: Both voice and face indicate {emotion} with high confidence"
    elif agreement == "moderate":
        return f"Moderate confidence: Voice suggests {voice_emotion}, face shows {face_emotion}"
    elif agreement == "weak":
        return f"Weak agreement: {emotion} emotion detected with mixed signals"
    else:
        return f"Conflict resolved: {emotion} chosen with {confidence:.0%} confidence"
```

**Usage:**
```python
summary = get_fusion_summary(merged_result)
# "Strong agreement: Both voice and face indicate happy with high confidence"
```

---

### get_recommendation_emotion(merged_result)

```python
def get_recommendation_emotion(merged_result: dict) -> str:
    """
    Map merged emotion to Spotify recommendation categories
    
    Returns: Spotify mood string
    """
    emotion = merged_result['final_emotion']
    
    # Direct mappings
    if emotion in ['happy', 'sad', 'angry', 'neutral']:
        return emotion
    
    # Special mappings
    elif emotion == 'fear':
        return 'calm'  # Opposite emotion for soothing
    elif emotion == 'surprise':
        return 'energetic'  # High energy response
    elif emotion == 'disgust':
        return 'neutral'  # Neutral fallback
    
    return 'neutral'  # Default fallback
```

**Mapping Logic:**
- **happy → happy:** Upbeat music
- **sad → sad:** Melancholic music
- **angry → angry:** Intense music
- **fear → calm:** Soothing music (opposite)
- **surprise → energetic:** High energy
- **disgust → neutral:** Neutral/chill
- **neutral → neutral:** Balanced music

---

## Called By

### server_api.py

```python
@app.post("/analyze-voice-and-face")
async def analyze_voice_and_face(...):
    # Step 1: Voice analysis
    voice_result = voice_api.analyze_audio_upload(...)
    
    # Step 2: Face analysis
    face_result = face_expression.detect_expression(...)
    
    # Step 3: Merge predictions
    merged_result = emotion_fusion.merge_emotions(
        voice_emotion=voice_result['prediction']['emotion'],
        voice_confidence=voice_result['prediction']['confidence'],
        voice_all_emotions=voice_result['prediction']['all_emotions'],
        face_emotion=face_result['emotion'],
        face_confidence=face_result['confidence'],
        face_all_emotions=face_result.get('all_emotions', {})
    )
    
    # Step 4: Get summary
    summary = emotion_fusion.get_fusion_summary(merged_result)
    
    # Step 5: Map to Spotify mood
    recommendation_emotion = emotion_fusion.get_recommendation_emotion(merged_result)
    
    # Step 6: Get recommendations
    recommendations = spotify_service.get_mood_recommendations(recommendation_emotion, limit)
    
    # Return complete analysis
    return {
        "success": True,
        "analysis": {
            "merged_emotion": merged_result['final_emotion'],
            "merged_confidence": merged_result['confidence'],
            "agreement": merged_result['agreement'],
            "voice_weight": merged_result['voice_weight'],
            "face_weight": merged_result['face_weight'],
            "voice_prediction": merged_result['voice_prediction'],
            "face_prediction": merged_result['face_prediction'],
            "summary": summary,
            "explanation": merged_result['explanation']
        },
        "recommendations": recommendations
    }
```

---

## Performance Impact



## Testing Fusion Logic

### Unit Test Example

```python
def test_strong_agreement():
    result = merge_emotions(
        voice_emotion="happy",
        voice_confidence=0.87,
        voice_all_emotions={"happy": 0.87, "sad": 0.05, ...},
        face_emotion="happy",
        face_confidence=0.78,
        face_all_emotions={"happy": 0.78, "sad": 0.02, ...}
    )
    
    assert result['final_emotion'] == "happy"
    assert result['agreement'] == "strong"
    assert result['voice_weight'] == 0.55
    assert result['face_weight'] == 0.45
    assert 0.80 <= result['confidence'] <= 0.85

def test_conflict_resolution():
    result = merge_emotions(
        voice_emotion="happy",
        voice_confidence=0.88,
        voice_all_emotions={"happy": 0.88, ...},
        face_emotion="sad",
        face_confidence=0.42,
        face_all_emotions={"sad": 0.42, ...}
    )
    
    assert result['final_emotion'] == "happy"  # Higher confidence wins
    assert result['agreement'] == "conflict"
    assert result['voice_weight'] > 0.7  # Voice heavily weighted
    assert result['confidence'] < 0.88  # Conflict penalty applied
```

---

## Next Steps

- **[Spotify Integration](./06_Spotify_Integration.md)** - Music recommendations
- **[Complete Flow](./07_Complete_Flow.md)** - End-to-end journey
- **[Model Evaluation](./08_Model_Evaluation.md)** - Performance metrics
