export type Mood =
  | "happy"
  | "sad"
  | "energetic"
  | "calm"
  | "romantic"
  | "focus"
  | "chill"
  | "melancholy"
  | "uplifting";

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  coverUrl: string;
  genre: string;
  mood: Mood[];
  energy: number;
  valence: number;
  tempo: number;
  year: number;
  explicit: boolean;
  liked?: boolean;
  previewUrl?: string | null;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  tracks: string[];
  trackCount: number;
  duration: number; // Duration in seconds
  createdAt: string;
  updatedAt: string;
  public: boolean;
  collaborative?: boolean;
  mood?: Mood;
  followers?: number;
  creator?: string;
}

export interface Artist {
  id: string;
  name: string;
  imageUrl: string;
  followers: number;
  genres: string[];
  popularity: number;
  bio?: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  year: number;
  trackCount: number;
  mood: Mood[];
  genre: string;
}

export interface FeatureRequestComment {
  id: string;
  author: string;
  avatarUrl?: string;
  message: string;
  createdAt: string;
}

export type FeatureRequestStatus = "planned" | "in-progress" | "done" | "backlog";

export interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  status: FeatureRequestStatus;
  tags: string[];
  votes: number;
  createdAt: string;
  updatedAt: string;
  comments: FeatureRequestComment[];
}

const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

export const genres: string[] = [
  "Pop",
  "Rock",
  "Hip Hop",
  "Electronic",
  "Jazz",
  "Classical",
  "Indie",
  "R&B",
  "Country",
  "Lo-Fi",
];

export const contexts: string[] = [
  "Working Out",
  "Studying",
  "Commute",
  "Relaxing",
  "Party",
  "Focus",
  "Morning",
  "Night Drive",
  "Dinner",
];

export const decades: string[] = [
  "2020s",
  "2010s",
  "2000s",
  "1990s",
  "1980s",
  "1970s",
];

export const languages: string[] = [
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Japanese",
  "Korean",
  "Hindi",
];

export const mockTracks: Track[] = [
  {
    id: "track-001",
    title: "Midnight Skyline",
    artist: "Neon Heights",
    album: "City Lights",
    duration: 212,
    coverUrl: "https://picsum.photos/seed/track001/600/600",
    genre: "Electronic",
    mood: ["energetic", "uplifting"],
    energy: 0.82,
    valence: 0.64,
    tempo: 124,
    year: 2023,
    explicit: false,
    previewUrl: null,
  },
  {
    id: "track-002",
    title: "Golden Hour",
    artist: "Aurora Lane",
    album: "Sunset Stories",
    duration: 198,
    coverUrl: "https://picsum.photos/seed/track002/600/600",
    genre: "Indie",
    mood: ["happy", "calm"],
    energy: 0.54,
    valence: 0.78,
    tempo: 98,
    year: 2022,
    explicit: false,
    previewUrl: null,
  },
  {
    id: "track-003",
    title: "Resonance",
    artist: "Echo District",
    album: "Analog Dreams",
    duration: 245,
    coverUrl: "https://picsum.photos/seed/track003/600/600",
    genre: "Lo-Fi",
    mood: ["chill", "focus"],
    energy: 0.37,
    valence: 0.52,
    tempo: 78,
    year: 2021,
    explicit: false,
    previewUrl: null,
  },
  {
    id: "track-004",
    title: "Broken Starlight",
    artist: "Nova Grey",
    album: "Fragments",
    duration: 234,
    coverUrl: "https://picsum.photos/seed/track004/600/600",
    genre: "Pop",
    mood: ["sad", "melancholy"],
    energy: 0.45,
    valence: 0.31,
    tempo: 92,
    year: 2020,
    explicit: false,
    previewUrl: null,
  },
  {
    id: "track-005",
    title: "Runaway Gravity",
    artist: "Stellar Pulse",
    album: "Orbit",
    duration: 256,
    coverUrl: "https://picsum.photos/seed/track005/600/600",
    genre: "Rock",
    mood: ["energetic"],
    energy: 0.9,
    valence: 0.6,
    tempo: 138,
    year: 2024,
    explicit: true,
    previewUrl: null,
  },
  {
    id: "track-006",
    title: "Quiet Streets",
    artist: "Low Tide",
    album: "Afterglow",
    duration: 207,
    coverUrl: "https://picsum.photos/seed/track006/600/600",
    genre: "Jazz",
    mood: ["calm", "romantic"],
    energy: 0.33,
    valence: 0.67,
    tempo: 84,
    year: 2019,
    explicit: false,
    previewUrl: null,
  },
  {
    id: "track-007",
    title: "Parallel Lines",
    artist: "Chromatic",
    album: "Vectors",
    duration: 221,
    coverUrl: "https://picsum.photos/seed/track007/600/600",
    genre: "Electronic",
    mood: ["focus"],
    energy: 0.58,
    valence: 0.48,
    tempo: 110,
    year: 2023,
    explicit: false,
    previewUrl: null,
  },
  {
    id: "track-008",
    title: "Summer Echoes",
    artist: "Coastal Lines",
    album: "Tidal Waves",
    duration: 188,
    coverUrl: "https://picsum.photos/seed/track008/600/600",
    genre: "Pop",
    mood: ["happy", "uplifting"],
    energy: 0.76,
    valence: 0.83,
    tempo: 122,
    year: 2024,
    explicit: false,
    previewUrl: null,
  },
  {
    id: "track-009",
    title: "Night Drive",
    artist: "MonoChrome",
    album: "Late Hours",
    duration: 230,
    coverUrl: "https://picsum.photos/seed/track009/600/600",
    genre: "R&B",
    mood: ["chill", "romantic"],
    energy: 0.49,
    valence: 0.58,
    tempo: 96,
    year: 2022,
    explicit: false,
    previewUrl: null,
  },
  {
    id: "track-010",
    title: "Static Bloom",
    artist: "Violet Noise",
    album: "Bloom",
    duration: 205,
    coverUrl: "https://picsum.photos/seed/track010/600/600",
    genre: "Indie",
    mood: ["melancholy", "calm"],
    energy: 0.42,
    valence: 0.44,
    tempo: 102,
    year: 2021,
    explicit: false,
    previewUrl: null,
  },
];

export const mockArtists: Artist[] = [
  {
    id: "artist-aurora-lane",
    name: "Aurora Lane",
    imageUrl: "https://picsum.photos/seed/artist001/400/400",
    followers: 1820000,
    genres: ["Indie Pop", "Dream Pop"],
    popularity: 78,
    bio: "Atmospheric indie artist known for dreamy soundscapes and intimate lyrics.",
  },
  {
    id: "artist-stellar-pulse",
    name: "Stellar Pulse",
    imageUrl: "https://picsum.photos/seed/artist002/400/400",
    followers: 980000,
    genres: ["Alternative Rock"],
    popularity: 71,
  },
  {
    id: "artist-low-tide",
    name: "Low Tide",
    imageUrl: "https://picsum.photos/seed/artist003/400/400",
    followers: 540000,
    genres: ["Jazz", "Neo-Soul"],
    popularity: 64,
  },
  {
    id: "artist-neon-heights",
    name: "Neon Heights",
    imageUrl: "https://picsum.photos/seed/artist004/400/400",
    followers: 1230000,
    genres: ["Electronic", "Synthwave"],
    popularity: 82,
  },
];

export const mockAlbums: Album[] = [
  {
    id: "album-city-lights",
    title: "City Lights",
    artist: "Neon Heights",
    coverUrl: "https://picsum.photos/seed/album001/600/600",
    year: 2023,
    trackCount: 12,
    mood: ["energetic"],
    genre: "Electronic",
  },
  {
    id: "album-sunset-stories",
    title: "Sunset Stories",
    artist: "Aurora Lane",
    coverUrl: "https://picsum.photos/seed/album002/600/600",
    year: 2022,
    trackCount: 10,
    mood: ["happy", "calm"],
    genre: "Indie",
  },
  {
    id: "album-analog-dreams",
    title: "Analog Dreams",
    artist: "Echo District",
    coverUrl: "https://picsum.photos/seed/album003/600/600",
    year: 2021,
    trackCount: 14,
    mood: ["chill", "focus"],
    genre: "Lo-Fi",
  },
];

export const mockPlaylists: Playlist[] = [
  {
    id: "playlist-focus-flow",
    title: "Focus Flow",
    description: "Stay in the zone with mellow electronica and lo-fi beats.",
    coverUrl: "https://picsum.photos/seed/playlist001/600/600",
    tracks: ["track-003", "track-007", "track-006", "track-010"],
    trackCount: 25,
    createdAt: daysAgo(60),
    updatedAt: daysAgo(2),
    public: true,
    mood: "focus",
    followers: 12845,
    creator: "VibeTune",
  },
  {
    id: "playlist-sunrise-vibes",
    title: "Sunrise Vibes",
    description: "Start your day with feel-good indie and acoustic tunes.",
    coverUrl: "https://picsum.photos/seed/playlist002/600/600",
    tracks: ["track-002", "track-008", "track-001", "track-009"],
    trackCount: 32,
    createdAt: daysAgo(120),
    updatedAt: daysAgo(14),
    public: true,
    mood: "happy",
    followers: 9842,
    creator: "Curated by Vibe AI",
  },
  {
    id: "playlist-late-night-drive",
    title: "Late Night Drive",
    description: "Moody synths and midnight melodies for your night rides.",
    coverUrl: "https://picsum.photos/seed/playlist003/600/600",
    tracks: ["track-001", "track-007", "track-004", "track-009"],
    trackCount: 28,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(4),
    public: false,
    collaborative: true,
    mood: "chill",
    followers: 1250,
    creator: "You",
  },
  {
    id: "playlist-workout-boost",
    title: "Workout Boost",
    description: "High-energy anthems to keep you moving.",
    coverUrl: "https://picsum.photos/seed/playlist004/600/600",
    tracks: ["track-005", "track-001", "track-008"],
    trackCount: 40,
    createdAt: daysAgo(10),
    updatedAt: daysAgo(1),
    public: true,
    mood: "energetic",
    followers: 15230,
    creator: "VibeTune",
  },
];

export const mockFeatureRequests: FeatureRequest[] = [
  {
    id: "feature-001",
    title: "Collaborative Playlist Editing",
    description:
      "Allow multiple friends to edit a shared playlist together in real time with activity history and moderation controls.",
    status: "in-progress",
    tags: ["Social", "Playlists"],
    votes: 184,
    createdAt: daysAgo(45),
    updatedAt: daysAgo(5),
    comments: [
      {
        id: "comment-001",
        author: "Alex Rivera",
        message: "Would love to invite my roommates to our party playlist!",
        createdAt: daysAgo(20),
      },
      {
        id: "comment-002",
        author: "Priya Patel",
        message: "Please include moderation so I can approve songs first.",
        createdAt: daysAgo(12),
      },
    ],
  },
  {
    id: "feature-002",
    title: "Lyrics View with Translation",
    description:
      "Show synchronized lyrics for songs, with the option to toggle on-the-fly translation for selected languages.",
    status: "planned",
    tags: ["UI/UX", "Accessibility"],
    votes: 246,
    createdAt: daysAgo(32),
    updatedAt: daysAgo(14),
    comments: [
      {
        id: "comment-003",
        author: "Jamie Chen",
        message: "Would be amazing for learning new languages through music!",
        createdAt: daysAgo(15),
      },
    ],
  },
  {
    id: "feature-003",
    title: "Smart Queue AI",
    description:
      "Automatically reorder the queue based on detected mood and energy, blending similar songs seamlessly.",
    status: "planned",
    tags: ["AI", "Playback"],
    votes: 167,
    createdAt: daysAgo(18),
    updatedAt: daysAgo(3),
    comments: [],
  },
  {
    id: "feature-004",
    title: "Offline Mood Detection",
    description:
      "Download lightweight models so mood detection can run without an internet connection while traveling.",
    status: "backlog",
    tags: ["Mobile", "AI"],
    votes: 98,
    createdAt: daysAgo(80),
    updatedAt: daysAgo(60),
    comments: [
      {
        id: "comment-004",
        author: "Daniel Brooks",
        message: "This would help a ton on flights!",
        createdAt: daysAgo(55),
      },
    ],
  },
  {
    id: "feature-005",
    title: "Mood-Based Visualizer",
    description:
      "Add a full-screen visualizer that adapts colors and animations to the current mood and song energy.",
    status: "done",
    tags: ["UI/UX", "Visual"],
    votes: 302,
    createdAt: daysAgo(140),
    updatedAt: daysAgo(7),
    comments: [
      {
        id: "comment-005",
        author: "Marcel Ortega",
        message: "The latest update looks fantastic, thank you!",
        createdAt: daysAgo(6),
      },
    ],
  },
];

