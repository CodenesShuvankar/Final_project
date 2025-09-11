'use client';

import * as React from 'react';
import { ThumbsUp, ThumbsDown, UserX, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface RefinementBarProps {
  onRefine: (type: 'more_like_this' | 'less_energetic' | 'skip_artist' | 'surprise_me', trackId?: string) => void;
  selectedTrackId?: string;
  className?: string;
}

/**
 * Refinement bar with chips for adjusting suggestions
 */
export function RefinementBar({ onRefine, selectedTrackId, className }: RefinementBarProps) {
  const refinements = [
    {
      id: 'more_like_this',
      label: 'More like this',
      icon: ThumbsUp,
      description: 'Find similar tracks',
      requiresSelection: true,
    },
    {
      id: 'less_energetic',
      label: 'Less energetic',
      icon: ThumbsDown,
      description: 'Lower energy tracks',
      requiresSelection: false,
    },
    {
      id: 'skip_artist',
      label: 'Skip this artist',
      icon: UserX,
      description: 'Hide tracks from this artist',
      requiresSelection: true,
    },
    {
      id: 'surprise_me',
      label: 'Surprise me',
      icon: Shuffle,
      description: 'Random selection',
      requiresSelection: false,
    },
  ] as const;

  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <h4 className="text-sm font-medium mb-2">Refine your results</h4>
        <p className="text-xs text-muted-foreground">
          {selectedTrackId 
            ? 'Select a track above, then use these options to refine your suggestions'
            : 'Click on a track first to enable more refinement options'
          }
        </p>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {refinements.map((refinement) => {
          const Icon = refinement.icon;
          const isDisabled = refinement.requiresSelection && !selectedTrackId;
          
          return (
            <Button
              key={refinement.id}
              variant="outline"
              size="sm"
              disabled={isDisabled}
              onClick={() => onRefine(refinement.id, selectedTrackId)}
              className={cn(
                'h-auto flex-col items-start p-3 text-left',
                isDisabled && 'opacity-50'
              )}
            >
              <div className="flex items-center space-x-2 mb-1">
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{refinement.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {refinement.description}
              </span>
            </Button>
          );
        })}
      </div>

      {selectedTrackId && (
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Selected track:</strong> Use the options above to refine suggestions based on this track.
          </p>
        </div>
      )}
    </div>
  );
}
