'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Square, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Import RecordRTC for WAV recording
declare global {
  interface Window {
    RecordRTC: any;
  }
}

interface VoiceRecorderWAVProps {
  onAudioRecorded?: (audioBlob: Blob) => void;
  isAnalyzing?: boolean;
  className?: string;
}

export function VoiceRecorderWAV({ onAudioRecorded, isAnalyzing, className }: VoiceRecorderWAVProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLibraryLoaded, setIsLibraryLoaded] = useState(false);
  
  const recorderRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load RecordRTC library
  useEffect(() => {
    const loadRecordRTC = async () => {
      if (typeof window !== 'undefined' && !window.RecordRTC) {
        try {
          const RecordRTC = await import('recordrtc');
          window.RecordRTC = RecordRTC.default;
          setIsLibraryLoaded(true);
        } catch (error) {
          console.error('Failed to load RecordRTC:', error);
        }
      } else if (window.RecordRTC) {
        setIsLibraryLoaded(true);
      }
    };
    
    loadRecordRTC();
  }, []);

  // Request microphone permission on mount
  useEffect(() => {
    const requestPermission = async () => {
      if (!isLibraryLoaded) return;
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setHasPermission(true);
        stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
      } catch (error) {
        console.error('Microphone permission denied:', error);
        setHasPermission(false);
      }
    };

    if (isLibraryLoaded) {
      requestPermission();
    }
  }, [isLibraryLoaded]);

  // Timer effect
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordingTime(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    if (!isLibraryLoaded || !window.RecordRTC) {
      console.error('RecordRTC library not loaded');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      streamRef.current = stream;
      
      // Create RecordRTC instance with WAV configuration
      recorderRef.current = new window.RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/wav',
        recorderType: window.RecordRTC.StereoAudioRecorder,
        numberOfAudioChannels: 1,
        desiredSampRate: 16000,
        bufferSize: 4096,
        audioBitsPerSecond: 128000,
      });
      
      recorderRef.current.startRecording();
      setIsRecording(true);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      setHasPermission(false);
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && isRecording) {
      recorderRef.current.stopRecording(() => {
        const blob = recorderRef.current.getBlob();
        console.log('Recorded WAV blob:', blob.type, blob.size, 'bytes');
        
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        setIsRecording(false);
      });
    }
  };

  const playRecording = () => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play();
    }
  };

  const handleAnalyze = () => {
    console.log('🎤 VoiceRecorderWAV: handleAnalyze clicked');
    console.log('🎤 VoiceRecorderWAV: audioBlob exists:', !!audioBlob);
    console.log('🎤 VoiceRecorderWAV: onAudioRecorded exists:', !!onAudioRecorded);
    if (audioBlob && onAudioRecorded) {
      console.log('🎤 VoiceRecorderWAV: Sending audio for analysis:', audioBlob.type, audioBlob.size, 'bytes');
      onAudioRecorded(audioBlob);
    } else {
      console.error('🎤 VoiceRecorderWAV: Cannot analyze - missing audioBlob or callback');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isLibraryLoaded) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mic className="h-5 w-5" />
            <span>Voice Emotion Detection</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading audio library...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hasPermission === null) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mic className="h-5 w-5" />
            <span>Voice Emotion Detection</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Requesting microphone access...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hasPermission === false) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mic className="h-5 w-5" />
            <span>Voice Emotion Detection</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MicOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Microphone Access Required</h3>
            <p className="text-muted-foreground mb-4">
              Please allow microphone access to use voice emotion detection.
            </p>
            <Button onClick={() => window.location.reload()}>
              Retry Permission
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Mic className="h-5 w-5" />
          <span>Voice Emotion Detection (WAV)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recording Controls */}
        <div className="flex items-center justify-center space-x-4">
          {!isRecording ? (
            <Button
              onClick={startRecording}
              variant="outline"
              size="lg"
              className="flex items-center space-x-2"
              disabled={isAnalyzing}
            >
              <Mic className="h-5 w-5" />
              <span>Start Recording</span>
            </Button>
          ) : (
            <Button
              onClick={stopRecording}
              variant="destructive"
              size="lg"
              className="flex items-center space-x-2"
            >
              <Square className="h-5 w-5" />
              <span>Stop Recording</span>
            </Button>
          )}
        </div>

        {/* Recording Status */}
        {isRecording && (
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Recording: {formatTime(recordingTime)}</span>
            </div>
          </div>
        )}

        {/* Audio Playback and Analysis */}
        {audioBlob && !isRecording && (
          <div className="space-y-3">
            <div className="text-center text-sm text-muted-foreground">
              Recorded: {audioBlob.type} ({Math.round(audioBlob.size / 1024)}KB)
            </div>
            
            <div className="flex items-center justify-center space-x-2">
              <Button
                onClick={playRecording}
                variant="outline"
                size="sm"
              >
                <Play className="h-4 w-4 mr-2" />
                Play Recording
              </Button>
              
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                variant="spotify"
                size="sm"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Analyze Voice'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Hidden audio element for playback */}
        {audioUrl && (
          <audio ref={audioRef} src={audioUrl} style={{ display: 'none' }} />
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Click "Start Recording" and speak clearly</p>
          <p>• Record for at least 3-5 seconds for best results</p>
          <p>• Audio will be saved as WAV format for better compatibility</p>
        </div>
      </CardContent>
    </Card>
  );
}