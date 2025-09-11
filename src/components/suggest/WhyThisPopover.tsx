'use client';

import * as React from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SuggestResult } from '@/lib/services/suggest';

interface WhyThisPopoverProps {
  result: SuggestResult;
  className?: string;
}

/**
 * Popover showing explanation for why a track was suggested
 */
export function WhyThisPopover({ result, className }: WhyThisPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <HelpCircle className="h-3 w-3" />
          <span className="sr-only">Why this suggestion?</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-sm">Why we suggested this</h4>
            <p className="text-xs text-muted-foreground">
              {result.track.title} by {result.track.artist}
            </p>
          </div>
          
          <div className="space-y-2">
            {result.reasons.map((reason, index) => (
              <div key={index} className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">{reason}</p>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Match Score</span>
              <span className="font-medium">
                {Math.round(result.score * 100)}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 mt-1">
              <div 
                className="bg-primary h-1.5 rounded-full transition-all"
                style={{ width: `${result.score * 100}%` }}
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
