'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { 
  Scan, Loader2, Mic, Video, Camera as CameraIcon, 
  CameraOff, Grid3X3, BoxSelect, ScanFace, RotateCcw, Send, AlertCircle, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VoiceEmotionService, MultimodalAnalysis } from '@/lib/services/voiceEmotion';
import { MusicRecommendations } from '@/components/music/MusicRecommendations';
import { MusicPlayer } from '@/components/music/MusicPlayer';
import { SpotifyTrack } from '@/lib/services/spotify';
import { cn } from '@/lib/utils';

interface MoodDetectorPanelProps {
  onMoodDetected?: (mood: string, analysis?: MultimodalAnalysis) => void;
  className?: string;
  autoDetect?: boolean;
}

type VisualMode = 'mesh' | 'box' | 'none';

// Visual Mode Toggle Button Component
const VisualOption = ({ 
  mode, 
  currentMode, 
  setMode, 
  icon: Icon 
}: { 
  mode: VisualMode; 
  currentMode: VisualMode; 
  setMode: (mode: VisualMode) => void; 
  icon: React.ComponentType<{ size?: number; className?: string }> 
}) => (
  <button 
    onClick={() => setMode(mode)}
    className="relative z-10 p-2 text-white/50 hover:text-white transition-colors duration-200 outline-none"
  >
    {currentMode === mode && (
      <motion.div 
        layoutId="activePill"
        className="absolute inset-0 bg-white/20 rounded-lg"
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    )}
    <Icon size={16} className="relative z-10" />
  </button>
);

/**
 * Advanced multimodal mood detection with MediaPipe Face Landmarker
 * Records 5-second video and sends to /analyze endpoint for fusion model processing
 */
export function MoodDetectorPanel({ onMoodDetected, className, autoDetect = false }: MoodDetectorPanelProps) {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const requestRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastAiTimeRef = useRef<number>(0);
  
  // Live refs for loop access
  const visualModeRef = useRef<VisualMode>('mesh');
  const isRecordingRef = useRef<boolean>(false);
  const isReviewingRef = useRef<boolean>(false); // Track if reviewing recorded video

  // State
  const [status, setStatus] = useState("Initializing AI...");
  const [isRecording, setIsRecording] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [visualMode, setVisualMode] = useState<VisualMode>('mesh');
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [analysis, setAnalysis] = useState<MultimodalAnalysis | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cameraUnavailable, setCameraUnavailable] = useState(false);
  
  // Music player state
  const [currentTracks, setCurrentTracks] = useState<SpotifyTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  const voiceService = VoiceEmotionService.getInstance();

  // Sync state to refs
  useEffect(() => { visualModeRef.current = visualMode; }, [visualMode]);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

  // FPS Limiter
  const AI_FPS = 30;
  const AI_INTERVAL = 1000 / AI_FPS;

  // Initialize MediaPipe Face Landmarker
  useEffect(() => {
    const initAI = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { 
            modelAssetPath: "/face_landmarker.task", 
            delegate: "GPU" 
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1
        });
        setModelLoaded(true);
        setStatus("System Ready - Enable Camera");
        console.log('✅ MediaPipe Face Landmarker initialized');
      } catch (e) {
        console.error('Failed to load MediaPipe:', e);
        setError("Failed to load Neural Core. Check console for details.");
        setStatus("AI Load Failed");
      }
    };
    initAI();

    return () => stopCameraStream();
  }, []);

  // Camera control
  const toggleCamera = () => {
    isCameraOn ? stopCameraStream() : startCameraStream();
  };

  const startCameraStream = async () => {
    if (!modelLoaded) {
      setError("Please wait for AI model to load");
      return;
    }

    setStatus("Accessing Hardware...");
    try {
      setRecordedUrl(null);
      setRecordedBlob(null);
      setError(null);
      isReviewingRef.current = false; // Clear reviewing state when starting camera

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        },
        audio: true 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        
        setIsCameraOn(true);
        setStatus("Active - Ready to Scan");
        predictWebcam();
      }
    } catch (e) {
      console.error('Camera+audio access error:', e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      
      // If audio fails but camera might work, try video-only mode
      if (errorMessage.includes('audio') || errorMessage.includes('microphone') || 
          errorMessage.includes('NotAllowedError') || errorMessage.includes('Permission')) {
        try {
          console.log('Attempting video-only mode (no microphone)...');
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: 'user',
              width: { ideal: 1280 }, 
              height: { ideal: 720 } 
            },
            audio: false 
          });
          
          streamRef.current = stream;
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            
            setIsCameraOn(true);
            setStatus("Camera Only - Face Detection Active");
            setError("Microphone unavailable. Using camera-only mode for facial expression detection.");
            predictWebcam();
          }
          return;
        } catch (videoError) {
          console.error('Video-only mode failed:', videoError);
        }
      }
      
      // Check if camera is physically disconnected or permission denied
      if (errorMessage.includes('NotFoundError') || errorMessage.includes('not found')) {
        setError("Camera not detected. You can still record audio-only for voice analysis.");
        setStatus("Camera Unavailable - Voice Mode Available");
        setCameraUnavailable(true);
      } else {
        // Permission denied - still allow voice-only mode
        setError("Camera access denied. Click the button below to record voice-only for mood analysis.");
        setStatus("Voice-Only Mode Available");
        setCameraUnavailable(true); // Changed from false to true to enable voice-only
      }
      setIsCameraOn(false);
    }
  };

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setIsCameraOn(false);
    setStatus("Camera Offline");
  };

  // Vision loop with MediaPipe
  const predictWebcam = () => {
    // Exit if stopped or reviewing
    if (!streamRef.current || !videoRef.current || isReviewingRef.current) return;

    // Schedule next frame immediately
    requestRef.current = requestAnimationFrame(predictWebcam);

    // Throttle processing
    const now = performance.now();
    if (now - lastAiTimeRef.current < AI_INTERVAL) return;
    lastAiTimeRef.current = now;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!canvas || video.readyState < 2 || !landmarkerRef.current) return;

    // Match resolution
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Detect faces
    let results;
    try {
      results = landmarkerRef.current.detectForVideo(video, now);
    } catch(e) {
      console.warn('Detection error:', e);
      return;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.faceLandmarks.length > 0) {
      const landmarks = results.faceLandmarks[0];
      const currentMode = visualModeRef.current;
      const recording = isRecordingRef.current;

      if (currentMode === 'mesh') {
        // Draw mesh points
        ctx.fillStyle = recording ? "#ef4444" : "#00ff9d";
        for (let i = 0; i < landmarks.length; i += 2) {
          const p = landmarks[i];
          const x = p.x * canvas.width;
          const y = p.y * canvas.height;
          ctx.fillRect(x - 1, y - 1, 2, 2);
        }
      } 
      else if (currentMode === 'box') {
        // Draw bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        landmarks.forEach(p => {
          const x = p.x * canvas.width;
          const y = p.y * canvas.height;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        });
        
        const pad = 20;
        ctx.strokeStyle = recording ? "#ef4444" : "#00e5ff";
        ctx.lineWidth = 4;
        ctx.lineJoin = "round";
        
        const w = (maxX - minX) + (pad * 2);
        const h = (maxY - minY) + (pad * 2);
        
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(minX - pad, minY - pad, w, h, 20);
        } else {
          ctx.rect(minX - pad, minY - pad, w, h);
        }
        ctx.stroke();
      }
      // 'none' mode draws nothing
    }
  };

  // Audio-only recording when camera is unavailable
  const recordAudioOnly = async () => {
    if (isRecording) return;
    
    // Clear previous analysis state when starting new recording
    setAnalysis(null);
    setRecommendations([]);
    setError(null);
    
    setStatus("Accessing Microphone...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      setIsRecording(true);
      setStatus("Recording Audio...");
      chunksRef.current = [];
      
      const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? { mimeType: 'audio/webm;codecs=opus' }
        : {};
      
      try {
        mediaRecorderRef.current = new MediaRecorder(stream, options);
      } catch (e) {
        mediaRecorderRef.current = new MediaRecorder(stream);
      }
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedUrl(url);
        setIsRecording(false);
        isReviewingRef.current = true; // Mark as reviewing
        stream.getTracks().forEach(track => track.stop());
        setStatus("Review Audio");
      };
      
      mediaRecorderRef.current.start(1000);
      
      // Auto-stop after 5 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, 5000);
    } catch (e) {
      console.error('Microphone access error:', e);
      setError("Microphone access denied. Please allow microphone permissions.");
      setStatus("Microphone Access Denied");
      setIsRecording(false);
    }
  };

  // Recording control
  const handleRecord = async () => {
    // If camera is off and not unavailable, try to start camera
    if (!isCameraOn && !cameraUnavailable) {
      startCameraStream();
      return;
    }
    
    // If camera is unavailable, record audio only
    if (cameraUnavailable && !isCameraOn) {
      await recordAudioOnly();
      return;
    }
    
    if (isRecording) return;

    // Clear previous analysis state when starting new recording
    setAnalysis(null);
    setRecommendations([]);
    setError(null);

    setIsRecording(true);
    setStatus("Recording...");
    chunksRef.current = [];
    
    const stream = streamRef.current;
    if (!stream) return;

    const options = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') 
      ? { mimeType: 'video/webm;codecs=vp8,opus' } 
      : {};
    
    try {
      mediaRecorderRef.current = new MediaRecorder(stream, options);
    } catch (e) {
      mediaRecorderRef.current = new MediaRecorder(stream);
    }
    
    mediaRecorderRef.current.ondataavailable = (e) => { 
      if (e.data.size > 0) chunksRef.current.push(e.data); 
    };
    
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordedUrl(url);
      
      setIsRecording(false);
      isReviewingRef.current = true; // Mark as reviewing
      
      // Stop loop
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      
      // Stop hardware
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setIsCameraOn(false);
      setStatus("Review Capture");
    };

    mediaRecorderRef.current.start(1000);
    
    // Auto-stop after 5 seconds
    setTimeout(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    }, 5000);
  };

  // Analyze recorded video or audio
  const handleAnalyze = async () => {
    if (!recordedBlob) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      let result;
      
      // Check if it's audio-only (webm audio) or video
      const isAudioOnly = recordedBlob.type.includes('audio');
      
      if (isAudioOnly) {
        setStatus("Analyzing Voice...");
        result = await voiceService.analyzeAudio(recordedBlob);
      } else {
        setStatus("Processing Neural Tensors...");
        result = await voiceService.analyzeVideo(recordedBlob, 20);
      }
      
      if (result.success && result.analysis) {
        setAnalysis(result.analysis);
        setRecommendations(result.recommendations || []);
        setStatus("Analysis Complete");
        onMoodDetected?.(result.analysis.merged_emotion, result.analysis);
        console.log('✅ Video analysis complete:', result.analysis);
      } else {
        throw new Error(result.error || 'Analysis failed');
      }
    } catch(e) {
      console.error('Analysis error:', e);
      setError("Server Connection Failed. Check if backend is running.");
      setStatus("Error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Retake video
  const handleRetake = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    setRecordedBlob(null);
    setAnalysis(null);
    setRecommendations([]);
    setError(null);
    startCameraStream();
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

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Scan className="h-5 w-5" />
            <span>AI Mood Detection</span>
          </div>
          {isAnalyzing && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Processing video...</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Camera and Preview Section - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Live Camera - Left Side */}
          <motion.div 
            initial={{opacity: 0, x: -10}} 
            animate={{opacity: 1, x: 0}}
            className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-border"
          >
            <div className="absolute top-2 left-2 z-50 pointer-events-none">
              <Badge variant={isCameraOn ? "default" : "secondary"} className="text-xs">
                <Video className="h-3 w-3 mr-1" />
                Live Camera
              </Badge>
            </div>

            {/* Live Camera */}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={cn(
                "w-full h-full object-cover transform scale-x-[-1] absolute inset-0 transition-opacity duration-500",
                !isCameraOn ? 'opacity-0' : 'opacity-100'
              )}
            />
            
            {/* Face Landmarks Overlay */}
            <canvas 
              ref={canvasRef} 
              className={cn(
                "absolute inset-0 w-full h-full transform scale-x-[-1] transition-opacity duration-500 pointer-events-none",
                !isCameraOn ? 'opacity-0' : 'opacity-100'
              )}
            />

            {/* Offline Placeholder */}
            {!isCameraOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/90 backdrop-blur-sm z-10">
                <div className="p-4 bg-zinc-800 rounded-full mb-3 shadow-lg">
                  <CameraOff size={32} className="text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground mb-3">
                  {cameraUnavailable ? 'Camera Unavailable' : 'Camera Offline'}
                </p>
                {!cameraUnavailable && (
                  <Button onClick={toggleCamera} disabled={!modelLoaded} size="sm">
                    <CameraIcon className="mr-2 h-3 w-3" />
                    {modelLoaded ? 'Start Camera' : 'Loading...'}
                  </Button>
                )}
                {cameraUnavailable && (
                  <p className="text-xs text-muted-foreground text-center px-4">
                    Use voice-only recording below
                  </p>
                )}
              </div>
            )}

            {/* Status Pill */}
            <div className="absolute top-2 right-2 z-50 pointer-events-none">
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border transition-all duration-300 text-xs",
                isRecording 
                  ? "bg-red-500/20 border-red-500/50 text-red-100" 
                  : "bg-black/60 border-white/10 text-white"
              )}>
                {isRecording ? (
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                ) : !modelLoaded ? (
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                ) : (
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    isCameraOn ? "bg-emerald-500" : "bg-gray-500"
                  )} />
                )}
                <span className="font-medium tracking-wide font-mono">{status}</span>
              </div>
            </div>

            {/* Floating Controls */}
            {isCameraOn && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-30">
                <button 
                  onClick={toggleCamera} 
                  className="p-2 rounded-xl bg-black/60 backdrop-blur-xl border border-white/10 text-white hover:bg-red-500/20 hover:border-red-500/50 transition-all"
                  title="Stop Camera"
                >
                  <CameraOff size={16} />
                </button>

                <div className="flex bg-black/60 backdrop-blur-xl border border-white/10 p-0.5 rounded-xl gap-0.5">
                  <VisualOption mode="mesh" currentMode={visualMode} setMode={setVisualMode} icon={Grid3X3} />
                  <VisualOption mode="box" currentMode={visualMode} setMode={setVisualMode} icon={BoxSelect} />
                  <VisualOption mode="none" currentMode={visualMode} setMode={setVisualMode} icon={ScanFace} />
                </div>
              </div>
            )}

            {/* Recording Laser Effect */}
            {isRecording && (
              <div 
                className="absolute top-0 left-0 w-full h-1 bg-red-500/80 shadow-[0_0_30px_rgba(239,68,68,0.8)] z-10"
                style={{
                  animation: 'scan 2s ease-in-out infinite'
                }}
              />
            )}
          </motion.div>

          {/* Captured Preview - Right Side */}
          <motion.div 
            initial={{opacity: 0, x: 10}} 
            animate={{opacity: 1, x: 0}}
            className="space-y-3"
          >
            <div className="relative aspect-video bg-muted/30 rounded-2xl overflow-hidden border border-border">
              <div className="absolute top-2 left-2 z-50">
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {recordedUrl ? (recordedBlob?.type.includes('audio') ? 'Recorded Audio' : 'Recorded Video') : 'Preview'}
                </Badge>
              </div>

              {recordedUrl ? (
                <video 
                  src={recordedUrl} 
                  controls 
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="p-4 bg-muted rounded-full mb-3">
                    <Video size={32} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No recording yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {cameraUnavailable ? 'Click button below for voice-only' : isCameraOn ? 'Click "Start Recording" below' : 'Enable camera first'}
                  </p>
                </div>
              )}
            </div>
          </motion.div>

        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          {recordedUrl ? (
            <>
              <Button 
                onClick={handleRetake} 
                variant="secondary"
                className="flex-1"
                size="lg"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Retake
              </Button>
              <Button 
                onClick={handleAnalyze} 
                className="flex-1"
                size="lg"
                disabled={isAnalyzing || !!analysis}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {analysis ? 'Analyzed ✓' : 'Analyze Video'}
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button 
              onClick={handleRecord}
              disabled={isRecording || !modelLoaded || (!isCameraOn && !cameraUnavailable)}
              className="w-full"
              size="lg"
              variant={isRecording ? "destructive" : "default"}
            >
              {isRecording ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording... (5s)
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-4 w-4" />
                  {cameraUnavailable ? 'Record Voice Only (5s)' : isCameraOn ? 'Start 5s Recording' : 'Enable Camera & Record'}
                </>
              )}
            </Button>
          )}
        </div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{y: 20, opacity: 0}} 
              animate={{y: 0, opacity: 1}}
              exit={{y: -20, opacity: 0}}
              className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-400"
            >
              <AlertCircle size={20} />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analysis Results - Compact Inline */}
        {analysis && (
          <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            className="p-4 bg-muted/30 rounded-xl border border-border"
          >
            <div className="flex items-center justify-between gap-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Detected Mood</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold capitalize">{analysis.merged_emotion}</p>
                  <p className="text-sm text-muted-foreground">
                    {(analysis.merged_confidence * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-1">Analysis Mode</p>
                <Badge variant="default" className="text-xs">
                  {analysis.fusion_used ? '🔮 AI Fusion' : '🤖 Multimodal'}
                </Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 italic">{analysis.explanation}</p>
          </motion.div>
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
          <p>• Click "Enable Camera" to start live face tracking (or use voice-only if unavailable)</p>
          <p>• Choose visualization mode: Mesh (landmarks), Box (outline), or None (clean)</p>
          <p>• Click "Start 5s Recording" to capture video with audio</p>
          <p>• If camera is blocked, click "Record Voice Only" for audio-based mood detection</p>
          <p>• Review your recording and click "Analyze Video" to detect your mood</p>
          <p>• Get personalized music recommendations based on your emotion</p>
        </div>
      </CardContent>

      <style jsx global>{`
        @keyframes scan {
          0%, 100% { transform: translateY(0); opacity: 0.8; }
          50% { transform: translateY(500px); opacity: 1; }
        }
      `}</style>
    </Card>
  );
}
