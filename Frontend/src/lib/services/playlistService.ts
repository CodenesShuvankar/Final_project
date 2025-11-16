import { supabase, Playlist, PlaylistSong } from '../supabaseClient';

export class PlaylistService {
  private static getApiUrl(): string {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  }

  private static async getAuthHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    };
  }

  /**
   * Create a new playlist using backend API
   */
  static async createPlaylist(name: string, description?: string): Promise<Playlist | null> {
    try {
      const headers = await this.getAuthHeaders();
      const apiUrl = this.getApiUrl();

      const response = await fetch(`${apiUrl}/api/playlists/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name, description }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create playlist');
      }

      const result = await response.json();
      return result.playlist;
    } catch (error) {
      console.error('Error creating playlist:', error);
      return null;
    }
  }

  /**
   * Get all playlists for the current user using backend API
   */
  static async getUserPlaylists(): Promise<Playlist[]> {
    try {
      const headers = await this.getAuthHeaders();
      const apiUrl = this.getApiUrl();

      const response = await fetch(`${apiUrl}/api/playlists/my`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch playlists');
      }

      const result = await response.json();
      return result.playlists || [];
    } catch (error) {
      console.error('Error fetching playlists:', error);
      return [];
    }
  }

  /**
   * Get a single playlist by ID using backend API
   */
  static async getPlaylist(playlistId: string): Promise<Playlist | null> {
    try {
      const headers = await this.getAuthHeaders();
      const apiUrl = this.getApiUrl();

      const response = await fetch(`${apiUrl}/api/playlists/${playlistId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch playlist');
      }

      const result = await response.json();
      return result.playlist;
    } catch (error) {
      console.error('Error fetching playlist:', error);
      return null;
    }
  }

  /**
   * Update playlist details using backend API
   */
  static async updatePlaylist(
    playlistId: string,
    updates: { name?: string; description?: string }
  ): Promise<boolean> {
    try {
      const headers = await this.getAuthHeaders();
      const apiUrl = this.getApiUrl();

      const response = await fetch(`${apiUrl}/api/playlists/${playlistId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update playlist');
      }

      return true;
    } catch (error) {
      console.error('Error updating playlist:', error);
      return false;
    }
  }

  /**
   * Delete a playlist using backend API
   */
  static async deletePlaylist(playlistId: string): Promise<boolean> {
    try {
      const headers = await this.getAuthHeaders();
      const apiUrl = this.getApiUrl();

      const response = await fetch(`${apiUrl}/api/playlists/${playlistId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to delete playlist');
      }

      return true;
    } catch (error) {
      console.error('Error deleting playlist:', error);
      return false;
    }
  }

  /**
   * Add a song to a playlist using backend API
   */
  static async addSongToPlaylist(
    playlistId: string,
    song: {
      song_id: string;
      song_name: string;
      artist_name: string;
      album_name?: string;
      image_url?: string;
      spotify_url?: string;
    }
  ): Promise<boolean> {
    try {
      const headers = await this.getAuthHeaders();
      const apiUrl = this.getApiUrl();

      const response = await fetch(`${apiUrl}/api/playlists/${playlistId}/songs`, {
        method: 'POST',
        headers,
        body: JSON.stringify(song),
      });

      if (!response.ok) {
        throw new Error('Failed to add song to playlist');
      }

      return true;
    } catch (error) {
      console.error('Error adding song to playlist:', error);
      return false;
    }
  }

  /**
   * Remove a song from a playlist using backend API
   */
  static async removeSongFromPlaylist(playlistId: string, playlistSongId: string): Promise<boolean> {
    try {
      const headers = await this.getAuthHeaders();
      const apiUrl = this.getApiUrl();

      const response = await fetch(`${apiUrl}/api/playlists/${playlistId}/songs/${playlistSongId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to remove song from playlist');
      }

      return true;
    } catch (error) {
      console.error('Error removing song from playlist:', error);
      return false;
    }
  }
}