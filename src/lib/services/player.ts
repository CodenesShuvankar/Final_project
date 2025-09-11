import { Track, mockTracks } from '@/lib/mockData';

export interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number; // 0-100
  volume: number; // 0-100
  shuffle: boolean;
  repeat: 'off' | 'track' | 'playlist';
  queue: Track[];
  currentIndex: number;
}

/**
 * Mock player service for managing playback state
 * TODO: Replace with real audio player when backend is integrated
 */
export class PlayerService {
  private static instance: PlayerService;
  private state: PlayerState = {
    currentTrack: null,
    isPlaying: false,
    progress: 0,
    volume: 80,
    shuffle: false,
    repeat: 'off',
    queue: [],
    currentIndex: -1,
  };
  private listeners: ((state: PlayerState) => void)[] = [];
  private progressInterval: NodeJS.Timeout | null = null;

  static getInstance(): PlayerService {
    if (!PlayerService.instance) {
      PlayerService.instance = new PlayerService();
    }
    return PlayerService.instance;
  }

  getState(): PlayerState {
    return { ...this.state };
  }

  subscribe(listener: (state: PlayerState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  async playTrack(track: Track, queue: Track[] = []): Promise<void> {
    this.state.currentTrack = track;
    this.state.queue = queue.length > 0 ? queue : [track];
    this.state.currentIndex = this.state.queue.findIndex(t => t.id === track.id);
    this.state.isPlaying = true;
    this.state.progress = 0;
    
    this.startProgressSimulation();
    this.notifyListeners();
  }

  async play(): Promise<void> {
    if (this.state.currentTrack) {
      this.state.isPlaying = true;
      this.startProgressSimulation();
      this.notifyListeners();
    }
  }

  async pause(): Promise<void> {
    this.state.isPlaying = false;
    this.stopProgressSimulation();
    this.notifyListeners();
  }

  async togglePlayPause(): Promise<void> {
    if (this.state.isPlaying) {
      await this.pause();
    } else {
      await this.play();
    }
  }

  async next(): Promise<void> {
    if (this.state.queue.length === 0) return;

    let nextIndex = this.state.currentIndex + 1;
    
    if (this.state.shuffle) {
      nextIndex = Math.floor(Math.random() * this.state.queue.length);
    } else if (nextIndex >= this.state.queue.length) {
      if (this.state.repeat === 'playlist') {
        nextIndex = 0;
      } else {
        return; // End of queue
      }
    }

    this.state.currentIndex = nextIndex;
    this.state.currentTrack = this.state.queue[nextIndex];
    this.state.progress = 0;
    
    if (this.state.isPlaying) {
      this.startProgressSimulation();
    }
    
    this.notifyListeners();
  }

  async previous(): Promise<void> {
    if (this.state.queue.length === 0) return;

    // If more than 3 seconds have passed, restart current track
    if (this.state.progress > 5) {
      this.state.progress = 0;
      this.notifyListeners();
      return;
    }

    let prevIndex = this.state.currentIndex - 1;
    
    if (prevIndex < 0) {
      if (this.state.repeat === 'playlist') {
        prevIndex = this.state.queue.length - 1;
      } else {
        return; // Beginning of queue
      }
    }

    this.state.currentIndex = prevIndex;
    this.state.currentTrack = this.state.queue[prevIndex];
    this.state.progress = 0;
    
    if (this.state.isPlaying) {
      this.startProgressSimulation();
    }
    
    this.notifyListeners();
  }

  async seek(percentage: number): Promise<void> {
    this.state.progress = Math.max(0, Math.min(100, percentage));
    this.notifyListeners();
  }

  async setVolume(volume: number): Promise<void> {
    this.state.volume = Math.max(0, Math.min(100, volume));
    this.notifyListeners();
  }

  async toggleShuffle(): Promise<void> {
    this.state.shuffle = !this.state.shuffle;
    this.notifyListeners();
  }

  async toggleRepeat(): Promise<void> {
    const modes: ('off' | 'track' | 'playlist')[] = ['off', 'playlist', 'track'];
    const currentIndex = modes.indexOf(this.state.repeat);
    this.state.repeat = modes[(currentIndex + 1) % modes.length];
    this.notifyListeners();
  }

  async addToQueue(track: Track): Promise<void> {
    this.state.queue.push(track);
    this.notifyListeners();
  }

  async removeFromQueue(index: number): Promise<void> {
    if (index >= 0 && index < this.state.queue.length) {
      this.state.queue.splice(index, 1);
      
      // Adjust current index if necessary
      if (index <= this.state.currentIndex) {
        this.state.currentIndex = Math.max(0, this.state.currentIndex - 1);
      }
      
      this.notifyListeners();
    }
  }

  async clearQueue(): Promise<void> {
    this.state.queue = this.state.currentTrack ? [this.state.currentTrack] : [];
    this.state.currentIndex = this.state.currentTrack ? 0 : -1;
    this.notifyListeners();
  }

  private startProgressSimulation(): void {
    this.stopProgressSimulation();
    
    this.progressInterval = setInterval(() => {
      if (this.state.isPlaying && this.state.currentTrack) {
        this.state.progress += 0.5; // Increment by 0.5% every 100ms
        
        if (this.state.progress >= 100) {
          this.state.progress = 100;
          this.handleTrackEnd();
        }
        
        this.notifyListeners();
      }
    }, 100);
  }

  private stopProgressSimulation(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  private async handleTrackEnd(): Promise<void> {
    if (this.state.repeat === 'track') {
      this.state.progress = 0;
      this.startProgressSimulation();
    } else {
      await this.next();
    }
  }
}
