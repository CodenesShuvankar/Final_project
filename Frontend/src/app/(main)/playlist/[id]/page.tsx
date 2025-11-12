'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Play, Pause, Heart, MoreHorizontal, Clock, Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SongCard } from '@/components/music/SongCard';
import { Badge } from '@/components/ui/badge';
import { mockPlaylists, Track } from '@/lib/mockData';
import { usePlayerStore } from '@/lib/store/playerStore';
import { LibraryService } from '@/lib/services/library';

/**
 * Individual playlist page
 */
export default function PlaylistPage() {
  const params = useParams();
  const playlistId = params.id as string;
  
  const [playlist, setPlaylist] = useState<any>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);

  const { playTrack, currentTrack, isPlaying } = usePlayerStore();

  useEffect(() => {
    const loadPlaylist = async () => {
      try {
        // Load playlist from LibraryService (checks user playlists in localStorage)
        const userPlaylist = await LibraryService.getPlaylist(playlistId);
        
        if (userPlaylist) {
          setPlaylist(userPlaylist);
          // Load tracks for this playlist
          const playlistTracks = await LibraryService.getPlaylistTracks(playlistId);
          setTracks(playlistTracks);
        } else {
          // Fallback to mock playlists if not found in user's library
          const mockPlaylist = mockPlaylists.find(p => p.id === playlistId);
          if (mockPlaylist) {
            setPlaylist(mockPlaylist);
            const playlistTracks = await LibraryService.getPlaylistTracks(playlistId);
            setTracks(playlistTracks);
          }
        }
      } catch (error) {
        console.error('Failed to load playlist:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPlaylist();
    
    // Listen for playlist updates (when songs are added)
    const handlePlaylistUpdate = (event: any) => {
      if (event.detail?.playlistId === playlistId) {
        console.log('🔄 Playlist updated, reloading...');
        loadPlaylist();
      }
    };
    
    window.addEventListener('playlistUpdated', handlePlaylistUpdate);
    
    return () => {
      window.removeEventListener('playlistUpdated', handlePlaylistUpdate);
    };
  }, [playlistId]);

  const handlePlayPlaylist = () => {
    if (tracks.length > 0) {
      playTrack(tracks[0]);
    }
  };

  const handlePlayTrack = (track: Track) => {
    playTrack(track);
  };

  const handleToggleLike = async (trackId: string) => {
    try {
      await LibraryService.toggleLike(trackId);
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  };

  const totalDuration = tracks.reduce((sum, track) => sum + track.duration, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading playlist...</p>
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">Playlist not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Playlist Header */}
      <div className="flex items-end gap-6 p-6 bg-gradient-to-b from-primary/20 to-background rounded-lg">
        <div className="w-48 h-48 rounded-lg overflow-hidden shadow-lg">
          <img
            src={playlist.coverUrl}
            alt={playlist.title}
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <Badge variant="secondary" className="mb-2">
            {playlist.public ? 'Public Playlist' : 'Private Playlist'}
          </Badge>
          
          <h1 className="text-4xl font-bold mb-2 truncate">{playlist.title}</h1>
          
          {playlist.description && (
            <p className="text-muted-foreground mb-4 line-clamp-2">
              {playlist.description}
            </p>
          )}
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {playlist.creator || 'You'}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {tracks.length} songs, {formatDuration(totalDuration)}
            </div>
            {playlist.collaborative && (
              <Badge variant="outline" className="gap-1">
                <Users className="h-3 w-3" />
                Collaborative
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-4">
        <Button
          size="lg"
          onClick={handlePlayPlaylist}
          disabled={tracks.length === 0}
          className="rounded-full w-14 h-14 p-0"
        >
          <Play className="h-6 w-6 fill-current" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsLiked(!isLiked)}
          className="w-10 h-10"
        >
          <Heart className={`h-6 w-6 ${isLiked ? 'fill-current text-primary' : ''}`} />
        </Button>
        
        <Button variant="ghost" size="icon" className="w-10 h-10">
          <MoreHorizontal className="h-6 w-6" />
        </Button>
      </div>

      {/* Track List */}
      <div className="space-y-1">
        {tracks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              This playlist is empty. Add some songs to get started!
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-2 text-sm text-muted-foreground border-b">
              <div className="w-8">#</div>
              <div>Title</div>
              <div>Album</div>
              <div className="w-16 text-center">
                <Clock className="h-4 w-4 mx-auto" />
              </div>
            </div>
            
            {/* Tracks */}
            {tracks.map((track, index) => (
              <div
                key={track.id}
                className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-2 hover:bg-accent/50 rounded-md group"
              >
                <div className="w-8 flex items-center justify-center text-sm text-muted-foreground">
                  {currentTrack?.id === track.id && isPlaying ? (
                    <div className="w-4 h-4 flex items-center justify-center">
                      <div className="flex gap-0.5">
                        <div className="w-0.5 h-3 bg-primary animate-pulse"></div>
                        <div className="w-0.5 h-2 bg-primary animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-0.5 h-4 bg-primary animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  ) : (
                    <span className="group-hover:hidden">{index + 1}</span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 hidden group-hover:flex"
                    onClick={() => handlePlayTrack(track)}
                  >
                    <Play className="h-3 w-3 fill-current" />
                  </Button>
                </div>
                
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      className="w-10 h-10 rounded"
                    />
                    <div className="min-w-0 flex-1">
                      <div className={`font-medium truncate ${
                        currentTrack?.id === track.id ? 'text-primary' : ''
                      }`}>
                        {track.title}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {track.artist}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center text-sm text-muted-foreground truncate">
                  {track.album}
                </div>
                
                <div className="w-16 flex items-center justify-center text-sm text-muted-foreground">
                  {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
