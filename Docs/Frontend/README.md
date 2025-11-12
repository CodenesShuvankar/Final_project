# Frontend Documentation

## Overview

Modern Next.js 14 web application for multimodal emotion detection with real-time mood analysis and personalized music recommendations.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: 18.0 or higher
- **npm**: 9.0 or higher
- **Backend API**: Running on http://localhost:8000

### Installation

```bash
# Navigate to frontend directory
cd "G:\My_Projects\Final_year\front end"

# Install dependencies
npm install

# Create environment file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Run development server
npm run dev
```

**Access:** http://localhost:3000

---

## 📁 Project Structure

```
front end/
├── src/
│   ├── app/                        # Next.js 14 App Router
│   │   ├── (main)/                # Main authenticated routes
│   │   │   ├── mood/              # Mood detection page
│   │   │   ├── playlist/          # Music playlists
│   │   │   ├── library/           # User library
│   │   │   ├── search/            # Search functionality
│   │   │   ├── suggest/           # Music suggestions
│   │   │   ├── profile/           # User profile
│   │   │   └── feature-requests/  # Feature voting
│   │   ├── login/                 # Login page
│   │   ├── signup/                # Signup page
│   │   └── callback/              # Auth callback
│   │
│   ├── components/
│   │   ├── mood/                  # Mood detection components
│   │   │   ├── MoodDetectorPanel.tsx
│   │   │   ├── MoodDetectorPanelIntegrated.tsx
│   │   │   ├── AutoMoodDetector.tsx
│   │   │   ├── CameraPreview.tsx
│   │   │   ├── VoiceRecorder.tsx
│   │   │   └── VoiceRecorderWAV.tsx
│   │   ├── music/                 # Music components
│   │   │   ├── MusicPlayer.tsx
│   │   │   ├── SpotifySongCard.tsx
│   │   │   └── MusicRecommendations.tsx
│   │   ├── player/                # Player controls
│   │   │   ├── PlayerBar.tsx
│   │   │   └── SpotifyConnect.tsx
│   │   ├── layout/                # Layout components
│   │   │   ├── Navbar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   └── ThemeToggle.tsx
│   │   └── ui/                    # Reusable UI components
│   │
│   └── lib/
│       ├── services/              # API service layer
│       ├── store/                 # State management
│       ├── utils.ts               # Utility functions
│       └── mockData.ts            # Mock data for testing
│
├── public/                        # Static assets
├── package.json                   # Dependencies
├── next.config.js                 # Next.js configuration
├── tailwind.config.ts             # Tailwind CSS config
└── tsconfig.json                  # TypeScript config
```

---

## 🎯 Key Features

### 1. **Mood Detection** (`/mood`)
- Real-time voice recording (7 seconds)
- Webcam capture for facial expression
- Fallback for missing devices (camera/microphone)
- Multimodal emotion analysis
- Confidence scores and agreement levels

**Main Component:** `src/components/mood/MoodDetectorPanelIntegrated.tsx`

### 2. **Music Recommendations**
- Spotify integration
- Mood-based song suggestions
- Inline music player
- Track preview playback
- Playlist creation

**Main Components:** 
- `src/components/music/MusicRecommendations.tsx`
- `src/components/music/SpotifySongCard.tsx`

### 3. **Device Handling**
- Automatic device detection
- Camera permission handling
- Microphone permission handling
- Placeholder generation for missing devices
- Graceful degradation

**Implementation:** `src/components/mood/MoodDetectorPanelIntegrated.tsx`

### 4. **Responsive Design**
- Mobile-first approach
- Desktop, tablet, and mobile layouts
- Bottom navigation for mobile
- Sidebar for desktop
- Dark mode support

---

## 🛠️ Technology Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Framework** | Next.js 14 | React framework with App Router |
| **Language** | TypeScript | Type-safe development |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **UI Components** | shadcn/ui | Accessible component library |
| **State Management** | React Hooks | Local component state |
| **API Calls** | Fetch API | Backend communication |
| **Media** | MediaRecorder API | Audio/video recording |
| **Audio Processing** | Web Audio API | Audio format conversion |

---

## 📱 Main Pages

### `/mood` - Mood Detection
```typescript
// User flow:
1. Click "Detect Mood" button
2. Record 7 seconds of audio
3. Capture image from webcam
4. Send to backend API
5. Display emotion results
6. Show music recommendations
```

### `/playlist` - Playlists
```typescript
// Features:
- Browse playlists
- Create new playlists
- Add/remove songs
- Play playlist
```

### `/library` - User Library
```typescript
// Features:
- Saved songs
- Recent plays
- Favorite tracks
- Download management
```

### `/search` - Search
```typescript
// Features:
- Search tracks, artists, albums
- Filter results
- Quick play
- Add to playlist
```

---

## 🔧 Configuration

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_client_id
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://localhost:3000/callback
```

### API Service

```typescript
// src/lib/services/voiceService.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const analyzeMultimodal = async (
  audioBlob: Blob,
  imageBlob: Blob,
  limit: number = 20
) => {
  const formData = new FormData();
  formData.append('audio_file', audioBlob, 'audio.wav');
  formData.append('image_file', imageBlob, 'image.jpg');
  formData.append('limit', limit.toString());

  const response = await fetch(`${API_URL}/analyze-voice-and-face`, {
    method: 'POST',
    body: formData,
  });

  return response.json();
};
```

---

## 🎨 UI Components

### Mood Detector Panel

```typescript
// Usage:
import MoodDetectorPanelIntegrated from '@/components/mood/MoodDetectorPanelIntegrated';

<MoodDetectorPanelIntegrated
  onMoodDetected={(mood, analysis) => {
    console.log('Detected mood:', mood);
    console.log('Analysis:', analysis);
  }}
/>
```

### Spotify Song Card

```typescript
// Usage:
import SpotifySongCard from '@/components/music/SpotifySongCard';

<SpotifySongCard
  track={{
    id: '123',
    name: 'Song Name',
    artists: ['Artist Name'],
    album: 'Album Name',
    image: 'https://...',
    preview_url: 'https://...'
  }}
  onPlay={(track) => playTrack(track)}
/>
```

---

## 📊 Data Flow

### Mood Detection Flow

```
User Action (Click "Detect Mood")
    ↓
Check Permissions (Camera + Microphone)
    ↓
Record Audio (7 seconds, 16kHz WAV)
    ↓
Capture Image (640x480 JPEG or placeholder)
    ↓
Create FormData
    ↓
POST /analyze-voice-and-face
    ↓
Backend Processing (~3s)
    ↓
Receive Response:
  - Voice emotion (87% confidence)
  - Face emotion (78% confidence)
  - Merged emotion (82% confidence)
  - 20 music recommendations
    ↓
Display Results
    ↓
Show Music Player
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "Camera not found"

**Cause:** No webcam or permission denied

**Solution:**
```typescript
// Automatically handled - creates placeholder image
// User sees "Camera unavailable, using voice-only detection"
```

### Issue 2: "Microphone not found"

**Cause:** No microphone or permission denied

**Solution:**
```typescript
// Falls back to camera-only detection
// Or shows error if both missing
```

### Issue 3: "API connection failed"

**Cause:** Backend not running

**Solution:**
```bash
# Start backend
cd BackEnd
python -m uvicorn server_api:app --reload
```

### Issue 4: "Module not found" errors

**Cause:** Dependencies not installed

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## 🚀 Deployment

### Build for Production

```bash
# Build optimized production bundle
npm run build

# Test production build locally
npm start

# Access: http://localhost:3000
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts to configure
```

### Deploy to Other Platforms

**Netlify:**
```bash
# Build command
npm run build

# Publish directory
.next
```

**Docker:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 🧪 Testing

### Manual Testing

```bash
# Run development server
npm run dev

# Test scenarios:
1. Mood detection with camera + microphone
2. Mood detection without camera (placeholder)
3. Mood detection without microphone (camera only)
4. Music playback
5. Playlist creation
6. Search functionality
```

### Key Test Cases

| Test                | Expected Result                       |
|---------------------|---------------------------------------|
| Click "Detect Mood" | Recording starts, countdown shows     |
| Allow camera        | Video preview appears                 |
| Deny camera         | Placeholder created, voice-only mode  |
| Allow microphone    | Audio recording works                 |
| Deny microphone     | Error or camera-only mode             |
| Wait 7 seconds      | Analysis starts automatically         |
| View results        | Emotion displayed with confidence     |
| Play preview        | 30s track preview plays               |
| Add to playlist     | Song added, confirmation shown        |

---

## 📝 Scripts

```json
{
  "scripts": {
    "dev": "next dev",              // Development server (hot reload)
    "build": "next build",          // Production build
    "start": "next start",          // Production server
    "lint": "next lint"             // Run ESLint
  }
}
```

---

## 🔗 API Integration

### Available Endpoints

| Endpoint                        | Method | Purpose               | Component           |
|---------------------------------|--------|-----------------------|---------------------|
| `/analyze-voice-and-face`       | POST   | Multimodal analysis   | MoodDetectorPanel   |
| `/mood-recommendations/{mood}`  | GET    | Get music by mood     | MusicRecommendations|
| `/search`                       | GET    | Search tracks/artists | SearchPage          |

**Backend Documentation:** [../../Docs/Backend/02_API_Endpoints.md](../Backend/02_API_Endpoints.md)

---

## 🎓 Development Guide

### Adding a New Page

```bash
# Create page file
touch "src/app/(main)/newpage/page.tsx"
```

```typescript
// src/app/(main)/newpage/page.tsx
export default function NewPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold">New Page</h1>
      {/* Your content */}
    </div>
  );
}
```

### Adding a New Component

```bash
# Create component file
touch "src/components/newfeature/NewComponent.tsx"
```

```typescript
// src/components/newfeature/NewComponent.tsx
interface NewComponentProps {
  data: string;
}

export default function NewComponent({ data }: NewComponentProps) {
  return (
    <div className="p-4">
      <p>{data}</p>
    </div>
  );
}
```

### Adding a New API Call

```typescript
// src/lib/services/apiService.ts
export const newApiCall = async (params: any) => {
  const response = await fetch(`${API_URL}/new-endpoint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  
  return response.json();
};
```

---

## 🔧 Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <process_id> /F

# Or use different port:
npm run dev -- -p 3001
```

### Build Errors

```bash
# Clear cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

---

## 📚 Related Documentation

- **Backend API:** [../Backend/README.md](../Backend/README.md)
- **API Endpoints:** [../Backend/02_API_Endpoints.md](../Backend/02_API_Endpoints.md)
- **Testing Guide:** [../../TESTING_GUIDE.md](../../TESTING_GUIDE.md)

---

## 🎯 Quick Links

- **Next.js Docs:** https://nextjs.org/docs
- **Tailwind CSS:** https://tailwindcss.com/docs
- **shadcn/ui:** https://ui.shadcn.com
- **TypeScript:** https://www.typescriptlang.org/docs

---

## 📞 Support

For frontend issues:
1. Check console errors (F12)
2. Verify backend is running (http://localhost:8000)
3. Check environment variables (.env.local)
4. Review network tab for failed API calls
5. Check device permissions (camera/microphone)

---

**Version:** 1.0.0  
**Last Updated:** November 2025  
**Framework:** Next.js 14 + TypeScript + Tailwind CSS
