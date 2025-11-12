/**
 * Spotify OAuth callback page
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SpotifyAuthService } from '@/lib/services/spotifyAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function SpotifyCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setMessage(`Authentication failed: ${error}`);
        return;
      }

      if (!code || !state) {
        setStatus('error');
        setMessage('Missing authentication parameters');
        return;
      }

      try {
        const authService = SpotifyAuthService.getInstance();
        const success = await authService.handleCallback(code, state);

        if (success) {
          // Check if user has Premium
          const hasPremium = await authService.hasPremium();
          
          if (!hasPremium) {
            setStatus('error');
            setMessage('Spotify Premium subscription required for full song playback');
            return;
          }

          setStatus('success');
          setMessage('Successfully authenticated with Spotify!');
          
          // Redirect after a brief delay
          setTimeout(() => {
            router.push('/');
          }, 2000);
        } else {
          setStatus('error');
          setMessage('Failed to complete authentication');
        }
      } catch (error) {
        setStatus('error');
        setMessage('An unexpected error occurred');
        console.error('Callback error:', error);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-spotify-green/10 to-primary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-spotify-green rounded-full flex items-center justify-center mx-auto mb-4">
            {status === 'loading' && <Loader2 className="h-6 w-6 text-white animate-spin" />}
            {status === 'success' && <CheckCircle className="h-6 w-6 text-white" />}
            {status === 'error' && <XCircle className="h-6 w-6 text-white" />}
          </div>
          <CardTitle className="text-2xl">
            {status === 'loading' && 'Authenticating...'}
            {status === 'success' && 'Success!'}
            {status === 'error' && 'Authentication Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{message}</p>
          
          {status === 'success' && (
            <p className="text-sm text-muted-foreground">
              Redirecting you back to the app...
            </p>
          )}
          
          {status === 'error' && (
            <div className="space-y-2">
              <Button onClick={() => router.push('/')} className="w-full">
                Return to App
              </Button>
              <p className="text-xs text-muted-foreground">
                Note: Full song playback requires Spotify Premium
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}