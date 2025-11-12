'use client';

import * as React from 'react';
import { Calendar, Users, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from './StatusBadge';
import { FeatureRequest } from '@/lib/mockData';
import { cn } from '@/lib/utils';

interface RoadmapViewProps {
  requests: FeatureRequest[];
  className?: string;
}

interface RoadmapSection {
  title: string;
  description: string;
  requests: FeatureRequest[];
  color: string;
}

/**
 * Roadmap view showing feature requests organized by status
 */
export function RoadmapView({ requests, className }: RoadmapViewProps) {
  const sections: RoadmapSection[] = [
    {
      title: 'In Progress',
      description: 'Features currently being developed',
      requests: requests.filter(r => r.status === 'in-progress'),
      color: 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950',
    },
    {
      title: 'Planned',
      description: 'Features scheduled for future development',
      requests: requests.filter(r => r.status === 'planned'),
      color: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950',
    },
    {
      title: 'Completed',
      description: 'Recently completed features',
      requests: requests.filter(r => r.status === 'done'),
      color: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950',
    },
  ];

  const totalRequests = requests.length;
  const completedRequests = requests.filter(r => r.status === 'done').length;
  const progressPercentage = totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Development Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>Overall completion</span>
              <span className="font-medium">{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {requests.filter(r => r.status === 'done').length}
                </div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {requests.filter(r => r.status === 'in-progress').length}
                </div>
                <div className="text-xs text-muted-foreground">In Progress</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {requests.filter(r => r.status === 'planned').length}
                </div>
                <div className="text-xs text-muted-foreground">Planned</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roadmap Sections */}
      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.title} className="space-y-3">
            <div>
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <p className="text-sm text-muted-foreground">{section.description}</p>
            </div>
            
            {section.requests.length === 0 ? (
              <Card className={cn('border-dashed', section.color)}>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    No features in this category yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {section.requests.map((request) => (
                  <Card key={request.id} className={cn('hover:shadow-md transition-shadow', section.color)}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm leading-tight mb-1">
                            {request.title}
                          </h3>
                          <StatusBadge status={request.status} />
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {request.votes}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {request.description}
                        </p>
                        
                        {request.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {request.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {request.tags.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{request.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(request.createdAt)}
                          </div>
                          {request.comments.length > 0 && (
                            <span>{request.comments.length} comments</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
