'use client';

import { useEffect, useState } from 'react';
import { AutoMoodDetectionService } from '@/lib/services/autoMoodDetection';
import { supabase } from '@/lib/supabaseClient';
import { Loader2 } from 'lucide-react';

/**
 * Auto mood detector component
 * 
 * Automatically detects user mood in the background using the same detection logic
 * as MoodDetectorPanelMediaPipe (MediaPipe + 5-second video recording).
 * 
 * Runs mood detection:
 * - Once after login (with 3 second delay, checks for fresh mood data first)
 * - Every 30 minutes automatically
 * - Only when user is authenticated
 * - Only when camera is enabled in user settings
 * 
 * Features:
 * - Silent background recording (5 seconds)
 * - Shows minimal notification during detection
 * - Automatically gets music recommendations for detected mood
 * - Dispatches events for other components to react to mood changes
 * - Stores mood data and recommendations in localStorage
 */

// Global flags to prevent duplicate detection runs (persists across React remounts)
let globalIsRunning = false;
let globalInitialTimer: NodeJS.Timeout | null = null;

export function AutoMoodDetector() {
  const [isDetecting, setIsDetecting] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [detectedMood, setDetectedMood] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    // Check authentication status
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const authed = !!session?.user;
      setIsAuthenticated(authed);
      return authed;
    };

    // Run mood detection
    const runAutoDetection = async (isScheduled: boolean = false) => {
      // Prevent duplicate runs using global flag
      if (globalIsRunning) {
        return;
      }
      
      // Check authentication first
      const authed = await checkAuth();
      if (!authed) {
        console.log('🚫 Auto mood detection skipped - user not authenticated');
        return;
      }

      // Check if user has disabled camera for mood
      const useCameraForMood = localStorage.getItem('useCameraForMood');
      const isCameraEnabled = useCameraForMood !== null ? useCameraForMood === 'true' : true;
      
      if (!isCameraEnabled) {
        console.log('🚫 Auto mood detection disabled by user setting');
        return;
      }

      const autoMoodService = AutoMoodDetectionService.getInstance();

      // Check cooldown (but allow scheduled detections)
      if (!isScheduled && autoMoodService.hasAlreadyDetected()) {
        const lastDetection = localStorage.getItem('auto_mood_last_detection');
        if (lastDetection) {
          const elapsed = Math.floor((Date.now() - Number(lastDetection)) / 60000);
          console.log('⏸️ Mood already detected recently (', elapsed, 'minutes ago), skipping');
        }
        return;
      }

     

      // Set global flag to prevent duplicate runs
      globalIsRunning = true;

      // Show notification
      setShowNotification(true);
      setIsDetecting(true);
      

      console.log(`🎯 Starting auto mood detection (scheduled: ${isScheduled})...`);

      try {
        // Add minimum display time for notification (3 seconds)
        const [result] = await Promise.all([
          autoMoodService.autoDetectMood(),
          new Promise(resolve => setTimeout(resolve, 3000))
        ]);

        console.log('📊 Detection result:', result);
        setIsDetecting(false);

        if (result.success && result.mood) {
          setDetectedMood(result.mood);
          
          console.log(`✅ Auto-detected mood: ${result.mood} (confidence: ${result.confidence})`);
          console.log('🔔 Updating notification with detected mood');
          
          // Store recommendations if available
          if (result.recommendations && result.recommendations.length > 0) {
            setRecommendations(result.recommendations);
            console.log(`🎵 Received ${result.recommendations.length} music recommendations`);
          }
          
          // Note: Backend automatically stores mood analysis when user is authenticated
          console.log('📝 Mood auto-stored by backend if authenticated');
          
          // Dispatch custom event to notify other components (including music player)
          window.dispatchEvent(new CustomEvent('moodUpdated', { 
            detail: { 
              mood: result.mood,
              recommendations: result.recommendations || []
            } 
          }));
          
          // Also dispatch event specifically for new recommendations
          if (result.recommendations && result.recommendations.length > 0) {
            window.dispatchEvent(new CustomEvent('newMoodRecommendations', {
              detail: {
                mood: result.mood,
                tracks: result.recommendations
              }
            }));
            console.log('🎵 Dispatched newMoodRecommendations event');
          }
          
          // Hide notification after 8 seconds
          setTimeout(() => {
            console.log('🔕 Hiding auto mood detection notification');
            setShowNotification(false);
          }, 8000);
        } else {
          // Detection failed (TEST CASE 3: Both camera and mic unavailable)
          console.error('❌ Auto mood detection failed');
          console.error('Detection result:', result);
          
          if (result.error) {
            console.error('Error message:', result.error);
            setErrorMessage(result.error);
          } else {
            setErrorMessage('Mood detection failed. Please check camera/microphone permissions.');
          }
          
          setDetectedMood('error');
          
          // Show error notification for 10 seconds
          setTimeout(() => {
            console.log('🔕 Hiding error notification');
            setShowNotification(false);
            setErrorMessage(null);
          }, 10000);
        }
      } catch (error) {
        console.error('❌ Detection error:', error);
        setIsDetecting(false);
        setDetectedMood('error');
        setShowNotification(false);
      } finally {
        // Ensure global flag is always reset
        globalIsRunning = false;
      }
    };

    // SINGLE detection trigger on component mount (only if timer doesn't exist)
    if (!globalInitialTimer) {
      globalInitialTimer = setTimeout(async () => {
        console.log('🎯 Component mounted - checking if auto mood detection should run...');
        
        // Check authentication first
        const authed = await checkAuth();
        if (!authed) {
          console.log('🚫 Not authenticated, skipping auto mood detection');
          globalInitialTimer = null;
          return;
        }
        
        // Check if we have recent mood data (less than 15 minutes old)
        const storedMood = localStorage.getItem('detected_mood');
        if (storedMood) {
          try {
            const moodData = JSON.parse(storedMood);
            if (moodData && moodData.timestamp) {
              const moodTimestamp = new Date(moodData.timestamp).getTime();
              const age = Date.now() - moodTimestamp;
              
              if (age < 15 * 60 * 1000) {
                console.log('✅ Fresh mood data exists (', Math.floor(age / 60000), 'min old), skipping detection');
                globalInitialTimer = null;
                return;
              } else {
                console.log('⏰ Mood data is stale (', Math.floor(age / 60000), 'min old), running detection');
              }
            }
          } catch (error) {
            console.error('Failed to parse stored mood:', error);
            localStorage.removeItem('detected_mood');
          }
        } else {
          console.log('📭 No mood data found, running initial detection');
        }
        
        // Run detection (scheduled=true to bypass cooldown)
        runAutoDetection(true);
        
        // Clear global timer reference after execution
        globalInitialTimer = null;
      }, 3000); // 3 second delay after page load
    } else {
      console.log('⏸️ Initial timer already set, skipping duplicate');
    }
    
    // Set up 30-minute interval for authenticated users
    checkAuth().then((authed) => {
      if (authed) {
        intervalId = setInterval(() => {
          console.log('⏰ 30-minute interval reached - running auto mood detection');
          runAutoDetection(true);
        }, 30 * 60 * 1000);
      }
    });

    // Listen for auth state changes (for new logins/logouts only)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      const authed = !!session?.user;
      setIsAuthenticated(authed);

      if (event === 'SIGNED_IN' && authed) {
        console.log('🔐 User just signed in (new login event)');
        // Initial detection is handled by timer above, just set up interval
        if (!intervalId) {
          intervalId = setInterval(() => {
            console.log('⏰ 30-minute interval reached - running auto mood detection');
            runAutoDetection(true);
          }, 30 * 60 * 1000);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('🔓 User signed out - stopping auto mood detection');
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    });

    // Cleanup
    return () => {
      if (globalInitialTimer) {
        clearTimeout(globalInitialTimer);
        globalInitialTimer = null;
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
      subscription.unsubscribe();
    };
  }, []);

  if (!showNotification || !isAuthenticated) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-in slide-in-from-bottom-5">
      <div className="bg-card border-2 border-primary/20 rounded-lg shadow-2xl p-6 space-y-3 backdrop-blur-sm">
        {isDetecting ? (
          <>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <div className="absolute inset-0 h-6 w-6 animate-ping opacity-30 rounded-full bg-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Analyzing your mood...</p>
                <p className="text-xs text-muted-foreground">Recording video (5s) + analyzing emotions</p>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div className="bg-primary h-full animate-pulse" style={{ width: '70%' }} />
            </div>
          </>
        ) : detectedMood === 'error' ? (
          <>
            <div className="flex items-center space-x-3 mb-2">
              <div className="text-5xl">⚠️</div>
              <div>
                <h2 className="text-xl font-bold text-destructive">
                  Detection Failed
                </h2>
                <p className="text-xs text-muted-foreground">Unable to run auto mood detection</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {errorMessage || 'Please allow camera and microphone access in your browser settings to use auto mood detection.'}
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center space-x-3 mb-2">
              <div className="text-5xl animate-bounce">
                {detectedMood === 'happy' ? '😊' : 
                 detectedMood === 'sad' ? '😢' : 
                 detectedMood === 'angry' ? '😠' : 
                 detectedMood === 'neutral' ? '😐' : 
                 detectedMood === 'fear' ? '😨' : 
                 detectedMood === 'surprise' ? '😲' : 
                 detectedMood === 'disgust' ? '🤢' : '😊'}
              </div>
              <div>
                <h2 className="text-xl font-bold capitalize">
                  You seem {detectedMood}!
                </h2>
                <p className="text-xs text-muted-foreground">Mood detected automatically</p>
              </div>
            </div>
            {recommendations.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                🎵 Found {recommendations.length} perfect songs for your mood!
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                🎵 Finding perfect songs for your mood...
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
