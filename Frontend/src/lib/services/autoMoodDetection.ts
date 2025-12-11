import { MoodDetection, MoodService } from "@/lib/services/mood"
import { VoiceEmotionService } from "@/lib/services/voiceEmotion"

interface AutoMoodDetectionResult {
  success: boolean
  mood?: string
  confidence?: number
  detection?: MoodDetection
  audioBlob?: Blob
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

  async autoDetectMood(): Promise<AutoMoodDetectionResult> {
    let stream: MediaStream | null = null;
    let hasVideo = false;
    let hasAudio = false;

    try {
      console.log('🎯 Starting real mood detection with camera and voice...');
      console.log('📍 Step 1: Checking browser support...');
      
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('❌ MediaDevices API not supported');
        throw new Error('Media devices not supported in this browser');
      }
      
      console.log('✅ Browser supports media devices');
      console.log('📍 Step 2: Requesting camera and microphone access...');
      
      // Try to get both video and audio first
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: 640, height: 480 }, 
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true
          }
        });
        
        hasVideo = stream.getVideoTracks().length > 0;
        hasAudio = stream.getAudioTracks().length > 0;
        
        console.log('✅ Camera and microphone access granted');
        console.log('📹 Stream tracks:', stream.getTracks().map(t => `${t.kind}: ${t.label}`));
      } catch (error: any) {
        console.warn('⚠️ Failed to get both video and audio:', error.message);
        console.warn('Error name:', error.name);
        
        // If microphone is denied/unavailable, try video-only first
        // This is the most common scenario when user denies mic permission
        try {
          console.log('📍 Step 2b: Trying video-only (microphone denied/unavailable)...');
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user', width: 640, height: 480 }
          });
          hasVideo = true;
          hasAudio = false;
          console.log('✅ Camera access granted (video-only mode)');
          console.log('📹 Video track:', stream.getVideoTracks()[0]?.label || 'unknown');
        } catch (videoError: any) {
          console.warn('⚠️ Failed to get video:', videoError.message);
          
          // Last resort: Try audio only (camera also failed)
          try {
            console.log('📍 Step 2c: Trying audio-only (camera also unavailable)...');
            stream = await navigator.mediaDevices.getUserMedia({ 
              audio: {
                sampleRate: 16000,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true
              }
            });
            hasAudio = true;
            hasVideo = false;
            console.log('✅ Microphone access granted (audio-only mode)');
          } catch (audioError: any) {
            console.error('❌ Failed to get any media devices');
            console.error('Video error:', videoError.message);
            console.error('Audio error:', audioError.message);
            throw new Error('Camera and microphone access denied. Please allow permissions in browser settings.');
          }
        }
      }

      if (!stream) {
        throw new Error('Failed to access any media devices');
      }

      console.log(`📊 Detection mode: ${hasVideo && hasAudio ? 'Video + Audio' : hasVideo ? 'Video only' : 'Audio only'}`);
      
      let imageBlob: Blob | null = null;
      let audioBlob: Blob | null = null;

      // Capture image if video is available
      if (hasVideo) {
        console.log('📸 Capturing image from camera...');
        const video = document.createElement('video');
        video.style.display = 'none';
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        document.body.appendChild(video);
        
        await video.play();
        
        // Wait a bit for camera to adjust
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Capture image frame
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        
        if (ctx && video.videoWidth > 0) {
          ctx.drawImage(video, 0, 0);
          imageBlob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(resolve, 'image/jpeg', 0.95);
          });
          console.log('✅ Image captured successfully');
        } else {
          console.warn('⚠️ Could not capture image (no video data)');
        }
        
        // Cleanup video element
        stream.getVideoTracks().forEach(track => track.stop());
        document.body.removeChild(video);
      }
      
      // Record audio if available
      if (hasAudio) {
        console.log('🎙️ Recording audio for 10 seconds...');
        const mediaRecorder = new MediaRecorder(stream);
        const audioChunks: Blob[] = [];
      
        const audioPromise = new Promise<Blob>((resolve) => {
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunks.push(event.data);
            }
          };
          
          mediaRecorder.onstop = async () => {
            const webmBlob = new Blob(audioChunks, { type: 'audio/webm' });
            
            try {
              // Convert to WAV
              const wavBlob = await this.convertToWav(webmBlob);
              resolve(wavBlob);
            } catch (error) {
              console.error('Failed to convert audio:', error);
              resolve(webmBlob); // Fallback to webm
            }
          };
        });
        
        mediaRecorder.start();
        
        // Record for 10 seconds
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        mediaRecorder.stop();
        audioBlob = await audioPromise;
        
        console.log('✅ Audio recorded');
      }
      
      // Stop all remaining tracks
      stream.getTracks().forEach(track => track.stop());
      
      // Validate we have at least one modality
      if (!imageBlob && !audioBlob) {
        throw new Error('Failed to capture any media (no image and no audio)');
      }
      
      console.log('✅ Media captured successfully');
      console.log(`📊 Captured: ${imageBlob ? '✓ Image' : '✗ Image'}, ${audioBlob ? '✓ Audio' : '✗ Audio'}`);
      
      // Send to backend for analysis
      console.log('🤖 Analyzing mood...');
      
      let result;
      
      // Choose appropriate analysis method based on available media
      if (imageBlob && audioBlob) {
        console.log('📤 Sending multimodal data (audio + image)');
        console.log(`   - Audio: ${audioBlob.size}B (${audioBlob.type})`);
        console.log(`   - Image: ${imageBlob.size}B (${imageBlob.type})`);
        result = await this.voiceService.analyzeMultimodal(audioBlob, imageBlob, 10);
      } else if (audioBlob) {
        console.log('📤 Sending audio-only data');
        console.log(`   - Audio: ${audioBlob.size}B (${audioBlob.type})`);
        result = await this.voiceService.analyzeAudio(audioBlob);
      } else if (imageBlob) {
        console.log('📤 Sending image-only data for face detection');
        console.log(`   - Image: ${imageBlob.size}B (${imageBlob.type})`);
        // Create a silent video with just the image for face-only analysis
        // The backend will detect no audio stream and use face-only mode
        result = await this.createSilentVideoAndAnalyze(imageBlob);
      } else {
        throw new Error('No media available for analysis');
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

      // Store the detection for other components to consume
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "detected_mood",
          JSON.stringify({
            mood: detection.mood,
            confidence: detection.confidence,
            timestamp: detection.timestamp,
            source: detection.source,
          }),
        )
      }

      console.log(`✅ Auto mood detection complete: ${detection.mood} (${(detection.confidence * 100).toFixed(1)}%)`);

      return {
        success: true,
        mood: detection.mood,
        confidence: detection.confidence,
        detection,
        audioBlob: audioBlob || undefined
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

  /**
   * Create a silent video from a single image frame for face-only analysis
   */
  private async createSilentVideoAndAnalyze(imageBlob: Blob): Promise<any> {
    try {
      // Create a video element with the image
      const img = new Image();
      const imageUrl = URL.createObjectURL(imageBlob);
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });
      
      // Create canvas and draw the image
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }
      
      // Create a 5-second silent video with multiple frames
      // Note: canvas.captureStream() only captures changes, so we need to continuously redraw
      const stream = canvas.captureStream(15); // 15 fps
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType: 'video/webm;codecs=vp8',
        videoBitsPerSecond: 2500000
      });
      
      const chunks: Blob[] = [];
      
      const videoPromise = new Promise<Blob>((resolve) => {
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };
        
        mediaRecorder.onstop = () => {
          const videoBlob = new Blob(chunks, { type: 'video/webm' });
          resolve(videoBlob);
        };
      });
      
      // Start recording with data chunks every 500ms
      mediaRecorder.start(500);
      
      // Keep redrawing the image to generate frames (15 fps = ~67ms per frame)
      const frameInterval = 1000 / 15;
      const drawFrame = () => {
        ctx.drawImage(img, 0, 0);
      };
      
      // Draw initial frame
      drawFrame();
      
      // Continue drawing frames for 5 seconds
      const intervalId = setInterval(drawFrame, frameInterval);
      
      // Record for 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      clearInterval(intervalId);
      
      // Request final data chunk before stopping
      mediaRecorder.requestData();
      
      // Small delay to ensure final chunk is captured
      await new Promise(resolve => setTimeout(resolve, 100));
      
      mediaRecorder.stop();
      const videoBlob = await videoPromise;
      
      URL.revokeObjectURL(imageUrl);
      
      console.log('✅ Created silent video from image:', videoBlob.size, 'bytes');
      
      // Send silent video to backend (will be detected as face-only)
      return await this.voiceService.analyzeVideo(videoBlob, 10);
      
    } catch (error) {
      console.error('Failed to create silent video:', error);
      throw new Error('Failed to process image for face analysis');
    }
  }

  /**
   * Convert audio to WAV format
   */
  private async convertToWav(audioBlob: Blob): Promise<Blob> {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const channelData = audioBuffer.getChannelData(0);
    const samples = channelData.length;
    const sampleRate = audioBuffer.sampleRate;
    
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);
    
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples * 2, true);
    
    let offset = 44;
    for (let i = 0; i < samples; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  }
}

export const AutoMoodDetectionService = AutoMoodDetectionServiceImpl

