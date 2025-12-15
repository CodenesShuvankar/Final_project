'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Heart, Clock, Music, Users, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SongCard } from '@/components/music/SongCard';
import { PlaylistCard } from '@/components/music/PlaylistCard';
import { ArtistChip } from '@/components/music/ArtistChip';
import { LibraryService } from '@/lib/services/library';
import { usePlayerStore } from '@/lib/store/playerStore';
import { Track, Playlist, Artist, Album } from '@/lib/mockData';

/**
 * Library page showing user's saved music
 */
export default function LibraryPage() {
  const [likedSongs, setLikedSongs] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { playTrack, currentTrack, isPlaying } = usePlayerStore();

  useEffect(() => {
    const loadLibrary = async () => {
      try {
        const [likedData, playlistData] = await Promise.all([
          LibraryService.getLikedSongs(),
          LibraryService.getPlaylists(),
        ]);

        setLikedSongs(likedData);
        setPlaylists(playlistData);
      } catch (error) {
        console.error('Failed to load library:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLibrary();
  }, []);

  const handlePlayTrack = (track: Track) => {
    playTrack(track);
  };

  const handleToggleLike = async (trackId: string) => {
    try {
      await LibraryService.toggleLike(trackId);
      // Refresh liked songs
      const updatedLikedSongs = await LibraryService.getLikedSongs();
      setLikedSongs(updatedLikedSongs);
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      alert('Please enter a playlist name');
      return;
    }

    setIsCreating(true);
    try {
      await LibraryService.createPlaylist(newPlaylistName, newPlaylistDescription);
      // Refresh playlists
      const updatedPlaylists = await LibraryService.getPlaylists();
      setPlaylists(updatedPlaylists);
      // Reset form
      setNewPlaylistName('');
      setNewPlaylistDescription('');
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Failed to create playlist:', error);
      alert('Failed to create playlist. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (!confirm('Are you sure you want to delete this playlist?')) {
      return;
    }

    try {
      await LibraryService.deletePlaylist(playlistId);
      // Refresh playlists
      const updatedPlaylists = await LibraryService.getPlaylists();
      setPlaylists(updatedPlaylists);
    } catch (error) {
      console.error('Failed to delete playlist:', error);
      alert('Failed to delete playlist. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Your Library</h1>
        <p className="text-muted-foreground mt-1">
          Your saved music, playlists, and followed artists.
        </p>
      </div>

      {/* Library Tabs */}
      <Tabs defaultValue="liked" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="liked" className="gap-1 sm:gap-2 text-xs sm:text-sm">
            <Heart className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Liked Songs</span>
            <span className="sm:hidden">Liked</span>
          </TabsTrigger>
          <TabsTrigger value="playlists" className="gap-1 sm:gap-2 text-xs sm:text-sm">
            <Music className="h-3 w-3 sm:h-4 sm:w-4" />
            Playlists
          </TabsTrigger>
        </TabsList>

        <TabsContent value="liked" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Liked Songs</h2>
              <span className="text-sm text-muted-foreground">
                {likedSongs.length} songs
              </span>
            </div>
            
            {likedSongs.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No liked songs yet. Start exploring music to build your collection!
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {likedSongs.map((track: any) => (
                  <SongCard
                    key={track.id}
                    track={track}
                    isLiked={true}
                    onPlay={() => handlePlayTrack(track)}
                    onToggleLike={() => handleToggleLike(track.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="playlists" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Your Playlists</h2>
              <Button className="gap-2" onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4" />
                Create Playlist
              </Button>
            </div>

            {/* Create Playlist Dialog */}
            {showCreateDialog && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-background border rounded-lg p-6 w-full max-w-md space-y-4">
                  <h3 className="text-xl font-bold">Create Playlist</h3>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Playlist Name</label>
                    <input
                      type="text"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      placeholder="My Awesome Playlist"
                      className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description (Optional)</label>
                    <textarea
                      value={newPlaylistDescription}
                      onChange={(e) => setNewPlaylistDescription(e.target.value)}
                      placeholder="Add a description..."
                      rows={3}
                      className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground resize-none"
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCreateDialog(false);
                        setNewPlaylistName('');
                        setNewPlaylistDescription('');
                      }}
                      disabled={isCreating}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreatePlaylist}
                      disabled={isCreating || !newPlaylistName.trim()}
                    >
                      {isCreating ? 'Creating...' : 'Create'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {playlists.length === 0 ? (
              <div className="text-center py-12">
                <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  No playlists yet. Create your first playlist to organize your music!
                </p>
                <Button className="gap-2" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4" />
                  Create Your First Playlist
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {playlists.map((playlist: any) => (
                  <div key={playlist.id} className="relative group">
                    <PlaylistCard
                      playlist={playlist}
                      onPlay={() => console.log('Play playlist:', playlist.id)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-background text-destructive hover:text-destructive"
                      onClick={() => handleDeletePlaylist(playlist.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>


      </Tabs>
    </div>
  );
}
