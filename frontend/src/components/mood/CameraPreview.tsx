'use client';

import * as React from 'react';
import { Camera, CameraOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CameraPreviewProps {
  isActive: boolean;
  onToggle: () => void;
  className?: string;
}

/**
 * Mock camera preview component (placeholder for real camera integration)
 */
export function CameraPreview({ isActive, onToggle, className }: CameraPreviewProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0">
        <div className="relative aspect-video bg-muted flex items-center justify-center">
          {isActive ? (
            <>
              {/* Mock camera feed with animated dots */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900">
                <div className="absolute inset-4 border-2 border-primary/50 rounded-lg">
                  <div className="absolute top-2 left-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <div className="absolute top-2 right-2 text-xs text-white/70">LIVE</div>
                </div>
                
                {/* Mock face detection overlay */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="w-32 h-40 border-2 border-primary rounded-lg animate-pulse">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-primary font-medium">
                      Face Detected
                    </div>
                  </div>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 text-white hover:bg-white/20"
                onClick={onToggle}
              >
                <CameraOff className="h-4 w-4" />
                <span className="sr-only">Turn off camera</span>
              </Button>
            </>
          ) : (
            <div className="text-center p-8">
              <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Camera preview</p>
              <Button onClick={onToggle} variant="outline">
                <Camera className="mr-2 h-4 w-4" />
                Enable Camera
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
