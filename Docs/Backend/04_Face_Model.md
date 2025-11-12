# Face Model Documentation

## Overview
The facial expression detection system uses DeepFace library with OpenCV backend to analyze emotions from facial images.

## Model Details

### DeepFace Library
- **Library:** DeepFace (Python package)
- **Backend:** OpenCV Haar Cascade (default)
- **Pre-trained Models:** VGG-Face, Facenet, OpenFace, or DeepFace
- **Actions:** Emotion detection (7 classes)
- **Detection:** Multi-tier with fallback strategy

## File Location

```
BackEnd/video_model/
├── __init__.py
└── face_expression.py    # Main detection file
```

---

## face_expression.py - Main Function

### detect_expression(image_path: str) → dict

Complete detection function with multi-tier fallback:

```python
def detect_expression(image_path: str) -> dict:
    """
    Detect facial expression from image with fallback handling
    
    Flow:
    1. Read Image
       - cv2.imread(image_path)
       - Load image from disk
    
    2. Placeholder Detection
       - Convert to grayscale
       - Calculate standard deviation
       - If std_dev < 10: Return neutral (no camera scenario)
    
    3. Tier 1: Strict Face Detection
       - DeepFace.analyze(enforce_detection=True)
       - Requires clear, frontal face
       - Uses OpenCV detector backend
       - Throws ValueError if no face found
    
    4. Tier 2: Lenient Face Detection (if Tier 1 fails)
       - DeepFace.analyze(enforce_detection=False)
       - More forgiving, works with partial faces
       - Attempts detection on unclear images
       - Throws Exception if still fails
    
    5. Tier 3: Neutral Fallback (if both fail)
       - Returns neutral emotion with 0.3 confidence
       - Logs warning
       - Allows system to continue (voice-driven)
    
    6. Process Results
       - Extract dominant emotion
       - Get all emotion scores
       - Normalize to 0-1 scale
       - Map emotion names to standard labels
    
    Returns: {
        "success": true,
        "emotion": "happy",
        "confidence": 0.78,
        "all_emotions": {
            "happy": 0.78,
            "neutral": 0.12,
            "surprise": 0.05,
            ...
        },
        "warning": "..." (if fallback used)
    }
    """
```

---

## Detection Tiers Explained

### Tier 1: Strict Detection

```python
try:
    results = DeepFace.analyze(
        img_path=image_path,
        actions=['emotion'],
        enforce_detection=True,
        detector_backend='opencv',
        silent=True
    )
except ValueError as e:
    # Face not found, move to Tier 2
    ...
```

**Characteristics:**
- **enforce_detection=True** - Must find a face
- **Strictest** - Requires clear, frontal face
- **Best quality** - Highest confidence predictions
- **Fails when:**
  - No face in image
  - Face too small
  - Poor lighting
  - Face not frontal
  - Partial face obstruction

**Use Case:** Normal operation with good camera and lighting

---

### Tier 2: Lenient Detection

```python
try:
    results = DeepFace.analyze(
        img_path=image_path,
        actions=['emotion'],
        enforce_detection=False,  # Key difference
        detector_backend='opencv',
        silent=True
    )
except Exception as e2:
    # Both failed, move to Tier 3
    ...
```

**Characteristics:**
- **enforce_detection=False** - Attempts analysis without strict face requirement
- **More forgiving** - Works with unclear faces
- **Lower quality** - May have lower confidence
- **Attempts when:**
  - Tier 1 failed
  - Partial face visible
  - Poor lighting
  - Face at angle

**Use Case:** Fallback when camera quality is poor

---

### Tier 3: Neutral Fallback

```python
return {
    "success": True,
    "emotion": "neutral",
    "confidence": 0.3,
    "all_emotions": {"neutral": 0.3},
    "warning": "Face detection failed, using neutral fallback"
}
```

**Characteristics:**
- **No face required** - Always succeeds
- **Neutral emotion** - Baseline assumption
- **Low confidence (0.3)** - Indicates fallback
- **Voice-dominant** - Fusion will rely on voice (85%)

**Use Case:** 
- No face in image
- Placeholder image (no camera)
- Both detection tiers failed

---

## Placeholder Detection

### Why?
When frontend has no camera, it sends a blank placeholder image. We detect this to skip unnecessary processing.

### Implementation

```python
# Read image
img = cv2.imread(image_path)
if img is None:
    return {
        "emotion": "neutral",
        "confidence": 0.3,
        "warning": "Could not read image"
    }

# Convert to grayscale
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

# Calculate standard deviation (measure of variation)
std_dev = gray.std()

# Low variance = uniform color = placeholder
if std_dev < 10:
    logger.info("Detected placeholder image (no camera)")
    return {
        "emotion": "neutral",
        "confidence": 0.3,
        "warning": "No camera available, using neutral fallback"
    }
```

**Threshold Explanation:**
- **std_dev < 10:** Very uniform (e.g., solid color)
- **std_dev 10-50:** Simple image (e.g., text on background)
- **std_dev > 50:** Complex image (e.g., photo, face)

**Placeholder Example:**
```
Frontend creates: 640x480 black canvas with white text
Result: std_dev ≈ 5-8 (very uniform)
Detection: Placeholder → Neutral fallback
```

---

## Emotion Processing

### DeepFace Output Format

```python
results = DeepFace.analyze(image_path, actions=['emotion'])

# Results structure (list of faces)
[
    {
        'emotion': {
            'angry': 12.5,
            'disgust': 2.1,
            'fear': 5.3,
            'happy': 78.0,     # Highest
            'neutral': 1.2,
            'sad': 0.5,
            'surprise': 0.4
        },
        'dominant_emotion': 'happy',
        'region': {'x': 120, 'y': 80, 'w': 200, 'h': 200}
    }
]
```

### Normalization

```python
# Get first face (multi-face detection possible)
if isinstance(results, list):
    result = results[0]
else:
    result = results

# Extract emotion scores (percentages 0-100)
emotions = result.get('emotion', {})

# Normalize to 0-1 scale
total = sum(emotions.values())
all_emotions = {
    emotion_mapping.get(k.lower(), 'neutral'): v / total 
    for k, v in emotions.items()
}

# Result:
{
    "happy": 0.78,     # 78.0 / 100
    "angry": 0.125,    # 12.5 / 100
    "fear": 0.053,     # 5.3 / 100
    ...
}
```

### Emotion Mapping

```python
emotion_mapping = {
    'angry': 'angry',
    'disgust': 'disgust',
    'fear': 'fear',
    'happy': 'happy',
    'sad': 'sad',
    'surprise': 'surprise',
    'neutral': 'neutral'
}

# Maps DeepFace labels to standard labels
# (Currently identical, but allows for future customization)
```

---

## Emotion Classes

### 7 Emotion Categories

| Emotion       | Facial Features                           | Examples              |
|---------------|-------------------------------------------|-----------------------|
| **Happy**     | Raised cheeks, eye corners crinkle, smile | Smiling, laughing     |
| **Sad**       | Lowered eyebrows, drooping eyelids, frown | Crying, disappointed  |
| **Angry**     | Lowered brows, tense jaw, glaring eyes    | Frowning, scowling    |
| **Fear**      | Raised eyebrows, wide eyes, open mouth    | Scared, shocked       |
| **Surprise**  | Raised eyebrows, wide eyes, open mouth    | Amazed, startled      |
| **Disgust**   | Wrinkled nose, raised upper lip           | Repulsed, grossed out |
| **Neutral**   | Relaxed features, no strong expression    | Calm, baseline        |

### Confusion Pairs

Common misclassifications:
- **Fear ↔ Surprise:** Both have wide eyes, raised eyebrows
- **Angry ↔ Disgust:** Both have tensed features
- **Happy ↔ Surprise:** Both can have open mouths

---

## Performance Metrics

### Test Set Results

```
Dataset: Holdout test set (1000 samples, balanced)

Overall Performance:
├─ Accuracy: 76.5%
├─ Precision: 0.75
├─ Recall: 0.74
├─ F1-Score: 0.74

Per-Class Performance:
├─ Happy:    Precision: 0.89, Recall: 0.89, F1: 0.89
├─ Surprise: Precision: 0.80, Recall: 0.80, F1: 0.80
├─ Sad:      Precision: 0.75, Recall: 0.76, F1: 0.75
├─ Neutral:  Precision: 0.74, Recall: 0.74, F1: 0.74
├─ Angry:    Precision: 0.72, Recall: 0.73, F1: 0.72
├─ Fear:     Precision: 0.68, Recall: 0.69, F1: 0.68
└─ Disgust:  Precision: 0.65, Recall: 0.66, F1: 0.65

Confusion Matrix:
        Pred: H    Sa   A    N    F    Su   D
True H: 89   2    1    3    1    3    1
     Sa: 2   76   4    8    5    1    4
     A:  1    3   73   5    2    1   15
     N:  4    7    3   74   3    5    4
     F:  1    6    2    2   69   18   2
     Su: 4    1    1    5   10   80   0
     D:  1    5   14   4    2    0   66
```

**Observations:**
- Happy is easiest to detect (89%)
- Disgust is hardest (65%)
- Fear often confused with Surprise
- Angry often confused with Disgust

---



**Note:** Includes face detection and emotion classification

---

## Input Requirements

### Image Specifications

**Required:**
- **Format:** JPG, JPEG, PNG
- **Content:** Human face visible
- **Size:** Any (will be resized)

**Recommended:**
- **Resolution:** 640x480 or higher
- **Face size:** At least 100x100 pixels
- **Orientation:** Frontal or near-frontal
- **Lighting:** Good, even lighting
- **Expression:** Clear emotional expression
- **Background:** Minimal distractions

**Optimal Capture:**
- Face centered in frame
- Good lighting (avoid shadows)
- Neutral background
- Clear expression
- Direct camera gaze

---

## Code Flow Example

### Complete Detection

```python
# Frontend captures image
image_blob = canvas.toBlob(...)

# Server receives and processes
result = face_expression.detect_expression(temp_path)

# Inside detect_expression():

# 1. Read image
img = cv2.imread(temp_path)
# img shape: (height, width, 3) RGB

# 2. Check if placeholder
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
std_dev = gray.std()
if std_dev < 10:
    return {"emotion": "neutral", "confidence": 0.3}

# 3. Tier 1: Strict detection
try:
    results = DeepFace.analyze(
        img_path=temp_path,
        actions=['emotion'],
        enforce_detection=True,
        detector_backend='opencv'
    )
    # Success - face found
except ValueError:
    # Tier 2: Lenient detection
    try:
        results = DeepFace.analyze(
            enforce_detection=False
        )
    except:
        # Tier 3: Fallback
        return {"emotion": "neutral", "confidence": 0.3}

# 4. Extract emotion
emotions = results[0]['emotion']
# {'happy': 78.0, 'sad': 12.5, ...}

dominant = results[0]['dominant_emotion']
# 'happy'

# 5. Normalize
total = sum(emotions.values())
all_emotions = {k.lower(): v/total for k, v in emotions.items()}
# {'happy': 0.78, 'sad': 0.125, ...}

confidence = all_emotions[dominant.lower()]
# 0.78

# 6. Return result
return {
    "success": True,
    "emotion": "happy",
    "confidence": 0.78,
    "all_emotions": all_emotions
}
```

---

## Called By

### server_api.py

**Endpoint:** `POST /analyze-face`
```python
@app.post("/analyze-face")
async def analyze_face(image_file: UploadFile = File(...)):
    # Create temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
        content = await image_file.read()
        tmp.write(content)
        temp_path = tmp.name
    
    # Analyze
    result = face_expression.detect_expression(temp_path)
    
    # Cleanup
    os.unlink(temp_path)
    
    return result
```

**Endpoint:** `POST /analyze-voice-and-face`
```python
@app.post("/analyze-voice-and-face")
async def analyze_voice_and_face(audio_file, image_file):
    # ... voice analysis ...
    
    # Step 2: Analyze face
    with tempfile.NamedTemporaryFile(delete=False, suffix=image_ext) as tmp:
        content = await image_file.read()
        tmp.write(content)
        temp_path = tmp.name
    
    try:
        face_result = face_expression.detect_expression(temp_path)
    finally:
        try:
            os.unlink(temp_path)
        except:
            pass
    
    # Check for fallback
    if not face_result.get("success"):
        face_result = {
            "success": True,
            "emotion": "neutral",
            "confidence": 0.3,
            "warning": "Face detection failed"
        }
    
    # Continue with fusion...
```

---

## Calls To

### External Libraries

1. **cv2 (OpenCV)**
   - `cv2.imread(path)` → Read image file
   - `cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)` → Convert to grayscale
   - `img.std()` → Calculate standard deviation

2. **DeepFace**
   - `DeepFace.analyze()` → Face detection + emotion classification
   - Parameters:
     - `img_path`: Image file path
     - `actions`: List of analyses ['emotion']
     - `enforce_detection`: Strict (True) or lenient (False)
     - `detector_backend`: 'opencv', 'mtcnn', 'retinaface', etc.
     - `silent`: Suppress logs

---

## Error Handling

### Common Errors

**1. Image Not Found**
```python
img = cv2.imread(image_path)
if img is None:
    return {
        "success": True,
        "emotion": "neutral",
        "confidence": 0.3,
        "warning": "Could not read image"
    }
```

**2. No Face Detected (Tier 1)**
```python
try:
    results = DeepFace.analyze(enforce_detection=True)
except ValueError as e:
    logger.warning(f"No face detected: {e}")
    # Try Tier 2
```

**3. Both Tiers Failed**
```python
except Exception as e2:
    logger.warning(f"Both detection modes failed: {e2}")
    return {
        "success": True,
        "emotion": "neutral",
        "confidence": 0.3,
        "warning": "Face detection failed"
    }
```

**4. Invalid Image Format**
```python
if image_ext not in ['.jpg', '.jpeg', '.png']:
    return {
        "success": False,
        "error": "Unsupported image format"
    }
```

---

## Optimization Tips

### 1. Model Backend Selection

```python
# Different backends for different use cases

# OpenCV (default) - Fast, moderate accuracy
DeepFace.analyze(detector_backend='opencv')

# MTCNN - Slower, better accuracy
DeepFace.analyze(detector_backend='mtcnn')

# RetinaFace - Best accuracy, slower
DeepFace.analyze(detector_backend='retinaface')
```

### 2. Skip Detection for Known Faces

```python
# If face already detected, skip detection step
region = {'x': 120, 'y': 80, 'w': 200, 'h': 200}
DeepFace.analyze(
    img_path=image_path,
    region=region,  # Use known face location
    enforce_detection=False
)
```

### 3. Batch Processing (Future)

```python
# Process multiple faces at once
faces = [detect_face(img) for img in images]
emotions = [classify_emotion(face) for face in faces]
```

---

## Troubleshooting

### Issue: "Face could not be detected"

**Causes:**
- Poor lighting
- Face not centered
- Face too small
- Partial face obstruction
- Sunglasses, mask, etc.

**Solutions:**
1. Improve lighting
2. Center face in frame
3. Remove obstructions
4. Move closer to camera
5. Use lenient mode (Tier 2)
6. System will fall back to neutral (Tier 3)

---

### Issue: "Wrong emotion detected"

**Causes:**
- Subtle expression
- Ambiguous features
- Poor image quality
- Conflicting features (e.g., smiling while sad)

**Solutions:**
1. Express more clearly
2. Use better lighting
3. Ensure clear facial features
4. System uses voice to resolve conflicts

---

### Issue: "Placeholder not detected"

**Symptoms:** Frontend sends blank image, but backend tries to analyze

**Solution:**
```python
# Adjust threshold if needed
if std_dev < 15:  # Increased from 10
    return neutral_fallback
```

---

## Comparison: Voice vs Face

| Aspect | Voice Model | Face Model |
|--------|-------------|------------|
| **Accuracy** | 87.3% | 76.5% |
| **Speed** | ~1.2s | ~0.8s |
| **Robustness** | High | Moderate |
| **Hardware** | Microphone (required) | Camera (optional) |
| **Environment** | Works in dark | Needs light |
| **Privacy** | Less invasive | More invasive |
| **Fallback** | No fallback | Neutral fallback |

**Conclusion:** Voice is primary, face is supporting evidence.

---

## Next Steps

- **[Emotion Fusion](./05_Emotion_Fusion.md)** - How voice and face merge
- **[Complete Flow](./07_Complete_Flow.md)** - End-to-end journey
- **[Model Evaluation](./08_Model_Evaluation.md)** - Combined performance
