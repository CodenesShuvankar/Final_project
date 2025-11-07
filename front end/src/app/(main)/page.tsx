'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlaylistCard } from '@/components/music/PlaylistCard';
import { SongCard } from '@/components/music/SongCard';
import { mockTracks, mockPlaylists } from '@/lib/mockData';
import { usePlayerStore } from '@/lib/store/playerStore';
import { SpotifyTrack, SpotifyMusicService } from '@/lib/services/spotify';
import { VoiceEmotionService } from '@/lib/services/voiceEmotion';
import { Lightbulb, Clock, Loader2, Mic, Camera } from 'lucide-react';
import Link from 'next/link';

/**
 * Home page with personalized content and mood highlights
 */
export default function HomePage() {
  const { playerService } = usePlayerStore();
  const [recentlyPlayed, setRecentlyPlayed] = useState<SpotifyTrack[]>([]);
  const [trending, setTrending] = useState<SpotifyTrack[]>([]);
  const [moodBasedTracks, setMoodBasedTracks] = useState<SpotifyTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoDetectionDone, setAutoDetectionDone] = useState(false);
  const [detectedMood, setDetectedMood] = useState<string | null>(null);
  
  const spotifyService = SpotifyMusicService.getInstance();
  const voiceService = VoiceEmotionService.getInstance();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Load Spotify data on component mount
  useEffect(() => {
    const loadSpotifyData = async () => {
      setIsLoading(true);
      try {
        // Check for detected mood
        const storedMood = localStorage.getItem('detected_mood');
        let moodToUse = 'happy'; // Default mood
        
        if (storedMood) {
          try {
            const parsed = JSON.parse(storedMood);
            moodToUse = parsed.mood || 'happy';
            setDetectedMood(moodToUse);
            console.log('✅ Using detected mood for recommendations:', moodToUse);
          } catch (error) {
            console.error('Failed to parse mood:', error);
          }
        }

        // Check if we already have cached recommendations for this mood
        const cachedKey = `cached_recommendations_${moodToUse}`;
        const cached = localStorage.getItem(cachedKey);
        
        if (cached) {
          try {
            const { tracks, timestamp } = JSON.parse(cached);
            const age = Date.now() - timestamp;
            
            // Use cache if less than 30 minutes old
            if (age < 30 * 60 * 1000) {
              console.log('✅ Using cached recommendations for mood:', moodToUse);
              setMoodBasedTracks(tracks);
            } else {
              console.log('⏰ Mood cache expired, fetching new recommendations');
              await fetchMoodRecommendations(moodToUse);
            }
          } catch (error) {
            console.error('Failed to parse cached recommendations:', error);
            await fetchMoodRecommendations(moodToUse);
          }
        } else {
          await fetchMoodRecommendations(moodToUse);
        }

        // Load trending and recently played (with cache)
        await loadTrendingAndRecent();

      } catch (error) {
        console.error('Failed to load Spotify data:', error);
        // Fallback to mock data if Spotify fails
        setRecentlyPlayed(mockTracks.slice(0, 6).map(track => ({
          id: track.id,
          name: track.title,
          artists: [track.artist],
          album: track.album,
          duration_ms: track.duration * 1000,
          preview_url: undefined,
          external_urls: { spotify: '#' },
          image_url: track.coverUrl,
        })));
        setTrending(mockTracks.slice(3, 9).map(track => ({
          id: track.id,
          name: track.title,
          artists: [track.artist],
          album: track.album,
          duration_ms: track.duration * 1000,
          preview_url: undefined,
          external_urls: { spotify: '#' },
          image_url: track.coverUrl,
        })));
        setMoodBasedTracks(mockTracks.slice(10, 18).map(track => ({
          id: track.id,
          name: track.title,
          artists: [track.artist],
          album: track.album,
          duration_ms: track.duration * 1000,
          preview_url: undefined,
          external_urls: { spotify: '#' },
          image_url: track.coverUrl,
        })));
      } finally {
        setIsLoading(false);
      }
    };

    const fetchMoodRecommendations = async (mood: string) => {
      console.log('🎵 Fetching recommendations for mood:', mood);
      const moodResult = await spotifyService.getMoodRecommendations(mood, 8);
      if (moodResult) {
        setMoodBasedTracks(moodResult.results.tracks);
        
        // Cache the recommendations
        localStorage.setItem(`cached_recommendations_${mood}`, JSON.stringify({
          tracks: moodResult.results.tracks,
          timestamp: Date.now()
        }));
        console.log('💾 Cached recommendations for mood:', mood);
      }
    };

    const loadTrendingAndRecent = async () => {
      // Check cache for trending
      const cachedTrending = localStorage.getItem('cached_trending');
      if (cachedTrending) {
        try {
          const { tracks, timestamp } = JSON.parse(cachedTrending);
          const age = Date.now() - timestamp;
          
          // Use cache if less than 30 minutes old
          if (age < 30 * 60 * 1000) {
            console.log('✅ Using cached trending tracks');
            setTrending(tracks);
          } else {
            console.log('⏰ Trending cache expired, fetching new');
            await fetchTrending();
          }
        } catch (error) {
          console.error('Failed to parse cached trending:', error);
          await fetchTrending();
        }
      } else {
        await fetchTrending();
      }

      // Check cache for recently played
      const cachedRecent = localStorage.getItem('cached_recent');
      if (cachedRecent) {
        try {
          const { tracks, timestamp } = JSON.parse(cachedRecent);
          const age = Date.now() - timestamp;
          
          // Use cache if less than 30 minutes old
          if (age < 30 * 60 * 1000) {
            console.log('✅ Using cached recent tracks');
            setRecentlyPlayed(tracks);
          } else {
            console.log('⏰ Recent cache expired, fetching new');
            await fetchRecent();
          }
        } catch (error) {
          console.error('Failed to parse cached recent:', error);
          await fetchRecent();
        }
      } else {
        await fetchRecent();
      }
    };

    const fetchTrending = async () => {
      console.log('🎵 Fetching trending tracks');
      const trendingResult = await spotifyService.searchMusic('trending hits 2024', 6);
      if (trendingResult) {
        setTrending(trendingResult.tracks);
        localStorage.setItem('cached_trending', JSON.stringify({
          tracks: trendingResult.tracks,
          timestamp: Date.now()
        }));
        console.log('💾 Cached trending tracks');
      }
    };

    const fetchRecent = async () => {
      console.log('🎵 Fetching recent tracks');
      const recentResult = await spotifyService.searchMusic('popular songs', 6);
      if (recentResult) {
        setRecentlyPlayed(recentResult.tracks);
        localStorage.setItem('cached_recent', JSON.stringify({
          tracks: recentResult.tracks,
          timestamp: Date.now()
        }));
        console.log('💾 Cached recent tracks');
      }
    };

    loadSpotifyData();
  }, []);

  // Listen for mood detection updates
  useEffect(() => {
    const handleMoodUpdate = async () => {
      const storedMood = localStorage.getItem('detected_mood');
      if (storedMood) {
        try {
          const parsed = JSON.parse(storedMood);
          const newMood = parsed.mood || 'happy';
          
          // Only reload if mood actually changed
          if (newMood !== detectedMood) {
            console.log('🔄 Mood changed from', detectedMood, 'to', newMood, '- fetching new recommendations');
            setDetectedMood(newMood);
            
            // Clear old cache for previous mood
            if (detectedMood) {
              localStorage.removeItem(`cached_recommendations_${detectedMood}`);
            }
            
            // Fetch new recommendations for new mood
            const moodResult = await spotifyService.getMoodRecommendations(newMood, 8);
            if (moodResult) {
              setMoodBasedTracks(moodResult.results.tracks);
              
              // Cache the new recommendations
              localStorage.setItem(`cached_recommendations_${newMood}`, JSON.stringify({
                tracks: moodResult.results.tracks,
                timestamp: Date.now()
              }));
              console.log('💾 Cached new recommendations for mood:', newMood);
            }
          } else {
            console.log('✅ Mood unchanged, no need to fetch');
          }
        } catch (error) {
          console.error('Failed to parse mood:', error);
        }
      }
    };

    // Listen for storage changes from other tabs
    window.addEventListener('storage', handleMoodUpdate);
    
    // Listen for custom mood update event from same tab
    const handleCustomMoodUpdate = () => {
      console.log('👂 Received mood update event');
      handleMoodUpdate();
    };
    window.addEventListener('moodUpdated', handleCustomMoodUpdate);

    return () => {
      window.removeEventListener('storage', handleMoodUpdate);
      window.removeEventListener('moodUpdated', handleCustomMoodUpdate);
    };
  }, [detectedMood, spotifyService]);

  const convertSpotifyTrackToTrack = (track: SpotifyTrack) => ({
    id: track.id,
    title: track.name,
    artist: track.artists.join(', '),
    album: track.album,
    duration: Math.floor(track.duration_ms / 1000),
    coverUrl: track.image_url || '',
    genre: 'Pop', // Default genre
    mood: ['happy'],
    energy: 0.7,
    valence: 0.8,
    tempo: 120,
    year: 2024,
    explicit: false,
    liked: false,
  });

  const handlePlayTrack = (track: SpotifyTrack) => {
    const playerTrack = convertSpotifyTrackToTrack(track);
    playerService.playTrack(playerTrack, [playerTrack]);
  };

  const madeForYou = mockPlaylists.slice(0, 4);

  return (
    <div className="p-6 space-y-8">
      {/* Greeting */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{getGreeting()}</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's what we think you'll love today.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="gradient-bg-purple text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-2">Discover by Mood</h3>
                <p className="text-sm opacity-90">
                  Let AI suggest music based on how you're feeling
                </p>
              </div>
              <Lightbulb className="h-8 w-8 opacity-80" />
            </div>
            <Button asChild className="mt-4 bg-white/20 hover:bg-white/30 text-white border-0">
              <Link href="/suggest">Try Suggest</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="gradient-bg-mint text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-2">Mood Detection</h3>
                <p className="text-sm opacity-90">
                  Use your camera to detect your current mood
                </p>
              </div>
              <Clock className="h-8 w-8 opacity-80" />
            </div>
            <Button asChild className="mt-4 bg-white/20 hover:bg-white/30 text-white border-0">
              <Link href="/mood">Detect Mood</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Mood-Based Recommendations - First Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">
              {detectedMood ? `${detectedMood.charAt(0).toUpperCase() + detectedMood.slice(1)} Vibes` : 'Recommended for You'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {detectedMood ? `Music matching your ${detectedMood} mood` : 'Personalized music recommendations'}
            </p>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/suggest">Show all</Link>
          </Button>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading recommendations...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {moodBasedTracks.slice(0, 6).map((track) => (
              <SongCard
                key={track.id}
                track={convertSpotifyTrackToTrack(track)}
                onPlay={() => handlePlayTrack(track)}
                showArtist
              />
            ))}
          </div>
        )}
      </section>

      {/* Recently Played - Second Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Recently played</h2>
          <Button variant="ghost" asChild>
            <Link href="/library">Show all</Link>
          </Button>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading music...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {recentlyPlayed.map((track) => (
              <SongCard
                key={track.id}
                track={convertSpotifyTrackToTrack(track)}
                onPlay={() => handlePlayTrack(track)}
                showArtist
              />
            ))}
          </div>
        )}
      </section>

      {/* Made for You */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Made for you</h2>
          <Button variant="ghost" asChild>
            <Link href="/library">Show all</Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {madeForYou.map((playlist) => (
            <PlaylistCard
              key={playlist.id}
              playlist={playlist}
              onPlay={() => {
                // Play first track from playlist
                const firstTrack = mockTracks.find(t => playlist.tracks.includes(t.id));
                if (firstTrack) {
                  const playlistTracks = mockTracks.filter(t => playlist.tracks.includes(t.id));
                  playerService.playTrack(firstTrack, playlistTracks);
                }
              }}
            />
          ))}
        </div>
      </section>

      {/* Trending */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Trending now</h2>
          <Button variant="ghost" asChild>
            <Link href="/search">Explore</Link>
          </Button>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading trending...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {trending.map((track) => (
              <SongCard
                key={track.id}
                track={convertSpotifyTrackToTrack(track)}
                onPlay={() => handlePlayTrack(track)}
                showArtist
              />
            ))}
          </div>
        )}
      </section>

      {/* Mood Highlights */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Mood Highlights</h2>
          <Button variant="ghost" asChild>
            <Link href="/suggest">Explore moods</Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/mood">
            <Card className="gradient-bg-coral text-white border-0 cursor-pointer hover:scale-105 transition-transform shadow-lg">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold mb-2">Happy Vibes</h3>
                <p className="text-sm opacity-90">Uplifting tracks to brighten your day</p>
                {moodBasedTracks.length > 0 && (
                  <p className="text-xs opacity-70 mt-2">{Math.floor(moodBasedTracks.length / 2)} tracks loaded</p>
                )}
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/mood">
            <Card className="gradient-bg-mint text-white border-0 cursor-pointer hover:scale-105 transition-transform shadow-lg">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold mb-2">Chill Out</h3>
                <p className="text-sm opacity-90">Relaxing music for peaceful moments</p>
                {moodBasedTracks.length > 0 && (
                  <p className="text-xs opacity-70 mt-2">{Math.ceil(moodBasedTracks.length / 2)} tracks loaded</p>
                )}
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/suggest">
            <Card className="gradient-bg-purple text-white border-0 cursor-pointer hover:scale-105 transition-transform shadow-lg">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold mb-2">Energetic</h3>
                <p className="text-sm opacity-90">High-energy beats to pump you up</p>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/suggest">
            <Card className="gradient-bg-vibrant text-white border-0 cursor-pointer hover:scale-105 transition-transform shadow-lg">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold mb-2">Melancholy</h3>
                <p className="text-sm opacity-90">Thoughtful tracks for introspective times</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>
    </div>
  );
}
