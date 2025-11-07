'use client';

import * as React from 'react';
import { useState } from 'react';
import { Search, Filter, SortAsc } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FeatureRequestCard } from './FeatureRequestCard';
import { FeatureRequest } from '@/lib/mockData';
import { cn } from '@/lib/utils';

interface FeatureRequestListProps {
  requests: FeatureRequest[];
  userVotes: string[];
  onVote: (requestId: string) => void;
  onShowComments?: (requestId: string) => void;
  className?: string;
}

type SortOption = 'newest' | 'oldest' | 'most-votes' | 'least-votes';
type FilterOption = 'all' | 'planned' | 'in-progress' | 'done';

/**
 * List component for displaying and filtering feature requests
 */
export function FeatureRequestList({ 
  requests, 
  userVotes, 
  onVote, 
  onShowComments,
  className 
}: FeatureRequestListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Get all unique tags from requests
  const allTags = Array.from(new Set(requests.flatMap(r => r.tags))).sort();

  // Filter and sort requests
  const filteredRequests = requests
    .filter(request => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!request.title.toLowerCase().includes(query) && 
            !request.description.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Status filter
      if (filterBy !== 'all' && request.status !== filterBy) {
        return false;
      }

      // Tag filter
      if (selectedTags.length > 0) {
        if (!selectedTags.some(tag => request.tags.includes(tag))) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'most-votes':
          return b.votes - a.votes;
        case 'least-votes':
          return a.votes - b.votes;
        default:
          return 0;
      }
    });

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterBy('all');
    setSelectedTags([]);
    setSortBy('newest');
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search feature requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Status:</span>
            {(['all', 'planned', 'in-progress', 'done'] as FilterOption[]).map((status) => (
              <Badge
                key={status}
                variant={filterBy === status ? "default" : "outline"}
                className="cursor-pointer capitalize"
                onClick={() => setFilterBy(status)}
              >
                {status === 'in-progress' ? 'In Progress' : status}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2">
            <SortAsc className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Sort:</span>
            {([
              { value: 'newest', label: 'Newest' },
              { value: 'oldest', label: 'Oldest' },
              { value: 'most-votes', label: 'Most Votes' },
              { value: 'least-votes', label: 'Least Votes' }
            ] as { value: SortOption; label: string }[]).map((option) => (
              <Badge
                key={option.value}
                variant={sortBy === option.value ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSortBy(option.value)}
              >
                {option.label}
              </Badge>
            ))}
          </div>
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium">Tags:</span>
            {allTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => handleTagToggle(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {(searchQuery || filterBy !== 'all' || selectedTags.length > 0 || sortBy !== 'newest') && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Showing {filteredRequests.length} of {requests.length} requests
            </span>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {/* Request List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {requests.length === 0 
                ? 'No feature requests yet. Be the first to submit one!'
                : 'No requests match your current filters.'
              }
            </p>
          </div>
        ) : (
          filteredRequests.map((request) => (
            <FeatureRequestCard
              key={request.id}
              request={request}
              hasVoted={userVotes.includes(request.id)}
              onVote={() => onVote(request.id)}
              onShowComments={() => onShowComments?.(request.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
