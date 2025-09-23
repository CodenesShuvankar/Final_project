'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, ExternalLink, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { SpotifyTrack, SpotifyMusicService } from '@/lib/services/spotify';
import { cn } from '@/lib/utils';

interface MusicPlayerProps {
  tracks: SpotifyTrack[];
  currentTrackIndex?: number;
  onTrackChange?: (index: number) => void;
  className?: string;
}

export function MusicPlayer({ 
  tracks, 
  currentTrackIndex = 0, 
  onTrackChange,
  className 
}: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const [currentIndex, setCurrentIndex] = useState(currentTrackIndex);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const spotifyService = SpotifyMusicService.getInstance();

  const currentTrack = tracks[currentIndex];

  useEffect(() => {
    setCurrentIndex(currentTrackIndex);
  }, [currentTrackIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.preview_url) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      handleNext();
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrack]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.preview_url) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % tracks.length;
    setCurrentIndex(nextIndex);
    onTrackChange?.(nextIndex);
    setIsPlaying(false);
  };

  const handlePrevious = () => {
    const prevIndex = currentIndex === 0 ? tracks.length - 1 : currentIndex - 1;
    setCurrentIndex(prevIndex);
    onTrackChange?.(prevIndex);
    setIsPlaying(false);
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (audio && duration) {
      const newTime = (value[0] / 100) * duration;
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const openInSpotify = () => {
    if (currentTrack) {
      spotifyService.openInSpotify(currentTrack);
    }
  };

  if (!currentTrack) {
    return (
      <Card className={cn(className)}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No tracks available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2">
          <Music className="h-5 w-5" />
          <span>Music Player</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Track Info */}
        <div className="flex items-center space-x-4">
          {currentTrack.image_url && (
            <img
              src={currentTrack.image_url}
              alt={`${currentTrack.album} cover`}
              className="w-16 h-16 rounded-md object-cover"
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{currentTrack.name}</h3>
            <p className="text-sm text-muted-foreground truncate">
              {currentTrack.artists.join(', ')}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {currentTrack.album}
            </p>
          </div>
          <Button
            onClick={openInSpotify}
            variant="ghost"
            size="sm"
            className="flex-shrink-0"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center space-x-4">
          <Button
            onClick={handlePrevious}
            variant="ghost"
            size="sm"
            disabled={tracks.length <= 1}
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          
          <Button
            onClick={togglePlay}
            variant="default"
            size="sm"
            disabled={!currentTrack.preview_url}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          
          <Button
            onClick={handleNext}
            variant="ghost"
            size="sm"
            disabled={tracks.length <= 1}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress Bar */}
        {currentTrack.preview_url && (
          <div className="space-y-2">
            <Slider
              value={[duration ? (currentTime / duration) * 100 : 0]}
              onValueChange={handleSeek}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}

        {/* Volume Control */}
        <div className="flex items-center space-x-2">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <Slider
            value={[volume]}
            onValueChange={handleVolumeChange}
            max={100}
            step={1}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-8">{volume}%</span>
        </div>

        {/* Preview Notice */}
        {!currentTrack.preview_url && (
          <div className="text-center text-xs text-muted-foreground bg-muted p-2 rounded">
            No preview available for this track. Click the external link to open in Spotify.
          </div>
        )}

        {/* Audio Element */}
        {currentTrack.preview_url && (
          <audio
            ref={audioRef}
            src={currentTrack.preview_url}
            onLoadStart={() => setCurrentTime(0)}
          />
        )}
      </CardContent>
    </Card>
  );
}