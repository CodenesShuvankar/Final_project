# 🧪 Testing Guide - Multimodal Emotion Recognition System

## Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (React/Next.js)                                        │
│ ┌─────────────┐   ┌──────────────┐   ┌─────────────────────┐    │
│ │ User clicks │ → │ Record audio │ → │ Capture image       │    │
│ │ "Detect"    │   │ 7 seconds    │   │ from camera/create  │    │
│ │             │   │ (16kHz WAV)  │   │ placeholder         │    │
│ └─────────────┘   └──────────────┘   └─────────────────────┘    │
│                                                 ↓               │
│                                   ┌─────────────────────────┐   │
│                                   │ FormData with:          │   │
│                                   │ - audio_file (Blob)     │   │
│                                   │ - image_file (Blob)     │   │
│                                   │ - limit (20)            │   │
│                                   └─────────────────────────┘   │
└────────────────────────────────────────┬────────────────────────┘
                                         │ HTTP POST
                                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND (FastAPI/Python)                                        │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ server_api.py: /analyze-voice-and-face endpoint            │  │
│ │ 1. Validate file types                                     │  │
│ │ 2. Create temp files                                       │  │
│ └────────────┬────────────────────────┬──────────────────────┘  │
│              ↓                        ↓                         │
│    ┌──────────────────┐     ┌──────────────────┐                │
│    │ VOICE ANALYSIS   │     │ FACE ANALYSIS    │                │
│    │ voice_api.py     │     │ face_expression  │                │
│    │                  │     │                  │                │
│    │ 1. Load audio    │     │ 1. Load image    │                │
│    │ 2. Resample      │     │ 2. Check placeholder              │
│    │ 3. Tokenize      │     │ 3. Detect face   │                │
│    │ 4. Wav2Vec2      │     │ 4. DeepFace      │                │
│    │ 5. Softmax       │     │ 5. Normalize     │                │
│    │                  │     │                  │                │
│    │ Result: happy    │     │ Result: happy    │                │
│    │ (0.87)           │     │ (0.78)           │                │
│    └──────────┬───────┘     └────────┬─────────┘                │
│               └──────────┬───────────┘                          │
│                          ↓                                      │
│              ┌──────────────────────┐                           │
│              │ EMOTION FUSION       │                           │
│              │ emotion_fusion.py    │                           │
│              │                      │                           │
│              │ 1. Get agreement     │ → "strong"                │
│              │ 2. Calc weights      │ → (0.55, 0.45)            │
│              │ 3. Choose emotion    │ → "happy"                 │
│              │ 4. Combine scores    │ → weighted avg            │
│              │ 5. Explain           │ → summary                 │
│              │                      │                           │
│              │ Result: happy (0.825)│                           │
│              └──────────┬───────────┘                           │
│                         ↓                                       │
│              ┌──────────────────────┐                           │
│              │ SPOTIFY SERVICE      │                           │
│              │ spotify_service.py   │                           │
│              │                      │                           │
│              │ 1. Get token         │                           │
│              │ 2. Map mood → params │ → valence, energy, etc.   │
│              │ 3. API request       │ → /recommendations        │
│              │ 4. Parse tracks      │ → 20 tracks               │
│              │                      │                           │
│              │ Result: [20 tracks]  │                           │
│              └──────────┬───────────┘                           │
│                         ↓                                       │
│              ┌──────────────────────┐                           │
│              │ BUILD RESPONSE       │                           │
│              │ {                    │                           │
│              │   success: true,     │                           │
│              │   analysis: {...},   │                           │
│              │   recommendations:.. │                           │
│              │ }                    │                           │
│              └──────────┬───────────┘                           │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP Response (JSON)
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (React/Next.js)                                        │
│ ┌──────────────────────────────────────────────────────────┐    │
│ │ Display Results:                                         │    │
│ │ - Emoji: 😊                                              |    │
│ │ - Emotion: HAPPY                                         │    │
│ │ - Confidence: 82.5%                                      │    │
│ │ - Agreement: STRONG                                      │    │
│ │ - Voice: happy (87%)                                     │    │
│ │ - Face: happy (78%)                                      │    │
│ │ - Music: Grid of 20 songs with play buttons              │    │
│ └──────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```
## 📋 Prerequisites

### Backend Setup
```powershell
# Navigate to BackEnd directory
cd "G:\My_Projects\Final_year\BackEnd"

# Activate virtual environment (if using one)
# .\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Start backend server
python -m uvicorn server_api:app --reload
```

**Expected Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### Frontend Setup
```powershell
# Navigate to frontend directory
cd "G:\My_Projects\Final_year\front end"

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

**Expected Output:**
```
> dev
> next dev

  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Ready in 2.5s
```

---

## 🧪 Test Scenarios

### 1. Home Page Tests

#### Test 1.1: Basic Page Load
**Steps:**
1. Navigate to `http://localhost:3000`
2. Observe greeting message (Good morning/afternoon/evening)
3. Check that "Discover by Mood" and "Mood Detection" cards are visible
4. Verify "Recently played" and "Trending" sections load

**Expected Results:**
- ✅ Page loads without errors
- ✅ Greeting displays correctly based on time of day
- ✅ All sections render properly
- ✅ Music tracks load from Spotify (or mock data if API fails)

#### Test 1.2: Mood Highlights
**Steps:**
1. Scroll to "Mood Highlights" section
2. Observe "Happy Vibes" and "Chill Out" cards
3. Check track count displays

**Expected Results:**
- ✅ 4 mood cards displayed (Happy Vibes, Chill Out, Energetic, Melancholy)
- ✅ Track counts show for Happy and Chill
- ✅ Cards are clickable and navigate to appropriate pages

---

### 2. Mood Detection Page Tests

#### Test 2.1: Camera Permission Request
**Steps:**
1. Navigate to `http://localhost:3000/mood`
2. Click "Start Camera" button
3. Allow camera access when browser prompts
4. Observe video preview

**Expected Results:**
- ✅ Browser permission dialog appears
- ✅ After allowing, video feed shows in preview
- ✅ "Detect Mood" button becomes enabled
- ✅ Camera indicator (green dot) appears in browser tab

#### Test 2.2: Multimodal Detection (Happy/Positive)
**Steps:**
1. Position yourself in front of camera with good lighting
2. **Smile naturally** (for happy emotion)
3. Click "Detect Mood" button
4. Observe progress bar and wait for completion
5. Review results

**Expected Results:**
- ✅ Progress bar animates from 0% to 100%
- ✅ Audio recording indicator appears (5 seconds)
- ✅ Image captured successfully
- ✅ Results display:
  - Combined emotion: "happy" (or similar positive)
  - Agreement level: "Strong Agreement" or "Moderate Agreement"
  - Voice prediction with confidence
  - Face prediction with confidence
- ✅ Music recommendations appear automatically
- ✅ Mood saved to localStorage

#### Test 2.3: Multimodal Detection (Sad/Negative)
**Steps:**
1. Position yourself in front of camera
2. **Frown or look sad** (for sad emotion)
3. **Speak in low/quiet tone** if possible
4. Click "Detect Mood" button
5. Review results

**Expected Results:**
- ✅ Detection completes successfully
- ✅ Combined emotion: "sad" or related negative emotion
- ✅ Agreement level displayed
- ✅ Different music recommendations (sadder/calmer tracks)

#### Test 2.4: Error Handling - No Camera
**Steps:**
1. Deny camera permission when prompted
2. Try to click "Detect Mood"

**Expected Results:**
- ✅ Error message displayed: "Camera access denied"
- ✅ Instructions to enable camera appear
- ✅ Detection button disabled

#### Test 2.5: Error Handling - No Microphone
**Steps:**
1. Allow camera but deny microphone
2. Try to detect mood

**Expected Results:**
- ✅ Error message displayed: "Microphone access required"
- ✅ Detection fails gracefully
- ✅ Clear instructions provided

---

### 3. Search Page Integration Tests

#### Test 3.1: Search Without Mood Detection
**Steps:**
1. Navigate to `http://localhost:3000/search`
2. Check if mood badge appears

**Expected Results:**
- ✅ Mood badge NOT displayed (no mood detected yet)
- ✅ Search bar visible and functional
- ✅ Browse categories displayed

#### Test 3.2: Search After Mood Detection
**Steps:**
1. First, go to `/mood` and detect mood
2. Navigate to `/search`
3. Observe mood badge at top

**Expected Results:**
- ✅ Mood badge displays detected emotion
- ✅ "Find music for this mood" button visible
- ✅ Mood persists across page navigation

#### Test 3.3: Quick Mood Search
**Steps:**
1. With mood badge visible, click "Find music for this mood" button
2. Observe search results

**Expected Results:**
- ✅ Search query auto-fills with detected mood
- ✅ Spotify search executes automatically
- ✅ Relevant tracks displayed
- ✅ Results match the detected emotion

#### Test 3.4: Manual Search
**Steps:**
1. Type "happy songs" in search bar
2. Press Enter or click search button
3. Wait for results

**Expected Results:**
- ✅ Loading spinner appears
- ✅ Spotify API returns results
- ✅ Tracks display in grid layout
- ✅ All tracks have play buttons and album art

---

### 4. Cross-Page Persistence Tests

#### Test 4.1: Mood Persistence
**Steps:**
1. Detect mood on `/mood` page
2. Navigate to home page (`/`)
3. Navigate to search page (`/search`)
4. Refresh browser
5. Check localStorage in DevTools

**Expected Results:**
- ✅ Mood persists across all pages
- ✅ LocalStorage has `detected_mood` key
- ✅ LocalStorage has `mood_analysis` key with full JSON
- ✅ Mood survives page refresh

#### Test 4.2: Music Recommendations Across Pages
**Steps:**
1. Detect mood and get recommendations on `/mood`
2. Navigate to `/search`
3. Click mood badge button
4. Compare results

**Expected Results:**
- ✅ Search results consistent with mood detection
- ✅ Recommendations similar between pages
- ✅ No data loss during navigation

---

### 5. API Integration Tests

#### Test 5.1: Voice-Only Endpoint
**Steps:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Detect mood on `/mood` page
4. Find `/analyze-voice` request (if separate)

**Expected Results:**
- ✅ POST request to backend `/analyze-voice`
- ✅ Audio file uploaded as FormData
- ✅ Response contains emotion and confidence
- ✅ Status code: 200

#### Test 5.2: Face-Only Endpoint
**Steps:**
1. Keep DevTools open
2. Detect mood
3. Find `/detect-facial-expression` request (if separate)

**Expected Results:**
- ✅ POST request to backend
- ✅ Image file uploaded as FormData
- ✅ Response contains emotion and confidence
- ✅ Status code: 200

#### Test 5.3: Multimodal Endpoint
**Steps:**
1. Keep DevTools open
2. Detect mood
3. Find `/analyze-voice-and-face` request

**Expected Results:**
- ✅ POST request with both audio and image files
- ✅ Response structure:
```json
{
  "combined_emotion": "happy",
  "combined_confidence": 0.85,
  "agreement_level": "Strong Agreement",
  "voice_prediction": {
    "emotion": "happy",
    "confidence": 0.87,
    "all_emotions": {...}
  },
  "face_prediction": {
    "emotion": "happy",
    "confidence": 0.83,
    "all_emotions": {...}
  }
}
```
- ✅ Status code: 200
- ✅ Response time < 10 seconds

---

### 6. Performance Tests

#### Test 6.1: Detection Speed
**Steps:**
1. Measure time from clicking "Detect Mood" to results displayed
2. Repeat 5 times
3. Calculate average

**Expected Results:**
- ✅ Average detection time: 5-8 seconds
- ✅ No timeout errors
- ✅ Progress bar accurate

#### Test 6.2: Page Load Speed
**Steps:**
1. Clear browser cache
2. Navigate to each page
3. Measure load time in DevTools

**Expected Results:**
- ✅ Home page: < 2 seconds
- ✅ Mood page: < 2 seconds
- ✅ Search page: < 2 seconds
- ✅ No blocking resources

#### Test 6.3: Memory Usage
**Steps:**
1. Open DevTools > Memory tab
2. Navigate through all pages
3. Detect mood multiple times
4. Check memory graph

**Expected Results:**
- ✅ No memory leaks
- ✅ Memory usage stable after operations
- ✅ Camera stream released after use

---

### 7. Mobile Responsiveness Tests

#### Test 7.1: Mobile Chrome (Emulation)
**Steps:**
1. Open DevTools (F12)
2. Click device toolbar icon (Ctrl+Shift+M)
3. Select "iPhone 12 Pro"
4. Test all pages

**Expected Results:**
- ✅ All pages render correctly
- ✅ Camera works on mobile
- ✅ Touch interactions work
- ✅ No horizontal scroll

#### Test 7.2: Tablet View
**Steps:**
1. Select "iPad Air" in device emulation
2. Test landscape and portrait

**Expected Results:**
- ✅ Grid layouts adapt correctly
- ✅ Camera preview scales properly
- ✅ All buttons accessible

---

### 8. Error Recovery Tests

#### Test 8.1: Backend Offline
**Steps:**
1. Stop backend server
2. Try to detect mood

**Expected Results:**
- ✅ Error message: "Failed to connect to server"
- ✅ Retry button appears
- ✅ No crash or blank page

#### Test 8.2: Network Timeout
**Steps:**
1. Use DevTools > Network > Throttling > Offline
2. Try detection

**Expected Results:**
- ✅ Timeout handled gracefully
- ✅ Clear error message
- ✅ Option to retry

#### Test 8.3: Invalid Audio/Image
**Steps:**
1. Manually test API with invalid files (if possible)

**Expected Results:**
- ✅ Backend validates input
- ✅ Returns 400 Bad Request
- ✅ Frontend shows meaningful error

---

### 9. Security Tests

#### Test 9.1: HTTPS Requirement
**Steps:**
1. Try accessing camera/mic over HTTP (non-localhost)

**Expected Results:**
- ✅ Browser blocks access
- ✅ Error message explains HTTPS requirement

#### Test 9.2: Permission Revocation
**Steps:**
1. Allow camera/mic
2. Detect mood successfully
3. Revoke permissions in browser settings
4. Try detecting again

**Expected Results:**
- ✅ Permission error detected
- ✅ Prompts user to re-enable
- ✅ No crash

---

### 10. Edge Cases

#### Test 10.1: Multiple Faces
**Steps:**
1. Position 2+ people in camera frame
2. Detect mood

**Expected Results:**
- ✅ DeepFace detects primary face
- ✅ No crash
- ✅ Results for dominant face

#### Test 10.2: No Face Detected
**Steps:**
1. Point camera away from face
2. Try detection

**Expected Results:**
- ✅ Error: "No face detected"
- ✅ Instruction to position face in frame
- ✅ Voice analysis may still work (partial result)

#### Test 10.3: Background Noise
**Steps:**
1. Play loud music in background
2. Try voice detection

**Expected Results:**
- ✅ Model processes audio
- ✅ May have lower confidence
- ✅ No crash

#### Test 10.4: Rapid Repeated Detections
**Steps:**
1. Click "Detect Mood" multiple times quickly
2. Observe behavior

**Expected Results:**
- ✅ Only one detection runs at a time
- ✅ Button disabled during detection
- ✅ No overlapping requests

---

## 🐛 Known Issues & Workarounds

### Issue 1: Safari Camera Access
**Problem**: Safari may require additional permissions
**Workaround**: Use Chrome or Firefox for testing

### Issue 2: First Detection Slow
**Problem**: First detection takes longer (model loading)
**Expected**: Subsequent detections faster

### Issue 3: Mock Data Fallback
**Problem**: If Spotify API fails, mock data used
**Expected**: This is normal fallback behavior

---

## ✅ Test Checklist

### Critical Path (Must Pass)
- [ ] Backend server starts without errors
- [ ] Frontend dev server starts without errors
- [ ] Home page loads successfully
- [ ] Mood page camera permission works
- [ ] Mood detection completes successfully
- [ ] Results display correctly
- [ ] Music recommendations load
- [ ] Search integration works
- [ ] Mood persists across pages

### Important Features
- [ ] Voice and face predictions both work
- [ ] Agreement level calculated correctly
- [ ] Progress bar shows accurate progress
- [ ] Error messages clear and helpful
- [ ] Mobile responsive
- [ ] LocalStorage persistence works

### Nice to Have
- [ ] Animations smooth
- [ ] Loading states polished
- [ ] Dark mode works (if implemented)
- [ ] All icons display correctly

---

## 📊 Test Results Log

| Test ID | Test Name         | Status     | Notes                                         |
|---------|-------------------|------------|-----------------------------------------------|
| 1.1     | Home Page Load    | ⏳ Pending | Voice Assistance and authentication pending   |
| 1.2     | Mood Highlights   | ✅Pass    |                                               |
| 2.1     | Camera Permission | ✅Pass    |                                               |
| 2.2     | Happy Detection   | ✅Pass    |                                               |
| 2.3     | Sad Detection     | ✅Pass    |                                               |
| 3.1     | Search No Mood    | ✅Pass    |                                               |
| 3.2     | Search With Mood  | ✅Pass    |                                               |
| 4.1     | Mood Persistence  | ✅Pass    |                                               |
| 5.3     | Multimodal API    | ✅Pass    |                                               |

**Legend:**
- ⏳ Pending
- ✅ Pass
- ❌ Fail
- ⚠️ Partial Pass

---

## 🔧 Debugging Tips

### Check Backend Logs
```powershell
# Backend terminal should show:
INFO:     POST /analyze-voice-and-face
INFO:     Analyzing voice...
INFO:     Detecting facial expression...
INFO:     Merging emotions...
```

### Check Browser Console
```javascript
// Open DevTools (F12) > Console
// Should see logs like:
🎵 MusicRecommendations: useEffect triggered - detectedMood: happy
📸 Captured image: Blob { size: 123456, type: "image/jpeg" }
🎤 Recorded audio: Blob { size: 789012, type: "audio/wav" }
```

### Check Network Tab
- Look for:
  - POST `/analyze-voice-and-face` (200 OK)
  - Spotify API calls (200 OK)
  - No CORS errors

### Check LocalStorage
```javascript
// In browser console:
console.log(localStorage.getItem('detected_mood'));
console.log(JSON.parse(localStorage.getItem('mood_analysis')));
```

---

## 📞 Support

If tests fail:
1. Check backend logs for errors
2. Verify all dependencies installed
3. Clear browser cache and localStorage
4. Try different browser
5. Check firewall/antivirus settings
6. Ensure ports 3000 and 8000 not blocked

---

**Test Status**: Ready for Testing ✅
**Last Updated**: [Current Date]
