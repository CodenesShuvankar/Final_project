import { Track, mockTracks, contexts, moods } from '@/lib/mockData';
import { MoodDetection } from './mood';

export interface SuggestFilters {
  energy: number; // 0-1
  tempo: number; // BPM range
  valence: number; // 0-1 (happy/sad)
  decade: string;
  languages: string[];
  contexts: string[];
  historyWeight: number; // 0-1
}

export interface SuggestRequest {
  mood?: MoodDetection;
  filters: SuggestFilters;
  excludeTrackIds?: string[];
}

export interface SuggestResult {
  track: Track;
  score: number;
  reasons: string[];
}

export interface SuggestResponse {
  results: SuggestResult[];
  totalCount: number;
}

/**
 * Mock suggestion service that combines mood, context, and preferences
 * TODO: Replace with real ML-powered recommendation engine
 */
export class SuggestService {
  private static instance: SuggestService;

  static getInstance(): SuggestService {
    if (!SuggestService.instance) {
      SuggestService.instance = new SuggestService();
    }
    return SuggestService.instance;
  }

  async getSuggestions(request: SuggestRequest): Promise<SuggestResponse> {
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate processing

    const { mood, filters, excludeTrackIds = [] } = request;
    let candidates = mockTracks.filter(track => !excludeTrackIds.includes(track.id));

    const results: SuggestResult[] = candidates.map(track => {
      const score = this.calculateScore(track, mood, filters);
      const reasons = this.generateReasons(track, mood, filters);
      
      return { track, score, reasons };
    });

    // Sort by score and take top results
    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, 20);

    return {
      results: topResults,
      totalCount: topResults.length,
    };
  }

  private calculateScore(track: Track, mood?: MoodDetection, filters?: SuggestFilters): number {
    let score = 0.5; // Base score

    // Mood matching
    if (mood && track.mood.includes(mood.mood)) {
      score += 0.3 * mood.confidence;
    }

    // Energy matching
    if (filters?.energy !== undefined) {
      const energyDiff = Math.abs(track.energy - filters.energy);
      score += (1 - energyDiff) * 0.2;
    }

    // Valence matching
    if (filters?.valence !== undefined) {
      const valenceDiff = Math.abs(track.valence - filters.valence);
      score += (1 - valenceDiff) * 0.15;
    }

    // Tempo matching (normalize BPM to 0-1 range)
    if (filters?.tempo !== undefined) {
      const normalizedTrackTempo = Math.min(track.tempo / 200, 1);
      const normalizedFilterTempo = Math.min(filters.tempo / 200, 1);
      const tempoDiff = Math.abs(normalizedTrackTempo - normalizedFilterTempo);
      score += (1 - tempoDiff) * 0.1;
    }

    // Context matching
    if (filters?.contexts && filters.contexts.length > 0) {
      const contextMatch = this.matchContext(track, filters.contexts);
      score += contextMatch * 0.15;
    }

    // Decade matching
    if (filters?.decade) {
      const decadeMatch = this.matchDecade(track, filters.decade);
      score += decadeMatch * 0.1;
    }

    // History weight (simulate personalization)
    if (filters?.historyWeight !== undefined && track.liked) {
      score += filters.historyWeight * 0.2;
    }

    // Add some randomness for variety
    score += (Math.random() - 0.5) * 0.1;

    return Math.max(0, Math.min(1, score));
  }

  private generateReasons(track: Track, mood?: MoodDetection, filters?: SuggestFilters): string[] {
    const reasons: string[] = [];

    if (mood && track.mood.includes(mood.mood)) {
      reasons.push(`Matches your ${mood.mood} mood (${Math.round(mood.confidence * 100)}% confidence)`);
    }

    if (filters?.energy !== undefined) {
      const energyDiff = Math.abs(track.energy - filters.energy);
      if (energyDiff < 0.3) {
        reasons.push(`Perfect energy level match`);
      }
    }

    if (filters?.valence !== undefined) {
      const valenceDiff = Math.abs(track.valence - filters.valence);
      if (valenceDiff < 0.3) {
        reasons.push(`Matches your mood preference`);
      }
    }

    if (track.liked) {
      reasons.push(`You've liked this artist before`);
    }

    if (filters?.contexts && filters.contexts.length > 0) {
      const matchingContexts = filters.contexts.filter(context => 
        this.trackMatchesContext(track, context)
      );
      if (matchingContexts.length > 0) {
        reasons.push(`Great for ${matchingContexts.join(', ').toLowerCase()}`);
      }
    }

    if (track.energy > 0.7) {
      reasons.push(`High energy track`);
    } else if (track.energy < 0.3) {
      reasons.push(`Chill and relaxed`);
    }

    if (track.year >= 2020) {
      reasons.push(`Recent release`);
    }

    // Ensure at least one reason
    if (reasons.length === 0) {
      reasons.push(`Popular in your taste profile`);
    }

    return reasons.slice(0, 3); // Limit to 3 reasons
  }

  private matchContext(track: Track, contexts: string[]): number {
    let matches = 0;
    
    for (const context of contexts) {
      if (this.trackMatchesContext(track, context)) {
        matches++;
      }
    }

    return contexts.length > 0 ? matches / contexts.length : 0;
  }

  private trackMatchesContext(track: Track, context: string): boolean {
    switch (context.toLowerCase()) {
      case 'workout':
        return track.energy > 0.6 && track.tempo > 120;
      case 'focus':
      case 'study':
        return track.energy < 0.5 && !track.explicit;
      case 'chill':
        return track.mood.includes('chill') || track.mood.includes('calm');
      case 'party':
        return track.energy > 0.7 && track.valence > 0.6;
      case 'sleep':
        return track.energy < 0.3 && track.tempo < 100;
      case 'travel':
      case 'commute':
        return track.energy > 0.4 && track.energy < 0.8;
      default:
        return false;
    }
  }

  private matchDecade(track: Track, decade: string): number {
    const trackDecade = Math.floor(track.year / 10) * 10;
    const filterDecade = parseInt(decade.replace('s', ''));
    
    return trackDecade === filterDecade ? 1 : 0;
  }

  async refineResults(
    currentResults: SuggestResult[],
    refinement: 'more_like_this' | 'less_energetic' | 'skip_artist' | 'surprise_me',
    targetTrackId?: string
  ): Promise<SuggestResponse> {
    await new Promise(resolve => setTimeout(resolve, 500));

    let refinedResults = [...currentResults];

    switch (refinement) {
      case 'more_like_this':
        if (targetTrackId) {
          const targetTrack = currentResults.find(r => r.track.id === targetTrackId)?.track;
          if (targetTrack) {
            refinedResults = refinedResults.filter(r => 
              r.track.genre === targetTrack.genre || 
              r.track.artist === targetTrack.artist ||
              Math.abs(r.track.energy - targetTrack.energy) < 0.3
            );
          }
        }
        break;

      case 'less_energetic':
        refinedResults = refinedResults.filter(r => r.track.energy < 0.6);
        break;

      case 'skip_artist':
        if (targetTrackId) {
          const targetTrack = currentResults.find(r => r.track.id === targetTrackId)?.track;
          if (targetTrack) {
            refinedResults = refinedResults.filter(r => r.track.artist !== targetTrack.artist);
          }
        }
        break;

      case 'surprise_me':
        // Shuffle and pick random subset
        refinedResults = refinedResults
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.ceil(refinedResults.length * 0.7));
        break;
    }

    return {
      results: refinedResults,
      totalCount: refinedResults.length,
    };
  }
}
