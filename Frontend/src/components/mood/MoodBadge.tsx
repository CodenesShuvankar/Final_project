'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { MoodDetection } from '@/lib/services/mood';

interface MoodBadgeProps {
  mood: MoodDetection['mood'];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const moodConfig: Record<string, { color: string; emoji: string }> = {
  happy: { color: 'bg-yellow-500 text-yellow-50', emoji: '😊' },
  sad: { color: 'bg-blue-500 text-blue-50', emoji: '😢' },
  energetic: { color: 'bg-red-500 text-red-50', emoji: '⚡' },
  natural: { color: 'bg-green-500 text-green-50', emoji: '😐' },
  calm: { color: 'bg-green-500 text-green-50', emoji: '😌' },
  neutral: { color: 'bg-gray-500 text-gray-50', emoji: '😐' },
  angry: { color: 'bg-orange-500 text-orange-50', emoji: '😠' },
  romantic: { color: 'bg-pink-500 text-pink-50', emoji: '💕' },
  confident: { color: 'bg-purple-500 text-purple-50', emoji: '💪' },
  chill: { color: 'bg-teal-500 text-teal-50', emoji: '😎' },
  disgust: { color: 'bg-teal-500 text-teal-50', emoji: '🤢' },
  fear: { color: 'bg-indigo-500 text-indigo-50', emoji: '😨' },
  surprise: { color: 'bg-cyan-500 text-cyan-50', emoji: '😲' },
};

/**
 * Mood badge component for displaying detected mood with appropriate styling
 */
export function MoodBadge({ mood, size = 'md', className }: MoodBadgeProps) {
  // Fallback to 'happy' if mood is undefined or not in config
  const safeMood = mood && moodConfig[mood] ? mood : 'happy';
  const config = moodConfig[safeMood];
  
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
      {safeMood.charAt(0).toUpperCase() + safeMood.slice(1)}
    </span>
  );
}
