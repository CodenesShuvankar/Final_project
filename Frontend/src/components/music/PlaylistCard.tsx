'use client';

import * as React from 'react';
import { Play, Pause, Heart, MoreHorizontal, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Playlist } from '@/lib/mockData';
import { usePlayerStore } from '@/lib/store/playerStore';
import Image from 'next/image';
import Link from 'next/link';

interface PlaylistCardProps {
  playlist: Playlist;
  onPlay?: () => void;
  showCreator?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * Playlist card component for displaying playlist information with play controls
 */
export function PlaylistCard({ 
  playlist, 
  onPlay, 
  showCreator = true,
  compact = false,
  className 
}: PlaylistCardProps) {
  const { isPlaying } = usePlayerStore();

  // Debug logging
  console.log('📀 PlaylistCard received:', { 
    id: playlist.id, 
    title: playlist.title, 
    trackCount: playlist.trackCount,
    duration: playlist.duration 
  });

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours} hr ${mins} min`;
    }
    return `${mins} min`;
  };

  if (compact) {
    return (
      <Link href={`/playlist/${playlist.id}`}>
        <div className={cn(
          "group flex items-center space-x-3 p-2 rounded-md hover:bg-accent/50 transition-colors cursor-pointer",
          className
        )}>
          <div className="relative w-12 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
            <Image
              src={playlist.coverUrl}
              alt={`${playlist.title} cover`}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.preventDefault();
                  onPlay?.();
                }}
              >
                <Play className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{playlist.title}</p>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              {playlist.collaborative && <Users className="h-3 w-3" />}
              <span>{playlist.trackCount} songs</span>
              <span>•</span>
              <span>{playlist.creator}</span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Card className={cn(
      "group overflow-hidden hover:bg-accent/50 transition-colors cursor-pointer",
      className
    )}>
      <Link href={`/playlist/${playlist.id}`}>
        <CardContent className="p-4">
          <div className="relative aspect-square mb-4 rounded-md overflow-hidden bg-muted">
            <Image
              src={playlist.coverUrl}
              alt={`${playlist.title} cover`}
              fill
              className="object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full"
                onClick={(e) => {
                  e.preventDefault();
                  onPlay?.();
                }}
              >
                <Play className="h-6 w-6 ml-0.5" />
              </Button>
            </div>
            {playlist.collaborative && (
              <div className="absolute top-2 right-2 bg-muted/80 p-1 rounded">
                <Users className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
          </div>
          
          <div className="space-y-1">
            <h3 className="font-medium truncate">{playlist.title}</h3>
            {playlist.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {playlist.description}
              </p>
            )}
            {showCreator && (
              <p className="text-xs text-muted-foreground">
                By {playlist.creator}
              </p>
            )}
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <span>{playlist.trackCount} songs</span>
              <span>•</span>
              <span>{formatDuration(playlist.duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center space-x-1">
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Heart className="h-3 w-3" />
                <span className="sr-only">Like playlist</span>
              </Button>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="h-3 w-3" />
              <span className="sr-only">More options</span>
            </Button>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
