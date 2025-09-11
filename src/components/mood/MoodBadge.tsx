'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { MoodDetection } from '@/lib/services/mood';

interface MoodBadgeProps {
  mood: MoodDetection['mood'];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const moodConfig = {
  happy: { color: 'bg-yellow-500 text-yellow-50', emoji: '😊' },
  sad: { color: 'bg-blue-500 text-blue-50', emoji: '😢' },
  energetic: { color: 'bg-red-500 text-red-50', emoji: '⚡' },
  calm: { color: 'bg-green-500 text-green-50', emoji: '😌' },
  angry: { color: 'bg-orange-500 text-orange-50', emoji: '😠' },
  romantic: { color: 'bg-pink-500 text-pink-50', emoji: '💕' },
  confident: { color: 'bg-purple-500 text-purple-50', emoji: '💪' },
  chill: { color: 'bg-teal-500 text-teal-50', emoji: '😎' },
};

/**
 * Mood badge component for displaying detected mood with appropriate styling
 */
export function MoodBadge({ mood, size = 'md', className }: MoodBadgeProps) {
  const config = moodConfig[mood];
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  return (
    <span className={cn(
      'inline-flex items-center rounded-full font-medium',
      config.color,
      sizeClasses[size],
      className
    )}>
      <span className="mr-1">{config.emoji}</span>
      {mood.charAt(0).toUpperCase() + mood.slice(1)}
    </span>
  );
}
