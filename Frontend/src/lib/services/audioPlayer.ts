export interface AudioPreviewTrack {
  id: string
  name: string
  artists: string[]
  preview_url: string | null
  image_url: string | null
}

export interface AudioPlayerState {
  currentTrack: AudioPreviewTrack | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
}

type Subscriber = (state: AudioPlayerState) => void

class AudioPlayerServiceImpl {
  private static instance: AudioPlayerServiceImpl
  private audio: HTMLAudioElement | null = null
  private state: AudioPlayerState = {
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 70,
  }

  private subscribers = new Set<Subscriber>()

  static getInstance(): AudioPlayerServiceImpl {
    if (!AudioPlayerServiceImpl.instance) {
      AudioPlayerServiceImpl.instance = new AudioPlayerServiceImpl()
    }
    return AudioPlayerServiceImpl.instance
  }

  subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback)
    return () => {
      this.subscribers.delete(callback)
    }
  }

  getState(): AudioPlayerState {
    return this.state
  }

  async playTrack(track: AudioPreviewTrack): Promise<void> {
    if (typeof window === "undefined") return

    if (!this.audio) {
      this.audio = new Audio()
      this.audio.crossOrigin = "anonymous"
      this.audio.addEventListener("timeupdate", this.handleTimeUpdate)
      this.audio.addEventListener("loadedmetadata", this.handleMetadata)
      this.audio.addEventListener("ended", this.handleEnded)
    }

    if (!track.preview_url) {
      this.updateState({
        currentTrack: track,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
      })
      return
    }

    if (this.audio.src !== track.preview_url) {
      this.audio.src = track.preview_url
      this.audio.currentTime = 0
    }

    this.audio.volume = this.state.volume / 100
    await this.audio.play().catch((error) => {
      console.error("[AudioPlayerService] Failed to play preview", error)
      this.updateState({
        currentTrack: track,
        isPlaying: false,
      })
    })

    this.updateState({
      currentTrack: track,
      isPlaying: true,
    })
  }

  async togglePlayPause(): Promise<void> {
    if (!this.audio || !this.state.currentTrack?.preview_url) {
      return
    }

    if (this.state.isPlaying) {
      this.audio.pause()
      this.updateState({ isPlaying: false })
    } else {
      await this.audio.play().catch((error) => {
        console.error("[AudioPlayerService] togglePlayPause failed", error)
      })
      this.updateState({ isPlaying: true })
    }
  }

  setVolume(volume: number) {
    const clamped = Math.max(0, Math.min(100, volume))
    this.state.volume = clamped
    if (this.audio) {
      this.audio.volume = clamped / 100
    }
    this.notify()
  }

  seek(percent: number) {
    if (!this.audio || this.state.duration === 0) return
    const clamped = Math.max(0, Math.min(100, percent))
    const newTime = (clamped / 100) * this.state.duration
    this.audio.currentTime = newTime
    this.updateState({
      currentTime: newTime,
    })
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  private handleTimeUpdate = () => {
    if (!this.audio) return
    this.updateState({
      currentTime: this.audio.currentTime,
    })
  }

  private handleMetadata = () => {
    if (!this.audio) return
    this.updateState({
      duration: this.audio.duration,
    })
  }

  private handleEnded = () => {
    this.updateState({
      isPlaying: false,
      currentTime: this.state.duration,
    })
  }

  private updateState(partial: Partial<AudioPlayerState>) {
    this.state = {
      ...this.state,
      ...partial,
    }
    this.notify()
  }

  private notify() {
    for (const subscriber of this.subscribers) {
      subscriber({ ...this.state })
    }
  }
}

export const AudioPlayerService = AudioPlayerServiceImpl

