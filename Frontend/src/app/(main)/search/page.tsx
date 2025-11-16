'use client';

import * as React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SongCard } from '@/components/music/SongCard';
import { SpotifySongCard } from '@/components/music/SpotifySongCard';
import { PlaylistCard } from '@/components/music/PlaylistCard';
import { ArtistChip } from '@/components/music/ArtistChip';
import { mockTracks, mockPlaylists, mockArtists, genres } from '@/lib/mockData';
import { usePlayerStore } from '@/lib/store/playerStore';
import { SpotifyTrack, SpotifyMusicService } from '@/lib/services/spotify';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Search page with tabs for different content types
 */
export default function SearchPage() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [detectedMood, setDetectedMood] = useState<string | null>(null);
  const { playerService } = usePlayerStore();
  const spotifyService = SpotifyMusicService.getInstance();

  // Load detected mood from localStorage on mount
  React.useEffect(() => {
    const storedMood = localStorage.getItem('detected_mood');
    if (storedMood) {
      try {
        const parsed = JSON.parse(storedMood);
        setDetectedMood(parsed.mood || null);
        console.log('✅ Loaded detected mood:', parsed.mood);
      } catch (error) {
        console.error('Failed to parse mood:', error);
        setDetectedMood(null);
      }
    }
  }, []);

  // Get search query from URL params
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    if (urlQuery && urlQuery !== query) {
      setQuery(urlQuery);
      performSearch(urlQuery);
    }
  }, [searchParams]);

  const convertSpotifyTrackToTrack = (track: SpotifyTrack) => ({
    id: track.id,
    title: track.name,
    artist: track.artists.join(', '),
    album: track.album,
    duration: Math.floor(track.duration_ms / 1000),
    coverUrl: track.image_url || '',
    genre: 'Pop',
    mood: ['happy'],
    energy: 0.7,
    valence: 0.8,
    tempo: 120,
    year: 2024,
    explicit: false,
    liked: false,
  });

  const handlePlayTrack = (track: SpotifyTrack) => {
    const playerTrack = convertSpotifyTrackToTrack(track);
    playerService.playTrack(playerTrack, [playerTrack]);
  };

  const handlePlayPlaylist = (playlist: typeof mockPlaylists[0]) => {
    const firstTrack = mockTracks.find(t => playlist.tracks.includes(t.id));
    if (firstTrack) {
      const playlistTracks = mockTracks.filter(t => playlist.tracks.includes(t.id));
      playerService.playTrack(firstTrack, playlistTracks);
    }
  };

  // Search via backend API
  const performSearch = useCallback(async (searchQuery: string) => {
    console.log('🔍 performSearch called with query:', searchQuery);
    
    if (!searchQuery.trim()) {
      console.log('Empty query, clearing results');
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    console.log('Starting search for:', searchQuery);
    setIsLoading(true);
    setHasSearched(true);
    
    try {
      // SpotifyService now routes through backend
      const result = await spotifyService.searchMusic(searchQuery, 20);
      console.log('Search result:', result);
      if (result) {
        console.log('Found tracks:', result.tracks.length);
        setSearchResults(result.tracks);
      } else {
        console.log('No results returned');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [spotifyService]);

  const handleSearch = () => {
    console.log('handleSearch called with query:', query);
    performSearch(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    console.log('Key pressed:', e.key);
    if (e.key === 'Enter') {
      console.log('Enter key pressed, calling handleSearch');
      handleSearch();
    }
  };

  // Fallback to mock data for artists and playlists (until we implement those endpoints)
  const filteredArtists = query && hasSearched
    ? mockArtists.filter(artist =>
        artist.name.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const filteredPlaylists = query && hasSearched
    ? mockPlaylists.filter(playlist =>
        playlist.title.toLowerCase().includes(query.toLowerCase()) ||
        playlist.description.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const allResults = [...searchResults, ...filteredArtists, ...filteredPlaylists];

  return (
    <div className="p-6 space-y-6">
      {/* Mood Badge */}
      {detectedMood && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {detectedMood === 'happy' ? '😊' : 
                 detectedMood === 'sad' ? '😢' : 
                 detectedMood === 'angry' ? '😠' : 
                 detectedMood === 'neutral' ? '😐' : 
                 detectedMood === 'fear' ? '😨' : 
                 detectedMood === 'surprise' ? '😲' : 
                 detectedMood === 'disgust' ? '🤢' : '😊'}
              </span>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Your current mood:</p>
                <p className="font-semibold capitalize text-primary text-lg">{detectedMood}</p>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setQuery(detectedMood);
                  performSearch(detectedMood);
                }}
              >
                Find music for this mood
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!query ? (
        /* Browse Categories */
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Browse all</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {genres.map((genre, index) => {
              const colors = [
                'from-red-500 to-pink-500',
                'from-blue-500 to-indigo-500',
                'from-green-500 to-teal-500',
                'from-yellow-500 to-orange-500',
                'from-purple-500 to-violet-500',
                'from-gray-500 to-slate-500',
              ];
              const colorClass = colors[index % colors.length];
              
              return (
                <Card 
                  key={genre} 
                  className={`bg-gradient-to-br ${colorClass} text-white border-0 cursor-pointer hover:scale-105 transition-transform`}
                  onClick={() => {
                    setQuery(genre);
                    performSearch(genre);
                  }}
                >
                  <CardContent className="p-6">
                    <h3 className="font-bold text-lg">{genre}</h3>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        /* Search Results */
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="songs">Songs</TabsTrigger>
            <TabsTrigger value="artists">Artists</TabsTrigger>
            <TabsTrigger value="albums">Albums</TabsTrigger>
            <TabsTrigger value="playlists">Playlists</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Searching Spotify...</span>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No results found for &quot;{query}&quot;</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try searching for something else
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                  {/* Top Result */}
                  {searchResults.length > 0 && (
                    <section>
                      <h3 className="text-xl font-bold mb-4">Top result</h3>
                      <div className="max-w-sm">
                        <SpotifySongCard
                          track={searchResults[0]}
                          showArtist
                          showAlbum
                        />
                      </div>
                    </section>
                  )}                {/* Songs */}
                {searchResults.length > 0 && (
                  <section>
                    <h3 className="text-xl font-bold mb-4">Songs</h3>
                    <div className="space-y-2">
                      {searchResults.slice(0, 5).map((track) => (
                        <SpotifySongCard
                          key={track.id}
                          track={track}
                          showArtist
                          compact
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Artists */}
                {filteredArtists.length > 0 && (
                  <section>
                    <h3 className="text-xl font-bold mb-4">Artists</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                      {filteredArtists.map((artist) => (
                        <ArtistChip key={artist.id} artist={artist} />
                      ))}
                    </div>
                  </section>
                )}

                {/* Playlists */}
                {filteredPlaylists.length > 0 && (
                  <section>
                    <h3 className="text-xl font-bold mb-4">Playlists</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {filteredPlaylists.map((playlist) => (
                        <PlaylistCard
                          key={playlist.id}
                          playlist={playlist}
                          onPlay={() => handlePlayPlaylist(playlist)}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="songs">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Searching songs...</span>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No songs found for &quot;{query}&quot;</p>
              </div>
            ) : (
              <div className="space-y-2">
                {searchResults.map((track) => (
                  <SpotifySongCard
                    key={track.id}
                    track={track}
                    showArtist
                    showAlbum
                    compact
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="artists">
            {filteredArtists.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No artists found for &quot;{query}&quot;</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {filteredArtists.map((artist) => (
                  <ArtistChip key={artist.id} artist={artist} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="albums">
            <div className="text-center py-12">
              <p className="text-muted-foreground">Album search coming soon</p>
            </div>
          </TabsContent>

          <TabsContent value="playlists">
            {filteredPlaylists.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No playlists found for &quot;{query}&quot;</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredPlaylists.map((playlist) => (
                  <PlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    onPlay={() => handlePlayPlaylist(playlist)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
