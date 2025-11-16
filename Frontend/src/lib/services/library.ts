import {
  Album,
  Artist,
  Playlist,
  Track,
  mockAlbums,
  mockArtists,
  mockTracks,
} from "@/lib/mockData"

const PLAYLIST_TRACKS_KEY = "vibetune_playlist_tracks"
const LIKED_SONGS_KEY = "vibetune_liked_songs"
const FOLLOWED_ARTISTS_KEY = "vibetune_followed_artists"
const SAVED_ALBUMS_KEY = "vibetune_saved_albums"

type PlaylistTrackMap = Record<string, Track[]>

const readStorage = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") {
    return fallback
  }

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch (error) {
    console.warn(`[LibraryService] Failed to read ${key}`, error)
    return fallback
  }
}

const writeStorage = (key: string, value: unknown) => {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn(`[LibraryService] Failed to write ${key}`, error)
  }
}

const coerceTrack = (trackId: string): Track | null => {
  const baseTrack = mockTracks.find((track) => track.id === trackId)
  return baseTrack ? { ...baseTrack } : null
}

const generateCover = (title: string) => {
  const hash = Array.from(title).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const palettes = [
    "FF8A80",
    "FFD180",
    "FFFF8D",
    "CCFF90",
    "80D8FF",
    "A7FFEB",
    "CFD8DC",
  ]
  const color = palettes[hash % palettes.length]
  return `https://singlecolorimage.com/get/${color}/400x400`
}

export class LibraryService {
  static async getLikedSongs(): Promise<Track[]> {
    try {
      // Use LikedSongsService to fetch from backend API
      const { LikedSongsService } = await import('./likedSongs');
      const service = LikedSongsService.getInstance();
      const likedSongs = await service.getLikedSongs();
      
      console.log('📥 Fetched liked songs from backend:', likedSongs);
      
      // Convert backend format to Track format
      const tracks: Track[] = likedSongs.map((song: any) => ({
        id: song.song_id,
        title: song.song_name,
        artist: song.artist_name,
        album: song.album_name || 'Unknown Album',
        duration: song.duration_ms ? Math.floor(song.duration_ms / 1000) : 0,
        coverUrl: song.image_url || generateCover(song.song_name),
        previewUrl: song.spotify_url,
        liked: true,
      }));
      
      console.log('✅ Converted to Track format:', tracks);
      return tracks;
    } catch (error) {
      console.error('Failed to fetch liked songs from backend:', error);
      // Return empty array if fetch fails
      return [];
    }
  }

  static async toggleLike(trackId: string): Promise<boolean> {
    // This method is deprecated - components should use LikedSongsService directly
    // But keeping for backward compatibility
    const { LikedSongsService } = await import('./likedSongs');
    const isLiked = LikedSongsService.isLiked(trackId);
    
    if (isLiked) {
      return false; // Already liked
    }
    
    return true;
  }

  static async getPlaylists(): Promise<Playlist[]> {
    // Use PlaylistService to fetch from backend API
    const { PlaylistService } = await import('./playlistService');
    const backendPlaylists = await PlaylistService.getUserPlaylists();
    
    console.log('🔍 Backend playlists raw data:', backendPlaylists);
    
    // Convert backend format to Playlist format
    const converted = backendPlaylists.map((p: any) => ({
      id: p.id,
      title: p.name,
      description: p.description || 'Personal playlist',
      tracks: [],
      trackCount: p.song_count || 0,
      duration: p.total_duration || 0, // Duration in seconds
      coverUrl: p.cover_url || generateCover(p.name),
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      public: p.is_public || false,
      collaborative: false,
      creator: 'You'
    }));
    
    console.log('✅ Converted playlists:', converted);
    
    return converted;
  }

  static async createPlaylist(name: string, description?: string): Promise<Playlist> {
    // Use PlaylistService to create via backend API
    const { PlaylistService } = await import('./playlistService');
    const backendPlaylist = await PlaylistService.createPlaylist(name, description || '');
    
    if (!backendPlaylist) {
      throw new Error('Failed to create playlist');
    }
    
    // Convert backend format to Playlist format
    return {
      id: backendPlaylist.id,
      title: backendPlaylist.name,
      description: backendPlaylist.description || 'Personal playlist',
      tracks: [],
      trackCount: 0,
      duration: 0,
      coverUrl: backendPlaylist.cover_url || generateCover(backendPlaylist.name),
      createdAt: backendPlaylist.created_at,
      updatedAt: backendPlaylist.updated_at,
      public: backendPlaylist.is_public || false,
      collaborative: false,
      creator: 'You'
    };
  }

  static async deletePlaylist(playlistId: string): Promise<boolean> {
    // Use PlaylistService to delete via backend API
    const { PlaylistService } = await import('./playlistService');
    return await PlaylistService.deletePlaylist(playlistId);
  }

  static async getPlaylist(playlistId: string): Promise<Playlist | null> {
    const playlists = await this.getPlaylists()
    const found = playlists.find((playlist) => playlist.id === playlistId)
    return found ?? null
  }

  static async getPlaylistTracks(playlistId: string): Promise<Track[]> {
    const playlistTracks = readStorage<PlaylistTrackMap>(PLAYLIST_TRACKS_KEY, {})
    if (playlistTracks[playlistId] && playlistTracks[playlistId].length > 0) {
      return playlistTracks[playlistId]
    }

    const playlist = await this.getPlaylist(playlistId)

    if (!playlist) {
      return []
    }

    const tracks = playlist.tracks
      .map((trackId) => coerceTrack(trackId))
      .filter((track): track is Track => Boolean(track))

    if (tracks.length > 0) {
      playlistTracks[playlistId] = tracks
      writeStorage(PLAYLIST_TRACKS_KEY, playlistTracks)
    }

    return tracks
  }

  static async addToPlaylist(playlistId: string, track: Track): Promise<boolean> {
    try {
      // Use PlaylistService to add song via backend API
      const { PlaylistService } = await import('./playlistService');
      
      const success = await PlaylistService.addSongToPlaylist(playlistId, {
        song_id: track.id,
        song_name: track.title,
        artist_name: track.artist,
        album_name: track.album,
        image_url: track.coverUrl,
        spotify_url: track.previewUrl || undefined,
      });
      
      if (success) {
        // Also update localStorage cache for quick access
        const playlistTracks = readStorage<PlaylistTrackMap>(PLAYLIST_TRACKS_KEY, {})
        const tracks = playlistTracks[playlistId] ? [...playlistTracks[playlistId]] : []

        if (!tracks.some((item) => item.id === track.id)) {
          tracks.push(track)
          playlistTracks[playlistId] = tracks
          writeStorage(PLAYLIST_TRACKS_KEY, playlistTracks)
        }
      }
      
      return success;
    } catch (error) {
      console.error('Failed to add song to playlist:', error);
      return false;
    }
  }

  static async getFollowedArtists(): Promise<Artist[]> {
    const artists = readStorage<Artist[]>(FOLLOWED_ARTISTS_KEY, [])
    if (artists.length > 0) {
      return artists
    }
    writeStorage(FOLLOWED_ARTISTS_KEY, mockArtists)
    return mockArtists
  }

  static async getSavedAlbums(): Promise<Album[]> {
    const albums = readStorage<Album[]>(SAVED_ALBUMS_KEY, [])
    if (albums.length > 0) {
      return albums
    }
    writeStorage(SAVED_ALBUMS_KEY, mockAlbums)
    return mockAlbums
  }

  static async getPlaylistSummary(playlistId: string): Promise<{ totalDuration: number; trackCount: number }> {
    const tracks = await this.getPlaylistTracks(playlistId)
    const totalDuration = tracks.reduce((sum, track) => sum + track.duration, 0)
    return {
      totalDuration,
      trackCount: tracks.length,
    }
  }
}

