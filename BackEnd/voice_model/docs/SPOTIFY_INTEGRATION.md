# 🎵 Spotify Integration for Mood-Based Music Player

This project now includes a complete Spotify integration that automatically recommends and plays music based on your detected mood from voice or camera analysis.

## 🚀 Features

### 🎯 **Intelligent Mood-to-Music Mapping**
- **Happy**: Pop, Dance, Funk, Disco, Electronic music with high energy and positive vibes
- **Sad**: Indie, Alternative, Blues, Folk, Acoustic with low energy and melancholic feel
- **Angry**: Rock, Metal, Punk, Hardcore, Rap with high energy and intense emotions
- **Calm**: Ambient, Classical, Jazz, Lo-fi, Acoustic with peaceful and relaxing vibes
- **Energetic**: Electronic, Dance, House, Techno, Pop with maximum energy levels
- **Neutral**: Balanced mix of popular genres with moderate energy

### 🎮 **Music Player Features**
- **Preview Playback**: Play 30-second previews directly in the app
- **Full Track Access**: Open songs directly in Spotify
- **Playlist Creation**: Generate playlists based on detected emotions
- **Search Functionality**: Manual music search with comprehensive results
- **Playback Controls**: Play, pause, skip, volume control
- **Auto-Recommendations**: Instant music suggestions after mood detection

## 📋 **Setup Instructions**

### 1. **Get Spotify Developer Credentials**

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/applications)
2. Log in with your Spotify account
3. Click "Create App"
4. Fill in app details:
   - **App Name**: "Voice Mood Music Player" (or any name)
   - **App Description**: "Mood-based music recommendation system"
   - **Redirect URI**: `http://localhost:3000/callback`
5. Save and copy your **Client ID** and **Client Secret**

### 2. **Backend Setup**

```bash
# Navigate to backend directory
cd "D:\My_Projects\Final_year\BackEnd\Voice model"

# Run the setup script
.\setup_spotify.ps1

# Or manually install dependencies
pip install spotipy==2.23.0 python-dotenv==1.0.0
```

### 3. **Environment Configuration**

Create/edit `.env` file in the backend directory:

```env
# Spotify API Configuration
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REDIRECT_URI=http://localhost:3000/callback
```

### 4. **Start the Services**

```bash
# Start Backend API
cd "D:\My_Projects\Final_year\BackEnd\Voice model"
python voice_api.py

# Start Frontend (in new terminal)
cd "D:\My_Projects\Final_year\front end"
npm run dev
```

## 🎯 **How It Works**

### **Mood Detection → Music Flow**

1. **Voice/Camera Analysis**: Detect emotion using AI models
2. **Mood Mapping**: Convert emotions to music-compatible moods
3. **Smart Recommendations**: Use Spotify's audio features API for precise matching
4. **Auto-Playback**: Instantly play recommended tracks
5. **Interactive Control**: Full music player with search and controls

### **API Endpoints**

```http
# Search music
GET /spotify/search?query=happy+songs&limit=20

# Get mood-based recommendations
GET /spotify/mood-recommendations/Happy?limit=20

# Combined voice analysis + music
POST /analyze-voice-and-recommend
```

### **Audio Features Matching**

The system uses Spotify's audio features for intelligent matching:

- **Energy**: 0.0 (calm) to 1.0 (energetic)
- **Valence**: 0.0 (sad) to 1.0 (happy)
- **Genre Filtering**: Appropriate genres for each mood
- **Search Terms**: Contextual keywords for better results

## 🎨 **Frontend Components**

### **MusicRecommendations Component**
- Displays AI-recommended tracks based on detected mood
- Manual search functionality
- Interactive track list with previews
- Auto-refreshing recommendations

### **MusicPlayer Component**
- Full-featured audio player
- 30-second preview playback
- Skip, pause, volume controls
- Direct Spotify integration
- Album artwork display

### **Integrated MoodDetectorPanel**
- Seamless mood detection + music flow
- Automatic music loading after emotion detection
- Side-by-side mood results and music player

## 🔧 **Technical Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Voice/Camera  │───▶│   AI Analysis   │───▶│  Mood Detection │
│    Input        │    │   (GPU Accel)   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Music Playback  │◀───│ Spotify Search  │◀───│ Mood→Music Map  │
│   & Controls    │    │ & Recommend API │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🎵 **Usage Examples**

### **Voice-Based Music Discovery**
1. Click "Voice" tab
2. Record 3-5 seconds of speech
3. AI detects emotion (e.g., "Happy")
4. Spotify automatically loads upbeat, positive music
5. Play previews or open full tracks in Spotify

### **Manual Music Search**
1. Use search bar in Music Recommendations
2. Search for any artist, song, or genre
3. Click tracks to play previews
4. Build custom playlists

### **Mood-Based Playlists**
1. Multiple emotion detections refine recommendations
2. System learns your preferences over time
3. Create playlists for different moods
4. Export to your Spotify account

## 🔒 **Privacy & Security**

- **Client Credentials Flow**: Secure app-only authentication
- **No User Login Required**: Works without Spotify account login
- **Local Processing**: Voice analysis happens on your device
- **API Rate Limiting**: Respectful API usage patterns

## 🐛 **Troubleshooting**

### **Common Issues**

1. **"Spotify credentials not found"**
   - Check `.env` file exists and has correct credentials
   - Verify Client ID and Secret are from Spotify Dashboard

2. **"No audio previews"**
   - Some tracks don't have previews (Spotify limitation)
   - Use "Open in Spotify" button for full playback

3. **"Recommendations failed"**
   - Check internet connection
   - Verify Spotify API credentials
   - Some genres might have limited tracks

### **Debug Mode**

Enable debug logging in the backend:
```python
logging.basicConfig(level=logging.DEBUG)
```

## 🚀 **Next Steps**

- **User Authentication**: Full Spotify account integration
- **Playlist Management**: Create and save playlists
- **Advanced Recommendations**: Machine learning for personalization
- **Real-time Streaming**: WebSocket-based live recommendations
- **Mobile App**: React Native version

---

**🎵 Enjoy your mood-based music experience!**