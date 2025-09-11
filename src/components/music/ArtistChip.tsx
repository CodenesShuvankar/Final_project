'use client';

import * as React from 'react';
import { Play, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Artist } from '@/lib/mockData';
import Image from 'next/image';

interface ArtistChipProps {
  artist: Artist;
  onPlay?: () => void;
  className?: string;
}

/**
 * Artist chip component for displaying artist information
 */
export function ArtistChip({ artist, onPlay, className }: ArtistChipProps) {
  const formatFollowers = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(0)}K`;
    }
    return count.toString();
  };

  return (
    <Card className={cn(
      "group overflow-hidden hover:bg-accent/50 transition-colors cursor-pointer",
      className
    )}>
      <CardContent className="p-4 text-center">
        <div className="relative aspect-square mb-4 rounded-full overflow-hidden bg-muted mx-auto">
          <Image
            src={artist.imageUrl}
            alt={`${artist.name} photo`}
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
              <Play className="h-6 w-6 ml-0.5" />
            </Button>
          </div>
          {artist.verified && (
            <div className="absolute bottom-2 right-2 bg-primary text-primary-foreground p-1 rounded-full">
              <UserCheck className="h-3 w-3" />
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <h3 className="font-medium truncate">{artist.name}</h3>
          <p className="text-sm text-muted-foreground">
            {formatFollowers(artist.followers)} followers
          </p>
          <div className="flex flex-wrap justify-center gap-1 mt-2">
            {artist.genres.slice(0, 2).map((genre) => (
              <span
                key={genre}
                className="text-xs bg-muted px-2 py-1 rounded-full"
              >
                {genre}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
