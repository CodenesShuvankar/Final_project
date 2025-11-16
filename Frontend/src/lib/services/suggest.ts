import {
  Track,
  mockPlaylists,
  mockTracks,
} from "@/lib/mockData"
import { MoodDetection } from "@/lib/services/mood"

export interface SuggestFilters {
  energy: number
  tempo: number
  valence: number
  decade?: string
  languages: string[]
  contexts: string[]
  historyWeight?: number
}

export interface SuggestResult {
  id: string
  track: Track
  score: number
  reasons: string[]
}

interface SuggestRequest {
  mood?: MoodDetection
  filters: SuggestFilters
}

interface SuggestResponse {
  results: SuggestResult[]
  source: "mock"
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const scoreTrack = (track: Track, filters: SuggestFilters, mood?: MoodDetection): { score: number; reasons: string[] } => {
  const reasons: string[] = []
  let score = 0

  if (mood) {
    const matchesMood = track.mood.includes(mood.mood)
    if (matchesMood) {
      score += 0.35
      reasons.push(`Matches your ${mood.mood} mood`)
    }
  }

  const energyDelta = Math.abs(track.energy - filters.energy)
  score += clamp(0.3 - energyDelta, 0, 0.3)
  reasons.push(
    energyDelta < 0.1
      ? "Energy level closely matches your preference"
      : "Energy level is similar to your preference",
  )

  const valenceDelta = Math.abs(track.valence - filters.valence)
  score += clamp(0.2 - valenceDelta, 0, 0.2)

  const tempoDelta = Math.abs(track.tempo - filters.tempo)
  if (tempoDelta < 15) {
    score += 0.1
    reasons.push("Tempo aligns with your setting")
  }

  if (filters.decade) {
    const decade = `${Math.floor(track.year / 10) * 10}s`
    if (decade === filters.decade) {
      score += 0.05
      reasons.push(`Released in the ${decade}`)
    }
  }

  if (filters.contexts.length > 0) {
    const contextMatch = filters.contexts.some((context) =>
      track.mood.some((moodTag) => context.toLowerCase().includes(moodTag)),
    )
    if (contextMatch) {
      score += 0.05
      reasons.push("Fits your current activity")
    }
  }

  score = clamp(score, 0, 1)

  return {
    score,
    reasons,
  }
}

const mapToSuggestResult = (track: Track, score: number, reasons: string[]): SuggestResult => ({
  id: `${track.id}-${Math.random().toString(36).slice(2, 8)}`,
  track,
  score,
  reasons,
})

class SuggestServiceImpl {
  private static instance: SuggestServiceImpl

  static getInstance(): SuggestServiceImpl {
    if (!SuggestServiceImpl.instance) {
      SuggestServiceImpl.instance = new SuggestServiceImpl()
    }
    return SuggestServiceImpl.instance
  }

  async getSuggestions(request: SuggestRequest): Promise<SuggestResponse> {
    // Simulate latency
    await new Promise((resolve) => setTimeout(resolve, 500))

    const scored = mockTracks.map((track) => {
      const { score, reasons } = scoreTrack(track, request.filters, request.mood)
      return mapToSuggestResult(track, score, reasons)
    })

    const sorted = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)

    return {
      results: sorted,
      source: "mock",
    }
  }

  async refineResults(
    currentResults: SuggestResult[],
    type: "more_like_this" | "less_energetic" | "skip_artist" | "surprise_me",
    trackId?: string,
  ): Promise<SuggestResponse> {
    if (currentResults.length === 0) {
      return { results: [], source: "mock" }
    }

    let results: SuggestResult[] = currentResults

    if (type === "surprise_me") {
      const shuffled = [...mockTracks].sort(() => Math.random() - 0.5).slice(0, 10)
      results = shuffled.map((track, index) =>
        mapToSuggestResult(track, clamp(0.6 - index * 0.04, 0.3, 0.8), ["Surprise pick just for you"]),
      )
      return { results, source: "mock" }
    }

    const selected = trackId
      ? currentResults.find((result) => result.track.id === trackId)?.track
      : currentResults[0].track

    if (!selected) {
      return { results: currentResults, source: "mock" }
    }

    switch (type) {
      case "more_like_this": {
        const similar = mockTracks
          .filter((track) => track.id !== selected.id)
          .filter(
            (track) =>
              track.genre === selected.genre ||
              track.mood.some((mood) => selected.mood.includes(mood)),
          )
          .slice(0, 12)

        results = similar.map((track) =>
          mapToSuggestResult(track, clamp(0.8 - Math.random() * 0.2, 0.5, 0.9), [
            `Similar ${selected.genre} vibe`,
            "Matches the mood you liked",
          ]),
        )
        break
      }
      case "less_energetic": {
        const filtered = mockTracks
          .filter((track) => track.energy <= selected.energy)
          .slice(0, 12)

        results = filtered.map((track) =>
          mapToSuggestResult(track, clamp(0.7 - Math.random() * 0.25, 0.4, 0.8), [
            "Lower energy alternative",
            "Keeps similar mood but mellower",
          ]),
        )
        break
      }
      case "skip_artist": {
        const filtered = currentResults.filter((result) => result.track.artist !== selected.artist)
        const replacements = mockTracks
          .filter((track) => track.artist !== selected.artist)
          .slice(0, Math.max(0, 12 - filtered.length))
          .map((track) =>
            mapToSuggestResult(track, clamp(0.65 - Math.random() * 0.2, 0.4, 0.75), [
              "Fresh artist recommendation",
            ]),
          )

        results = [...filtered, ...replacements].slice(0, 12)
        break
      }
      default:
        break
    }

    return {
      results,
      source: "mock",
    }
  }

  getSuggestedPlaylists(limit = 4) {
    return mockPlaylists.slice(0, limit)
  }
}

export const SuggestService = SuggestServiceImpl

