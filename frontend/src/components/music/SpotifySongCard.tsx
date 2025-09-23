'use client';

import * as React from 'react';
import { Heart, MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { InlinePlayer } from './InlinePlayer';
import Image from 'next/image';

import { SpotifyTrack } from '@/lib/services/spotify';

interface SpotifySongCardProps {
  track: SpotifyTrack;
  showArtist?: boolean;
  showAlbum?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * Song card component specifically for Spotify tracks with preview support
 */
export function SpotifySongCard({
  track,
  showArtist = false,
  showAlbum = false,
  compact = false,
  className
}: SpotifySongCardProps) {
  const formatDuration = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const artistNames = Array.isArray(track.artists) ? track.artists.join(', ') : track.artists;

  if (compact) {
    return (
      <div className={cn(
        "group flex items-center space-x-3 p-2 rounded-md hover:bg-accent/50 transition-colors",
        className
      )}>
        <div className="relative w-10 h-10 rounded overflow-hidden bg-muted flex-shrink-0">
          {track.image_url ? (
            <Image
              src={track.image_url}
              alt={`${track.name} cover`}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-xs text-muted-foreground">♪</span>
            </div>
          )}
        </div>
        
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">
            {track.name}
          </p>
          {showArtist && (
            <p className="text-xs text-muted-foreground truncate">
              {artistNames}
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <InlinePlayer
            track={{
              id: track.id,
              name: track.name,
              artists: track.artists,
              preview_url: track.preview_url || null,
              image_url: track.image_url || null,
              external_urls: track.external_urls,
            }}
            showExternalLink={false}
          />
          <span className="text-xs text-muted-foreground">
            {formatDuration(track.duration_ms)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn(
      "group overflow-hidden hover:bg-accent/50 transition-colors",
      className
    )}>
      <CardContent className="p-4">
        <div className="relative aspect-square mb-4 rounded-md overflow-hidden bg-muted">
          {track.image_url ? (
            <Image
              src={track.image_url}
              alt={`${track.name} cover`}
              fill
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-4xl text-muted-foreground">♪</span>
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <h3 className="font-medium truncate">
            {track.name}
          </h3>
          {showArtist && (
            <p className="text-sm text-muted-foreground truncate">
              {artistNames}
            </p>
          )}
          {showAlbum && (
            <p className="text-xs text-muted-foreground truncate">
              {track.album}
            </p>
          )}
        </div>

        {/* Player Controls */}
        <div className="mt-4">
          <InlinePlayer
            track={{
              id: track.id,
              name: track.name,
              artists: track.artists,
              preview_url: track.preview_url || null,
              image_url: track.image_url || null,
              external_urls: track.external_urls,
            }}
            showVolumeControl={false}
            showExternalLink={true}
          />
        </div>

        <div className="flex items-center justify-between mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
            >
              <Heart className="h-3 w-3" />
              <span className="sr-only">Like song</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Plus className="h-3 w-3" />
              <span className="sr-only">Add to playlist</span>
            </Button>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-xs text-muted-foreground">
              {formatDuration(track.duration_ms)}
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