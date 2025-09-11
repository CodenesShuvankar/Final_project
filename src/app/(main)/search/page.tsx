'use client';

import * as React from 'react';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SongCard } from '@/components/music/SongCard';
import { PlaylistCard } from '@/components/music/PlaylistCard';
import { ArtistChip } from '@/components/music/ArtistChip';
import { mockTracks, mockPlaylists, mockArtists, genres } from '@/lib/mockData';
import { usePlayerStore } from '@/lib/store/playerStore';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Search page with tabs for different content types
 */
export default function SearchPage() {
  const [query, setQuery] = useState('');
  const { playerService } = usePlayerStore();

  const handlePlayTrack = (track: typeof mockTracks[0]) => {
    playerService.playTrack(track, mockTracks);
  };

  const handlePlayPlaylist = (playlist: typeof mockPlaylists[0]) => {
    const firstTrack = mockTracks.find(t => playlist.tracks.includes(t.id));
    if (firstTrack) {
      const playlistTracks = mockTracks.filter(t => playlist.tracks.includes(t.id));
      playerService.playTrack(firstTrack, playlistTracks);
    }
  };

  // Filter results based on query
  const filteredTracks = query 
    ? mockTracks.filter(track => 
        track.title.toLowerCase().includes(query.toLowerCase()) ||
        track.artist.toLowerCase().includes(query.toLowerCase()) ||
        track.album.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const filteredArtists = query
    ? mockArtists.filter(artist =>
        artist.name.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const filteredPlaylists = query
    ? mockPlaylists.filter(playlist =>
        playlist.title.toLowerCase().includes(query.toLowerCase()) ||
        playlist.description.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const allResults = [...filteredTracks, ...filteredArtists, ...filteredPlaylists];

  return (
    <div className="p-6 space-y-6">
      {/* Search Input */}
      <div className="max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="What do you want to listen to?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 bg-muted border-0 focus-visible:ring-1"
          />
        </div>
      </div>

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
            {allResults.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No results found for "{query}"</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try searching for something else
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Top Result */}
                {filteredTracks.length > 0 && (
                  <section>
                    <h3 className="text-xl font-bold mb-4">Top result</h3>
                    <div className="max-w-sm">
                      <SongCard
                        track={filteredTracks[0]}
                        onPlay={() => handlePlayTrack(filteredTracks[0])}
                        showArtist
                        showAlbum
                      />
                    </div>
                  </section>
                )}

                {/* Songs */}
                {filteredTracks.length > 0 && (
                  <section>
                    <h3 className="text-xl font-bold mb-4">Songs</h3>
                    <div className="space-y-2">
                      {filteredTracks.slice(0, 5).map((track) => (
                        <SongCard
                          key={track.id}
                          track={track}
                          onPlay={() => handlePlayTrack(track)}
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
            {filteredTracks.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No songs found for "{query}"</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTracks.map((track) => (
                  <SongCard
                    key={track.id}
                    track={track}
                    onPlay={() => handlePlayTrack(track)}
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
                <p className="text-muted-foreground">No artists found for "{query}"</p>
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
                <p className="text-muted-foreground">No playlists found for "{query}"</p>
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
