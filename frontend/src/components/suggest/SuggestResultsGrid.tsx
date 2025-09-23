'use client';

import * as React from 'react';
import { SongCard } from '@/components/music/SongCard';
import { PlaylistCard } from '@/components/music/PlaylistCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SuggestResult } from '@/lib/services/suggest';
import { mockPlaylists } from '@/lib/mockData';
import { usePlayerStore } from '@/lib/store/playerStore';
import { Music, Plus, Shuffle } from 'lucide-react';

interface SuggestResultsGridProps {
  results: SuggestResult[];
  loading?: boolean;
  onCreatePlaylist?: () => void;
  className?: string;
}

/**
 * Grid display for suggestion results with quick actions
 */
export function SuggestResultsGrid({ 
  results, 
  loading = false, 
  onCreatePlaylist,
  className 
}: SuggestResultsGridProps) {
  const { playerService } = usePlayerStore();

  const handlePlayTrack = (track: SuggestResult['track']) => {
    const allTracks = results.map(r => r.track);
    playerService.playTrack(track, allTracks);
  };

  const handleShuffleAll = () => {
    if (results.length > 0) {
      const shuffledTracks = [...results.map(r => r.track)].sort(() => Math.random() - 0.5);
      playerService.playTrack(shuffledTracks[0], shuffledTracks);
    }
  };

  if (loading) {
    return (
      <div className={className}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="aspect-square bg-muted rounded-md mb-4" />
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-12 text-center">
          <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-2">No suggestions yet</h3>
          <p className="text-muted-foreground mb-4">
            Adjust your preferences and generate suggestions to see results here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Action Bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">
            {results.length} suggestions found
          </h3>
          <p className="text-sm text-muted-foreground">
            Personalized recommendations based on your preferences
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={handleShuffleAll}
            disabled={results.length === 0}
          >
            <Shuffle className="mr-2 h-4 w-4" />
            Shuffle All
          </Button>
          
          <Button
            variant="outline"
            onClick={onCreatePlaylist}
            disabled={results.length === 0}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Playlist
          </Button>
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {results.map((result) => (
          <SongCard
            key={result.track.id}
            track={result.track}
            onPlay={() => handlePlayTrack(result.track)}
            showArtist
            showAlbum
          />
        ))}
      </div>

      {/* Suggested Playlists */}
      {results.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">You might also like</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {mockPlaylists.slice(0, 4).map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                onPlay={() => {
                  // Play first track from playlist
                  const firstTrack = results.find(r => 
                    playlist.tracks.includes(r.track.id)
                  )?.track;
                  if (firstTrack) {
                    handlePlayTrack(firstTrack);
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
