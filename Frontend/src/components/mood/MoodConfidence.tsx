'use client';

import * as React from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface MoodConfidenceProps {
  confidence: number; // 0-1
  className?: string;
}

/**
 * Mood confidence indicator with progress bar and percentage
 */
export function MoodConfidence({ confidence, className }: MoodConfidenceProps) {
  const percentage = Math.round(confidence * 100);
  
  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'text-green-600';
    if (conf >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (conf: number) => {
    if (conf >= 0.8) return 'High confidence';
    if (conf >= 0.6) return 'Medium confidence';
    return 'Low confidence';
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Confidence</span>
        <span className={cn('font-medium', getConfidenceColor(confidence))}>
          {percentage}%
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
      <p className={cn('text-xs', getConfidenceColor(confidence))}>
        {getConfidenceLabel(confidence)}
      </p>
    </div>
  );
}
