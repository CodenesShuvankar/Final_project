# VibeTune

A modern, AI-powered music streaming web application built with Next.js, featuring multimodal mood detection and personalized music recommendations based on your emotions.

## 🎵 Features

### Core Functionality
- **Music Streaming Interface**: Browse, search, and play music with a Spotify-like UI
- **Mood Detection**: Camera-based mood detection for personalized music suggestions
- **Smart Suggestions**: AI-powered music recommendations based on mood, context, and preferences
- **Library Management**: Organize liked songs, playlists, albums, and followed artists
- **Feature Requests**: Community-driven roadmap with voting and comments

### User Experience
- **Responsive Design**: Optimized for desktop and mobile devices
- **Dark/Light Themes**: System-aware theme switching with manual override
- **Accessibility**: Keyboard navigation, screen reader support, and focus management
- **Real-time Player**: Persistent music player with queue management

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: shadcn/ui with Radix UI primitives
- **State Management**: Zustand
- **Charts**: Recharts for analytics visualization
- **Icons**: Lucide React
- **Animations**: Framer Motion (ready for implementation)

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (main)/            # Main app layout group
│   │   ├── feature-requests/
│   │   ├── library/
│   │   ├── mood/
│   │   ├── playlist/[id]/
│   │   ├── profile/
│   │   ├── search/
│   │   └── suggest/
│   ├── login/
│   ├── signup/
│   └── layout.tsx
├── components/
│   ├── feedback/          # Feature request components
│   ├── layout/            # Navigation and layout
│   ├── mood/              # Mood detection UI
│   ├── music/             # Music-related components
│   ├── player/            # Audio player controls
│   ├── suggest/           # Suggestion system
│   └── ui/                # Reusable UI components
├── lib/
│   ├── services/          # Mock API services
│   ├── store/             # Zustand state stores
│   ├── mockData.ts        # Sample data
│   └── utils.ts           # Utility functions
└── globals.css            # Global styles and theme
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Modern web browser with camera access (for mood detection)

### Installation

1. **Clone and install dependencies**:
   ```bash
   cd spotify-mood-app
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Open in browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

### Demo Credentials
- **Email**: demo@example.com
- **Password**: password123

## 🎨 Design System

### Colors
- **Primary**: Spotify Green (#1DB954)
- **Secondary**: Complementary teal/blue tones
- **Dark Mode**: Near-black surfaces with green accents
- **Light Mode**: Clean whites with subtle grays

### Typography
- **Font**: Inter (system fallback)
- **Scales**: Responsive typography with consistent spacing

### Components
- Built with shadcn/ui for consistency
- Custom variants for music-specific use cases
- Accessible focus states and keyboard navigation

## 📱 Pages & Features

### Home (`/`)
- Personalized greeting and recommendations
- Recently played tracks
- Trending music and mood highlights
- Quick access to mood detection

### Search (`/search`)
- Real-time search with filters
- Tabbed results (Songs, Artists, Albums, Playlists)
- Play controls and library actions

### Mood Detection (`/mood`)
- Camera preview for mood analysis
- Confidence indicators and mood badges
- Automatic suggestion generation
- Privacy-focused design

### Suggest (`/suggest`)
- Advanced preference controls
- Context-aware recommendations
- Refinement options and explanations
- Mood integration

### Library (`/library`)
- Liked songs management
- Personal playlists
- Followed artists and saved albums
- Organization tools

### Profile (`/profile`)
- Listening statistics and analytics
- Interactive charts (genres, artists, activity)
- Personal music insights
- Account management

### Feature Requests (`/feature-requests`)
- Community suggestion system
- Voting and commenting
- Development roadmap
- Status tracking

### Playlist View (`/playlist/[id]`)
- Detailed playlist interface
- Track management
- Collaborative features
- Playback controls

## 🔧 Development

### Mock Services
All backend functionality is currently mocked:
- **Authentication**: Local storage simulation
- **Music Data**: Static JSON with realistic samples
- **Player State**: Simulated playback with progress
- **Mood Detection**: Random mood generation
- **Feature Requests**: Local storage persistence

### State Management
- **Theme Store**: System-aware dark/light mode
- **Player Store**: Music playback state
- **Feedback Store**: Feature request management

### Future Integration Points
The codebase is prepared for real backend integration:
- API service classes ready for HTTP calls
- TypeScript interfaces for all data models
- Error handling and loading states
- Authentication flow structure

## 🎯 Roadmap

### Phase 1: Core Features ✅
- [x] Basic music interface
- [x] Mood detection placeholder
- [x] Suggestion system
- [x] Feature request system

### Phase 2: Enhancements
- [ ] Framer Motion animations
- [ ] Advanced accessibility features
- [ ] Performance optimizations
- [ ] Mobile app considerations

### Phase 3: Backend Integration
- [ ] Real authentication system
- [ ] Music streaming API
- [ ] ML-powered mood detection
- [ ] Social features and sharing

## 🤝 Contributing

This is a demonstration project showcasing modern web development practices. The architecture supports easy extension and real backend integration.

### Key Principles
- **Type Safety**: Full TypeScript coverage
- **Accessibility**: WCAG compliance focus
- **Performance**: Optimized loading and rendering
- **Maintainability**: Clean, documented code

## 📄 License

This project is for demonstration purposes. All music-related assets are placeholder content.

---

**Built with ❤️ using Next.js, TypeScript, and Tailwind CSS**
