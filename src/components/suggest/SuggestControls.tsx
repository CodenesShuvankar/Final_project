'use client';

import * as React from 'react';
import { useState } from 'react';
import { Camera, Sliders, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { CameraPreview } from '@/components/mood/CameraPreview';
import { MoodBadge } from '@/components/mood/MoodBadge';
import { MoodConfidence } from '@/components/mood/MoodConfidence';
import { SuggestFilters } from '@/lib/services/suggest';
import { MoodDetection, MoodService } from '@/lib/services/mood';
import { contexts, decades, languages } from '@/lib/mockData';
import { cn } from '@/lib/utils';

interface SuggestControlsProps {
  filters: SuggestFilters;
  onFiltersChange: (filters: SuggestFilters) => void;
  mood?: MoodDetection;
  onMoodChange: (mood: MoodDetection | undefined) => void;
  className?: string;
}

/**
 * Suggest page controls for mood detection and preference filters
 */
export function SuggestControls({ 
  filters, 
  onFiltersChange, 
  mood, 
  onMoodChange, 
  className 
}: SuggestControlsProps) {
  const [useCameraForMood, setUseCameraForMood] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const moodService = MoodService.getInstance();

  const handleDetectMood = async () => {
    if (!cameraActive) {
      setCameraActive(true);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsDetecting(true);
    try {
      const detection = await moodService.detectMood();
      onMoodChange(detection);
    } catch (error) {
      console.error('Mood detection failed:', error);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleContextToggle = (context: string) => {
    const newContexts = filters.contexts.includes(context)
      ? filters.contexts.filter(c => c !== context)
      : [...filters.contexts, context];
    
    onFiltersChange({ ...filters, contexts: newContexts });
  };

  const handleLanguageToggle = (language: string) => {
    const newLanguages = filters.languages.includes(language)
      ? filters.languages.filter(l => l !== language)
      : [...filters.languages, language];
    
    onFiltersChange({ ...filters, languages: newLanguages });
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Mood Detection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Camera className="h-5 w-5" />
            <span>Mood Detection</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Use Camera for Mood</p>
              <p className="text-xs text-muted-foreground">
                Detect your mood using your camera
              </p>
            </div>
            <Switch
              checked={useCameraForMood}
              onCheckedChange={setUseCameraForMood}
            />
          </div>

          {useCameraForMood && (
            <div className="space-y-4">
              <CameraPreview 
                isActive={cameraActive} 
                onToggle={() => setCameraActive(!cameraActive)}
              />
              
              <Button
                onClick={handleDetectMood}
                disabled={isDetecting}
                className="w-full"
                variant="outline"
              >
                {isDetecting ? 'Detecting...' : 'Detect Mood'}
              </Button>
            </div>
          )}

          {mood && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <MoodBadge mood={mood.mood} />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMoodChange(undefined)}
                >
                  Clear
                </Button>
              </div>
              <MoodConfidence confidence={mood.confidence} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Context Chips */}
      <Card>
        <CardHeader>
          <CardTitle>Context</CardTitle>
          <p className="text-sm text-muted-foreground">
            What are you doing right now?
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {contexts.map((context) => (
              <Badge
                key={context}
                variant={filters.contexts.includes(context) ? "default" : "outline"}
                className="cursor-pointer hover:bg-accent"
                onClick={() => handleContextToggle(context)}
              >
                {context}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preference Sliders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sliders className="h-5 w-5" />
            <span>Preferences</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Energy</label>
              <span className="text-xs text-muted-foreground">
                {Math.round(filters.energy * 100)}%
              </span>
            </div>
            <Slider
              value={[filters.energy * 100]}
              onValueChange={(value) => 
                onFiltersChange({ ...filters, energy: value[0] / 100 })
              }
              max={100}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Tempo (BPM)</label>
              <span className="text-xs text-muted-foreground">
                {Math.round(filters.tempo)}
              </span>
            </div>
            <Slider
              value={[filters.tempo]}
              onValueChange={(value) => 
                onFiltersChange({ ...filters, tempo: value[0] })
              }
              min={60}
              max={200}
              step={5}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Valence (Happy/Sad)</label>
              <span className="text-xs text-muted-foreground">
                {Math.round(filters.valence * 100)}%
              </span>
            </div>
            <Slider
              value={[filters.valence * 100]}
              onValueChange={(value) => 
                onFiltersChange({ ...filters, valence: value[0] / 100 })
              }
              max={100}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">History Weight</label>
              <span className="text-xs text-muted-foreground">
                {Math.round(filters.historyWeight * 100)}%
              </span>
            </div>
            <Slider
              value={[filters.historyWeight * 100]}
              onValueChange={(value) => 
                onFiltersChange({ ...filters, historyWeight: value[0] / 100 })
              }
              max={100}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              How much to consider your listening history
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Decade Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Decade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {decades.map((decade) => (
              <Badge
                key={decade}
                variant={filters.decade === decade ? "default" : "outline"}
                className="cursor-pointer hover:bg-accent"
                onClick={() => 
                  onFiltersChange({ 
                    ...filters, 
                    decade: filters.decade === decade ? '' : decade 
                  })
                }
              >
                {decade}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Language Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Languages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {languages.map((language) => (
              <Badge
                key={language}
                variant={filters.languages.includes(language) ? "default" : "outline"}
                className="cursor-pointer hover:bg-accent"
                onClick={() => handleLanguageToggle(language)}
              >
                {language}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
