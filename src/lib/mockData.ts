export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  coverUrl: string;
  genre: string;
  mood: string[];
  energy: number; // 0-1
  valence: number; // 0-1 (happy/sad)
  tempo: number; // BPM
  year: number;
  explicit: boolean;
  liked: boolean;
}

export interface Artist {
  id: string;
  name: string;
  imageUrl: string;
  followers: number;
  genres: string[];
  verified: boolean;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  coverUrl: string;
  year: number;
  trackCount: number;
  duration: number;
  genre: string;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  creator: string;
  trackCount: number;
  duration: number;
  public: boolean;
  collaborative: boolean;
  tracks: string[]; // track IDs
}

export interface User {
  id: string;
  displayName: string;
  name: string;
  email: string;
  avatar: string;
  country: string;
  premium: boolean;
  followers: number;
  following: number;
  createdAt: string;
  playlists: number;
  likedSongs: number;
}

export interface ListeningHistory {
  date: string;
  hours: number;
  trackId: string;
  track: Track;
  duration: number;
  playedAt: string;
}

export interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  tags: string[];
  status: 'planned' | 'in-progress' | 'done';
  votes: number;
  createdAt: string;
  comments: Comment[];
  votedBy: string[]; // user IDs who voted
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

// Mock data
export const mockTracks: Track[] = [
  {
    id: '1',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    duration: 200,
    coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
    genre: 'Pop',
    mood: ['energetic', 'happy'],
    energy: 0.8,
    valence: 0.7,
    tempo: 171,
    year: 2020,
    explicit: false,
    liked: true,
  },
  {
    id: '2',
    title: 'Watermelon Sugar',
    artist: 'Harry Styles',
    album: 'Fine Line',
    duration: 174,
    coverUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&h=300&fit=crop',
    genre: 'Pop Rock',
    mood: ['happy', 'chill'],
    energy: 0.6,
    valence: 0.8,
    tempo: 95,
    year: 2020,
    explicit: false,
    liked: false,
  },
  {
    id: '3',
    title: 'Good 4 U',
    artist: 'Olivia Rodrigo',
    album: 'SOUR',
    duration: 178,
    coverUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300&fit=crop',
    genre: 'Pop Punk',
    mood: ['energetic', 'angry'],
    energy: 0.9,
    valence: 0.4,
    tempo: 166,
    year: 2021,
    explicit: true,
    liked: true,
  },
  {
    id: '4',
    title: 'Levitating',
    artist: 'Dua Lipa',
    album: 'Future Nostalgia',
    duration: 203,
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop',
    genre: 'Dance Pop',
    mood: ['energetic', 'happy'],
    energy: 0.8,
    valence: 0.9,
    tempo: 103,
    year: 2020,
    explicit: false,
    liked: true,
  },
  {
    id: '5',
    title: 'drivers license',
    artist: 'Olivia Rodrigo',
    album: 'SOUR',
    duration: 242,
    coverUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300&fit=crop',
    genre: 'Pop Ballad',
    mood: ['sad', 'calm'],
    energy: 0.3,
    valence: 0.2,
    tempo: 144,
    year: 2021,
    explicit: false,
    liked: false,
  },
  {
    id: '6',
    title: 'Stay',
    artist: 'The Kid LAROI & Justin Bieber',
    album: 'F*CK LOVE 3: OVER YOU',
    duration: 141,
    coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
    genre: 'Pop',
    mood: ['energetic', 'happy'],
    energy: 0.7,
    valence: 0.6,
    tempo: 169,
    year: 2021,
    explicit: true,
    liked: true,
  },
  {
    id: '7',
    title: 'Heat Waves',
    artist: 'Glass Animals',
    album: 'Dreamland',
    duration: 238,
    coverUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&h=300&fit=crop',
    genre: 'Indie Pop',
    mood: ['chill', 'calm'],
    energy: 0.4,
    valence: 0.5,
    tempo: 80,
    year: 2020,
    explicit: false,
    liked: false,
  },
  {
    id: '8',
    title: 'Industry Baby',
    artist: 'Lil Nas X & Jack Harlow',
    album: 'MONTERO',
    duration: 212,
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop',
    genre: 'Hip Hop',
    mood: ['energetic', 'confident'],
    energy: 0.9,
    valence: 0.8,
    tempo: 150,
    year: 2021,
    explicit: true,
    liked: true,
  },
  {
    id: '9',
    title: 'Shivers',
    artist: 'Ed Sheeran',
    album: '=',
    duration: 207,
    coverUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300&fit=crop',
    genre: 'Pop',
    mood: ['happy', 'romantic'],
    energy: 0.6,
    valence: 0.7,
    tempo: 141,
    year: 2021,
    explicit: false,
    liked: false,
  },
  {
    id: '10',
    title: 'Bad Habits',
    artist: 'Ed Sheeran',
    album: '=',
    duration: 231,
    coverUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300&fit=crop',
    genre: 'Pop',
    mood: ['energetic', 'party'],
    energy: 0.8,
    valence: 0.6,
    tempo: 126,
    year: 2021,
    explicit: false,
    liked: true,
  },
];

export const mockArtists: Artist[] = [
  {
    id: '1',
    name: 'The Weeknd',
    imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
    followers: 85000000,
    genres: ['Pop', 'R&B'],
    verified: true,
  },
  {
    id: '2',
    name: 'Harry Styles',
    imageUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&h=300&fit=crop',
    followers: 45000000,
    genres: ['Pop Rock', 'Pop'],
    verified: true,
  },
  {
    id: '3',
    name: 'Olivia Rodrigo',
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300&fit=crop',
    followers: 35000000,
    genres: ['Pop', 'Pop Punk'],
    verified: true,
  },
  {
    id: '4',
    name: 'Dua Lipa',
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop',
    followers: 55000000,
    genres: ['Dance Pop', 'Pop'],
    verified: true,
  },
  {
    id: '5',
    name: 'Ed Sheeran',
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300&fit=crop',
    followers: 75000000,
    genres: ['Pop', 'Folk Pop'],
    verified: true,
  },
];

export const mockAlbums: Album[] = [
  {
    id: '1',
    title: 'After Hours',
    artist: 'The Weeknd',
    artistId: '1',
    coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
    year: 2020,
    trackCount: 14,
    duration: 3360,
    genre: 'Pop',
  },
  {
    id: '2',
    title: 'Fine Line',
    artist: 'Harry Styles',
    artistId: '2',
    coverUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&h=300&fit=crop',
    year: 2019,
    trackCount: 12,
    duration: 2760,
    genre: 'Pop Rock',
  },
  {
    id: '3',
    title: 'SOUR',
    artist: 'Olivia Rodrigo',
    artistId: '3',
    coverUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300&fit=crop',
    year: 2021,
    trackCount: 11,
    duration: 2040,
    genre: 'Pop',
  },
];

export const mockPlaylists: Playlist[] = [
  {
    id: '1',
    title: 'Today\'s Top Hits',
    description: 'The biggest hits right now',
    coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
    creator: 'Spotify',
    trackCount: 50,
    duration: 9000,
    public: true,
    collaborative: false,
    tracks: ['1', '2', '3', '4', '5'],
  },
  {
    id: '2',
    title: 'Chill Vibes',
    description: 'Relax and unwind with these chill tracks',
    coverUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&h=300&fit=crop',
    creator: 'User',
    trackCount: 25,
    duration: 4500,
    public: false,
    collaborative: true,
    tracks: ['2', '5', '7', '9'],
  },
  {
    id: '3',
    title: 'Workout Mix',
    description: 'High energy tracks to fuel your workout',
    coverUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300&fit=crop',
    creator: 'User',
    trackCount: 30,
    duration: 5400,
    public: true,
    collaborative: false,
    tracks: ['1', '3', '4', '6', '8', '10'],
  },
];

export const mockUser: User = {
  id: '1',
  displayName: 'Music Lover',
  name: 'Music Lover',
  email: 'user@example.com',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
  country: 'United States',
  premium: true,
  followers: 42,
  following: 156,
  createdAt: '2023-01-15T10:30:00Z',
  playlists: 12,
  likedSongs: 347,
};

export const mockListeningHistory: ListeningHistory[] = [
  { date: '2024-01-01', hours: 2.5, trackId: '1', track: mockTracks[0], duration: 200, playedAt: '2024-01-01T10:30:00Z' },
  { date: '2024-01-02', hours: 3.2, trackId: '2', track: mockTracks[1], duration: 174, playedAt: '2024-01-02T14:20:00Z' },
  { date: '2024-01-03', hours: 1.8, trackId: '3', track: mockTracks[2], duration: 178, playedAt: '2024-01-03T16:45:00Z' },
  { date: '2024-01-04', hours: 4.1, trackId: '4', track: mockTracks[3], duration: 203, playedAt: '2024-01-04T09:15:00Z' },
  { date: '2024-01-05', hours: 2.9, trackId: '5', track: mockTracks[4], duration: 189, playedAt: '2024-01-05T12:30:00Z' },
  { date: '2024-01-06', hours: 3.7, trackId: '1', track: mockTracks[0], duration: 200, playedAt: '2024-01-06T18:00:00Z' },
  { date: '2024-01-07', hours: 2.3, trackId: '2', track: mockTracks[1], duration: 174, playedAt: '2024-01-07T11:45:00Z' },
  { date: '2024-01-08', hours: 3.5, trackId: '6', track: mockTracks[5], duration: 195, playedAt: '2024-01-08T15:20:00Z' },
  { date: '2024-01-09', hours: 1.9, trackId: '7', track: mockTracks[6], duration: 210, playedAt: '2024-01-09T13:10:00Z' },
  { date: '2024-01-10', hours: 4.2, trackId: '3', track: mockTracks[2], duration: 178, playedAt: '2024-01-10T17:30:00Z' },
  { date: '2024-01-11', hours: 2.8, trackId: '8', track: mockTracks[7], duration: 185, playedAt: '2024-01-11T20:15:00Z' },
  { date: '2024-01-12', hours: 3.1, trackId: '4', track: mockTracks[3], duration: 203, playedAt: '2024-01-12T08:45:00Z' },
  { date: '2024-01-13', hours: 2.6, trackId: '9', track: mockTracks[8], duration: 192, playedAt: '2024-01-13T19:25:00Z' },
  { date: '2024-01-14', hours: 3.8, trackId: '5', track: mockTracks[4], duration: 189, playedAt: '2024-01-14T14:50:00Z' },
  { date: '2024-01-15', hours: 2.2, trackId: '10', track: mockTracks[9], duration: 176, playedAt: '2024-01-15T16:35:00Z' },
  { date: '2024-01-16', hours: 3.4, trackId: '6', track: mockTracks[5], duration: 195, playedAt: '2024-01-16T12:20:00Z' },
  { date: '2024-01-17', hours: 2.7, trackId: '7', track: mockTracks[6], duration: 210, playedAt: '2024-01-17T21:10:00Z' },
  { date: '2024-01-18', hours: 3.3, trackId: '8', track: mockTracks[7], duration: 185, playedAt: '2024-01-18T10:40:00Z' },
  { date: '2024-01-19', hours: 2.4, trackId: '9', track: mockTracks[8], duration: 192, playedAt: '2024-01-19T15:55:00Z' },
  { date: '2024-01-20', hours: 3.9, trackId: '10', track: mockTracks[9], duration: 176, playedAt: '2024-01-20T18:25:00Z' },
];

export const mockFeatureRequests: FeatureRequest[] = [
  {
    id: '1',
    title: 'Collaborative Queue',
    description: 'Allow multiple users to add songs to a shared queue in real-time',
    tags: ['social', 'playback'],
    status: 'planned',
    votes: 156,
    createdAt: '2024-01-15T10:30:00Z',
    comments: [
      {
        id: '1',
        userId: '1',
        userName: 'Music Lover',
        content: 'This would be perfect for parties!',
        createdAt: '2024-01-15T11:00:00Z',
      },
    ],
    votedBy: ['1'],
  },
  {
    id: '2',
    title: 'Lyrics Synchronization',
    description: 'Display synchronized lyrics that highlight as the song plays',
    tags: ['playback', 'accessibility'],
    status: 'in-progress',
    votes: 243,
    createdAt: '2024-01-10T14:20:00Z',
    comments: [],
    votedBy: ['1'],
  },
  {
    id: '3',
    title: 'Sleep Timer',
    description: 'Automatically pause music after a specified time',
    tags: ['playback'],
    status: 'done',
    votes: 89,
    createdAt: '2024-01-05T09:15:00Z',
    comments: [],
    votedBy: [],
  },
  {
    id: '4',
    title: 'Voice Commands',
    description: 'Control playback using voice commands',
    tags: ['accessibility', 'mobile'],
    status: 'planned',
    votes: 67,
    createdAt: '2024-01-20T16:45:00Z',
    comments: [],
    votedBy: [],
  },
  {
    id: '5',
    title: 'Crossfade Settings',
    description: 'Customize crossfade duration between songs',
    tags: ['playback', 'desktop'],
    status: 'planned',
    votes: 34,
    createdAt: '2024-01-18T12:30:00Z',
    comments: [],
    votedBy: [],
  },
];

export const genres = [
  'Pop', 'Rock', 'Hip Hop', 'R&B', 'Country', 'Electronic', 'Jazz', 'Classical',
  'Indie', 'Alternative', 'Folk', 'Reggae', 'Blues', 'Punk', 'Metal', 'Latin'
];

export const moods = ['happy', 'sad', 'energetic', 'calm', 'angry', 'romantic', 'confident', 'chill', 'party'];

export const contexts = ['Focus', 'Workout', 'Chill', 'Study', 'Party', 'Travel', 'Sleep', 'Commute'];

export const decades = ['2020s', '2010s', '2000s', '1990s', '1980s', '1970s', '1960s'];

export const languages = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Japanese', 'Korean'];
