import { mockTracks, mockPlaylists, mockAlbums, mockArtists, Track, Playlist, Album, Artist } from '@/lib/mockData';

/**
 * Mock library service for managing user's music library
 * TODO: Replace with real API calls when backend is integrated
 */
export const LibraryService = {

  async getLikedSongs(): Promise<Track[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockTracks.filter(track => track.liked);
  },

  async getPlaylists(): Promise<Playlist[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockPlaylists;
  },

  async getPlaylist(id: string): Promise<Playlist | null> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockPlaylists.find(playlist => playlist.id === id) || null;
  },

  async getPlaylistTracks(playlistId: string): Promise<Track[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const playlist = mockPlaylists.find(p => p.id === playlistId);
    if (!playlist) return [];
    
    return mockTracks.filter(track => playlist.tracks.includes(track.id));
  },

  async getAlbums(): Promise<Album[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockAlbums;
  },

  async getArtists(): Promise<Artist[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockArtists;
  },

  getLikedSongIds(): string[] {
    try {
      const stored = localStorage.getItem('likedSongs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  async toggleLike(trackId: string): Promise<void> {
    const likedSongs = LibraryService.getLikedSongIds();
    const isLiked = likedSongs.includes(trackId);
    
    if (isLiked) {
      const updatedLikes = likedSongs.filter((id: string) => id !== trackId);
      localStorage.setItem('likedSongs', JSON.stringify(updatedLikes));
    } else {
      likedSongs.push(trackId);
      localStorage.setItem('likedSongs', JSON.stringify(likedSongs));
    }
  },

  async getSavedAlbums(): Promise<Album[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockAlbums.slice(0, 8); // Return some saved albums
  },

  async getFollowedArtists(): Promise<Artist[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockArtists.slice(0, 6); // Return some followed artists
  },

  async createPlaylist(name: string, description: string = ''): Promise<Playlist> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      title: name,
      description,
      coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
      creator: 'User',
      trackCount: 0,
      duration: 0,
      public: false,
      collaborative: false,
      tracks: [],
    };

    mockPlaylists.push(newPlaylist);
    return newPlaylist;
  },

  async addToPlaylist(playlistId: string, trackId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const playlist = mockPlaylists.find(p => p.id === playlistId);
    const track = mockTracks.find(t => t.id === trackId);
    
    if (playlist && track && !playlist.tracks.includes(trackId)) {
      playlist.tracks.push(trackId);
      playlist.trackCount = playlist.tracks.length;
      playlist.duration += track.duration;
      return true;
    }
    
    return false;
  },

  async removeFromPlaylist(playlistId: string, trackId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const playlist = mockPlaylists.find(p => p.id === playlistId);
    const track = mockTracks.find(t => t.id === trackId);
    
    if (playlist && track) {
      const index = playlist.tracks.indexOf(trackId);
      if (index > -1) {
        playlist.tracks.splice(index, 1);
        playlist.trackCount = playlist.tracks.length;
        playlist.duration -= track.duration;
        return true;
      }
    }
    
    return false;
  }
};
