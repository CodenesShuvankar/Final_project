'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Heart, MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { InlinePlayer } from './InlinePlayer';
import Image from 'next/image';
import { SpotifyTrack } from '@/lib/services/spotify';
import { LikedSongsService } from '@/lib/services/likedSongs';
import { LibraryService } from '@/lib/services/library';
import { HistoryService } from '@/lib/services/historyService';
import { Playlist } from '@/lib/mockData';
import { supabase } from '@/lib/supabaseClient';

interface SpotifySongCardProps {
  track: SpotifyTrack;
  showArtist?: boolean;
  showAlbum?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * Song card component specifically for Spotify tracks with preview support
 */
export function SpotifySongCard({
  track,
  showArtist = false,
  showAlbum = false,
  compact = false,
  className
}: SpotifySongCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isCheckingLiked, setIsCheckingLiked] = useState(true);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isAddingToPlaylist, setIsAddingToPlaylist] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const likedSongsService = LikedSongsService.getInstance();

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();
  }, []);

  // Check if song is liked
  useEffect(() => {
    const checkLikedStatus = async () => {
      if (!isAuthenticated) {
        setIsCheckingLiked(false);
        return;
      }
      
      const liked = await likedSongsService.isLiked(track.id);
      setIsLiked(liked);
      setIsCheckingLiked(false);
    };

    checkLikedStatus();
  }, [track.id, isAuthenticated]);

  // Listen for like/unlike events
  useEffect(() => {
    const handleSongLiked = (event: CustomEvent) => {
      if (event.detail.songId === track.id) {
        setIsLiked(event.detail.liked);
      }
    };

    window.addEventListener('songLiked', handleSongLiked as EventListener);
    return () => {
      window.removeEventListener('songLiked', handleSongLiked as EventListener);
    };
  }, [track.id]);

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isAuthenticated) {
      alert('Please login to like songs');
      return;
    }

    const artistNames = Array.isArray(track.artists) ? track.artists.join(', ') : track.artists;
    const success = await likedSongsService.toggleLike(
      track.id,
      track.name,
      artistNames,
      track.album,
      track.image_url || undefined,
      track.external_urls?.spotify,
      track.duration_ms
    );

    if (success) {
      setIsLiked(!isLiked);
    }
  };

  const loadPlaylists = async () => {
    if (!isAuthenticated) {
      alert('Please login to add songs to playlists');
      return;
    }
    
    try {
      const userPlaylists = await LibraryService.getPlaylists();
      setPlaylists(userPlaylists);
    } catch (error) {
      console.error('Failed to load playlists:', error);
    }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    setIsAddingToPlaylist(true);
    try {
      const artistNames = Array.isArray(track.artists) ? track.artists.join(', ') : track.artists;
      
      // Convert SpotifyTrack to Track format
      const trackData = {
        id: track.id,
        title: track.name,
        artist: artistNames,
        album: track.album || 'Unknown Album',
        duration: Math.floor(track.duration_ms / 1000),
        coverUrl: track.image_url || '',
        genre: '',
        mood: [] as any[],
        energy: 0.5,
        valence: 0.5,
        tempo: 120,
        year: new Date().getFullYear(),
        explicit: false,
        previewUrl: track.preview_url
      };

      const success = await LibraryService.addToPlaylist(playlistId, trackData);
      if (success) {
        alert('Song added to playlist!');
        window.dispatchEvent(new CustomEvent('playlistUpdated', { detail: { playlistId } }));
      } else {
        alert('Song is already in this playlist');
      }
      setShowPlaylistMenu(false);
    } catch (error) {
      console.error('Failed to add to playlist:', error);
      alert('Failed to add song to playlist');
    } finally {
      setIsAddingToPlaylist(false);
    }
  };

  const formatDuration = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const artistNames = Array.isArray(track.artists) ? track.artists.join(', ') : track.artists;

  if (compact) {
    return (
      <div className={cn(
        "group flex items-center space-x-3 p-2 rounded-md hover:bg-accent/50 transition-colors",
        className
      )}>
        <div className="relative w-10 h-10 rounded overflow-hidden bg-muted flex-shrink-0">
          {track.image_url ? (
            <Image
              src={track.image_url}
              alt={`${track.name} cover`}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-xs text-muted-foreground">♪</span>
            </div>
          )}
        </div>
        
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">
            {track.name}
          </p>
          {showArtist && (
            <p className="text-xs text-muted-foreground truncate">
              {artistNames}
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <InlinePlayer
            track={{
              id: track.id,
              name: track.name,
              artists: track.artists,
              preview_url: track.preview_url || null,
              image_url: track.image_url || null,
              external_urls: track.external_urls,
              album: track.album,
              duration_ms: track.duration_ms,
            }}
            showExternalLink={false}
          />
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity",
              isLiked && "opacity-100 text-red-500"
            )}
            onClick={handleToggleLike}
            disabled={isCheckingLiked}
          >
            <Heart className={cn("h-3 w-3", isLiked && "fill-current")} />
            <span className="sr-only">{isLiked ? 'Unlike' : 'Like'} song</span>
          </Button>
          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                setShowPlaylistMenu(!showPlaylistMenu);
                if (!showPlaylistMenu) loadPlaylists();
              }}
            >
              <Plus className="h-3 w-3" />
              <span className="sr-only">Add to playlist</span>
            </Button>
            
            {/* Playlist Modal Popup - Compact View */}
            {showPlaylistMenu && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowPlaylistMenu(false)}>
                <div className="bg-background border rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                  <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Add to Playlist</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setShowPlaylistMenu(false)}
                    >
                      <span className="text-xl">&times;</span>
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    {isAddingToPlaylist ? (
                      <div className="p-8 text-center text-sm text-muted-foreground">
                        Adding to playlist...
                      </div>
                    ) : playlists.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-sm text-muted-foreground mb-4">
                          No playlists yet. Create one first!
                        </p>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            setShowPlaylistMenu(false);
                            window.location.href = '/library?tab=playlists';
                          }}
                        >
                          Go to Library
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {playlists.map((playlist) => (
                          <button
                            key={playlist.id}
                            onClick={() => handleAddToPlaylist(playlist.id)}
                            className="w-full px-4 py-3 text-left hover:bg-accent rounded-md transition-colors flex items-center gap-3"
                          >
                            <div className="w-12 h-12 bg-muted rounded flex-shrink-0 flex items-center justify-center">
                              <Plus className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{playlist.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {playlist.trackCount} {playlist.trackCount === 1 ? 'song' : 'songs'}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {formatDuration(track.duration_ms)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn(
      "group overflow-hidden hover:bg-accent/50 transition-colors",
      className
    )}>
      <CardContent className="p-4">
        <div className="relative aspect-square mb-4 rounded-md overflow-hidden bg-muted">
          {track.image_url ? (
            <Image
              src={track.image_url}
              alt={`${track.name} cover`}
              fill
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-4xl text-muted-foreground">♪</span>
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <h3 className="font-medium truncate">
            {track.name}
          </h3>
          {showArtist && (
            <p className="text-sm text-muted-foreground truncate">
              {artistNames}
            </p>
          )}
          {showAlbum && (
            <p className="text-xs text-muted-foreground truncate">
              {track.album}
            </p>
          )}
        </div>

        <div className="mt-4">
          <InlinePlayer
            track={{
              id: track.id,
              name: track.name,
              artists: track.artists,
              preview_url: track.preview_url || null,
              image_url: track.image_url || null,
              external_urls: track.external_urls,
              album: track.album,
              duration_ms: track.duration_ms,
            }}
            showVolumeControl={false}
            showExternalLink={true}
          />
        </div>

        <div className="flex items-center justify-between mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6",
                isLiked && "text-red-500"
              )}
              onClick={handleToggleLike}
              disabled={isCheckingLiked}
            >
              <Heart className={cn("h-3 w-3", isLiked && "fill-current")} />
              <span className="sr-only">{isLiked ? 'Unlike' : 'Like'} song</span>
            </Button>
            <div className="relative">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPlaylistMenu(!showPlaylistMenu);
                  if (!showPlaylistMenu) loadPlaylists();
                }}
              >
                <Plus className="h-3 w-3" />
                <span className="sr-only">Add to playlist</span>
              </Button>
              
              {/* Playlist Modal Popup */}
              {showPlaylistMenu && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowPlaylistMenu(false)}>
                  <div className="bg-background border rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                    <div className="p-4 border-b flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Add to Playlist</h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setShowPlaylistMenu(false)}
                      >
                        <span className="text-xl">&times;</span>
                      </Button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                      {isAddingToPlaylist ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                          Adding to playlist...
                        </div>
                      ) : playlists.length === 0 ? (
                        <div className="p-8 text-center">
                          <p className="text-sm text-muted-foreground mb-4">
                            No playlists yet. Create one first!
                          </p>
                          <Button 
                            variant="outline"
                            onClick={() => {
                              setShowPlaylistMenu(false);
                              window.location.href = '/library?tab=playlists';
                            }}
                          >
                            Go to Library
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {playlists.map((playlist) => (
                            <button
                              key={playlist.id}
                              onClick={() => handleAddToPlaylist(playlist.id)}
                              className="w-full px-4 py-3 text-left hover:bg-accent rounded-md transition-colors flex items-center gap-3"
                            >
                              <div className="w-12 h-12 bg-muted rounded flex-shrink-0 flex items-center justify-center">
                                <Plus className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium truncate">{playlist.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  {playlist.trackCount} {playlist.trackCount === 1 ? 'song' : 'songs'}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-xs text-muted-foreground">
              {formatDuration(track.duration_ms)}
            </span>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="h-3 w-3" />
              <span className="sr-only">More options</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}