import { MoodDetection, MoodService } from "@/lib/services/mood"
import { VoiceEmotionService } from "@/lib/services/voiceEmotion"

interface AutoMoodDetectionResult {
  success: boolean
  mood?: string
  confidence?: number
  detection?: MoodDetection
  recommendations?: any[]
  error?: string
}

export type { AutoMoodDetectionResult }

const LAST_DETECTION_KEY = "auto_mood_last_detection"
const DETECTION_COOLDOWN_MINUTES = 30

const readLastDetection = (): number | null => {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(LAST_DETECTION_KEY)
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

const writeLastDetection = (timestamp: number) => {
  if (typeof window === "undefined") return
  window.localStorage.setItem(LAST_DETECTION_KEY, String(timestamp))
}

class AutoMoodDetectionServiceImpl {
  private static instance: AutoMoodDetectionServiceImpl
  private moodService = MoodService.getInstance()
  private voiceService = VoiceEmotionService.getInstance()

  static getInstance(): AutoMoodDetectionServiceImpl {
    if (!AutoMoodDetectionServiceImpl.instance) {
      AutoMoodDetectionServiceImpl.instance = new AutoMoodDetectionServiceImpl()
    }
    return AutoMoodDetectionServiceImpl.instance
  }

  hasAlreadyDetected(): boolean {
    const lastDetection = readLastDetection()
    if (!lastDetection) return false
    const elapsed = Date.now() - lastDetection
    return elapsed < DETECTION_COOLDOWN_MINUTES * 60 * 1000
  }

  /**
   * Auto detect mood using 5-second video recording (matching MoodDetectorPanelMediaPipe)
   * 
   * FALLBACK HIERARCHY (Test Cases):
   * 1. Try video + audio (ideal multimodal detection)
   * 2. TEST CASE 2: If mic broken/missing → Try video-only (silent video for face detection)
   * 3. TEST CASE 1: If camera broken/missing → Try audio-only (voice emotion detection)
   * 4. TEST CASE 3: If both broken/missing → Fail with descriptive error message
   * 
   * Error Types Handled:
   * - NotAllowedError: Permission denied
   * - NotFoundError: Hardware not detected
   * - NotReadableError: Device in use by another app
   */
  async autoDetectMood(): Promise<AutoMoodDetectionResult> {
    let stream: MediaStream | null = null;

    try {
      console.log('🎯 Starting auto mood detection (5-second video recording)...');
      console.log('📍 Step 1: Checking browser support...');
      
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('❌ MediaDevices API not supported');
        throw new Error('Media devices not supported in this browser');
      }
      
      console.log('✅ Browser supports media devices');
      console.log('📍 Step 2: Requesting camera and microphone access...');
      
      // Try to get both video and audio (matching MoodDetectorPanelMediaPipe)
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'user',
            width: { ideal: 1280 }, 
            height: { ideal: 720 } 
          },
          audio: true
        });
        
        console.log('✅ Camera and microphone access granted');
        console.log('📹 Stream tracks:', stream.getTracks().map(t => `${t.kind}: ${t.label}`));
      } catch (error: any) {
        console.warn('⚠️ Failed to get both video and audio:', error.message);
        console.warn('Error name:', error.name);
        
        // Test Case 2: If microphone fails, try video-only mode (silent video)
        try {
          console.log('📍 Step 2b: Trying video-only mode (microphone broken/missing)...');
          console.log('   → Will capture silent video for face-based mood detection');
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: 'user',
              width: { ideal: 1280 }, 
              height: { ideal: 720 } 
            },
            audio: false
          });
          console.log('✅ Camera access granted (video-only mode)');
          console.log('📹 Video track:', stream.getVideoTracks()[0]?.label || 'unknown');
          console.log('🎬 Will record 5-second silent video for face expression analysis');
        } catch (videoError: any) {
          console.warn('⚠️ Camera also unavailable:', videoError.message);
          
          // Test Case 1: Camera failed, try audio-only mode
          try {
            console.log('📍 Step 2c: Trying audio-only mode (camera broken/missing)...');
            console.log('   → Will use voice-only mood detection');
            stream = await navigator.mediaDevices.getUserMedia({ 
              audio: true
            });
            console.log('✅ Microphone access granted (audio-only mode)');
            console.log('🎙️ Will record 5-second audio for voice emotion analysis');
          } catch (audioError: any) {
            // Test Case 3: Both devices failed
            console.error('❌ BOTH camera and microphone unavailable');
            console.error('   Camera error:', videoError.message, `(${videoError.name})`);
            console.error('   Audio error:', audioError.message, `(${audioError.name})`);
            
            // Determine if it's a permission issue or hardware issue
            const isPermissionError = 
              error.name === 'NotAllowedError' || 
              videoError.name === 'NotAllowedError' || 
              audioError.name === 'NotAllowedError';
            
            const isHardwareError = 
              error.name === 'NotFoundError' || 
              videoError.name === 'NotFoundError' || 
              audioError.name === 'NotFoundError';
            
            if (isPermissionError) {
              throw new Error('Unable to run auto mood detection: Camera and microphone permissions denied. Please allow access in your browser settings.');
            } else if (isHardwareError) {
              throw new Error('Unable to run auto mood detection: No camera or microphone detected. Please connect at least one device.');
            } else {
              throw new Error('Unable to run auto mood detection: Both camera and microphone are unavailable. They may be in use by another application.');
            }
          }
        }
      }

      if (!stream) {
        throw new Error('Failed to access any media devices');
      }

      const hasVideo = stream.getVideoTracks().length > 0;
      const hasAudio = stream.getAudioTracks().length > 0;
      
      // Log which test case/mode we're in
      if (hasVideo && hasAudio) {
        console.log('📊 Recording mode: Video + Audio (Full multimodal detection)');
      } else if (hasVideo && !hasAudio) {
        console.log('📊 Recording mode: Video only (TEST CASE 2: Mic broken/missing → Silent video for face detection)');
      } else if (!hasVideo && hasAudio) {
        console.log('📊 Recording mode: Audio only (TEST CASE 1: Camera broken/missing → Voice-only detection)');
      }
      
      // Record video/audio (5 seconds) - matching MoodDetectorPanelMediaPipe
      console.log('🎬 Recording 5 seconds...');
      
      const chunks: Blob[] = [];
      let mediaRecorder: MediaRecorder;
      
      // Use appropriate MIME type based on available tracks
      if (hasVideo) {
        const options = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') 
          ? { mimeType: 'video/webm;codecs=vp8,opus' } 
          : {};
        try {
          mediaRecorder = new MediaRecorder(stream, options);
        } catch (e) {
          mediaRecorder = new MediaRecorder(stream);
        }
      } else {
        // Audio-only
        const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? { mimeType: 'audio/webm;codecs=opus' }
          : {};
        try {
          mediaRecorder = new MediaRecorder(stream, options);
        } catch (e) {
          mediaRecorder = new MediaRecorder(stream);
        }
      }
      
      const recordingPromise = new Promise<Blob>((resolve) => {
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };
        
        mediaRecorder.onstop = () => {
          const mimeType = hasVideo ? 'video/webm' : 'audio/webm';
          const blob = new Blob(chunks, { type: mimeType });
          console.log(`✅ Recording complete: ${blob.size}B (${blob.type})`);
          resolve(blob);
        };
      });
      
      mediaRecorder.start(1000); // Collect data every second
      
      // Record for 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      mediaRecorder.stop();
      const recordedBlob = await recordingPromise;
      
      // Stop all tracks
      stream.getTracks().forEach(track => track.stop());
      
      // Send to backend for analysis (matching MoodDetectorPanelMediaPipe approach)
      console.log('🤖 Analyzing recorded media...');
      
      let result;
      
      if (hasVideo) {
        console.log('📤 Sending video for analysis');
        result = await this.voiceService.analyzeVideo(recordedBlob, 5);
      } else {
        console.log('📤 Sending audio for analysis');
        result = await this.voiceService.analyzeAudio(recordedBlob);
      }
      
      console.log('📥 Analysis result:', result);
      
      if (!result.success) {
        console.error('❌ Analysis failed:', result.error);
        throw new Error(result.error || 'Mood detection failed');
      }
      
      if (!result.analysis) {
        console.error('❌ No analysis data in result');
        throw new Error('No analysis data returned from backend');
      }
      
      writeLastDetection(Date.now());

      const detection: MoodDetection = {
        mood: result.analysis.merged_emotion || 'happy',
        confidence: result.analysis.merged_confidence || 0.5,
        timestamp: new Date(),
        source: 'auto'
      };

      // Store the detection and recommendations for other components to consume
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "detected_mood",
          JSON.stringify({
            mood: detection.mood,
            confidence: detection.confidence,
            timestamp: detection.timestamp,
            source: detection.source,
            analysis: result.analysis
          }),
        );
        
        // Store recommendations if available
        if (result.recommendations && result.recommendations.length > 0) {
          window.localStorage.setItem(
            "mood_recommendations",
            JSON.stringify({
              tracks: result.recommendations,
              mood: detection.mood,
              timestamp: detection.timestamp
            })
          );
          console.log(`🎵 Stored ${result.recommendations.length} music recommendations`);
        }
      }

      console.log(`✅ Auto mood detection complete: ${detection.mood} (${(detection.confidence * 100).toFixed(1)}%)`);

      return {
        success: true,
        mood: detection.mood,
        confidence: detection.confidence,
        detection,
        recommendations: result.recommendations
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : 'Unknown';
      
      console.error("[AutoMoodDetectionService] Mood detection failed:", errorMessage);
      console.error("Error type:", errorName);
      console.error("Full error:", error);
      
      // Provide helpful error messages based on error type
      let userMessage = errorMessage;
      if (errorName === 'NotAllowedError' || errorMessage.includes('permission')) {
        userMessage = 'Camera/microphone permission denied. Please allow access in browser settings.';
      } else if (errorName === 'NotFoundError' || errorMessage.includes('not found')) {
        userMessage = 'No camera or microphone detected. Please connect a device.';
      } else if (errorName === 'NotReadableError' || errorMessage.includes('in use')) {
        userMessage = 'Camera/microphone is in use by another application.';
      } else if (errorMessage.includes('not supported')) {
        userMessage = 'Your browser does not support media devices.';
      }
      
      console.error("User-friendly message:", userMessage);
      
      return {
        success: false,
        mood: undefined,
        confidence: undefined,
        detection: undefined,
        error: userMessage
      }
    }
  }
}

export const AutoMoodDetectionService = AutoMoodDetectionServiceImpl

