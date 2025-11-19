'use client';

import { useEffect, useState } from 'react';
import { AutoMoodDetectionService } from '@/lib/services/autoMoodDetection';
import { MoodAnalysisService } from '@/lib/services/moodAnalysisService';
import { supabase } from '@/lib/supabaseClient';
import { Loader2 } from 'lucide-react';

/**
 * Auto mood detector component
 * Runs mood detection:
 * - On first login/page load
 * - Every 30 minutes automatically
 * - Only when user is authenticated
 */
export function AutoMoodDetector() {
  const [isDetecting, setIsDetecting] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [detectedMood, setDetectedMood] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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

      // Check cooldown (but allow initial page load and scheduled detections)
      if (!isScheduled && autoMoodService.hasAlreadyDetected()) {
        const lastDetection = localStorage.getItem('auto_mood_last_detection');
        if (lastDetection) {
          const elapsed = Math.floor((Date.now() - Number(lastDetection)) / 60000);
          console.log('⏸️ Mood already detected recently (', elapsed, 'minutes ago), skipping');
        }
        return;
      }

      console.log('🚀 Cooldown passed or scheduled detection, proceeding...');

      // Show notification
      setShowNotification(true);
      setIsDetecting(true);
      console.log('🔔 Showing auto mood detection notification');

      console.log(`🎯 Starting auto mood detection (scheduled: ${isScheduled})...`);

      // Add minimum display time for notification (2 seconds)
      const [result] = await Promise.all([
        autoMoodService.autoDetectMood(),
        new Promise(resolve => setTimeout(resolve, 2000))
      ]);

      setIsDetecting(false);

      if (result.success && result.mood) {
        setDetectedMood(result.mood);
        console.log(`✅ Auto-detected mood: ${result.mood} (confidence: ${result.confidence})`);
        console.log('🔔 Updating notification with detected mood');
        
        // Note: Backend automatically stores mood analysis when user is authenticated
        // The detection API call includes auth token and stores results server-side
        console.log('📝 Mood auto-stored by backend if authenticated');
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('moodUpdated', { detail: { mood: result.mood } }));
      } else {
        // Fallback to happy
        setDetectedMood('happy');
        console.log('⚠️ Auto detection failed, using default mood: happy');
        
        // Still dispatch event for fallback mood
        window.dispatchEvent(new CustomEvent('moodUpdated', { detail: { mood: 'happy' } }));
      }

      // Hide notification after 8 seconds (give user time to see it)
      setTimeout(() => {
        console.log('🔕 Hiding auto mood detection notification');
        setShowNotification(false);
      }, 8000);
    };

    // Initial detection on page load (with delay)
    const initialTimer = setTimeout(async () => {
      console.log('🎯 Initial page load - checking if auto mood detection should run...');
      
      // Check authentication first
      const authed = await checkAuth();
      if (!authed) {
        console.log('🚫 Not authenticated, skipping initial auto mood detection');
        return;
      }
      
      // For initial page load, check if we have recent mood data
      const storedMood = localStorage.getItem('detected_mood');
      if (storedMood) {
        try {
          // Try to parse as JSON object first
          let moodData;
          try {
            moodData = JSON.parse(storedMood);
          } catch {
            // If parsing fails, it's an old string format - clear it
            console.log('🧹 Clearing old mood format from localStorage');
            localStorage.removeItem('detected_mood');
            moodData = null;
          }
          
          if (moodData && moodData.timestamp) {
            const moodTimestamp = new Date(moodData.timestamp).getTime();
            const age = Date.now() - moodTimestamp;
            
            // If mood is less than 15 minutes old, skip detection
            if (age < 29 * 60 * 1000) {
              console.log('✅ Fresh mood data exists (', Math.floor(age / 60000), 'min old), skipping initial detection');
              return;
            } else {
              console.log('⏰ Mood data is stale (', Math.floor(age / 60000), 'min old), running detection');
            }
          }
        } catch (error) {
          console.error('Failed to parse stored mood:', error);
          localStorage.removeItem('detected_mood'); // Clear corrupted data
        }
      } else {
        console.log('📭 No mood data found, running initial detection');
      }
      
      // Run detection (scheduled=true to bypass cooldown)
      runAutoDetection(true);
    }, 3000);
    
    // Set up automatic mood detection every 30 minutes
    checkAuth().then((authed) => {
      if (authed) {
        intervalId = setInterval(() => {
          console.log('⏰ 30-minute interval reached - running auto mood detection');
          runAutoDetection(true);
        }, 30 * 60 * 1000); // Every 30 minutes
      }
    });

    // Listen for auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      const authed = !!session?.user;
      setIsAuthenticated(authed);

      if (event === 'SIGNED_IN' && authed) {
        console.log('🔐 User signed in - triggering auto mood detection');
        // Run detection after sign in (with small delay)
        setTimeout(() => {
          runAutoDetection(false);
        }, 2000);

        // Set up 30-minute interval if not already running
        if (!intervalId) {
          intervalId = setInterval(() => {
            console.log('⏰ 30-minute interval reached - running auto mood detection');
            runAutoDetection(true);
          }, 30 * 60 * 1000); // Every 30 minutes
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
      clearTimeout(initialTimer);
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
                <p className="text-sm font-semibold">Detecting your mood...</p>
                <p className="text-xs text-muted-foreground">Analyzing your current state</p>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div className="bg-primary h-full animate-pulse" style={{ width: '70%' }} />
            </div>
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
            <p className="text-sm text-muted-foreground">
              🎵 Finding perfect songs for your mood...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
