'use client';

import * as React from 'react';
import { useState } from 'react';
import { MessageCircle, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from './StatusBadge';
import { VoteButton } from './VoteButton';
import { FeatureRequest } from '@/lib/mockData';
import { cn } from '@/lib/utils';

interface FeatureRequestCardProps {
  request: FeatureRequest;
  hasVoted: boolean;
  onVote: () => void;
  onShowComments?: () => void;
  className?: string;
}

/**
 * Card component for displaying feature requests
 */
export function FeatureRequestCard({ 
  request, 
  hasVoted, 
  onVote, 
  onShowComments,
  className 
}: FeatureRequestCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const truncateDescription = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-tight mb-2">
              {request.title}
            </h3>
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={request.status} />
              <span className="text-xs text-muted-foreground">
                {formatDate(request.createdAt)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <VoteButton
              votes={request.votes}
              hasVoted={hasVoted}
              onVote={onVote}
            />
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isExpanded ? request.description : truncateDescription(request.description)}
            </p>
            {request.description.length > 150 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-auto p-0 mt-1 text-xs text-primary hover:bg-transparent"
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </Button>
            )}
          </div>

          {request.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {request.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={onShowComments}
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
            >
              <MessageCircle className="h-3 w-3 mr-1" />
              {request.comments.length} {request.comments.length === 1 ? 'comment' : 'comments'}
            </Button>
            
            <div className="text-xs text-muted-foreground">
              {request.votes} {request.votes === 1 ? 'vote' : 'votes'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
