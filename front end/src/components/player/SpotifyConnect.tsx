/**
 * Spotify Premium Connect Component
 * Shows connection status and allows users to connect for full song playback
 */
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePlayerStore } from '@/lib/store/playerStore';
import { SpotifyAuthService } from '@/lib/services/spotifyAuth';
import { Music, Crown, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';

interface SpotifyConnectProps {
  className?: string;
  compact?: boolean;
}

export function SpotifyConnect({ className, compact = false }: SpotifyConnectProps) {
  const { isSpotifyConnected, hasPremium, playerService } = usePlayerStore();
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const loadUserProfile = async () => {
      const authService = SpotifyAuthService.getInstance();
      if (authService.isAuthenticated()) {
        const profile = await authService.getUserProfile();
        setUserProfile(profile);
      }
    };

    loadUserProfile();
  }, [isSpotifyConnected]);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const success = await playerService.connectToSpotify();
      if (!success) {
        // User will be redirected to Spotify auth
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to connect to Spotify:', error);
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    playerService.disconnectFromSpotify();
    setUserProfile(null);
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {isSpotifyConnected && hasPremium ? (
          <Badge variant="secondary" className="bg-spotify-green/10 text-spotify-green">
            <Crown className="h-3 w-3 mr-1" />
            Premium Connected
          </Badge>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={handleConnect}
            disabled={loading}
            className="text-xs"
          >
            <Music className="h-3 w-3 mr-1" />
            Connect Spotify
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="text-center pb-4">
        <div className="w-16 h-16 bg-spotify-green rounded-full flex items-center justify-center mx-auto mb-4">
          <Music className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-xl">
          {isSpotifyConnected ? 'Spotify Connected' : 'Connect Spotify Premium'}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isSpotifyConnected && hasPremium ? (
          // Connected State
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="font-medium">Connected and Ready</span>
            </div>
            
            {userProfile && (
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <img 
                    src={userProfile.images?.[0]?.url || '/default-avatar.png'} 
                    alt={userProfile.display_name}
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="font-medium">{userProfile.display_name}</span>
                </div>
                <Badge variant="secondary" className="bg-spotify-green/10 text-spotify-green">
                  <Crown className="h-3 w-3 mr-1" />
                  {userProfile.product} Member
                </Badge>
              </div>
            )}

            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">Full Song Playback Enabled</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                You can now play complete songs instead of just previews!
              </p>
            </div>

            <Button 
              variant="outline" 
              onClick={handleDisconnect}
              className="w-full"
            >
              Disconnect Spotify
            </Button>
          </div>
        ) : (
          // Not Connected State
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-orange-600">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Preview Mode Only</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Currently playing 30-second previews
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Connect Spotify Premium for:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Full song streaming
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  No interruptions
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  High-quality audio
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Full playlist control
                </li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-amber-800">
                <Crown className="h-4 w-4" />
                <span className="font-medium">Spotify Premium Required</span>
              </div>
              <p className="text-sm text-amber-600 mt-1">
                Full song playback requires an active Spotify Premium subscription
              </p>
            </div>

            <Button 
              onClick={handleConnect}
              disabled={loading}
              className="w-full bg-spotify-green hover:bg-spotify-green/90"
            >
              {loading ? (
                'Connecting...'
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connect Spotify Premium
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              You'll be redirected to Spotify to authorize the connection
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}