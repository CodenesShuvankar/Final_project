'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Scan, Loader2, Mic, Video, Camera as CameraIcon, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { VoiceEmotionService, MultimodalAnalysis } from '@/lib/services/voiceEmotion';
import { MusicRecommendations } from '@/components/music/MusicRecommendations';
import { MusicPlayer } from '@/components/music/MusicPlayer';
import { SpotifyTrack } from '@/lib/services/spotify';
import { cn } from '@/lib/utils';

interface MoodDetectorPanelProps {
  onMoodDetected?: (mood: string, analysis?: MultimodalAnalysis, recommendations?: any[]) => void;
  className?: string;
  autoDetect?: boolean; // For homepage auto-detection
}

/**
 * Integrated mood detection panel with multimodal analysis
 */
export function MoodDetectorPanel({ onMoodDetected, className, autoDetect = false }: MoodDetectorPanelProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionProgress, setDetectionProgress] = useState(0);
  const [analysis, setAnalysis] = useState<MultimodalAnalysis | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [hasMicrophone, setHasMicrophone] = useState<boolean | null>(null);
  
  // Music player state
  const [currentTracks, setCurrentTracks] = useState<SpotifyTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  
  // Preview state
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [capturedAudioUrl, setCapturedAudioUrl] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cameraActiveRef = useRef<boolean>(false); // Track camera state with ref
  
  const voiceService = VoiceEmotionService.getInstance();

  // Check device availability on mount
  useEffect(() => {
    const checkDevices = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
          setHasCamera(false);
          setHasMicrophone(false);
          setError('Media devices not supported in this browser');
          return;
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        const audioDevices = devices.filter(device => device.kind === 'audioinput');
        
        setHasCamera(videoDevices.length > 0);
        setHasMicrophone(audioDevices.length > 0);
        
        if (videoDevices.length === 0 && audioDevices.length === 0) {
          setError('No camera or microphone detected. Voice-only mode will use a default neutral emotion.');
        } else if (videoDevices.length === 0) {
          console.log('⚠️ No camera detected - will use voice-only analysis');
        } else if (audioDevices.length === 0) {
          setError('No microphone detected. Please connect a microphone for mood detection.');
        }
      } catch (err) {
        console.error('Failed to check devices:', err);
        setHasCamera(null);
        setHasMicrophone(null);
      }
    };

    checkDevices();
  }, []);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      if (capturedImageUrl) URL.revokeObjectURL(capturedImageUrl);
      if (capturedAudioUrl) URL.revokeObjectURL(capturedAudioUrl);
    };
  }, [capturedImageUrl, capturedAudioUrl]);

  // Cleanup camera when component unmounts or navigates away
  useEffect(() => {
    // Handle visibility change (tab switching, navigation)
    const handleVisibilityChange = () => {
      if (document.hidden && cameraActiveRef.current) {
        console.log('Page hidden, stopping camera...');
        stopCamera();
      }
    };

    // Handle page navigation (beforeunload)
    const handleBeforeUnload = () => {
      if (cameraActiveRef.current) {
        stopCamera();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // Stop camera stream on unmount only if it's active
      if (cameraActiveRef.current) {
        console.log('Component unmounting, stopping camera...');
        stopCamera();
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []); // Empty dependency array - only run on mount/unmount

  // Start camera preview
  const startCamera = async () => {
    if (hasCamera === false) {
      setError('No camera detected on this device. Voice-only analysis will be used.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: false
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setCameraActive(true);
      cameraActiveRef.current = true; // Update ref
      setPermissionDenied(false);
      setError(null);
    } catch (err) {
      console.error('Camera access error:', err);
      setPermissionDenied(true);
      
      if (err instanceof Error && err.name === 'NotFoundError') {
        setError('No camera found on this device. Voice-only analysis will be used.');
        setHasCamera(false);
      } else if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access to detect mood.');
      } else {
        setError('Failed to access camera. Voice-only analysis will be used.');
      }
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    cameraActiveRef.current = false; // Update ref
  };

  // Capture image from video
  const captureImage = async (): Promise<Blob | null> => {
    // If no camera, create a placeholder image
    if (hasCamera === false || !videoRef.current || !cameraActive) {
      console.log('⚠️ No camera available, creating placeholder image');
      
      // Create a blank canvas as placeholder
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Draw a simple placeholder
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No Camera Available', canvas.width / 2, canvas.height / 2);
      }
      
      return new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          const imageBlob = blob || new Blob();
          const imageUrl = URL.createObjectURL(imageBlob);
          setCapturedImageUrl(imageUrl);
          resolve(imageBlob);
        }, 'image/jpeg', 0.95);
      });
    }
    
    if (!canvasRef.current) return null;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.drawImage(video, 0, 0);
    
    return new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        const imageBlob = blob || new Blob();
        
        // Create preview URL
        const imageUrl = URL.createObjectURL(imageBlob);
        setCapturedImageUrl(imageUrl);
        
        resolve(imageBlob);
      }, 'image/jpeg', 0.95);
    });
  };

  // Convert audio blob to WAV format using Web Audio API
  const convertToWav = async (audioBlob: Blob): Promise<Blob> => {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Get audio data
    const channelData = audioBuffer.getChannelData(0); // Mono
    const samples = channelData.length;
    const sampleRate = audioBuffer.sampleRate;
    
    // Create WAV file
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // PCM format
    view.setUint16(20, 1, true); // Linear PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true); // 16-bit
    writeString(36, 'data');
    view.setUint32(40, samples * 2, true);
    
    // Write PCM samples
    let offset = 44;
    for (let i = 0; i < samples; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  };

  // Record audio
  const recordAudio = async (duration: number = 5000): Promise<Blob | null> => {
    if (hasMicrophone === false) {
      throw new Error('No microphone detected on this device');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      const mediaRecorder = new MediaRecorder(stream);
      
      audioChunksRef.current = [];
      
      return new Promise((resolve) => {
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const webmBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          stream.getTracks().forEach(track => track.stop());
          
          try {
            // Convert WebM to WAV in the browser
            console.log('🔄 Converting audio to WAV format...');
            const wavBlob = await convertToWav(webmBlob);
            console.log('✅ Audio converted to WAV:', wavBlob.size, 'bytes');
            
            // Create preview URL for the WAV audio
            const audioUrl = URL.createObjectURL(wavBlob);
            setCapturedAudioUrl(audioUrl);
            
            resolve(wavBlob);
          } catch (error) {
            console.error('❌ Failed to convert audio:', error);
            setError('Failed to convert audio format');
            resolve(null);
          }
        };

        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;

        // Stop after duration
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, duration);
      });
    } catch (err) {
      console.error('Microphone access error:', err);
      
      if (err instanceof Error && err.name === 'NotFoundError') {
        setError('No microphone found on this device. Cannot perform mood detection.');
        setHasMicrophone(false);
      } else if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow microphone access.');
      } else {
        setError('Failed to access microphone. Cannot perform mood detection.');
      }
      
      return null;
    }
  };

  // Detect mood (multimodal)
  const handleDetectMood = async () => {
    // Check if microphone is available (required)
    if (hasMicrophone === false) {
      setError('Microphone is required for mood detection. Please connect a microphone.');
      return;
    }

    // Start camera if available and not active
    if (hasCamera !== false && !cameraActive) {
      await startCamera();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsDetecting(true);
    setDetectionProgress(0);
    setError(null);

    try {
      // Progress: Starting
      setDetectionProgress(10);
      
      // Start recording audio (7 seconds)
      setDetectionProgress(20);
      const audioPromise = recordAudio(7000);
      
      // Simulate progress during recording
      const progressInterval = setInterval(() => {
        setDetectionProgress(prev => Math.min(prev + 7, 70));
      }, 1000);

      const audioBlob = await audioPromise;
      clearInterval(progressInterval);
      
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('Failed to record audio');
      }

      setDetectionProgress(75);
      
      // Capture image (or placeholder if no camera)
      const imageBlob = await captureImage();
      if (!imageBlob || imageBlob.size === 0) {
        throw new Error('Failed to capture image');
      }

      setDetectionProgress(80);

      // Analyze multimodal
      console.log('🤖 Analyzing multimodal emotion...');
      const result = await voiceService.analyzeMultimodal(audioBlob, imageBlob, 20);
      
      setDetectionProgress(100);

      if (result.success && result.analysis) {
        setAnalysis(result.analysis);
        const recs = result.recommendations || [];
        setRecommendations(recs);
        onMoodDetected?.(result.analysis.merged_emotion, result.analysis, recs);
        console.log('✅ Analysis complete:', result.analysis.summary);
        console.log('🎵 Recommendations:', recs.length, 'tracks');
      } else {
        throw new Error(result.error || 'Analysis failed');
      }

    } catch (err) {
      console.error('Mood detection failed:', err);
      setError(err instanceof Error ? err.message : 'Mood detection failed');
    } finally {
      setIsDetecting(false);
      setDetectionProgress(0);
    }
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

  // Get agreement icon
  const getAgreementIcon = (agreement: string) => {
    return voiceService.getAgreementIcon(agreement);
  };

  // Get agreement color
  const getAgreementColor = (agreement: string) => {
    const colors = {
      'strong': 'bg-green-500',
      'moderate': 'bg-blue-500',
      'weak': 'bg-yellow-500',
      'conflict': 'bg-red-500'
    };
    return colors[agreement as keyof typeof colors] || 'bg-gray-500';
  };

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Scan className="h-5 w-5" />
            <span>Multimodal Mood Detection</span>
          </div>
          {/* Device Status Indicators */}
          <div className="flex items-center gap-2">
            {hasCamera !== null && (
              <Badge variant={hasCamera ? "default" : "secondary"} className="text-xs">
                <Video className="h-3 w-3 mr-1" />
                {hasCamera ? 'Camera OK' : 'No Camera'}
              </Badge>
            )}
            {hasMicrophone !== null && (
              <Badge variant={hasMicrophone ? "default" : "destructive"} className="text-xs">
                <Mic className="h-3 w-3 mr-1" />
                {hasMicrophone ? 'Mic OK' : 'No Mic'}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Camera and Preview Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Camera Preview - Left Side */}
          <div className="relative">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Video className="h-4 w-4" />
                Live Camera
              </h4>
              <div className="relative">
                <video
                  ref={videoRef}
                  className={cn(
                    "w-full rounded-lg shadow-lg",
                    cameraActive ? "block" : "hidden"
                  )}
                  autoPlay
                  playsInline
                  muted
                  style={{ maxHeight: '300px', objectFit: 'cover' }}
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {!cameraActive && (
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center" style={{ maxHeight: '300px' }}>
                    <div className="text-center space-y-2">
                      <CameraIcon className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Camera preview will appear here</p>
                    </div>
                  </div>
                )}
                
                {/* Recording Indicator */}
                {isDetecting && (
                  <div className="absolute top-2 right-2 flex items-center space-x-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span>Recording</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Captured Preview - Right Side */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Captured Data
            </h4>
            
            {/* Captured Image */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <CameraIcon className="h-3 w-3" />
                Captured Image
              </div>
              {capturedImageUrl ? (
                <div className="relative">
                  <img
                    src={capturedImageUrl}
                    alt="Captured"
                    className="w-full rounded-lg shadow-md border"
                    style={{ maxHeight: '200px', objectFit: 'cover' }}
                  />
                  <Badge className="absolute top-2 left-2 bg-green-500">
                    ✓ Captured
                  </Badge>
                </div>
              ) : (
                <div className="aspect-video bg-muted/50 rounded-lg flex items-center justify-center border-2 border-dashed" style={{ maxHeight: '200px' }}>
                  <div className="text-center">
                    <CameraIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground">No image captured yet</p>
                  </div>
                </div>
              )}
            </div>

            {/* Captured Audio */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Mic className="h-3 w-3" />
                Recorded Audio
              </div>
              {capturedAudioUrl ? (
                <div className="p-3 bg-muted/50 rounded-lg border">
                  <audio
                    ref={audioRef}
                    src={capturedAudioUrl}
                    controls
                    className="w-full"
                    style={{ height: '40px' }}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant="outline" className="text-xs">
                      WAV • 16kHz Mono
                    </Badge>
                    <span className="text-xs text-muted-foreground">7 seconds</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-muted/50 rounded-lg flex items-center justify-center border-2 border-dashed">
                  <div className="text-center">
                    <Mic className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground">No audio recorded yet</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Permission Denied Notice */}
        {permissionDenied && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Camera and microphone access are required for mood detection. Please allow permissions and try again.
            </p>
          </div>
        )}

        {/* Detection Progress */}
        {isDetecting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Analyzing...</span>
              <span className="font-medium">{detectionProgress}%</span>
            </div>
            <Progress value={detectionProgress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              {detectionProgress < 30 ? 'Recording audio...' :
               detectionProgress < 80 ? 'Capturing image...' :
               'Analyzing emotions...'}
            </p>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex gap-2">
          {hasCamera !== false && (
            !cameraActive ? (
              <Button
                onClick={startCamera}
                className="flex-1"
                variant="outline"
              >
                <Video className="mr-2 h-4 w-4" />
                Start Camera
              </Button>
            ) : (
              <Button
                onClick={stopCamera}
                className="flex-1"
                variant="outline"
              >
                <X className="mr-2 h-4 w-4" />
                Stop Camera
              </Button>
            )
          )}
          
          <Button
            onClick={handleDetectMood}
            disabled={isDetecting || hasMicrophone === false}
            className="flex-1"
            variant="default"
          >
            {isDetecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Detecting...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {hasMicrophone === false ? 'No Microphone' : 'Detect Mood'}
              </>
            )}
          </Button>
        </div>

        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-4 p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border">
            <div className="text-center space-y-2">
              <div className="text-4xl mb-2">
                {voiceService.getEmotionEmoji(analysis.merged_emotion)}
              </div>
              <h3 className="text-xl font-bold capitalize">{analysis.merged_emotion}</h3>
              <div className="flex items-center justify-center gap-2">
                <Badge className={getAgreementColor(analysis.agreement)}>
                  {getAgreementIcon(analysis.agreement)} {analysis.agreement.toUpperCase()}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {(analysis.merged_confidence * 100).toFixed(1)}% confident
                </span>
              </div>
            </div>

            {/* Summary */}
            <div className="text-center text-sm text-muted-foreground">
              {analysis.summary}
            </div>

            {/* Individual Predictions */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-background rounded-lg">
                <div className="text-xs font-medium text-muted-foreground mb-1">🎤 Voice</div>
                <div className="text-sm font-medium capitalize">{analysis.voice_prediction.emotion}</div>
                <div className="text-xs text-muted-foreground">
                  {(analysis.voice_prediction.confidence * 100).toFixed(1)}%
                </div>
              </div>
              <div className="p-3 bg-background rounded-lg">
                <div className="text-xs font-medium text-muted-foreground mb-1">📸 Face</div>
                <div className="text-sm font-medium capitalize">{analysis.face_prediction.emotion}</div>
                <div className="text-xs text-muted-foreground">
                  {(analysis.face_prediction.confidence * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Explanation */}
            <div className="text-xs text-center text-muted-foreground italic">
              {analysis.explanation}
            </div>
          </div>
        )}

        {/* Music Recommendations */}
        {analysis && recommendations.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Music Recommendations</h3>
            <MusicRecommendations
              detectedMood={analysis.merged_emotion}
              onTrackSelect={handleTrackSelect}
            />
          </div>
        )}

        {/* Music Player */}
        {currentTracks.length > 0 && (
          <MusicPlayer
            tracks={currentTracks}
            currentTrackIndex={currentTrackIndex}
            onTrackChange={handleTrackChange}
          />
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/30 rounded-lg">
          <p className="font-semibold mb-2">💡 How it works:</p>
          {hasMicrophone === false && hasCamera === false ? (
            <>
              <p className="text-destructive">⚠️ No camera or microphone detected</p>
              <p>• Please connect audio/video devices to use mood detection</p>
            </>
          ) : hasMicrophone === false ? (
            <>
              <p className="text-destructive">⚠️ Microphone is required for mood detection</p>
              <p>• Please connect a microphone to continue</p>
            </>
          ) : hasCamera === false ? (
            <>
              <p className="text-yellow-600 dark:text-yellow-400">⚠️ No camera detected - Voice-only mode</p>
              <p>• Click "Detect Mood" to analyze your mood using voice (takes ~7 seconds)</p>
              <p>• Facial analysis will use a neutral fallback</p>
              <p>• Voice emotion will be weighted more heavily in the final result</p>
            </>
          ) : (
            <>
              <p>• Click "Start Camera" to enable video preview</p>
              <p>• Click "Detect Mood" to analyze your mood (takes ~7 seconds)</p>
              <p>• Both camera and microphone will be used for best accuracy</p>
              <p>• Music recommendations will appear automatically after detection</p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
