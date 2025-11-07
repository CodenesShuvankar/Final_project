'use client';

import * as React from 'react';
import { X, Play, MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlayerStore } from '@/lib/store/playerStore';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface QueueDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Queue drawer showing upcoming tracks with reorder and remove functionality
 */
export function QueueDrawer({ open, onOpenChange }: QueueDrawerProps) {
  const { queue, currentIndex, currentTrack, playerService } = usePlayerStore();

  const upcomingTracks = queue.slice(currentIndex + 1);

  const handlePlayTrack = (trackIndex: number) => {
    const actualIndex = currentIndex + 1 + trackIndex;
    const track = queue[actualIndex];
    if (track) {
      playerService.playTrack(track, queue);
    }
  };

  const handleRemoveFromQueue = (trackIndex: number) => {
    const actualIndex = currentIndex + 1 + trackIndex;
    playerService.removeFromQueue(actualIndex);
  };

  const handleClearQueue = () => {
    playerService.clearQueue();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-96">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Queue</SheetTitle>
            {upcomingTracks.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearQueue}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear all
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Now Playing */}
          {currentTrack && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Now Playing
              </h3>
              <div className="flex items-center space-x-3 p-2 rounded-md bg-accent/50">
                <div className="relative w-10 h-10 rounded overflow-hidden bg-muted flex-shrink-0">
                  <Image
                    src={currentTrack.coverUrl}
                    alt={`${currentTrack.title} cover`}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{currentTrack.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {currentTrack.artist}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDuration(currentTrack.duration)}
                </span>
              </div>
            </div>
          )}

          {/* Next Up */}
          {upcomingTracks.length > 0 ? (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Next Up ({upcomingTracks.length})
              </h3>
              <div className="space-y-1">
                {upcomingTracks.map((track, index) => (
                  <div
                    key={`${track.id}-${index}`}
                    className="group flex items-center space-x-3 p-2 rounded-md hover:bg-accent/50 transition-colors"
                  >
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
                          onClick={() => handlePlayTrack(index)}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{track.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {track.artist}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(track.duration)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveFromQueue(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                        <span className="sr-only">Remove from queue</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No tracks in queue</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add songs to see them here
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
