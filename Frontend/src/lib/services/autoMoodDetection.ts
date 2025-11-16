import { MoodDetection, MoodService } from "@/lib/services/mood"
import { VoiceEmotionService } from "@/lib/services/voiceEmotion"

interface AutoMoodDetectionResult {
  success: boolean
  mood?: string
  confidence?: number
  detection?: MoodDetection
}

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
    try {
      console.log('🎯 Starting real mood detection with camera and voice...');
      
      // Get camera and microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 480 }, 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      console.log('📹 Camera and microphone access granted');
      
      // Create video element to capture frame
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
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }
      
      ctx.drawImage(video, 0, 0);
      
      const imageBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.95);
      });
      
      console.log('📸 Image captured');
      
      // Record audio
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
      console.log('🎙️ Recording audio for 10 seconds...');
      
      // Record for 10 seconds
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      mediaRecorder.stop();
      const audioBlob = await audioPromise;
      
      console.log('🎙️ Audio recorded');
      
      // Stop all tracks and cleanup
      stream.getTracks().forEach(track => track.stop());
      document.body.removeChild(video);
      
      if (!imageBlob || !audioBlob) {
        throw new Error('Failed to capture media');
      }
      
      // Send to backend for analysis
      console.log('🤖 Analyzing mood...');
      const result = await this.voiceService.analyzeMultimodal(audioBlob, imageBlob, 10);
      
      if (!result.success || !result.analysis) {
        throw new Error(result.error || 'Mood detection failed');
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
      }
    } catch (error) {
      console.warn("[AutoMoodDetectionService] Mood detection failed:", error)
      
      // Fallback to happy
      const fallback: MoodDetection = {
        mood: "happy",
        confidence: 0.55,
        timestamp: new Date(),
        source: "auto",
      }
      
      // Still store fallback
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "detected_mood",
          JSON.stringify({
            mood: fallback.mood,
            confidence: fallback.confidence,
            timestamp: fallback.timestamp,
            source: fallback.source,
          }),
        )
      }
      
      return {
        success: false,
        mood: fallback.mood,
        confidence: fallback.confidence,
        detection: fallback,
      }
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

