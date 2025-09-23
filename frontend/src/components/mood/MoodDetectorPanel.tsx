'use client';

import * as React from 'react';
import { useState } from 'react';
import { Scan, Loader2, Mic, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CameraPreview } from './CameraPreview';
import { VoiceRecorderWAV } from './VoiceRecorderWAV';
import { MoodBadge } from './MoodBadge';
import { MoodConfidence } from './MoodConfidence';
import { MoodService, MoodDetection, mapVoiceEmotionToMood } from '@/lib/services/mood';
import { VoiceEmotionService, VoiceEmotionResult } from '@/lib/services/voiceEmotion';
import { MusicRecommendations } from '@/components/music/MusicRecommendations';
import { MusicPlayer } from '@/components/music/MusicPlayer';
import { SpotifyTrack, SpotifyMusicService } from '@/lib/services/spotify';
import { cn } from '@/lib/utils';

interface MoodDetectorPanelProps {
  onMoodDetected?: (mood: MoodDetection) => void;
  className?: string;
}

/**
 * Complete mood detection panel with camera preview, voice recording, and multimodal results
 */
export function MoodDetectorPanel({ onMoodDetected, className }: MoodDetectorPanelProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isAnalyzingVoice, setIsAnalyzingVoice] = useState(false);
  const [lastDetection, setLastDetection] = useState<MoodDetection | null>(null);
  const [lastVoiceDetection, setLastVoiceDetection] = useState<VoiceEmotionResult | null>(null);
  const [activeTab, setActiveTab] = useState('camera');
  
  // Music integration state
  const [currentTracks, setCurrentTracks] = useState<SpotifyTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [detectedMoodForMusic, setDetectedMoodForMusic] = useState<string | null>(null);
  const [isLoadingMusic, setIsLoadingMusic] = useState(false);
  
  const moodService = MoodService.getInstance();
  const voiceService = VoiceEmotionService.getInstance();

  const handleDetectMood = async () => {
    console.log('📸 handleDetectMood triggered');
    if (!cameraActive) {
      console.log('📸 Camera not active, activating...');
      setCameraActive(true);
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for camera to "start"
    }

    console.log('📸 Setting isDetecting to true');
    setIsDetecting(true);
    try {
      console.log('📸 Calling moodService.detectMood...');
      const detection = await moodService.detectMood();
      console.log('📸 Mood detection result:', detection);
      setLastDetection(detection);
      
      // Update mood for music recommendations
      console.log('📷 MoodDetectorPanel: Camera mood detected:', detection.mood);
      setIsLoadingMusic(true);
      setDetectedMoodForMusic(detection.mood);
      onMoodDetected?.(detection);
      
      // Reset loading state after a delay (MusicRecommendations will handle its own loading)
      setTimeout(() => setIsLoadingMusic(false), 500);
    } catch (error) {
      console.error('📸 Mood detection failed:', error);
    } finally {
      console.log('📸 Setting isDetecting to false');
      setIsDetecting(false);
    }
  };

  const handleCameraToggle = () => {
    setCameraActive(!cameraActive);
    if (cameraActive) {
      setLastDetection(null);
    }
  };

  const handleVoiceAnalysis = async (audioBlob: Blob) => {
    console.log('🎯 MoodDetectorPanel: handleVoiceAnalysis called with audio blob:', audioBlob.size, 'bytes');
    console.log('🎯 MoodDetectorPanel: audioBlob type:', audioBlob.type);
    console.log('🎯 MoodDetectorPanel: Setting isAnalyzingVoice to true');
    setIsAnalyzingVoice(true);
    try {
      console.log('🔄 MoodDetectorPanel: Calling voiceService.analyzeVoiceEmotion...');
      const result = await voiceService.analyzeVoiceEmotion(audioBlob);
      console.log('📨 MoodDetectorPanel: Received result:', result);
      
      if (result.success && result.prediction) {
        setLastVoiceDetection(result.prediction);
        
        // Convert voice emotion to mood detection format and notify parent
        const mappedMood = mapVoiceEmotionToMood(result.prediction.emotion);
        const moodDetection: MoodDetection = {
          mood: mappedMood,
          confidence: result.prediction.confidence,
          timestamp: new Date(),
          source: 'voice'
        };
        
        console.log('✅ MoodDetectorPanel: Voice emotion detected:', result.prediction.emotion, '→', mappedMood);
        
        // Update mood for music recommendations
        setIsLoadingMusic(true);
        setDetectedMoodForMusic(mappedMood);
        onMoodDetected?.(moodDetection);
        
        // Reset loading state after a delay (MusicRecommendations will handle its own loading)
        setTimeout(() => setIsLoadingMusic(false), 500);
      } else {
        console.error('❌ MoodDetectorPanel: Voice analysis failed:', result.error);
      }
    } catch (error) {
      console.error('💥 MoodDetectorPanel: Voice analysis error:', error);
    } finally {
      setIsAnalyzingVoice(false);
    }
  };

  const getCombinedMood = () => {
    if (lastDetection && lastVoiceDetection) {
      // Simple combination: average confidence if moods match, otherwise use higher confidence
      if (lastDetection.mood === lastVoiceDetection.emotion) {
        return {
          mood: lastDetection.mood,
          confidence: (lastDetection.confidence + lastVoiceDetection.confidence) / 2,
          source: 'multimodal' as const
        };
      } else {
        return lastDetection.confidence > lastVoiceDetection.confidence 
          ? { ...lastDetection, source: 'camera' as const }
          : { mood: mapVoiceEmotionToMood(lastVoiceDetection.emotion), confidence: lastVoiceDetection.confidence, source: 'voice' as const };
      }
    }
    return null;
  };

  // Music handlers
  const handleTrackSelect = (track: SpotifyTrack, allTracks: SpotifyTrack[]) => {
    setCurrentTracks(allTracks);
    const trackIndex = allTracks.findIndex(t => t.id === track.id);
    setCurrentTrackIndex(trackIndex >= 0 ? trackIndex : 0);
  };

  const handleTrackChange = (index: number) => {
    setCurrentTrackIndex(index);
  };

  const handleMusicLoadingChange = (loading: boolean) => {
    setIsLoadingMusic(loading);
  };

  const combinedMood = getCombinedMood();

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Scan className="h-5 w-5" />
          <span>Multimodal Mood Detection</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Detection Method Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="camera" className="flex items-center space-x-2">
              <Video className="h-4 w-4" />
              <span>Camera</span>
            </TabsTrigger>
            <TabsTrigger value="voice" className="flex items-center space-x-2">
              <Mic className="h-4 w-4" />
              <span>Voice</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="camera" className="space-y-4">
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
                  Analyzing Face...
                </>
              ) : (
                <>
                  <Scan className="mr-2 h-4 w-4" />
                  Detect Face Mood
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="voice" className="space-y-4">
            <VoiceRecorderWAV
              onAudioRecorded={handleVoiceAnalysis}
              isAnalyzing={isAnalyzingVoice}
            />
          </TabsContent>
        </Tabs>

        {/* Combined Results */}
        {combinedMood && (
          <div className="space-y-4 p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {combinedMood.source === 'multimodal' ? '🤖 Multimodal Result' : 
                   combinedMood.source === 'camera' ? '📷 Camera Result' : '🎙️ Voice Result'}
                </span>
              </div>
              <MoodBadge mood={combinedMood.mood} size="lg" />
            </div>
            
            <MoodConfidence confidence={combinedMood.confidence} />
            
            {combinedMood.source === 'multimodal' && (
              <div className="text-center text-xs text-muted-foreground">
                Combined from camera and voice analysis
              </div>
            )}
          </div>
        )}

        {/* Individual Results */}
        {(lastDetection || lastVoiceDetection) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lastDetection && (
              <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Camera</div>
                  <MoodBadge mood={lastDetection.mood} size="sm" />
                  <div className="text-xs text-muted-foreground mt-1">
                    {(lastDetection.confidence * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            )}
            
            {lastVoiceDetection && (
              <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Voice</div>
                  <MoodBadge mood={mapVoiceEmotionToMood(lastVoiceDetection.emotion)} size="sm" />
                  <div className="text-xs text-muted-foreground mt-1">
                    {(lastVoiceDetection.confidence * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Music Integration */}
        {(detectedMoodForMusic || isLoadingMusic) && (
          <div className="space-y-4 mt-6">
            {/* Music Loading Indicator */}
            {isLoadingMusic && (
              <div className="text-center py-4">
                <div className="flex items-center justify-center space-x-2 text-primary">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm font-medium">Getting music recommendations...</span>
                </div>
              </div>
            )}
            
            <div className="space-y-6">
              {detectedMoodForMusic && (
                <div className="w-full">
                  <MusicRecommendations
                    key={detectedMoodForMusic}
                    detectedMood={detectedMoodForMusic}
                    onTrackSelect={handleTrackSelect}
                    className="w-full"
                  />
                </div>
              )}
              {currentTracks.length > 0 && (
                <div className="w-full max-w-2xl mx-auto">
                  <MusicPlayer
                    tracks={currentTracks}
                    currentTrackIndex={currentTrackIndex}
                    onTrackChange={handleTrackChange}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Make sure your face is clearly visible or speak clearly for voice detection</p>
          <p>• Look directly at the camera or record at least 3-5 seconds of voice</p>
          <p>• Ensure good lighting/audio quality for best results</p>
          <p>• Music recommendations will appear automatically after mood detection</p>
        </div>
      </CardContent>
    </Card>
  );
}
