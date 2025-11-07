'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SuggestControls } from '@/components/suggest/SuggestControls';
import { SuggestResultsGrid } from '@/components/suggest/SuggestResultsGrid';
import { RefinementBar } from '@/components/suggest/RefinementBar';
import { SuggestService, SuggestFilters, SuggestResult } from '@/lib/services/suggest';
import { MoodDetection } from '@/lib/services/mood';

/**
 * Suggest page with mood-based and preference-based recommendations
 */
export default function SuggestPage() {
  const [filters, setFilters] = useState<SuggestFilters>({
    energy: 0.5,
    tempo: 120,
    valence: 0.5,
    decade: '',
    languages: ['English'],
    contexts: [],
    historyWeight: 0.7,
  });
  
  const [mood, setMood] = useState<MoodDetection | undefined>();
  const [results, setResults] = useState<SuggestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string>();

  const suggestService = SuggestService.getInstance();

  // Load stored mood on mount
  useEffect(() => {
    const storedMood = localStorage.getItem('detected_mood');
    if (storedMood) {
      try {
        const parsedMood = JSON.parse(storedMood);
        setMood({
          ...parsedMood,
          timestamp: new Date(parsedMood.timestamp),
        });
        console.log('[SuggestPage] Loaded stored mood from localStorage:', parsedMood);
      } catch (error) {
        console.error('Failed to parse stored mood:', error);
      }
    } else {
      console.log('[SuggestPage] No stored mood found in localStorage');
    }
  }, []);

  const handleGenerateSuggestions = async () => {
    console.log('[SuggestPage] Generating suggestions with mood:', mood?.mood || 'none');
    setLoading(true);
    try {
      const response = await suggestService.getSuggestions({
        mood,
        filters,
      });
      setResults(response.results);
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async (
    type: 'more_like_this' | 'less_energetic' | 'skip_artist' | 'surprise_me',
    trackId?: string
  ) => {
    if (results.length === 0) return;

    setLoading(true);
    try {
      const response = await suggestService.refineResults(results, type, trackId);
      setResults(response.results);
      setSelectedTrackId(undefined);
    } catch (error) {
      console.error('Failed to refine suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = () => {
    // TODO: Implement playlist creation
    console.log('Create playlist from suggestions');
  };

  return (
    <div className="p-6">
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold">Suggest</h1>
        <p className="text-muted-foreground">
          Get personalized music recommendations based on your mood, preferences, and listening history.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Controls Panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            <SuggestControls
              filters={filters}
              onFiltersChange={setFilters}
              mood={mood}
              onMoodChange={setMood}
            />

            <Button
              onClick={handleGenerateSuggestions}
              disabled={loading}
              className="w-full"
              variant="spotify"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Generate Suggestions
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-3 space-y-6">
          <SuggestResultsGrid
            results={results}
            loading={loading}
            onCreatePlaylist={handleCreatePlaylist}
          />

          {results.length > 0 && (
            <RefinementBar
              onRefine={handleRefine}
              selectedTrackId={selectedTrackId}
            />
          )}
        </div>
      </div>

      {/* Getting Started Guide */}
      {results.length === 0 && !loading && (
        <div className="mt-12 max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-4">How to get started</h2>
            <p className="text-muted-foreground">
              Follow these steps to get personalized music recommendations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 rounded-lg border">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎭</span>
              </div>
              <h3 className="font-semibold mb-2">1. Set Your Mood</h3>
              <p className="text-sm text-muted-foreground">
                Use the camera to detect your mood or manually select your current context
              </p>
            </div>

            <div className="text-center p-6 rounded-lg border">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎛️</span>
              </div>
              <h3 className="font-semibold mb-2">2. Adjust Preferences</h3>
              <p className="text-sm text-muted-foreground">
                Fine-tune energy, tempo, and other musical characteristics
              </p>
            </div>

            <div className="text-center p-6 rounded-lg border">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✨</span>
              </div>
              <h3 className="font-semibold mb-2">3. Generate & Refine</h3>
              <p className="text-sm text-muted-foreground">
                Get suggestions and use refinement options to perfect your playlist
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
