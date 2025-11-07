'use client';

import { useEffect, useState } from 'react';
import { AutoMoodDetectionService } from '@/lib/services/autoMoodDetection';
import { Loader2 } from 'lucide-react';

/**
 * Auto mood detector component
 * Runs mood detection in background on first page load
 */
export function AutoMoodDetector() {
  const [isDetecting, setIsDetecting] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [detectedMood, setDetectedMood] = useState<string | null>(null);

  useEffect(() => {
    const runAutoDetection = async () => {
      // Check if user has disabled camera for mood
      const useCameraForMood = localStorage.getItem('useCameraForMood');
      const isCameraEnabled = useCameraForMood !== null ? useCameraForMood === 'true' : true; // Default to true
      
      if (!isCameraEnabled) {
        console.log('🚫 Auto mood detection disabled by user setting');
        return;
      }

      const autoMoodService = AutoMoodDetectionService.getInstance();

      // Check if already detected recently
      if (autoMoodService.hasAlreadyDetected()) {
        console.log('✅ Mood already detected recently, skipping auto-detection');
        return;
      }

      // Show notification that we're starting
      setShowNotification(true);
      setIsDetecting(true);

      // Run auto detection
      const result = await autoMoodService.autoDetectMood();

      setIsDetecting(false);

      if (result.success && result.mood) {
        setDetectedMood(result.mood);
        console.log(`✅ Auto-detected mood: ${result.mood}`);
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('moodUpdated', { detail: { mood: result.mood } }));
      } else {
        // Fallback to happy
        setDetectedMood('happy');
        console.log('⚠️ Using default mood: happy');
        
        // Still dispatch event for fallback mood
        window.dispatchEvent(new CustomEvent('moodUpdated', { detail: { mood: 'happy' } }));
      }

      // Hide notification after 3 seconds
      setTimeout(() => {
        setShowNotification(false);
      }, 3000);
    };

    // Run detection after a short delay (to not block initial page load)
    const timer = setTimeout(() => {
      runAutoDetection();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (!showNotification) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div className="bg-card border rounded-lg shadow-lg p-6 space-y-3 animate-in slide-in-from-bottom-5">
        {isDetecting ? (
          <>
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm font-medium">Detecting your mood...</span>
            </div>
            <p className="text-xs text-muted-foreground">
              This helps us recommend better music for you
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-4xl">
                {detectedMood === 'happy' ? '😊' : 
                 detectedMood === 'sad' ? '😢' : 
                 detectedMood === 'angry' ? '😠' : 
                 detectedMood === 'neutral' ? '😐' : 
                 detectedMood === 'fear' ? '😨' : 
                 detectedMood === 'surprise' ? '😲' : 
                 detectedMood === 'disgust' ? '🤢' : '😊'}
              </span>
              <div>
                <h2 className="text-xl font-bold capitalize">
                  Hi, you are looking {detectedMood}!
                </h2>
              </div>
            </div>
            <h3 className="text-base text-muted-foreground">
              Here are some songs for you based on your mood
            </h3>
          </>
        )}
      </div>
    </div>
  );
}
