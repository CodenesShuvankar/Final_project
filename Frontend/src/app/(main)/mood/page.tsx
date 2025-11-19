'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MoodDetectorPanel } from '@/components/mood/MoodDetectorPanelIntegrated';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MultimodalAnalysis } from '@/lib/services/voiceEmotion';
import { MoodAnalysisService } from '@/lib/services/moodAnalysisService';
import { Lightbulb, Settings, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AuthService } from '@/lib/services/auth';

/**
 * Mood detection page with integrated multimodal analysis
 */
export default function MoodPage() {
  const router = useRouter();
  const [currentMood, setCurrentMood] = useState<string | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<MultimodalAnalysis | null>(null);
  const [autoApplyToSuggest, setAutoApplyToSuggest] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const authService = AuthService.getInstance();
      const user = await authService.getUserProfile();
      
      if (!user) {
        router.push('/login?redirect=/mood');
        return;
      }
      
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/login?redirect=/mood');
    } finally {
      setIsChecking(false);
    }
  };

  const handleMoodDetected = async (mood: string, analysis?: MultimodalAnalysis, recommendations?: any[]) => {
    setCurrentMood(mood);
    setCurrentAnalysis(analysis || null);
    
    // Note: Backend now automatically stores mood analysis when authenticated
    // No need for manual storage call here
    console.log('✅ Mood detected:', mood, '- Backend will auto-store if authenticated');
    
    if (autoApplyToSuggest) {
      // Store mood for suggest page (localStorage for quick access)
      const moodData = {
        mood: mood,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('detected_mood', JSON.stringify(moodData));
      if (analysis) {
        localStorage.setItem('mood_analysis', JSON.stringify(analysis));
      }
      
      // Store recommendations if available so main page doesn't refetch
      if (recommendations && recommendations.length > 0) {
        const authService = AuthService.getInstance();
        const user = await authService.getUserProfile();
        const preferences = user?.preferences || {};
        const primaryLanguage = preferences.language_priorities?.[0] || 'English';
        
        localStorage.setItem(`cached_recommendations_${mood}_${primaryLanguage}`, JSON.stringify({
          tracks: recommendations,
          timestamp: Date.now(),
          language: primaryLanguage
        }));
        console.log('💾 Saved', recommendations.length, 'recommendations for mood:', mood, 'in', primaryLanguage);
      }
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('moodUpdated', { detail: { mood } }));
      console.log('🎯 Mood manually detected and event dispatched:', mood);
    }
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Mood Detection</h1>
        <p className="text-muted-foreground">
          Use your camera to detect your current mood and get personalized music recommendations.
        </p>
      </div>

      <div className="space-y-8">
        {/* Mood Detection Panel - Full Width */}
        <MoodDetectorPanel onMoodDetected={handleMoodDetected} />
        
        {/* Settings - Compact */}
        <div className="max-w-md">
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

        {/* Quick Actions - Compact */}
        <div className="max-w-md">
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
                  localStorage.removeItem('mood_analysis');
                  setCurrentMood(null);
                  setCurrentAnalysis(null);
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📸</span>
              </div>
              <h3 className="font-medium mb-2">1. Camera Detection</h3>
              <p className="text-sm text-muted-foreground">
                AI analyzes your facial expressions
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🎤</span>
              </div>
              <h3 className="font-medium mb-2">2. Voice Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Records and analyzes your voice tone
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="font-medium mb-2">3. Emotion Fusion</h3>
              <p className="text-sm text-muted-foreground">
                Combines both sources for accuracy
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🎵</span>
              </div>
              <h3 className="font-medium mb-2">4. Music Matching</h3>
              <p className="text-sm text-muted-foreground">
                Personalized recommendations instantly
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
