'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Play, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FeatureRequest } from '@/lib/mockData';

interface StatusBadgeProps {
  status: FeatureRequest['status'];
  className?: string;
}

const statusConfig = {
  planned: {
    label: 'Planned',
    color: 'bg-blue-500 text-blue-50',
    icon: Clock,
  },
  'in-progress': {
    label: 'In Progress',
    color: 'bg-yellow-500 text-yellow-50',
    icon: Play,
  },
  done: {
    label: 'Done',
    color: 'bg-green-500 text-green-50',
    icon: CheckCircle,
  },
};

/**
 * Status badge for feature requests
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge className={cn(config.color, 'gap-1', className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
