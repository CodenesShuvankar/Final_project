import { create } from 'zustand';
import { PlayerService, PlayerState } from '@/lib/services/player';

interface PlayerStore extends PlayerState {
  playerService: PlayerService;
  playTrack: (track: any, queue?: any[]) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seek: (percentage: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  toggleShuffle: () => Promise<void>;
  toggleRepeat: () => Promise<void>;
  initialize: () => void;
  cleanup: () => void;
}

export const usePlayerStore = create<PlayerStore>((set, get) => {
  const playerService = PlayerService.getInstance();
  let unsubscribe: (() => void) | null = null;

  return {
    // Initial state
    currentTrack: null,
    isPlaying: false,
    progress: 0,
    volume: 80,
    shuffle: false,
    repeat: 'off',
    queue: [],
    currentIndex: -1,
    playerService,

    // Player actions
    playTrack: async (track: any, queue?: any[]) => {
      await playerService.playTrack(track, queue);
    },

    play: async () => {
      await playerService.play();
    },

    pause: async () => {
      await playerService.pause();
    },

    togglePlayPause: async () => {
      await playerService.togglePlayPause();
    },

    next: async () => {
      await playerService.next();
    },

    previous: async () => {
      await playerService.previous();
    },

    seek: async (percentage: number) => {
      await playerService.seek(percentage);
    },

    setVolume: async (volume: number) => {
      await playerService.setVolume(volume);
    },

    toggleShuffle: async () => {
      await playerService.toggleShuffle();
    },

    toggleRepeat: async () => {
      await playerService.toggleRepeat();
    },

    initialize: () => {
      // Subscribe to player service updates
      unsubscribe = playerService.subscribe((state) => {
        set(state);
      });
      
      // Set initial state
      set(playerService.getState());
    },

    cleanup: () => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    },
  };
});
