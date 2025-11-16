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
import { HistoryService } from '@/lib/services/historyService';
import { LikedSongsService } from '@/lib/services/likedSongs';
import { Lightbulb, Clock, Loader2, Mic, Camera } from 'lucide-react';
import Link from 'next/link';
import { AutoMoodDetector } from '@/components/mood/AutoMoodDetector';
import { supabase } from '@/lib/supabaseClient';

/**
 * Home page with personalized content and mood highlights
 */
export default function HomePage() {
  const { playerService } = usePlayerStore();
  const [recentlyPlayed, setRecentlyPlayed] = useState<SpotifyTrack[]>([]);
  const [trending, setTrending] = useState<SpotifyTrack[]>([]);
  const [moodBasedTracks, setMoodBasedTracks] = useState<SpotifyTrack[]>([]);
  const [interestBasedTracks, setInterestBasedTracks] = useState<SpotifyTrack[]>([]);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [languagePriorities, setLanguagePriorities] = useState<string[]>(['English']);
  const [isLoading, setIsLoading] = useState(true);
  const [autoDetectionDone, setAutoDetectionDone] = useState(false);
  const [detectedMood, setDetectedMood] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
  const spotifyService = SpotifyMusicService.getInstance();
  const voiceService = VoiceEmotionService.getInstance();
  const likedSongsService = LikedSongsService.getInstance();

  const getGreeting = () => {
    const hour = new Date().getHours();
    console.log('🕐 Current hour:', hour);
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Set mounted state to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load Spotify data on component mount
  useEffect(() => {
    const loadSpotifyData = async () => {
      setIsLoading(true);
      try {
        // Initialize liked songs cache first to prevent multiple API calls
        await likedSongsService.initializeCache();
        
        // Load user interests from backend
        const preferences = await loadUserInterests();
        const languages = preferences?.language_priorities || ['English'];
        
        // Force clear any stale mood data first
        const storedMood = localStorage.getItem('detected_mood');
        let moodToUse = 'happy'; // Default mood
        
        if (storedMood) {
          try {
            const parsed = JSON.parse(storedMood);
            const moodTimestamp = parsed.timestamp ? new Date(parsed.timestamp).getTime() : 0;
            const age = Date.now() - moodTimestamp;
            
            // Only use mood if it's less than 15 minutes old AND not 'calm' (clear old calm data)
            if (age < 15 * 60 * 1000 && parsed.mood !== 'calm') {
              moodToUse = parsed.mood || 'happy';
              setDetectedMood(moodToUse);
              console.log('✅ Using detected mood for recommendations:', moodToUse, '(age:', Math.floor(age / 60000), 'minutes)');
            } else {
              console.log('⏰ Detected mood is too old or invalid (', parsed.mood, '), using default: happy');
              localStorage.removeItem('detected_mood'); // Clear stale data
              // Clear ALL mood recommendation caches
              ['calm', 'happy', 'sad', 'energetic', 'angry', 'neutral'].forEach(mood => {
                localStorage.removeItem(`cached_recommendations_${mood}`);
              });
              console.log('🧹 Cleared all stale mood caches');
              moodToUse = 'happy';
              setDetectedMood(null);
            }
          } catch (error) {
            console.error('Failed to parse mood:', error);
            localStorage.removeItem('detected_mood'); // Clear invalid data
            localStorage.removeItem('cached_recommendations_calm');
          }
        } else {
          console.log('📝 No stored mood, using default: happy');
          setDetectedMood(null);
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
              await fetchMoodRecommendations(moodToUse, languages);
            }
          } catch (error) {
            console.error('Failed to parse cached recommendations:', error);
            await fetchMoodRecommendations(moodToUse, languages);
          }
        } else {
          await fetchMoodRecommendations(moodToUse, languages);
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
          preview_url: null,
          external_urls: { spotify: '#' },
          image_url: track.coverUrl,
        })));
        setTrending(mockTracks.slice(3, 9).map(track => ({
          id: track.id,
          name: track.title,
          artists: [track.artist],
          album: track.album,
          duration_ms: track.duration * 1000,
          preview_url: null,
          external_urls: { spotify: '#' },
          image_url: track.coverUrl,
        })));
        setMoodBasedTracks(mockTracks.slice(10, 18).map(track => ({
          id: track.id,
          name: track.title,
          artists: [track.artist],
          album: track.album,
          duration_ms: track.duration * 1000,
          preview_url: null,
          external_urls: { spotify: '#' },
          image_url: track.coverUrl,
        })));
      } finally {
        setIsLoading(false);
      }
    };

    const loadUserInterests = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('📝 No session, skipping interest loading');
          return { language_priorities: ['English'] };
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/api/user-preferences`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.preferences && data.preferences.preferred_genres && data.preferences.preferred_genres.length > 0) {
            setUserInterests(data.preferences.preferred_genres);
            setLanguagePriorities(data.preferences.language_priorities || ['English']);
            console.log('✅ Loaded user interests:', data.preferences.preferred_genres);
            console.log('✅ Loaded language priorities:', data.preferences.language_priorities);
            
            // Fetch interest-based recommendations
            await fetchInterestBasedRecommendations(data.preferences.preferred_genres, data.preferences.language_priorities || ['English']);
            return data.preferences;
          } else {
            console.log('📝 No user interests set');
            setLanguagePriorities(data.preferences?.language_priorities || ['English']);
            return data.preferences || { language_priorities: ['English'] };
          }
        }
        return { language_priorities: ['English'] };
      } catch (error) {
        console.error('Failed to load user interests:', error);
        return { language_priorities: ['English'] };
      }
    };

    const fetchInterestBasedRecommendations = async (interests: string[], languages: string[] = ['English']) => {
      try {
        // Take first 3 interests to search for
        const searchGenres = interests.slice(0, 3);
        const primaryLanguage = languages[0] || 'English';
        console.log('🎵 Fetching recommendations for interests:', searchGenres, 'with language:', primaryLanguage);
        
        const allTracks: SpotifyTrack[] = [];
        
        // Fetch tracks for each interest with language preference
        for (const genre of searchGenres) {
          // Add language to search query for better results
          const searchQuery = `${genre} ${primaryLanguage}`;
          const result = await spotifyService.searchMusic(searchQuery, 4);
          if (result && result.tracks.length > 0) {
            allTracks.push(...result.tracks);
          }
        }
        
        // Shuffle and limit to 8 tracks
        const shuffled = allTracks.sort(() => Math.random() - 0.5).slice(0, 8);
        setInterestBasedTracks(shuffled);
        console.log('✅ Loaded', shuffled.length, 'interest-based tracks for', primaryLanguage);
      } catch (error) {
        console.error('Failed to fetch interest-based recommendations:', error);
      }
    };

    const fetchMoodRecommendations = async (mood: string, languages: string[] = ['English']) => {
      const primaryLanguage = languages[0] || 'English';
      console.log('🎵 Fetching recommendations for mood:', mood, 'with language:', primaryLanguage);
      
      // Add language to mood query for better results
      const searchQuery = `${mood} ${primaryLanguage}`;
      const moodResult = await spotifyService.getMoodRecommendations(searchQuery, 8);
      if (moodResult) {
        setMoodBasedTracks(moodResult.results.tracks);
        
        // Cache the recommendations
        localStorage.setItem(`cached_recommendations_${mood}`, JSON.stringify({
          tracks: moodResult.results.tracks,
          timestamp: Date.now()
        }));
        console.log('💾 Cached recommendations for mood:', mood, 'in', primaryLanguage);
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
      console.log('🎵 Fetching trending tracks via backend');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      try {
        const response = await fetch(`${apiUrl}/recommendations?limit=6`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.recommendations) {
            const tracks = data.recommendations.map((rec: any) => ({
              id: rec.id || rec.track_id || Math.random().toString(),
              name: rec.name || rec.track_name || 'Unknown Track',
              artists: Array.isArray(rec.artists) ? rec.artists : [rec.artist || 'Unknown Artist'],
              album: rec.album || 'Unknown Album',
              duration_ms: rec.duration_ms || 180000,
              preview_url: rec.preview_url || null,
              image_url: rec.image_url || rec.album_art || null,
              external_urls: { spotify: rec.spotify_url || '#' },
            }));
            
            setTrending(tracks);
            localStorage.setItem('cached_trending', JSON.stringify({
              tracks: tracks,
              timestamp: Date.now()
            }));
            console.log('💾 Cached trending tracks:', tracks.length);
            return;
          }
        }
      } catch (error) {
        console.error('Failed to fetch trending from backend:', error);
      }
      
      // Fallback to search if recommendations fail
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
      console.log('🎵 Fetching recently played from listening history database');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      try {
        // Get auth token
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          console.log('⚠️ No auth token, using fallback - latest releases');
          // Fallback to different search than trending
          const recentResult = await spotifyService.searchMusic('new releases 2024', 6);
          if (recentResult) {
            setRecentlyPlayed(recentResult.tracks);
            localStorage.setItem('cached_recent', JSON.stringify({
              tracks: recentResult.tracks,
              timestamp: Date.now()
            }));
          }
          return;
        }
        
        // Fetch from listening history database
        const response = await fetch(`${apiUrl}/listening-history?limit=6`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.history && data.history.length > 0) {
            const tracks = data.history.map((h: any) => ({
              id: h.song_id,
              name: h.song_name,
              artists: [h.artist_name],
              album: h.album_name || 'Unknown Album',
              duration_ms: h.duration_ms || 180000,
              image_url: h.image_url || null,
              external_urls: { spotify: h.spotify_url || '#' },
              preview_url: null
            }));
            
            setRecentlyPlayed(tracks);
            localStorage.setItem('cached_recent', JSON.stringify({
              tracks: tracks,
              timestamp: Date.now()
            }));
            console.log('💾 Cached recent tracks from listening history:', tracks.length);
            return;
          } else {
            console.log('📭 No listening history found, using fallback');
          }
        }
      } catch (error) {
        console.error('Failed to fetch listening history:', error);
      }
      
      // Fallback to search if listening history is empty or fails
      // Use different search terms than trending section
      console.log('🔄 Using fallback: searching for latest releases');
      const recentResult = await spotifyService.searchMusic('latest hits 2024', 6);
      if (recentResult) {
        setRecentlyPlayed(recentResult.tracks);
        localStorage.setItem('cached_recent', JSON.stringify({
          tracks: recentResult.tracks,
          timestamp: Date.now()
        }));
        console.log('💾 Cached fallback recent tracks');
      }
    };

    loadSpotifyData();
  }, []);

  // Listen for mood detection updates
  useEffect(() => {
    const handleMoodUpdate = async () => {
      console.log('👂 Mood update event received');
      const storedMood = localStorage.getItem('detected_mood');
      if (storedMood) {
        try {
          const parsed = JSON.parse(storedMood);
          const newMood = parsed.mood || 'happy';
          
          // Only reload if mood actually changed
          if (newMood !== detectedMood) {
            console.log('🔄 Mood changed from', detectedMood, 'to', newMood, '- fetching new recommendations');
            setDetectedMood(newMood);
            setIsLoading(true);
            
            // Clear old cache for previous mood
            if (detectedMood) {
              localStorage.removeItem(`cached_recommendations_${detectedMood}`);
            }
            
            // Fetch new recommendations with language priority
            const primaryLanguage = languagePriorities[0] || 'English';
            const searchQuery = `${newMood} ${primaryLanguage}`;
            console.log('🔍 Searching with language priority:', searchQuery);
            
            const moodResult = await spotifyService.getMoodRecommendations(searchQuery, 8);
            if (moodResult) {
              setMoodBasedTracks(moodResult.results.tracks);
              
              // Cache the new recommendations
              localStorage.setItem(`cached_recommendations_${newMood}`, JSON.stringify({
                tracks: moodResult.results.tracks,
                timestamp: Date.now()
              }));
              console.log('💾 Cached new recommendations for mood:', newMood, 'in', primaryLanguage);
            }
            
            setIsLoading(false);
          } else {
            console.log('✅ Mood unchanged, no need to fetch');
          }
        } catch (error) {
          console.error('Failed to parse mood:', error);
          setIsLoading(false);
        }
      }
    };

    // Listen for storage changes from other tabs
    window.addEventListener('storage', handleMoodUpdate);
    
    // Listen for custom mood update event from same tab (most important!)
    const handleCustomMoodUpdate = (event: any) => {
      console.log('👂 Received custom moodUpdated event:', event.detail);
      handleMoodUpdate();
    };
    window.addEventListener('moodUpdated', handleCustomMoodUpdate as EventListener);
    
    // Listen for page visibility changes (user returns to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👁️ Page visible again, checking for mood updates');
        handleMoodUpdate();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('storage', handleMoodUpdate);
      window.removeEventListener('moodUpdated', handleCustomMoodUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [detectedMood, spotifyService]);

  // Also reload mood data when page gains focus
  useEffect(() => {
    const handleFocus = () => {
      console.log('🎯 Page focused, reloading mood data');
      const storedMood = localStorage.getItem('detected_mood');
      if (storedMood) {
        try {
          // Try to parse as JSON object
          let moodData;
          try {
            moodData = JSON.parse(storedMood);
          } catch {
            // If parsing fails, it's an old string format - clear it
            console.log('🧹 Clearing old mood format from localStorage on focus');
            localStorage.removeItem('detected_mood');
            return;
          }
          
          if (moodData && moodData.timestamp) {
            const moodTimestamp = new Date(moodData.timestamp).getTime();
            const age = Date.now() - moodTimestamp;
            
            if (age < 15 * 60 * 1000 && moodData.mood !== 'calm') {
              const newMood = moodData.mood || 'happy';
              if (newMood !== detectedMood) {
                console.log('🔄 Detected mood changed on focus:', detectedMood, '→', newMood);
                setDetectedMood(newMood);
              }
            }
          }
        } catch (error) {
          console.error('Failed to parse mood on focus:', error);
          localStorage.removeItem('detected_mood'); // Clear corrupted data
        }
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [detectedMood, spotifyService]);

  const convertSpotifyTrackToTrack = (track: SpotifyTrack) => ({
    id: track.id,
    title: track.name,
    artist: track.artists.join(', '),
    album: track.album,
    duration: Math.floor(track.duration_ms / 1000),
    coverUrl: track.image_url || '',
    genre: 'Pop', // Default genre
    mood: ['happy'] as any,
    energy: 0.7,
    valence: 0.8,
    tempo: 120,
    year: 2024,
    explicit: false,
    liked: false,
  });

  const handlePlayTrack = (track: SpotifyTrack) => {
    // Open Spotify URL directly since we don't have streaming capability
    const spotifyUrl = track.external_urls?.spotify;
    if (spotifyUrl) {
      window.open(spotifyUrl, '_blank', 'noopener,noreferrer');
    } else {
      // Fallback: search for the track on Spotify
      const searchQuery = encodeURIComponent(`${track.name} ${track.artists.join(' ')}`);
      window.open(`https://open.spotify.com/search/${searchQuery}`, '_blank', 'noopener,noreferrer');
    }
    
    // Track in listening history
    const trackHistory = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        try {
          await HistoryService.addToHistory(
            track.id,
            track.name,
            track.artists.join(', '),
            track.album,
            track.image_url || '',
            spotifyUrl,
            track.duration_ms,
            false
          );
        } catch (error) {
          console.error('Failed to track listening history:', error);
        }
      }
    };
    trackHistory();
  };

  return (
    <div className="p-6 space-y-8">
      {/* Greeting */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold" suppressHydrationWarning>
          {mounted ? getGreeting() : 'Welcome'}
        </h1>
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

      {/* Interest-Based Recommendations - NEW */}
      {userInterests.length > 0 && interestBasedTracks.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Based on Your Interests</h2>
              <p className="text-sm text-muted-foreground">
                {userInterests.slice(0, 3).join(', ')} {userInterests.length > 3 ? `and ${userInterests.length - 3} more` : ''}
              </p>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/account">Edit Interests</Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {interestBasedTracks.map((track) => (
              <SongCard
                key={track.id}
                track={convertSpotifyTrackToTrack(track)}
                onPlay={() => handlePlayTrack(track)}
                showArtist
              />
            ))}
          </div>
        </section>
      )}

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

      {/* Trending - Third Section */}
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
        ) : trending.length > 0 ? (
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
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No trending tracks available</p>
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
      <AutoMoodDetector />
    </div>
  );
}

