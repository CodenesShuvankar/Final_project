import { supabase } from '../supabaseClient';

export interface HistoryEntry {
  id: string;
  song_id: string;
  song_name: string;
  artist_name: string;
  album_name?: string;
  image_url?: string;
  spotify_url?: string;
  duration_ms?: number;
  completed: boolean;
  mood_detected?: string;
  played_at: string;
}

export interface ListeningStats {
  total_plays: number;
  unique_songs: number;
  unique_artists: number;
  top_artists: Array<{ name: string; plays: number }>;
  mood_distribution: Record<string, number>;
}

export class HistoryService {
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
   * Add a song to listening history
   */
  static async addToHistory(
    song_id: string,
    song_name: string,
    artist_name: string,
    album_name?: string,
    image_url?: string,
    spotify_url?: string,
    duration_ms?: number,
    completed: boolean = false,
    mood_detected?: string
  ): Promise<boolean> {
    try {
      const headers = await this.getAuthHeaders();
      const apiUrl = this.getApiUrl();

      const response = await fetch(`${apiUrl}/api/history/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          song_id,
          song_name,
          artist_name,
          album_name,
          image_url,
          spotify_url,
          duration_ms,
          completed,
          mood_detected,
        }),
      });

      if (!response.ok) {
        console.error('Failed to add to history:', await response.text());
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error adding to history:', error);
      return false;
    }
  }

  /**
   * Get listening history
   */
  static async getHistory(limit: number = 50, offset: number = 0): Promise<{ total: number; history: HistoryEntry[] }> {
    try {
      const headers = await this.getAuthHeaders();
      const apiUrl = this.getApiUrl();

      const response = await fetch(`${apiUrl}/api/history/?limit=${limit}&offset=${offset}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }

      const result = await response.json();
      return { total: result.total, history: result.history };
    } catch (error) {
      console.error('Error fetching history:', error);
      return { total: 0, history: [] };
    }
  }

  /**
   * Get recent listening history (last 24 hours)
   */
  static async getRecentHistory(limit: number = 10): Promise<HistoryEntry[]> {
    try {
      const headers = await this.getAuthHeaders();
      const apiUrl = this.getApiUrl();

      const response = await fetch(`${apiUrl}/api/history/recent?limit=${limit}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recent history');
      }

      const result = await response.json();
      return result.recent || [];
    } catch (error) {
      console.error('Error fetching recent history:', error);
      return [];
    }
  }

  /**
   * Get listening statistics
   */
  static async getStats(days: number = 30): Promise<ListeningStats | null> {
    try {
      const headers = await this.getAuthHeaders();
      const apiUrl = this.getApiUrl();

      const response = await fetch(`${apiUrl}/api/history/stats?days=${days}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const result = await response.json();
      return result.stats;
    } catch (error) {
      console.error('Error fetching stats:', error);
      return null;
    }
  }

  /**
   * Clear all history
   */
  static async clearHistory(): Promise<boolean> {
    try {
      const headers = await this.getAuthHeaders();
      const apiUrl = this.getApiUrl();

      const response = await fetch(`${apiUrl}/api/history/`, {
        method: 'DELETE',
        headers,
      });

      return response.ok;
    } catch (error) {
      console.error('Error clearing history:', error);
      return false;
    }
  }

  /**
   * Delete a specific history entry
   */
  static async deleteHistoryEntry(historyId: string): Promise<boolean> {
    try {
      const headers = await this.getAuthHeaders();
      const apiUrl = this.getApiUrl();

      const response = await fetch(`${apiUrl}/api/history/${historyId}`, {
        method: 'DELETE',
        headers,
      });

      return response.ok;
    } catch (error) {
      console.error('Error deleting history entry:', error);
      return false;
    }
  }
}
