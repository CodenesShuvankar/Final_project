'use client';

import * as React from 'react';
import { useState } from 'react';
import { MoodDetectorPanel } from '@/components/mood/MoodDetectorPanel';
import { SongCard } from '@/components/music/SongCard';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MoodDetection } from '@/lib/services/mood';
import { mockTracks } from '@/lib/mockData';
import { usePlayerStore } from '@/lib/store/playerStore';
import { Lightbulb, Settings } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * Mood detection page with camera preview and mood-based recommendations
 */
export default function MoodPage() {
  const [currentMood, setCurrentMood] = useState<MoodDetection | null>(null);
  const [autoApplyToSuggest, setAutoApplyToSuggest] = useState(true);
  const { playerService } = usePlayerStore();

  const handleMoodDetected = (mood: MoodDetection) => {
    setCurrentMood(mood);
    
    if (autoApplyToSuggest) {
      // Store mood for suggest page (in real app, this would be in global state)
      localStorage.setItem('detected_mood', JSON.stringify(mood));
    }
  };

  const handlePlayTrack = (track: typeof mockTracks[0]) => {
    playerService.playTrack(track, mockTracks);
  };

  // Get mood-based recommendations
  const getMoodRecommendations = () => {
    if (!currentMood) return [];
    
    return mockTracks.filter(track => 
      track.mood.includes(currentMood.mood)
    ).slice(0, 6);
  };

  const recommendations = getMoodRecommendations();

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Mood Detection</h1>
        <p className="text-muted-foreground">
          Use your camera to detect your current mood and get personalized music recommendations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Mood Detection Panel */}
        <div className="space-y-6">
          <MoodDetectorPanel onMoodDetected={handleMoodDetected} />
          
          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Auto-apply to Suggest page</p>
                  <p className="text-xs text-muted-foreground">
                    Automatically use detected mood for suggestions
                  </p>
                </div>
                <Switch
                  checked={autoApplyToSuggest}
                  onCheckedChange={setAutoApplyToSuggest}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recommendations */}
        <div className="space-y-6">
          {currentMood ? (
            <Card>
              <CardHeader>
                <CardTitle>Recommended for your mood</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Based on your detected {currentMood.mood} mood
                </p>
              </CardHeader>
              <CardContent>
                {recommendations.length > 0 ? (
                  <div className="space-y-3">
                    {recommendations.map((track) => (
                      <SongCard
                        key={track.id}
                        track={track}
                        onPlay={() => handlePlayTrack(track)}
                        showArtist
                        compact
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      No recommendations found for your current mood.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Detect your mood first</h3>
                <p className="text-muted-foreground mb-4">
                  Use the camera to detect your current mood and get personalized recommendations.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/suggest">
                  <Lightbulb className="mr-2 h-4 w-4" />
                  Go to Suggest Page
                </Link>
              </Button>
              
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => {
                  // Clear stored mood
                  localStorage.removeItem('detected_mood');
                  setCurrentMood(null);
                }}
              >
                Clear Detected Mood
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Info Section */}
      <Card>
        <CardHeader>
          <CardTitle>How it works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📸</span>
              </div>
              <h3 className="font-medium mb-2">1. Camera Detection</h3>
              <p className="text-sm text-muted-foreground">
                Our AI analyzes your facial expressions through your camera
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🧠</span>
              </div>
              <h3 className="font-medium mb-2">2. Mood Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Advanced algorithms determine your current emotional state
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🎵</span>
              </div>
              <h3 className="font-medium mb-2">3. Music Matching</h3>
              <p className="text-sm text-muted-foreground">
                Get personalized song recommendations that match your mood
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
