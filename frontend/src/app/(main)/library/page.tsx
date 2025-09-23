'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Heart, Clock, Music, Users, Plus } from 'lucide-react';
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
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  const { playTrack, currentTrack, isPlaying } = usePlayerStore();

  useEffect(() => {
    const loadLibrary = async () => {
      try {
        const [likedData, playlistData, artistData, albumData] = await Promise.all([
          LibraryService.getLikedSongs(),
          LibraryService.getPlaylists(),
          LibraryService.getFollowedArtists(),
          LibraryService.getSavedAlbums(),
        ]);

        setLikedSongs(likedData);
        setPlaylists(playlistData);
        setArtists(artistData);
        setAlbums(albumData);
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
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 max-w-2xl">
          <TabsTrigger value="liked" className="gap-1 sm:gap-2 text-xs sm:text-sm">
            <Heart className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Liked Songs</span>
            <span className="sm:hidden">Liked</span>
          </TabsTrigger>
          <TabsTrigger value="playlists" className="gap-1 sm:gap-2 text-xs sm:text-sm">
            <Music className="h-3 w-3 sm:h-4 sm:w-4" />
            Playlists
          </TabsTrigger>
          <TabsTrigger value="artists" className="gap-1 sm:gap-2 text-xs sm:text-sm">
            <Users className="h-3 w-3 sm:h-4 sm:w-4" />
            Artists
          </TabsTrigger>
          <TabsTrigger value="albums" className="gap-1 sm:gap-2 text-xs sm:text-sm">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
            Albums
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
              <div className="space-y-2">
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
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Playlist
              </Button>
            </div>
            
            {playlists.length === 0 ? (
              <div className="text-center py-12">
                <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  No playlists yet. Create your first playlist to organize your music!
                </p>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Playlist
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {playlists.map((playlist: any) => (
                  <PlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    onPlay={() => console.log('Play playlist:', playlist.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="artists" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Followed Artists</h2>
              <span className="text-sm text-muted-foreground">
                {artists.length} artists
              </span>
            </div>
            
            {artists.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No followed artists yet. Discover and follow artists you love!
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {artists.map((artist: any) => (
                  <ArtistChip
                    key={artist.id}
                    artist={artist}
                    onPlay={() => console.log('Play artist:', artist.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="albums" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Saved Albums</h2>
              <span className="text-sm text-muted-foreground">
                {albums.length} albums
              </span>
            </div>
            
            {albums.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No saved albums yet. Save albums to easily find them later!
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {albums.map((album: any) => (
                  <div key={album.id} className="group cursor-pointer">
                    <div className="relative aspect-square rounded-lg overflow-hidden mb-3">
                      <img
                        src={album.coverUrl}
                        alt={album.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button className="h-10 w-10 rounded-full">
                          <Music className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium truncate">{album.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {album.artist}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {album.year} • {album.trackCount} tracks
                      </p>
                    </div>
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
