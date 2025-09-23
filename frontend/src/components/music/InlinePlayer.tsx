'use client';

import React, { useEffect, useState } from 'react';
import { Play, Pause, Volume2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { AudioPlayerService, AudioPlayerState } from '@/lib/services/audioPlayer';
import { SpotifyMusicService } from '@/lib/services/spotify';
import { cn } from '@/lib/utils';

interface InlinePlayerProps {
  track: {
    id: string;
    name: string;
    artists: string[];
    preview_url: string | null;
    image_url: string | null;
    external_urls?: { spotify?: string };
  };
  className?: string;
  showVolumeControl?: boolean;
  showExternalLink?: boolean;
}

export function InlinePlayer({
  track,
  className,
  showVolumeControl = false,
  showExternalLink = true,
}: InlinePlayerProps) {
  const [playerState, setPlayerState] = useState<AudioPlayerState | null>(null);
  const audioPlayer = AudioPlayerService.getInstance();
  const spotifyService = SpotifyMusicService.getInstance();

  const isCurrentTrack = playerState?.currentTrack?.id === track.id;
  const isPlaying = isCurrentTrack && playerState?.isPlaying;

  useEffect(() => {
    const unsubscribe = audioPlayer.subscribe(setPlayerState);
    setPlayerState(audioPlayer.getState());
    return unsubscribe;
  }, [audioPlayer]);

  const handlePlayToggle = async () => {
    console.log('Play button clicked for track:', track.name);
    console.log('Preview URL:', track.preview_url);
    console.log('External URLs:', track.external_urls);
    
    if (!track.preview_url) {
      console.log('No preview URL available, opening Spotify');
      // No preview available, open in Spotify
      if (track.external_urls?.spotify) {
        window.open(track.external_urls.spotify, '_blank');
      }
      return;
    }

    if (isCurrentTrack) {
      await audioPlayer.togglePlayPause();
    } else {
      await audioPlayer.playTrack({
        id: track.id,
        name: track.name,
        artists: track.artists,
        preview_url: track.preview_url,
        image_url: track.image_url,
      });
    }
  };

  const handleVolumeChange = (value: number[]) => {
    audioPlayer.setVolume(value[0]);
  };

  const handleSeek = (value: number[]) => {
    audioPlayer.seek(value[0]);
  };

  const openInSpotify = () => {
    if (track.external_urls?.spotify) {
      window.open(track.external_urls.spotify, '_blank');
    } else {
      // Fallback to search
      spotifyService.openInSpotify(track as any);
    }
  };

  const progress = 
    isCurrentTrack && playerState?.duration 
      ? (playerState.currentTime / playerState.duration) * 100 
      : 0;

  return (
    <div className={cn('flex items-center space-x-3', className)}>
      {/* Play/Pause Button */}
      <Button
        onClick={handlePlayToggle}
        variant={track.preview_url ? 'default' : 'secondary'}
        size="sm"
        className="flex-shrink-0"
        title={track.preview_url ? 'Play 30-second preview' : 'Open in Spotify'}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      {/* Progress Bar (only show if this track is playing) */}
      {isCurrentTrack && playerState?.duration && (
        <div className="flex-1 min-w-0">
          <Slider
            value={[progress]}
            onValueChange={handleSeek}
            max={100}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{audioPlayer.formatTime(playerState.currentTime)}</span>
            <span>{audioPlayer.formatTime(playerState.duration)}</span>
          </div>
        </div>
      )}

      {/* Volume Control (optional) */}
      {showVolumeControl && playerState && (
        <div className="flex items-center space-x-2 flex-shrink-0">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <Slider
            value={[playerState.volume]}
            onValueChange={handleVolumeChange}
            max={100}
            step={1}
            className="w-20"
          />
        </div>
      )}

      {/* External Link */}
      {showExternalLink && (
        <Button
          onClick={openInSpotify}
          variant="ghost"
          size="sm"
          className="flex-shrink-0"
          title="Open in Spotify"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      )}

      {/* Preview Notice */}
      {!track.preview_url && (
        <span className="text-xs text-muted-foreground flex-shrink-0">
          No preview
        </span>
      )}
    </div>
  );
}