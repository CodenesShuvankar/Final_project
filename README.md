# 🎵 VibeTune - AI-Powered Music Recommendation System

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.12.9-blue?logo=python)](https://www.python.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green?logo=supabase)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript)](https://www.typescriptlang.org/)

> VibeTune is an intelligent music recommendation platform that uses **multimodal emotion detection** (voice + facial expression) to suggest personalized music based on your current mood. It features multi-language support, interest-based filtering, and detailed mood analytics.

---

## 🌟 Key Features

- 🎭 **Multimodal Emotion Detection**: Combines voice (Wav2Vec2) and facial analysis (DeepFace) for accurate mood detection.
- 🎵 **Smart Music Recommendations**: AI-powered song suggestions via Spotify API based on detected emotions.
- 🌐 **Multi-Language Support**: Prioritizes music in Bengali, Hindi, English, or your preferred languages.
- 🎯 **Interest-Based Filtering**: Personalizes recommendations with genre preferences.
- 👤 **User Profiles & Playlists**: Save preferences, create playlists, and track listening history.
- 📊 **Mood Analytics**: Tracks your emotional patterns over time with visual insights.
- 🔒 **Secure Authentication**: Powered by Supabase Auth with JWT tokens.
- 📱 **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices.

---

## 🏗️ System Architecture & Data Flow

This diagram shows the end-to-end flow, from user interaction on the frontend to data processing in the backend and communication with external services.

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (Next.js 14 - Port 3000)                               │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ TWO DETECTION MODES                                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ MODE 1: Manual Detection (MoodDetectorPanelMediaPipe.tsx)      │
│ ┌─────────────┐   ┌──────────────┐   ┌─────────────────────┐  │
│ │ User clicks │ → │ MediaPipe    │ → │ Record 5s video     │  │
│ │ "Start"     │   │ Face Tracking│   │ (WebM, audio+video) │  │
│ └─────────────┘   └──────────────┘   └─────────────────────┘  │
│                                                 ↓               │
│                          lib/services/voiceEmotion.ts           │
│                          POST /analyze-video                    │
│                                                                 │
│ MODE 2: Auto Detection (AutoMoodDetector.tsx)                  │
│ ┌─────────────┐   ┌──────────────┐   ┌─────────────────────┐  │
│ │ Timer: 3s   │ → │ Capture photo│ → │ Generate silent     │  │
│ │ + 30min loop│   │ from camera  │   │ video (5s, no audio)│  │
│ └─────────────┘   └──────────────┘   └─────────────────────┘  │
│                                                 ↓               │
│                  lib/services/autoMoodDetection.ts              │
│                  POST /analyze-video (face-only)                │
└────────────────────────────────┬────────────────────────────────┘
                                 │ HTTP POST
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND (FastAPI - Port 8000)                                   │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ server_api.py: @app.post("/analyze-video")                 │  │
│ │ 1. Middleware: supabase_auth.py (Optional JWT)             │  │
│ │ 2. Save video to temp file                                 │  │
│ │ 3. Check audio stream (ffprobe)                            │  │
│ └────────────┬────────────────────────┬──────────────────────┘  │
│              ↓ (Conditional)          ↓                         │
│    ┌──────────────────┐     ┌──────────────────┐                │
│    │ VOICE ANALYSIS   │     │ FACE ANALYSIS    │                │
│    │ (if audio exists)│     │ (always)         │                │
│    │                  │     │                  │                │
│    │ voice_model/     │     │ video_model/     │                │
│    │ voice_api.py     │     │ face_expression.py                │
│    │                  │     │                  │                │
│    │ 1. Extract audio │     │ 1. Sample frames │                │
│    │    (FFmpeg)      │     │    (every 10th)  │                │
│    │ 2. Load/resample │     │ 2. Crop faces    │                │
│    │ 3. Wav2Vec2      │     │ 3. DeepFace      │                │
│    │ 4. Softmax       │     │ 4. Avg emotions  │                │
│    │                  │     │                  │                │
│    │ Result: happy    │     │ Result: happy    │                │
│    │ (0.87) or None   │     │ (0.78)           │                │
│    └──────────┬───────┘     └────────┬─────────┘                │
│               └──────────┬───────────┘                          │
│                          ↓                                      │
│              ┌──────────────────────┐                           │
│              │ EMOTION FUSION       │                           │
│              │ (Priority: NeuroSyncFusion → Rule-based)         │
│              │                      │                           │
│              │ NeuroSyncFusion (if both exist):                 │
│              │ 1. Load fusion model │ → PyTorch model           │
│              │ 2. Process 16 frames │ → LSTM features           │
│              │ 3. Combine modalities│ → Joint prediction        │
│              │                      │                           │
│              │ emotion_fusion.py (fallback):                    │
│              │ 1. Calc agreement    │ → "Strong"/"Partial"      │
│              │ 2. Weight emotions   │ → (0.55, 0.45)            │
│              │ 3. Merge predictions │ → Weighted avg            │
│              └──────────┬───────────┘                           │
│                         ↓                                       │
│              ┌──────────────────────┐                           │
│              │ SPOTIFY SERVICE      │                           │
│              │ services/spotify_service.py                      │
│              │                      │                           │
│              │ 1. Map mood→params   │ → valence, energy, tempo  │
│              │ 2. Get user prefs    │ → routes/user_preferences │
│              │ 3. API request       │ → RapidAPI (Spotify)      │
│              │ 4. Filter language   │ → Bengali/Hindi priority  │
│              └──────────┬───────────┘                           │
│                         ↓                                       │
│              ┌──────────────────────┐                           │
│              │ DATABASE (Prisma)    │                           │
│              │ routes/mood_analysis.py                          │
│              │                      │                           │
│              │ 1. Store analysis    │ → mood_analysis table     │
│              │ 2. Link user         │ → user_id (if auth)       │
│              │ 3. Save timestamp    │ → for analytics           │
│              └──────────┬───────────┘                           │
│                         ↓                                       │
│              ┌──────────────────────┐                           │
│              │ RESPONSE             │                           │
│              │ {                    │                           │
│              │   "success": true,   │                           │
│              │   "final_emotion": "happy",                      │
│              │   "confidence": 0.829,                           │
│              │   "recommendations": [...]                       │
│              │ }                    │                           │
│              └──────────────────────┘                           │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP Response (JSON)
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (React/Next.js)                                        │
│ ┌──────────────────────────────────────────────────────────┐    │
│ │ Display Results                                          │    │
│ │ - MoodBadge: HAPPY                                       │    │
│ │ - MoodConfidence: 82.9%                                  │    │
│ │ - Music Grid: 20 songs (components/music/SongCard.tsx)   │    │
│ │ - Toast: "Auto-detected: Happy" (AutoMoodDetector)       │    │
│ └──────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## � Dashboard Analytics Architecture

The Profile Dashboard uses a **centralized data architecture** optimized for interactive analytics (similar to Power BI). This ensures efficient performance and enables future filter-based interactions.

### Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Single Source of Truth** | Centralized `EMOTION_VALENCE` mapping and `VALENCE_THRESHOLDS` constants |
| **Compute Once, Use Everywhere** | `useMemo` hook calculates all derived data when mood history changes |
| **Ready for Interactivity** | Architecture supports adding date range filters, emotion filters, etc. |
| **Consistent Classification** | All cards use the same thresholds for Positive/Neutral/Negative |

### Valence Mapping

Emotions are mapped to a valence scale from -1 (most negative) to +1 (most positive):

| Emotion | Valence | Category |
|---------|---------|----------|
| Happy | +0.8 | Positive |
| Surprise | +0.4 | Positive |
| Neutral | 0.0 | Neutral |
| Disgust | -0.6 | Negative |
| Sad | -0.7 | Negative |
| Angry | -0.8 | Negative |
| Fear | -0.9 | Negative |

**Classification Thresholds:**
- **Positive**: Valence ≥ +0.3
- **Neutral**: Valence between -0.3 and +0.3
- **Negative**: Valence ≤ -0.3

### Centralized Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    MOOD HISTORY (Raw Data)                      │
│         Array of mood detections from /mood-history API         │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              useMemo: DASHBOARD DATA (Computed Once)            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ moodWithValence │  │   moodByDate    │  │  emotionCounts  │ │
│  │ (pre-calculated │  │ (aggregated by  │  │ (frequency per  │ │
│  │  valence per    │  │  day for        │  │  emotion type)  │ │
│  │  mood entry)    │  │  calendar)      │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  averageValence │  │    last24h      │  │ valenceCategory │ │
│  │ (overall avg)   │  │ (recent moods,  │  │ (KPI: category, │ │
│  │                 │  │  avg, count)    │  │  emoji, color)  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    months                                │   │
│  │        (pre-generated 6 months for calendar grid)        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────┬───────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Valence        │ │  Valence Trend  │ │  Mood Calendar  │
│  Category Card  │ │  Line Chart     │ │  Heatmap        │
│  (uses KPI      │ │  (uses mood     │ │  (uses moodBy   │
│   data)         │ │   WithValence)  │ │   Date, months) │
└─────────────────┘ └─────────────────┘ └─────────────────┘
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Primary Mood   │ │  Emotion        │ │  Mood Patterns  │
│  Card           │ │  Distribution   │ │  Analysis       │
│  (uses emotion  │ │  Donut Chart    │ │                 │
│   Counts)       │ │                 │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Dashboard Cards

| Card | Data Source | Description |
|------|-------------|-------------|
| **Valence Category** | `valenceCategory` | KPI showing Positive/Neutral/Negative with traffic-light colors |
| **Valence Trend** | `moodWithValence` | Line chart showing emotional polarity over last 20 detections |
| **Mood Calendar** | `moodByDate`, `months` | 6-month heatmap grid (GitHub-style) with daily mood colors |
| **Primary Mood** | `emotionCounts` | Most frequently detected emotion |
| **Emotion Distribution** | `emotionCounts` | Donut chart breakdown of all detected emotions |

### Benefits of This Architecture

| Aspect | Before | After |
|--------|--------|-------|
| **Calculations** | 6+ duplicate valence computations | 1 computation via `useMemo` |
| **Re-renders** | Recalculates on every render | Only when `moodHistory` changes |
| **Consistency** | Scattered threshold definitions | Single `VALENCE_THRESHOLDS` constant |
| **Extensibility** | Hard to add filters | Ready for date/emotion filters |
| **Maintainability** | Logic scattered across cards | Centralized in one hook |

### Future Interactive Features (Planned)

- **Date Range Filter**: Filter all cards by custom date range
- **Emotion Filter**: Toggle specific emotions on/off
- **Analysis Type Filter**: Voice-only, Face-only, or Combined
- **Cross-Card Interactions**: Click calendar day to filter other charts

---

## �🚀 Getting Started

Follow these steps to set up and run the project locally.

### Prerequisites

- **Node.js**: v18.0 or higher
- **Python**: v3.9 or higher
- **Git**: For cloning the repository
- **Supabase Account**: For database and authentication (free tier is sufficient)
- **RapidAPI Account**: With a subscription to the Spotify API

### 1. Clone the Repository

```bash
git clone https://github.com/SubhobrataMaity/VibeTune.git
cd VibeTune
```

### 2. Backend Setup

```powershell
# Navigate to the Backend directory
cd Backend

#Download paste this model to Backend\voice_model\final_voice_model
https://huggingface.co/SumitPaul/speech-emotion-recognition-7class/tree/main/checkpoints/checkpoint-9380
#Download and paste this model to Backend\video_model
https://huggingface.co/SumitPaul/neurosync-multimodal-fusion/blob/main/last_checkpoint.pth


# Create and activate a Python virtual environment
python -m venv venv

#activate a Python virtual environment
venv\Scripts\Activate.ps1

# Install the required dependencies
pip install -r requirements.txt

#for prisma generation
prisma generate

# Create the environment file from the example
paste the .env file to Backend/



# Edit the .env file with your credentials from Supabase and RapidAPI
# SUPABASE_URL=https://your-project-id.supabase.co
# SUPABASE_SERVICE_KEY=your-supabase-service-key
# SUPABASE_JWT_SECRET=your-supabase-jwt-secret
# RAPIDAPI_KEY=your-rapidapi-key
# RAPIDAPI_HOST=spotify81.p.rapidapi.com
# RAPIDAPI_URL=https://spotify81.p.rapidapi.com

# Start the backend server
python -m uvicorn server_api:app --reload --port 8000
```
The backend will be running at `http://localhost:8000`. You can access the API documentation at `http://localhost:8000/docs`.

### 3. Frontend Setup

```powershell
#open another powershell or terminal in vs code

# Navigate to the Frontend directory from the root
cd Frontend

# Install the required dependencies
npm install

#paste the .env.local file to the Frontend/
.env.local


# Edit the .env.local file with your Supabase credentials
# NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
# NEXT_PUBLIC_API_URL=http://localhost:8000

# Start the frontend development server
npm run dev
```
The frontend will be running at `http://localhost:3000`.

### 4. Database Setup

1.  **Create a Supabase Project**: Go to your [Supabase Dashboard](https://supabase.com/dashboard) and create a new project.
2.  **Get Credentials**: Find your Project URL, `anon` key, and `service_role` key in the "Project Settings" > "API" section.
3.  **Run SQL Schema**:
    *   Navigate to the "SQL Editor" in your Supabase project.
    *   Copy the entire content of `supabase_schema.sql` from the root of this repository.
    *   Paste it into the SQL Editor and click "Run".
    *   This will create all the necessary tables (`users`, `playlists`, `user_preferences`, etc.).

---

## 📁 Project Structure

```
VibeTune/
├── Backend/                          # FastAPI Backend
│   ├── server_api.py                # Main API: /analyze-video, /recommendations
│   ├── requirements.txt             # Python dependencies
│   ├── .env.example                 # Environment variable template
│   ├── database.py                  # Prisma client initialization
│   ├── INSTALL_FFMPEG.md            # FFmpeg setup guide for Windows
│   │
│   ├── middleware/
│   │   └── supabase_auth.py         # JWT verification middleware
│   │
│   ├── routes/                      # Prisma-based database operations
│   │   ├── playlists_prisma.py      # Playlist CRUD with Prisma
│   │   ├── user_preferences.py      # User settings & language prefs
│   │   ├── mood_analysis.py         # Store mood detection history
│   │   ├── history.py               # Listening history tracking
│   │   └── liked_songs.py           # User's liked songs
│   │
│   ├── services/                    # Business logic
│   │   ├── emotion_fusion.py        # Rule-based emotion merging (fallback)
│   │   └── spotify_service.py       # Spotify API wrapper (RapidAPI)
│   │
│   ├── video_model/                 # Facial emotion detection
│   │   └── face_expression.py       # DeepFace + face cropping
│   │
│   ├── voice_model/                 # Voice emotion detection
│   │   ├── voice_api.py             # Wav2Vec2 model integration
│   │   ├── last_checkpoint.pth      # NeuroSyncFusion checkpoint
│   │   └── final_voice_model/       # Wav2Vec2 pre-trained model
│   │       ├── config.json
│   │       ├── model.safetensors
│   │       └── preprocessor_config.json
│   │
│   └── prisma/
│       └── schema.prisma            # Prisma database schema
│
├── Frontend/                         # Next.js 14 Frontend
│   ├── src/
│   │   ├── app/                     # App Router (Next.js 14)
│   │   │   ├── page.tsx             # Landing page
│   │   │   ├── login/page.tsx       # Login page
│   │   │   ├── signup/page.tsx      # Signup page
│   │   │   ├── callback/page.tsx    # OAuth callback
│   │   │   │
│   │   │   └── (main)/              # Protected routes (authenticated)
│   │   │       ├── layout.tsx       # Layout with Sidebar + BottomNav
│   │   │       ├── page.tsx         # Home/Dashboard
│   │   │       ├── mood/page.tsx    # Mood detection page
│   │   │       ├── search/page.tsx  # Search music
│   │   │       ├── library/page.tsx # User's library
│   │   │       ├── playlist/        # Playlist management
│   │   │       ├── suggest/page.tsx # Mood-based suggestions
│   │   │       ├── account/page.tsx # Account settings
│   │   │       ├── profile/page.tsx # User profile
│   │   │       └── feature-requests/ # Feature request system
│   │   │
│   │   ├── components/
│   │   │   ├── mood/
│   │   │   │   ├── MoodDetectorPanelMediaPipe.tsx  # Manual detection
│   │   │   │   ├── AutoMoodDetector.tsx            # Auto-detection
│   │   │   │   ├── MoodBadge.tsx                   # Emotion display
│   │   │   │   ├── MoodConfidence.tsx              # Confidence bar
│   │   │   │   └── CameraPreview.tsx               # Camera preview
│   │   │   │
│   │   │   ├── music/
│   │   │   │   ├── MusicRecommendations.tsx        # Song grid
│   │   │   │   └── SongCard.tsx                    # Individual song
│   │   │   │
│   │   │   ├── player/                # Audio player components
│   │   │   ├── suggest/               # Suggestion components
│   │   │   ├── feedback/              # Feature request components
│   │   │   ├── ui/                    # Reusable UI components
│   │   │   └── layout/
│   │   │       ├── Navbar.tsx         # Top navigation
│   │   │       ├── Sidebar.tsx        # Desktop sidebar
│   │   │       ├── BottomNav.tsx      # Mobile bottom nav
│   │   │       └── ThemeToggle.tsx    # Dark/light mode
│   │   │
│   │   └── lib/
│   │       ├── services/              # Frontend API layer
│   │       │   ├── voiceEmotion.ts    # Video/multimodal analysis
│   │       │   ├── autoMoodDetection.ts # Auto-detection service
│   │       │   ├── mood.ts            # Mood recommendations
│   │       │   ├── spotify.ts         # Spotify integration
│   │       │   ├── auth.ts            # Supabase auth
│   │       │   ├── playlistService.ts # Playlist operations
│   │       │   ├── moodAnalysisService.ts # Mood history
│   │       │   ├── historyService.ts  # Listening history
│   │       │   ├── likedSongs.ts      # Liked songs
│   │       │   └── library.ts         # Library management
│   │       │
│   │       ├── store/                 # Zustand state management
│   │       ├── supabaseClient.ts      # Supabase client config
│   │       ├── mockData.ts            # Mock data for development
│   │       └── utils.ts               # Utility functions
│   │
│   ├── package.json                   # Node dependencies
│   ├── next.config.js                 # Next.js configuration
│   ├── tailwind.config.ts             # Tailwind CSS config
│   └── .env.example                   # Frontend env template
│
├── Docs/                              # Detailed documentation
│   ├── Backend/
│   │   ├── 01_Overview.md
│   │   ├── 02_API_Endpoints.md
│   │   ├── 03_Voice_Model.md
│   │   ├── 04_Face_Model.md
│   │   ├── 05_Emotion_Fusion.md
│   │   ├── 06_Spotify_Integration.md
│   │   └── ...
│   └── Frontend/
│       └── README.md
│
├── .gitignore                         # Git ignore rules
├── README.MD                          # This file
└── package.json                       # Root package.json (workspace)
```

---

## 🧪 Testing

A comprehensive testing guide with detailed scenarios for every feature can be found in `Docs/TestingGuide.md`. It covers:
-   Home Page and Mood Detection tests.
-   Search and Cross-Page Persistence tests.
-   API, Performance, and Mobile Responsiveness tests.
-   Error recovery and edge case scenarios.

---

## 🤝 Contributing

Contributions are welcome! Please fork the repository, create a feature branch, and open a pull request.


