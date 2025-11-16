import { create } from "zustand"
import { Track } from "@/lib/mockData"
import { SpotifyAuthService } from "@/lib/services/spotifyAuth"
import { HistoryService } from "@/lib/services/historyService"

type RepeatMode = "off" | "context" | "track"

export interface PlayerState {
  queue: Track[]
  currentIndex: number
  currentTrack: Track | null
  isPlaying: boolean
  progress: number
  volume: number
  shuffle: boolean
  repeat: RepeatMode
  isSpotifyConnected: boolean
  hasPremium: boolean
  playerService: PlayerControlService
  initialize: () => void
  cleanup: () => void
  playTrack: (track: Track, queue?: Track[]) => void
  setQueue: (queue: Track[]) => void
  setProgress: (progress: number) => void
  setIsPlaying: (isPlaying: boolean) => void
  setVolume: (volume: number) => void
  toggleShuffle: () => void
  cycleRepeat: () => void
  removeFromQueue: (index: number) => void
  clearQueue: () => void
}

const PROGRESS_INTERVAL_MS = 1000

let progressTimer: number | null = null
let playerServiceSingleton: PlayerControlService

const startProgressTimer = () => {
  if (typeof window === "undefined") return
  if (progressTimer !== null) return

  progressTimer = window.setInterval(() => {
    const state = usePlayerStore.getState()
    if (!state.isPlaying || !state.currentTrack) {
      return
    }

    const trackDuration = state.currentTrack.duration || 0
    if (trackDuration === 0) {
      return
    }

    const increment = (100 / trackDuration) * (PROGRESS_INTERVAL_MS / 1000)
    const nextProgress = state.progress + increment

    if (nextProgress >= 100) {
      // Track as completed in history before moving to next song
      if (state.currentTrack) {
        trackListeningHistory(state.currentTrack, true).catch(console.error)
      }
      
      if (state.repeat === "track") {
        usePlayerStore.setState({ progress: 0 })
      } else {
        playerServiceSingleton.next()
      }
    } else {
      usePlayerStore.setState({ progress: Math.min(100, nextProgress) })
    }
  }, PROGRESS_INTERVAL_MS)
}

const trackListeningHistory = async (track: Track, completed: boolean) => {
  try {
    // Get detected mood if available
    const storedMood = localStorage.getItem('detected_mood');
    let mood: string | undefined;
    
    if (storedMood) {
      try {
        const parsed = JSON.parse(storedMood);
        mood = parsed.mood || parsed;
      } catch {
        mood = storedMood;
      }
    }
    
    await HistoryService.addToHistory(
      track.id,
      track.title,
      track.artist,
      track.album,
      track.coverUrl,
      undefined, // spotify_url
      track.duration ? track.duration * 1000 : undefined,
      completed,
      mood
    );
  } catch (error) {
    console.error('Failed to track listening history:', error);
  }
}

const stopProgressTimer = () => {
  if (typeof window === "undefined") return
  if (progressTimer !== null) {
    window.clearInterval(progressTimer)
    progressTimer = null
  }
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  currentIndex: -1,
  currentTrack: null,
  isPlaying: false,
  progress: 0,
  volume: 70,
  shuffle: false,
  repeat: "off",
  isSpotifyConnected: false,
  hasPremium: false,
  playerService: undefined as unknown as PlayerControlService,
  initialize: () => {
    if (typeof window === "undefined") return
    const cleanup = () => {
      stopProgressTimer()
      set({
        isPlaying: false,
        progress: 0,
      })
    }
    window.addEventListener("beforeunload", cleanup)
  },
  cleanup: () => {
    stopProgressTimer()
    set({
      isPlaying: false,
      progress: 0,
      currentTrack: null,
      queue: [],
      currentIndex: -1,
    })
  },
  playTrack: (track, queue) => {
    const currentQueue = queue && queue.length > 0 ? queue : get().queue
    let nextQueue = currentQueue

    if (!queue || queue.length === 0) {
      const existingIndex = currentQueue.findIndex((t) => t.id === track.id)
      if (existingIndex === -1) {
        nextQueue = [...currentQueue, track]
      }
    }

    const index = nextQueue.findIndex((t) => t.id === track.id)

    set({
      queue: nextQueue,
      currentTrack: track,
      currentIndex: index === -1 ? 0 : index,
      isPlaying: true,
      progress: 0,
    })

    // Track in history when song starts playing
    trackListeningHistory(track, false).catch(console.error)

    startProgressTimer()
  },
  setQueue: (queue) => {
    set({ queue })
  },
  setProgress: (progress) => {
    set({ progress })
  },
  setIsPlaying: (isPlaying) => {
    set({ isPlaying })
    if (isPlaying) {
      startProgressTimer()
    } else {
      stopProgressTimer()
    }
  },
  setVolume: (volume) => {
    set({ volume })
  },
  toggleShuffle: () => {
    set((state) => ({ shuffle: !state.shuffle }))
  },
  cycleRepeat: () => {
    set((state) => {
      const order: RepeatMode[] = ["off", "context", "track"]
      const nextIndex = (order.indexOf(state.repeat) + 1) % order.length
      return { repeat: order[nextIndex] }
    })
  },
  removeFromQueue: (index) => {
    set((state) => {
      const nextQueue = state.queue.filter((_, i) => i !== index)
      let nextIndex = state.currentIndex
      let nextTrack = state.currentTrack

      if (index < state.currentIndex) {
        nextIndex = Math.max(0, state.currentIndex - 1)
      } else if (index === state.currentIndex) {
        nextTrack = nextQueue[nextIndex] ?? null
      }

      return {
        queue: nextQueue,
        currentIndex: nextTrack ? nextIndex : -1,
        currentTrack: nextTrack,
        isPlaying: Boolean(nextTrack) && state.isPlaying,
      }
    })
  },
  clearQueue: () => {
    set({
      queue: [],
      currentTrack: null,
      currentIndex: -1,
      isPlaying: false,
      progress: 0,
    })
    stopProgressTimer()
  },
}))

class PlayerControlService {
  playTrack(track: Track, queue?: Track[]) {
    usePlayerStore.getState().playTrack(track, queue)
  }

  togglePlayPause() {
    const { isPlaying, setIsPlaying, currentTrack } = usePlayerStore.getState()
    if (!currentTrack) {
      return
    }
    setIsPlaying(!isPlaying)
  }

  next() {
    const state = usePlayerStore.getState()
    if (state.queue.length === 0) {
      return
    }

    if (state.repeat === "track" && state.currentTrack) {
      state.playTrack(state.currentTrack, state.queue)
      return
    }

    const queue = [...state.queue]
    let nextIndex = state.currentIndex

    if (state.shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length)
    } else {
      nextIndex = state.currentIndex + 1
      if (nextIndex >= queue.length) {
        if (state.repeat === "context") {
          nextIndex = 0
        } else {
          usePlayerStore.setState({
            isPlaying: false,
            progress: 100,
          })
          stopProgressTimer()
          return
        }
      }
    }

    const nextTrack = queue[nextIndex]
    if (nextTrack) {
      state.playTrack(nextTrack, queue)
    }
  }

  previous() {
    const state = usePlayerStore.getState()
    if (state.queue.length === 0) {
      return
    }

    let prevIndex = state.currentIndex - 1
    if (prevIndex < 0) {
      prevIndex = state.repeat === "context" ? state.queue.length - 1 : 0
    }

    const prevTrack = state.queue[prevIndex]
    if (prevTrack) {
      state.playTrack(prevTrack, state.queue)
    }
  }

  seek(progress: number) {
    const clamped = Math.max(0, Math.min(100, progress))
    usePlayerStore.setState({ progress: clamped })
  }

  setVolume(volume: number) {
    const clamped = Math.max(0, Math.min(100, volume))
    usePlayerStore.getState().setVolume(clamped)
  }

  toggleShuffle() {
    usePlayerStore.getState().toggleShuffle()
  }

  toggleRepeat() {
    usePlayerStore.getState().cycleRepeat()
  }

  removeFromQueue(index: number) {
    usePlayerStore.getState().removeFromQueue(index)
  }

  clearQueue() {
    usePlayerStore.getState().clearQueue()
  }

  async connectToSpotify(): Promise<boolean> {
    const authService = SpotifyAuthService.getInstance()
    try {
      if (!authService.isAuthenticated()) {
        const redirected = await authService.beginAuth()
        if (redirected) {
          return false
        }
      }

      const hasPremium = await authService.hasPremium().catch(() => false)
      usePlayerStore.setState({
        isSpotifyConnected: true,
        hasPremium,
      })

      return hasPremium
    } catch (error) {
      console.error("Failed to connect to Spotify:", error)
      return false
    }
  }

  disconnectFromSpotify() {
    const authService = SpotifyAuthService.getInstance()
    authService.logout()
    usePlayerStore.setState({
      isSpotifyConnected: false,
      hasPremium: false,
    })
  }
}

playerServiceSingleton = new PlayerControlService()
usePlayerStore.setState({ playerService: playerServiceSingleton })

export { PlayerControlService }

