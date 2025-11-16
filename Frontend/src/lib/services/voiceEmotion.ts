import { mapVoiceEmotionToMood } from "@/lib/services/mood"
import { supabase } from "@/lib/supabaseClient"

export interface VoiceEmotionPrediction {
  emotion: string
  confidence: number
  energy: number
  valence: number
  pitch?: number
  speakingRate?: number
}

export interface VoiceEmotionResult {
  success: boolean
  prediction?: VoiceEmotionPrediction
  analysisId?: string
  error?: string
}

export interface MultimodalAnalysis {
  merged_emotion: string
  merged_confidence: number
  agreement: "strong" | "moderate" | "weak" | "conflict"
  summary: string
  explanation: string
  voice_prediction: VoiceEmotionPrediction
  face_prediction: {
    emotion: string
    confidence: number
  }
}

export interface MultimodalResult extends VoiceEmotionResult {
  analysis?: MultimodalAnalysis
  recommendations?: string[]
}

const EMOTIONS = ["happy", "sad", "neutral", "angry", "fear", "surprise", "disgust"]

const randomBetween = (min: number, max: number): number =>
  Math.random() * (max - min) + min

class VoiceEmotionServiceImpl {
  private static instance: VoiceEmotionServiceImpl

  static getInstance(): VoiceEmotionServiceImpl {
    if (!VoiceEmotionServiceImpl.instance) {
      VoiceEmotionServiceImpl.instance = new VoiceEmotionServiceImpl()
    }
    return VoiceEmotionServiceImpl.instance
  }

  async analyzeVoiceEmotion(audioBlob: Blob): Promise<VoiceEmotionResult> {
    if (!audioBlob || audioBlob.size === 0) {
      return {
        success: false,
        error: "No audio provided",
      }
    }

    try {
      // Try backend API first
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      console.log(`🔗 Calling backend API: ${apiUrl}/analyze-voice`)
      
      const formData = new FormData()
      formData.append('audio_file', audioBlob, 'recording.wav')

      // Get auth token if user is logged in
      const headers: HeadersInit = {}
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
        console.log('🔑 Including auth token in request')
      }

      const response = await fetch(`${apiUrl}/analyze-voice`, {
        method: 'POST',
        headers,
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Backend voice analysis response:', data)
        
        if (data.success && data.prediction) {
          return {
            success: true,
            prediction: {
              emotion: data.prediction.emotion,
              confidence: data.prediction.confidence,
              energy: data.prediction.energy || 0.7,
              valence: data.prediction.valence || 0.7,
              pitch: data.prediction.pitch,
              speakingRate: data.prediction.speaking_rate,
            },
            analysisId: data.analysis_id || `voice-${Date.now()}`,
          }
        }
      }
      
      console.warn('⚠️ Backend API failed, falling back to mock analysis')
    } catch (error) {
      console.error('❌ Backend API error:', error)
      console.log('📦 Falling back to mock analysis')
    }

    // Fallback to mock analysis
    await new Promise((resolve) => setTimeout(resolve, 600))

    const emotion = EMOTIONS[Math.floor(Math.random() * EMOTIONS.length)]
    const confidence = randomBetween(0.6, 0.92)
    const prediction: VoiceEmotionPrediction = {
      emotion,
      confidence,
      energy: randomBetween(0.3, 0.85),
      valence: randomBetween(0.2, 0.9),
      pitch: randomBetween(120, 250),
      speakingRate: randomBetween(0.8, 1.4),
    }

    return {
      success: true,
      prediction,
      analysisId: `voice-${Date.now()}`,
    }
  }

  async analyzeMultimodal(audioBlob: Blob, imageBlob: Blob, trackLimit = 20): Promise<MultimodalResult> {
    if (!audioBlob || audioBlob.size === 0 || !imageBlob || imageBlob.size === 0) {
      return {
        success: false,
        error: "Missing audio or image data",
      }
    }

    try {
      // Try backend API first
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      console.log(`🔗 Calling backend API: ${apiUrl}/analyze-voice-and-face`)
      
      const formData = new FormData()
      formData.append('audio_file', audioBlob, 'recording.wav')
      formData.append('image_file', imageBlob, 'capture.jpg')

      // Get auth token if user is logged in
      const headers: HeadersInit = {}
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
        console.log('🔑 Including auth token in request')
      }

      const response = await fetch(`${apiUrl}/analyze-voice-and-face?limit=${trackLimit}`, {
        method: 'POST',
        headers,
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Backend multimodal analysis response:', data)
        
        if (data.success && data.analysis) {
          const analysis = data.analysis
          
          return {
            success: true,
            prediction: {
              emotion: analysis.voice_prediction.emotion,
              confidence: analysis.voice_prediction.confidence,
              energy: analysis.voice_prediction.energy || 0.7,
              valence: analysis.voice_prediction.valence || 0.7,
              pitch: analysis.voice_prediction.pitch,
              speakingRate: analysis.voice_prediction.speaking_rate,
            },
            analysisId: `multimodal-${Date.now()}`,
            analysis: {
              merged_emotion: analysis.merged_emotion,
              merged_confidence: analysis.merged_confidence,
              agreement: analysis.agreement,
              summary: analysis.summary || analysis.explanation,
              explanation: analysis.explanation,
              voice_prediction: {
                emotion: analysis.voice_prediction.emotion,
                confidence: analysis.voice_prediction.confidence,
              },
              face_prediction: {
                emotion: analysis.face_prediction.emotion,
                confidence: analysis.face_prediction.confidence,
              },
            },
            recommendations: data.recommendations ? this.generateRecommendations(analysis.merged_emotion) : undefined,
          }
        }
      }
      
      console.warn('⚠️ Backend API failed, falling back to mock analysis')
    } catch (error) {
      console.error('❌ Backend API error:', error)
      console.log('📦 Falling back to mock analysis')
    }

    // Fallback to mock analysis
    const voiceResult = await this.analyzeVoiceEmotion(audioBlob)
    if (!voiceResult.success || !voiceResult.prediction) {
      return {
        success: false,
        error: voiceResult.error ?? "Voice analysis failed",
      }
    }

    // Simulate face emotion detection
    const faceEmotion = EMOTIONS[Math.floor(Math.random() * EMOTIONS.length)]
    const faceConfidence = randomBetween(0.55, 0.9)

    const voiceMood = mapVoiceEmotionToMood(voiceResult.prediction.emotion)
    const faceMood = mapVoiceEmotionToMood(faceEmotion)

    const agreement = this.determineAgreement(voiceMood, faceMood, voiceResult.prediction.confidence, faceConfidence)
    const merged = this.mergeEmotions(voiceMood, faceMood, agreement)

    const analysis: MultimodalAnalysis = {
      merged_emotion: merged.mood,
      merged_confidence: merged.confidence,
      agreement,
      summary: this.buildSummary(merged.mood, agreement, trackLimit),
      explanation: this.buildExplanation(voiceMood, faceMood, agreement),
      voice_prediction: voiceResult.prediction,
      face_prediction: {
        emotion: faceMood,
        confidence: faceConfidence,
      },
    }

    return {
      ...voiceResult,
      success: true,
      analysis,
      recommendations: this.generateRecommendations(analysis.merged_emotion),
    }
  }

  getEmotionEmoji(mood: string): string {
    switch (mood.toLowerCase()) {
      case "happy":
        return "😊"
      case "sad":
        return "😢"
      case "energetic":
        return "⚡"
      case "calm":
        return "🧘"
      case "focus":
        return "🎯"
      case "romantic":
        return "💖"
      case "chill":
        return "🌙"
      default:
        return "🎵"
    }
  }

  getAgreementIcon(agreement: string): string {
    switch (agreement) {
      case "strong":
        return "✅"
      case "moderate":
        return "👍"
      case "weak":
        return "⚖️"
      case "conflict":
        return "⚠️"
      default:
        return "ℹ️"
    }
  }

  private determineAgreement(
    voiceMood: string,
    faceMood: string,
    voiceConfidence: number,
    faceConfidence: number,
  ): MultimodalAnalysis["agreement"] {
    if (voiceMood === faceMood && Math.min(voiceConfidence, faceConfidence) > 0.7) {
      return "strong"
    }

    if (voiceMood === faceMood) {
      return "moderate"
    }

    if (Math.abs(voiceConfidence - faceConfidence) < 0.15) {
      return "conflict"
    }

    return "weak"
  }

  private mergeEmotions(
    voiceMood: string,
    faceMood: string,
    agreement: MultimodalAnalysis["agreement"],
  ): { mood: string; confidence: number } {
    if (agreement === "strong") {
      return { mood: voiceMood, confidence: 0.92 }
    }
    if (agreement === "moderate") {
      return { mood: voiceMood, confidence: 0.82 }
    }
    if (agreement === "weak") {
      return { mood: voiceMood, confidence: 0.7 }
    }
    return { mood: voiceMood, confidence: 0.6 }
  }

  private buildSummary(mood: string, agreement: string, limit: number): string {
    const moodLabel = mood.charAt(0).toUpperCase() + mood.slice(1)
    const agreementText =
      agreement === "strong"
        ? "High agreement between voice and facial cues"
        : agreement === "conflict"
        ? "Voice and facial expressions show some differences"
        : "Signals indicate a blended emotional state"
    return `${moodLabel} mood detected. ${agreementText}. Prepared ${limit} tailored tracks to match this vibe.`
  }

  private buildExplanation(voiceMood: string, faceMood: string, agreement: string): string {
    if (agreement === "strong") {
      return `Both voice and face strongly indicate a ${voiceMood} mood, giving high confidence in the prediction.`
    }

    if (agreement === "conflict") {
      return `Voice suggests ${voiceMood}, while facial cues point toward ${faceMood}. Recommendations balance both signals.`
    }

    if (agreement === "moderate") {
      return `Signals lean toward ${voiceMood}, with supporting evidence from facial analysis.`
    }

    return `We detected ${voiceMood} from voice with softer support from facial cues (${faceMood}).`
  }

  private generateRecommendations(mood: string): string[] {
    switch (mood) {
      case "happy":
        return ["Upbeat pop anthems", "Feel-good dance tracks", "Bright indie tunes"]
      case "sad":
        return ["Warm acoustic ballads", "Ambient piano pieces", "Reflective lo-fi beats"]
      case "energetic":
        return ["High-tempo electronic", "Driving alt-rock", "Motivational hip-hop"]
      case "calm":
        return ["Gentle lo-fi instrumentals", "Smooth jazz evenings", "Rainy day acoustics"]
      case "focus":
        return ["Deep focus electronica", "Soft piano concentration", "Low-key ambient textures"]
      case "chill":
        return ["Late-night R&B", "Dreamy synthwave", "Relaxed indie grooves"]
      default:
        return ["Curated blend of tailored tracks"]
    }
  }
}

export const VoiceEmotionService = VoiceEmotionServiceImpl

