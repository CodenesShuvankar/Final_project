import { supabase } from '../supabaseClient';

export interface LikedSong {
  id: string;
  user_id: string;
  song_id: string;
  song_name: string;
  artist_name: string;
  album_name?: string;
  image_url?: string;
  spotify_url?: string;
  duration_ms?: number;
  liked_at: string;
}

/**
 * Service for managing user's liked songs
 */
export class LikedSongsService {
  private static instance: LikedSongsService;
  private likedSongsCache: Set<string> = new Set();
  private cacheInitialized: boolean = false;

  private constructor() {}

  static getInstance(): LikedSongsService {
    if (!LikedSongsService.instance) {
      LikedSongsService.instance = new LikedSongsService();
    }
    return LikedSongsService.instance;
  }

  /**
   * Initialize cache with user's liked songs
   */
  async initializeCache(): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        this.cacheInitialized = true;
        return;
      }

      const token = session.access_token;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${apiUrl}/api/liked-songs`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const likedSongs: LikedSong[] = await response.json();
        this.likedSongsCache = new Set(likedSongs.map(song => song.song_id));
        console.log(`✅ Loaded ${this.likedSongsCache.size} liked songs into cache`);
      }
      
      this.cacheInitialized = true;
    } catch (error) {
      console.error('Failed to initialize liked songs cache:', error);
      this.cacheInitialized = true;
    }
  }

  /**
   * Get all liked songs
   */
  async getLikedSongs(limit: number = 50): Promise<LikedSong[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No session, returning empty liked songs');
        return [];
      }

      const token = session.access_token;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${apiUrl}/api/liked-songs?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch liked songs: ${response.statusText}`);
      }

      const likedSongs: LikedSong[] = await response.json();
      return likedSongs;
    } catch (error) {
      console.error('Error fetching liked songs:', error);
      return [];
    }
  }

  /**
   * Like a song
   */
  async likeSong(
    songId: string,
    songName: string,
    artistName: string,
    albumName?: string,
    imageUrl?: string,
    spotifyUrl?: string,
    durationMs?: number
  ): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No session, cannot like song');
        return false;
      }

      const token = session.access_token;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const formData = new FormData();
      formData.append('song_id', songId);
      formData.append('song_name', songName);
      formData.append('artist_name', artistName);
      if (albumName) formData.append('album_name', albumName);
      if (imageUrl) formData.append('image_url', imageUrl);
      if (spotifyUrl) formData.append('spotify_url', spotifyUrl);
      if (durationMs) formData.append('duration_ms', durationMs.toString());

      const response = await fetch(`${apiUrl}/api/liked-songs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to like song: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Update cache
      this.likedSongsCache.add(songId);
      
      // Dispatch event to notify UI
      window.dispatchEvent(new CustomEvent('songLiked', { detail: { songId, liked: true } }));
      
      console.log(`❤️ Song liked: ${songName}`);
      return true;
    } catch (error) {
      console.error('Error liking song:', error);
      return false;
    }
  }

  /**
   * Unlike a song
   */
  async unlikeSong(songId: string): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No session, cannot unlike song');
        return false;
      }

      const token = session.access_token;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${apiUrl}/api/liked-songs/${songId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to unlike song: ${response.statusText}`);
      }

      // Update cache
      this.likedSongsCache.delete(songId);
      
      // Dispatch event to notify UI
      window.dispatchEvent(new CustomEvent('songLiked', { detail: { songId, liked: false } }));
      
      console.log(`💔 Song unliked: ${songId}`);
      return true;
    } catch (error) {
      console.error('Error unliking song:', error);
      return false;
    }
  }

  /**
   * Check if a song is liked (uses cache if available)
   */
  async isLiked(songId: string): Promise<boolean> {
    // Initialize cache if not done
    if (!this.cacheInitialized) {
      await this.initializeCache();
    }

    // Check cache first
    if (this.cacheInitialized) {
      return this.likedSongsCache.has(songId);
    }

    // Fallback to API call
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return false;
      }

      const token = session.access_token;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${apiUrl}/api/liked-songs/check/${songId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return result.is_liked || false;
    } catch (error) {
      console.error('Error checking liked status:', error);
      return false;
    }
  }

  /**
   * Toggle like status of a song
   */
  async toggleLike(
    songId: string,
    songName: string,
    artistName: string,
    albumName?: string,
    imageUrl?: string,
    spotifyUrl?: string,
    durationMs?: number
  ): Promise<boolean> {
    const isCurrentlyLiked = await this.isLiked(songId);
    
    if (isCurrentlyLiked) {
      return await this.unlikeSong(songId);
    } else {
      return await this.likeSong(
        songId,
        songName,
        artistName,
        albumName,
        imageUrl,
        spotifyUrl,
        durationMs
      );
    }
  }

  /**
   * Clear cache (useful on logout)
   */
  clearCache(): void {
    this.likedSongsCache.clear();
    this.cacheInitialized = false;
  }
}
