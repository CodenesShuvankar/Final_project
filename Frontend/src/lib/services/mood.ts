import { mockTracks } from "@/lib/mockData"

export type MoodSource = "camera" | "voice" | "auto" | "manual"

export interface MoodDetection {
  mood: string
  confidence: number
  timestamp: Date
  source: MoodSource
}

const MOOD_STORAGE_KEY = "detected_mood"
const MOOD_HISTORY_KEY = "detected_mood_history"

const availableMoods = ["happy", "sad", "energetic", "calm", "focus", "romantic", "chill"]

const randomFrom = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)]

class MoodServiceImpl {
  private static instance: MoodServiceImpl

  static getInstance(): MoodServiceImpl {
    if (!MoodServiceImpl.instance) {
      MoodServiceImpl.instance = new MoodServiceImpl()
    }
    return MoodServiceImpl.instance
  }

  async detectMood(source: MoodSource = "camera"): Promise<MoodDetection> {
    // Simulate detection latency
    await new Promise((resolve) => setTimeout(resolve, 400))

    // Bias detection towards moods used in mock data to keep UI consistent
    const weightedMoods = mockTracks.flatMap((track) => track.mood)
    const mood =
      Math.random() > 0.3 ? randomFrom(weightedMoods) : randomFrom(availableMoods)
    const confidence = Math.min(0.95, 0.6 + Math.random() * 0.35)

    const detection: MoodDetection = {
      mood,
      confidence,
      timestamp: new Date(),
      source,
    }

    this.persistDetection(detection)
    return detection
  }

  getLastDetection(): MoodDetection | null {
    if (typeof window === "undefined") return null
    const raw = window.localStorage.getItem(MOOD_STORAGE_KEY)
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw)
      return {
        ...parsed,
        timestamp: parsed.timestamp ? new Date(parsed.timestamp) : new Date(),
      }
    } catch (error) {
      console.warn("[MoodService] Failed to parse stored detection", error)
      return null
    }
  }

  private persistDetection(detection: MoodDetection) {
    if (typeof window === "undefined") return

    const payload = {
      ...detection,
      timestamp: detection.timestamp.toISOString(),
    }

    window.localStorage.setItem(MOOD_STORAGE_KEY, JSON.stringify(payload))

    try {
      const historyRaw = window.localStorage.getItem(MOOD_HISTORY_KEY)
      const history = historyRaw ? (JSON.parse(historyRaw) as typeof payload[]) : []
      history.unshift(payload)
      const trimmed = history.slice(0, 20)
      window.localStorage.setItem(MOOD_HISTORY_KEY, JSON.stringify(trimmed))
    } catch (error) {
      console.warn("[MoodService] Failed to persist mood history", error)
    }
  }
}

export const MoodService = MoodServiceImpl

export const mapVoiceEmotionToMood = (emotion: string): string => {
  const normalized = emotion.toLowerCase()
  switch (normalized) {
    case "happiness":
    case "joy":
    case "excited":
      return "happy"
    case "sadness":
    case "melancholy":
      return "sad"
    case "anger":
    case "frustrated":
      return "energetic"
    case "fear":
    case "anxious":
      return "calm"
    case "surprise":
      return "chill"
    case "neutral":
      return "focus"
    default:
      return availableMoods.includes(normalized) ? normalized : "happy"
  }
}

