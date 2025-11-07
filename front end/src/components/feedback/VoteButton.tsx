'use client';

import * as React from 'react';
import { ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoteButtonProps {
  votes: number;
  hasVoted: boolean;
  onVote: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Vote button for feature requests with vote count
 */
export function VoteButton({ votes, hasVoted, onVote, disabled = false, className }: VoteButtonProps) {
  return (
    <Button
      variant={hasVoted ? "default" : "outline"}
      size="sm"
      onClick={onVote}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center px-3 py-2 h-auto min-w-[60px]',
        hasVoted && 'bg-primary text-primary-foreground',
        className
      )}
    >
      <ChevronUp className={cn(
        'h-4 w-4 mb-1',
        hasVoted && 'fill-current'
      )} />
      <span className="text-xs font-medium">{votes}</span>
    </Button>
  );
}
