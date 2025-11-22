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
│ FRONTEND (Next.js - Port 3000)                                  │
│ components/mood/MoodDetectorPanelIntegrated.tsx                 │
│ ┌─────────────┐   ┌──────────────┐   ┌─────────────────────┐    │
│ │ User clicks │ → │ Record audio │ → │ Capture image       │    │
│ │ "Detect"    │   │ (7s, 16kHz WAV)│ │ from <video> stream │    │
│ └─────────────┘   └──────────────┘   └─────────────────────┘    │
│                                                 ↓               │
│                                   ┌─────────────────────────┐   │
│                                   │ lib/services/voiceEmotion.ts│
│                                   │ FormData with:          │   │
│                                   │ - audio_file (Blob)     │   │
│                                   │ - image_file (Blob)     │   │
│                                   └─────────────────────────┘   │
└────────────────────────────────────────┬────────────────────────┘
                                         │ HTTP POST to http://localhost:8000/analyze-voice-and-face
                                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND (FastAPI - Port 8000)                                   │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ server_api.py: @app.post("/analyze-voice-and-face")        │  │
│ │ 1. Middleware: middleware/supabase_auth.py (Verify JWT)    │  │
│ │ 2. Save temp files (audio.wav, image.jpg)                  │  │
│ └────────────┬────────────────────────┬──────────────────────┘  │
│              ↓ (Parallel Execution)   ↓                         │
│    ┌──────────────────┐     ┌──────────────────┐                │
│    │ VOICE ANALYSIS   │     │ FACE ANALYSIS    │                │
│    │ voice_model/     │     │ video_model/     │                │
│    │ voice_api.py     │     │ face_expression.py                │
│    │                  │     │                  │                │
│    │ 1. Load audio    │     │ 1. Load image    │                │
│    │ 2. Resample 16kHz│     │ 2. Detect face   │                │
│    │ 3. Tokenize      │     │ 3. DeepFace      │                │
│    │ 4. Wav2Vec2      │     │ 4. Normalize     │                │
│    │ 5. Softmax       │     │                  │                │
│    │                  │     │                  │                │
│    │ Result: happy    │     │ Result: happy    │                │
│    │ (Confidence 0.87)│     │ (Confidence 0.78)│                │
│    └──────────┬───────┘     └────────┬─────────┘                │
│               └──────────┬───────────┘                          │
│                          ↓                                      │
│              ┌──────────────────────┐                           │
│              │ EMOTION FUSION       │                           │
│              │ services/emotion_fusion.py                       │
│              │                      │                           │
│              │ 1. Get agreement     │ → "Strong"                │
│              │ 2. Calc weights      │ → (0.55, 0.45)            │
│              │ 3. Choose emotion    │ → "happy"                 │
│              │ 4. Combine scores    │ → Weighted Avg: 0.829     │
│              └──────────┬───────────┘                           │
│                         ↓                                       │
│              ┌──────────────────────┐                           │
│              │ SPOTIFY SERVICE      │                           │
│              │ services/spotify_service.py                      │
│              │                      │                           │
│              │ 1. Get lang priority │ → routes/user_preferences.py │
│              │ 2. Map mood→params   │ → valence, energy, etc.   │
│              │ 3. API request       │ → RapidAPI (Spotify)      │
│              │ 4. Parse tracks      │ → 20 tracks               │
│              └──────────┬───────────┘                           │
│                         ↓                                       │
│              ┌──────────────────────┐                           │
│              │ BUILD & SEND RESPONSE│                           │
│              │ {                    │                           │
│              │   "success": true,   │                           │
│              │   "combined_emotion": "happy", ...               │
│              │ }                    │                           │
│              └──────────────────────┘                           │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP Response (JSON)
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (React/Next.js)                                        │
│ ┌──────────────────────────────────────────────────────────┐    │
│ │ Display Results in components/mood/MoodDetectorPanel...  │    │
│ │ - Emotion: HAPPY                                         │    │
│ │ - Confidence: 82.9%                                      │    │
│ │ - Agreement: Strong                                      │    │
│ │ - Music: Grid of 20 songs (components/music/SongCard.tsx)│    │
│ └──────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

Follow these steps to set up and run the project locally.

### Prerequisites

- **Node.js**: v18.0 or higher
- **Python**: v3.12.9 
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

#download the model from this link and paste this to Backend/voice_model/final_voice_model folder
-link - https://drive.google.com/drive/folders/1qDL5Arjf2JCxPJ6_73uU_5rOBU9QSzZP?usp=sharing

# Create enviroment in python
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
│   ├── server_api.py                # Main application entry point & routes
│   ├── requirements.txt             # Python dependencies
│   ├── .env.example                 # Environment variable template
│   │
│   ├── middleware/
│   │   └── supabase_auth.py         # JWT verification middleware
│   │
│   ├── routes/                      # API route modules for DB operations
│   │   ├── playlists.py             # Playlist CRUD
│   │   └── ...
│   │
│   ├── services/                    # Business logic
│   │   ├── emotion_fusion.py        # Emotion merging algorithm
│   │   └── spotify_service.py       # Spotify API wrapper
│   │
│   ├── video_model/                 # Facial emotion detection
│   │   └── face_expression.py       # DeepFace integration
│   │
│   └── voice_model/                 # Voice emotion detection
│       ├── voice_api.py             # Wav2Vec2 integration
│       └── final_voice_model/       # Pre-trained model files
│
├── Frontend/                         # Next.js Frontend
│   ├── src/
│   │   ├── app/                     # Next.js 14 App Router
│   │   │   ├── (main)/              # Authenticated routes
│   │   │   │   ├── page.tsx         # Home page
│   │   │   │   └── mood/page.tsx    # Mood detection page
│   │   │   ├── login/page.tsx       # Login page
│   │   │   └── layout.tsx           # Root layout
│   │   │
│   │   ├── components/
│   │   │   ├── mood/
│   │   │   │ └── MoodDetectorPanelIntegrated.tsx # Main detector UI
│   │   │   ├── music/
│   │   │   │   ├── MusicRecommendations.tsx    # Displays song grid
│   │   │   │   └── SongCard.tsx                # Individual song card
│   │   │   └── layout/
│   │   │       ├── Navbar.tsx
│   │   │       └── Sidebar.tsx
│   │   │
│   │   └── lib/
│   │       ├── services/            # Frontend API service layer
│   │       │   ├── auth.ts          # Supabase auth functions
│   │       │   ├── spotify.ts       # Calls to backend for music
│   │       │   └── voiceEmotion.ts  # Calls to backend for mood analysis
│   │       ├── supabaseClient.ts    # Supabase client configuration
│   │       └── utils.ts             # Utility functions
│   │
│   ├── package.json                 # Node dependencies
│   └── ...
│
├── Docs/                             # Detailed documentation files
├── README.md                         # This file
└── supabase_schema.sql              # Database schema for Supabase
```

---

## 🧪 Testing

A comprehensive testing guide with detailed scenarios for every feature can be found in `Docs/TestingGuide.md`. It covers:
-   Home Page and Mood Detection tests.
-   Search and Cross-Page Persistence tests.
-   API, Performance, and Mobile Responsiveness tests.
-   Error recovery and edge case scenarios.

---

