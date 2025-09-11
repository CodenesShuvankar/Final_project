'use client';

import * as React from 'react';
import { 
  Heart, 
  MoreHorizontal, 
  Pause, 
  Play, 
  List, 
  Repeat, 
  Shuffle, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { usePlayerStore } from '@/lib/store/playerStore';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface PlayerBarProps {
  className?: string;
  onQueueOpen?: () => void;
}

/**
 * Bottom player bar with playback controls and track information
 */
export function PlayerBar({ className, onQueueOpen }: PlayerBarProps) {
  const {
    currentTrack,
    isPlaying,
    progress,
    volume,
    shuffle,
    repeat,
    playerService,
  } = usePlayerStore();

  const [isMuted, setIsMuted] = React.useState(false);
  const [previousVolume, setPreviousVolume] = React.useState(volume);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    playerService.togglePlayPause();
  };

  const handlePrevious = () => {
    playerService.previous();
  };

  const handleNext = () => {
    playerService.next();
  };

  const handleSeek = (value: number[]) => {
    playerService.seek(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    playerService.setVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const handleMute = () => {
    if (isMuted) {
      playerService.setVolume(previousVolume);
      setIsMuted(false);
    } else {
      setPreviousVolume(volume);
      playerService.setVolume(0);
      setIsMuted(true);
    }
  };

  const handleShuffle = () => {
    playerService.toggleShuffle();
  };

  const handleRepeat = () => {
    playerService.toggleRepeat();
  };

  const currentTime = currentTrack ? (currentTrack.duration * progress) / 100 : 0;
  const totalTime = currentTrack?.duration || 0;

  if (!currentTrack) {
    return null;
  }

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 bg-card border-t px-4 py-3 z-30 lg:ml-64",
      className
    )}>
      <div className="flex items-center justify-between">
        {/* Track info */}
        <div className="flex items-center space-x-3 min-w-0 flex-1 lg:flex-none lg:w-64">
          <div className="relative w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
            <Image
              src={currentTrack.coverUrl}
              alt={`${currentTrack.title} cover`}
              fill
              className="object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{currentTrack.title}</p>
            <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
            <Heart className="h-4 w-4" />
            <span className="sr-only">Like song</span>
          </Button>
        </div>

        {/* Player controls */}
        <div className="hidden lg:flex flex-col items-center space-y-2 flex-1 max-w-md">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", shuffle && "text-primary")}
              onClick={handleShuffle}
            >
              <Shuffle className="h-4 w-4" />
              <span className="sr-only">Shuffle</span>
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handlePrevious}
            >
              <SkipBack className="h-4 w-4" />
              <span className="sr-only">Previous</span>
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full"
              onClick={handlePlayPause}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
              <span className="sr-only">{isPlaying ? 'Pause' : 'Play'}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleNext}
            >
              <SkipForward className="h-4 w-4" />
              <span className="sr-only">Next</span>
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8",
                repeat !== 'off' && "text-primary"
              )}
              onClick={handleRepeat}
            >
              <Repeat className="h-4 w-4" />
              {repeat === 'track' && (
                <span className="absolute top-0 right-0 w-1 h-1 bg-primary rounded-full" />
              )}
              <span className="sr-only">Repeat</span>
            </Button>
          </div>

          {/* Progress bar */}
          <div className="flex items-center space-x-2 w-full">
            <span className="text-xs text-muted-foreground w-10 text-right">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[progress]}
              onValueChange={handleSeek}
              max={100}
              step={0.1}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-10">
              {formatTime(totalTime)}
            </span>
          </div>
        </div>

        {/* Volume and queue */}
        <div className="flex items-center space-x-2 lg:w-64 justify-end">
          {/* Mobile play/pause */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 lg:hidden"
            onClick={handlePlayPause}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            <span className="sr-only">{isPlaying ? 'Pause' : 'Play'}</span>
          </Button>

          {/* Desktop volume controls */}
          <div className="hidden lg:flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleMute}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
              <span className="sr-only">Toggle mute</span>
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
              className="w-20"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onQueueOpen}
          >
            <List className="h-4 w-4" />
            <span className="sr-only">Queue</span>
          </Button>

          <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">More options</span>
          </Button>
        </div>
      </div>

      {/* Mobile progress bar */}
      <div className="lg:hidden mt-2">
        <Slider
          value={[progress]}
          onValueChange={handleSeek}
          max={100}
          step={0.1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalTime)}</span>
        </div>
      </div>
    </div>
  );
}
