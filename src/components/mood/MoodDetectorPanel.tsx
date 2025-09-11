'use client';

import * as React from 'react';
import { useState } from 'react';
import { Scan, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CameraPreview } from './CameraPreview';
import { MoodBadge } from './MoodBadge';
import { MoodConfidence } from './MoodConfidence';
import { MoodService, MoodDetection } from '@/lib/services/mood';
import { cn } from '@/lib/utils';

interface MoodDetectorPanelProps {
  onMoodDetected?: (mood: MoodDetection) => void;
  className?: string;
}

/**
 * Complete mood detection panel with camera preview and results
 */
export function MoodDetectorPanel({ onMoodDetected, className }: MoodDetectorPanelProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [lastDetection, setLastDetection] = useState<MoodDetection | null>(null);
  const moodService = MoodService.getInstance();

  const handleDetectMood = async () => {
    if (!cameraActive) {
      setCameraActive(true);
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for camera to "start"
    }

    setIsDetecting(true);
    try {
      const detection = await moodService.detectMood();
      setLastDetection(detection);
      onMoodDetected?.(detection);
    } catch (error) {
      console.error('Mood detection failed:', error);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleCameraToggle = () => {
    setCameraActive(!cameraActive);
    if (cameraActive) {
      setLastDetection(null);
    }
  };

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Scan className="h-5 w-5" />
          <span>Mood Detection</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Camera Preview */}
        <CameraPreview 
          isActive={cameraActive} 
          onToggle={handleCameraToggle}
        />

        {/* Detection Button */}
        <Button
          onClick={handleDetectMood}
          disabled={isDetecting}
          className="w-full"
          variant="spotify"
        >
          {isDetecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Scan className="mr-2 h-4 w-4" />
              Detect Mood
            </>
          )}
        </Button>

        {/* Results */}
        {lastDetection && (
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <MoodBadge mood={lastDetection.mood} size="lg" />
            </div>
            
            <MoodConfidence confidence={lastDetection.confidence} />
            
            <div className="text-center text-sm text-muted-foreground">
              Detected at {lastDetection.timestamp.toLocaleTimeString()}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Make sure your face is clearly visible</p>
          <p>• Look directly at the camera</p>
          <p>• Ensure good lighting for best results</p>
        </div>
      </CardContent>
    </Card>
  );
}
