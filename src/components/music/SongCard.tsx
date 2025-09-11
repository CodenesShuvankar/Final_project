'use client';

import * as React from 'react';
import { Play, Pause, Heart, MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Track } from '@/lib/mockData';
import { usePlayerStore } from '@/lib/store/playerStore';
import Image from 'next/image';

interface SongCardProps {
  track: Track;
  onPlay?: () => void;
  onToggleLike?: () => void;
  isLiked?: boolean;
  showArtist?: boolean;
  showAlbum?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * Song card component for displaying track information with play controls
 */
export function SongCard({ 
  track, 
  onPlay, 
  onToggleLike,
  isLiked,
  showArtist = false, 
  showAlbum = false,
  compact = false,
  className 
}: SongCardProps) {
  const { currentTrack, isPlaying } = usePlayerStore();
  const isCurrentTrack = currentTrack?.id === track.id;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (compact) {
    return (
      <div className={cn(
        "group flex items-center space-x-3 p-2 rounded-md hover:bg-accent/50 transition-colors",
        className
      )}>
        <div className="relative w-10 h-10 rounded overflow-hidden bg-muted flex-shrink-0">
          <Image
            src={track.coverUrl}
            alt={`${track.title} cover`}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-white hover:bg-white/20"
              onClick={onPlay}
            >
              {isCurrentTrack && isPlaying ? (
                <Pause className="h-3 w-3" />
              ) : (
                <Play className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn(
            "text-sm font-medium truncate",
            isCurrentTrack && "text-primary"
          )}>
            {track.title}
          </p>
          {showArtist && (
            <p className="text-xs text-muted-foreground truncate">
              {track.artist}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity",
              track.liked && "opacity-100 text-primary"
            )}
          >
            <Heart className={cn("h-3 w-3", track.liked && "fill-current")} />
            <span className="sr-only">Like song</span>
          </Button>
          <span className="text-xs text-muted-foreground">
            {formatDuration(track.duration)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn(
      "group overflow-hidden hover:bg-accent/50 transition-colors cursor-pointer",
      className
    )}>
      <CardContent className="p-4">
        <div className="relative aspect-square mb-4 rounded-md overflow-hidden bg-muted">
          <Image
            src={track.coverUrl}
            alt={`${track.title} cover`}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full"
              onClick={onPlay}
            >
              {isCurrentTrack && isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 ml-0.5" />
              )}
            </Button>
          </div>
          {track.explicit && (
            <div className="absolute top-2 left-2 bg-muted/80 text-xs px-1.5 py-0.5 rounded text-muted-foreground">
              E
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <h3 className={cn(
            "font-medium truncate",
            isCurrentTrack && "text-primary"
          )}>
            {track.title}
          </h3>
          {showArtist && (
            <p className="text-sm text-muted-foreground truncate">
              {track.artist}
            </p>
          )}
          {showAlbum && (
            <p className="text-xs text-muted-foreground truncate">
              {track.album} • {track.year}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6",
                track.liked && "text-primary"
              )}
            >
              <Heart className={cn("h-3 w-3", track.liked && "fill-current")} />
              <span className="sr-only">Like song</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Plus className="h-3 w-3" />
              <span className="sr-only">Add to playlist</span>
            </Button>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-xs text-muted-foreground">
              {formatDuration(track.duration)}
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
