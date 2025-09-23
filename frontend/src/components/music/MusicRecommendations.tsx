'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Search, Music, PlayCircle, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SpotifyTrack, SpotifyMusicService, MusicRecommendationResult } from '@/lib/services/spotify';
import { InlinePlayer } from '@/components/music/InlinePlayer';
import { cn } from '@/lib/utils';

interface MusicRecommendationsProps {
  detectedMood?: string;
  onTrackSelect?: (track: SpotifyTrack, allTracks: SpotifyTrack[]) => void;
  className?: string;
}

export function MusicRecommendations({ 
  detectedMood, 
  onTrackSelect,
  className 
}: MusicRecommendationsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMood, setCurrentMood] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const spotifyService = SpotifyMusicService.getInstance();

  // Auto-load recommendations when mood is detected
  useEffect(() => {
    console.log('🎵 MusicRecommendations: useEffect triggered - detectedMood:', detectedMood, 'currentMood:', currentMood);
    if (detectedMood && detectedMood !== currentMood) {
      console.log('🎵 MusicRecommendations: Mood changed, loading recommendations for:', detectedMood);
      loadMoodRecommendations(detectedMood);
    } else if (detectedMood) {
      console.log('🎵 MusicRecommendations: Mood same as current, not reloading');
    } else {
      console.log('🎵 MusicRecommendations: No detected mood');
    }
  }, [detectedMood]);

  const loadMoodRecommendations = async (mood: string) => {
    console.log('🎼 MusicRecommendations: loadMoodRecommendations called with mood:', mood);
    setIsLoading(true);
    setError(null);
    setCurrentMood(mood);

    try {
      console.log('🔍 MusicRecommendations: Calling spotifyService.getMoodRecommendations...');
      const result = await spotifyService.getMoodRecommendations(mood, 20);
      console.log('📊 MusicRecommendations: Mood recommendations result:', result);
      if (result) {
        // Handle different response structures
        let tracks: SpotifyTrack[] = [];
        if (result.results && result.results.tracks) {
          tracks = result.results.tracks;
        } else if (result.results && Array.isArray(result.results)) {
          tracks = result.results;
        } else {
          console.error('Unexpected result structure:', result);
        }
        console.log('✅ MusicRecommendations: Setting tracks:', tracks.length, 'tracks found');
        setTracks(tracks);
      } else {
        console.log('❌ MusicRecommendations: No result received');
        setError('Failed to load mood recommendations');
        setTracks([]);
      }
    } catch (error) {
      console.error('💥 MusicRecommendations: Error loading mood recommendations:', error);
      setError('Failed to load recommendations');
      setTracks([]);
    } finally {
      console.log('🏁 MusicRecommendations: Loading completed, isLoading = false');
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);
    setCurrentMood(null);

    try {
      const result = await spotifyService.searchMusic(searchQuery, 20);
      if (result) {
        setTracks(result.tracks);
      } else {
        setError('No results found');
        setTracks([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setError('Search failed');
      setTracks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleTrackClick = (track: SpotifyTrack) => {
    onTrackSelect?.(track, tracks);
  };

  const openInSpotify = (track: SpotifyTrack, e: React.MouseEvent) => {
    e.stopPropagation();
    spotifyService.openInSpotify(track);
  };

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Music className="h-5 w-5" />
          <span>Music Recommendations</span>
          {currentMood && (
            <Badge variant="secondary" className="ml-auto">
              {currentMood} Mood
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="flex space-x-2">
          <Input
            placeholder="Search for music..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Reload Mood Recommendations */}
        {detectedMood && (
          <Button
            onClick={() => loadMoodRecommendations(detectedMood)}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Music className="h-4 w-4 mr-2" />
                Reload {detectedMood} Music
              </>
            )}
          </Button>
        )}

        {/* Error Message */}
        {error && (
          <div className="text-center text-red-500 text-sm bg-red-50 p-3 rounded">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="relative">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-pulse" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">
                {currentMood 
                  ? `Finding ${currentMood.toLowerCase()} music for you...` 
                  : 'Searching for music...'
                }
              </p>
              <p className="text-xs text-muted-foreground">
                {currentMood 
                  ? 'Analyzing your mood and matching with perfect tracks' 
                  : 'This may take a few seconds'
                }
              </p>
            </div>
          </div>
        )}

        {/* Track List */}
        {!isLoading && tracks.length > 0 && (
          <div className="space-y-4">
            {/* Mood-based header */}
            {currentMood && (
              <div className="text-center">
                <h3 className="font-semibold text-lg mb-2">
                  🎵 {currentMood} Music Recommendations
                </h3>
                <p className="text-sm text-muted-foreground">
                  Found {tracks.length} tracks perfect for your {currentMood.toLowerCase()} mood
                </p>
              </div>
            )}
            
            {/* Enhanced Grid Layout - Full Width */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 max-h-[600px] overflow-y-auto pr-2">
              {tracks.map((track, index) => (
                <div
                  key={track.id}
                  className="flex flex-col space-y-3 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-accent/50 hover:shadow-md transition-all duration-200 cursor-pointer bg-card"
                  onClick={() => handleTrackClick(track)}
                >
                  {/* Track Number and Album Art */}
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>
                    
                    <div className="relative flex-shrink-0">
                      {track.image_url ? (
                        <img
                          src={track.image_url}
                          alt={`${track.album} cover`}
                          className="w-16 h-16 rounded-lg object-cover shadow-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                          <Music className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Track Info */}
                  <div className="flex-1 space-y-2">
                    <h4 className="font-semibold text-base line-clamp-2 leading-tight">{track.name}</h4>
                    <p className="text-sm text-muted-foreground font-medium">
                      {track.artists.join(', ')}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="truncate flex-1 mr-2">{track.album}</span>
                      <span className="font-medium">{spotifyService.formatDuration(track.duration_ms)}</span>
                    </div>
                  </div>

                  {/* Player Controls */}
                  <div className="flex items-center justify-center pt-2 border-t border-border/50">
                    <InlinePlayer
                      track={{
                        id: track.id,
                        name: track.name,
                        artists: track.artists,
                        preview_url: track.preview_url || null,
                        image_url: track.image_url || null,
                        external_urls: track.external_urls,
                      }}
                      showExternalLink={true}
                      showVolumeControl={false}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && tracks.length === 0 && !error && (
          <div className="text-center py-8">
            <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {detectedMood 
                ? `Search for music or let me recommend ${detectedMood.toLowerCase()} tracks`
                : 'Search for music or detect your mood to get recommendations'
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}