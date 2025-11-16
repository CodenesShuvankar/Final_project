import { supabase } from '../supabaseClient';

export interface MoodAnalysis {
  id?: string;
  detected_mood: string;
  confidence: number;
  voice_emotion?: string;
  voice_confidence?: number;
  face_emotion?: string;
  face_confidence?: number;
  agreement?: string;
  analysis_type: 'voice' | 'face' | 'multimodal';
  created_at?: string;
}

export class MoodAnalysisService {
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
   * Store mood analysis result in database
   */
  static async storeMoodAnalysis(
    detected_mood: string,
    confidence: number,
    analysis_type: 'voice' | 'face' | 'multimodal',
    voice_emotion?: string,
    voice_confidence?: number,
    face_emotion?: string,
    face_confidence?: number,
    agreement?: string
  ): Promise<boolean> {
    try {
      const headers = await this.getAuthHeaders();
      const apiUrl = this.getApiUrl();

      const response = await fetch(`${apiUrl}/api/mood/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          detected_mood,
          confidence,
          voice_emotion,
          voice_confidence,
          face_emotion,
          face_confidence,
          agreement,
          analysis_type,
        }),
      });

      if (!response.ok) {
        console.error('Failed to store mood analysis:', await response.text());
        return false;
      }

      const result = await response.json();
      console.log('✅ Mood analysis stored:', result);
      return true;
    } catch (error) {
      console.error('Error storing mood analysis:', error);
      return false;
    }
  }

  /**
   * Get mood detection history
   */
  static async getMoodHistory(limit: number = 50, offset: number = 0): Promise<MoodAnalysis[]> {
    try {
      const headers = await this.getAuthHeaders();
      const apiUrl = this.getApiUrl();

      const response = await fetch(`${apiUrl}/api/mood/history?limit=${limit}&offset=${offset}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch mood history');
      }

      const result = await response.json();
      return result.analyses || [];
    } catch (error) {
      console.error('Error fetching mood history:', error);
      return [];
    }
  }

  /**
   * Get mood statistics
   */
  static async getMoodStats(days: number = 30): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const apiUrl = this.getApiUrl();

      const response = await fetch(`${apiUrl}/api/mood/stats?days=${days}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch mood stats');
      }

      const result = await response.json();
      return result.stats;
    } catch (error) {
      console.error('Error fetching mood stats:', error);
      return null;
    }
  }

  /**
   * Get latest mood analysis
   */
  static async getLatestMood(): Promise<MoodAnalysis | null> {
    try {
      const headers = await this.getAuthHeaders();
      const apiUrl = this.getApiUrl();

      const response = await fetch(`${apiUrl}/api/mood/latest`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch latest mood');
      }

      const result = await response.json();
      return result.analysis;
    } catch (error) {
      console.error('Error fetching latest mood:', error);
      return null;
    }
  }

  /**
   * Clear mood history
   */
  static async clearMoodHistory(): Promise<boolean> {
    try {
      const headers = await this.getAuthHeaders();
      const apiUrl = this.getApiUrl();

      const response = await fetch(`${apiUrl}/api/mood/`, {
        method: 'DELETE',
        headers,
      });

      return response.ok;
    } catch (error) {
      console.error('Error clearing mood history:', error);
      return false;
    }
  }
}
