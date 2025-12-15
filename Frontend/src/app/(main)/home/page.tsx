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
export default function MainAppPage() {
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
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
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

  // Fetch mood-based recommendations (can be called from anywhere)
  const fetchMoodRecommendations = async (mood: string, languages: string[] = ['English']) => {
    const primaryLanguage = languages[0] || 'English';
    console.log('🎵 Fetching recommendations for mood:', mood, 'with language:', primaryLanguage);
    
    try {
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
    } catch (error) {
      console.error('Failed to fetch mood recommendations:', error);
    }
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
        
        // Clear recently played cache (we always fetch fresh)
        localStorage.removeItem('cached_recent');
        console.log('🧹 Cleared recently played cache - always fetch fresh');
        
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

      // Always fetch fresh recently played (no cache)
      console.log('🔄 Fetching fresh recently played songs');
      await fetchRecent();
    };

    const fetchTrending = async () => {
      console.log('🎵 Fetching trending tracks via backend');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      try {
        // Get auth token to use language preferences
        const { data: { session } } = await supabase.auth.getSession();
        
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        
        const response = await fetch(`${apiUrl}/recommendations?limit=6`, { headers });
        console.log('📊 Trending response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('📊 Trending data:', data);
          
          if (data.success && data.recommendations && data.recommendations.length > 0) {
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
            console.log('✅ Cached trending tracks:', tracks.length);
            return;
          } else {
            console.log('⚠️ Backend returned no recommendations, using fallback');
          }
        } else {
          console.log('⚠️ Backend request failed with status:', response.status);
        }
      } catch (error) {
        console.error('Failed to fetch trending from backend:', error);
      }
      
      // Fallback to multiple search attempts with different queries
      console.log('🔄 Using Spotify search fallback for trending');
      const searchQueries = ['top hits 2024', 'popular songs', 'billboard hot 100'];
      
      for (const query of searchQueries) {
        try {
          const trendingResult = await spotifyService.searchMusic(query, 6);
          if (trendingResult && trendingResult.tracks && trendingResult.tracks.length > 0) {
            setTrending(trendingResult.tracks);
            localStorage.setItem('cached_trending', JSON.stringify({
              tracks: trendingResult.tracks,
              timestamp: Date.now()
            }));
            console.log('✅ Loaded trending via search:', query, trendingResult.tracks.length);
            return;
          }
        } catch (error) {
          console.error(`Failed search for "${query}":`, error);
        }
      }
      
      console.error('❌ All trending fallbacks failed');
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
          }
          return;
        }
        
        // Fetch from listening history database (NO CACHE - always fresh)
        const response = await fetch(`${apiUrl}/listening-history?limit=6`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.history && data.history.length > 0) {
            // Deduplicate by song_id to avoid showing same song multiple times
            const seenIds = new Set<string>();
            const uniqueTracks = data.history
              .filter((h: any) => {
                if (seenIds.has(h.song_id)) return false;
                seenIds.add(h.song_id);
                return true;
              })
              .map((h: any) => ({
                id: h.song_id,
                name: h.song_name,
                artists: [h.artist_name],
                album: h.album_name || 'Unknown Album',
                duration_ms: h.duration_ms || 180000,
                image_url: h.image_url || null,
                external_urls: { spotify: h.spotify_url || '#' },
                preview_url: null
              }));
            
            setRecentlyPlayed(uniqueTracks.slice(0, 6));
            console.log('✅ Loaded fresh recently played tracks (deduplicated):', uniqueTracks.length);
            return;
          } else {
            console.log('📭 No listening history found, using fallback');
          }
        }
      } catch (error) {
        console.error('Failed to fetch listening history:', error);
      }
      
      // Fallback to search if listening history is empty or fails
      console.log('🔄 Using fallback: searching for latest releases');
      const recentResult = await spotifyService.searchMusic('latest hits 2024', 6);
      if (recentResult) {
        setRecentlyPlayed(recentResult.tracks);
        console.log('✅ Loaded fallback recent tracks');
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
    
    // Listen for new mood recommendations from auto-detection
    const handleNewRecommendations = (event: any) => {
      console.log('🎵 Received new mood recommendations:', event.detail);
      if (event.detail?.tracks && event.detail.tracks.length > 0) {
        setMoodBasedTracks(event.detail.tracks);
        setDetectedMood(event.detail.mood);
        
        // Cache the new recommendations
        localStorage.setItem(`cached_recommendations_${event.detail.mood}`, JSON.stringify({
          tracks: event.detail.tracks,
          timestamp: Date.now()
        }));
        console.log('💾 Updated mood recommendations on home page');
      }
    };
    window.addEventListener('newMoodRecommendations', handleNewRecommendations as EventListener);
    
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
      window.removeEventListener('newMoodRecommendations', handleNewRecommendations);
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

  const moodGenres = [
    { name: 'Energize', icon: '⚡', color: 'from-orange-500 to-red-500', mood: 'energetic' },
    { name: 'Feel Good', icon: '😊', color: 'from-yellow-400 to-orange-400', mood: 'happy' },
    { name: 'Relax', icon: '🌊', color: 'from-blue-400 to-cyan-400', mood: 'calm' },
    { name: 'Workout', icon: '💪', color: 'from-red-500 to-pink-500', mood: 'energetic' },
    { name: 'Sad', icon: '😢', color: 'from-gray-500 to-blue-500', mood: 'sad' },
    { name: 'Party', icon: '🎉', color: 'from-purple-500 to-pink-500', mood: 'happy' },
    { name: 'Focus', icon: '🎯', color: 'from-indigo-500 to-blue-500', mood: 'calm' },
    { name: 'Romance', icon: '💕', color: 'from-pink-400 to-rose-400', mood: 'calm' },
    { name: 'Sleep', icon: '😴', color: 'from-indigo-600 to-purple-600', mood: 'calm' },
  ];

  return (
    <div className="h-full overflow-y-auto">
      {/* Hero Section with Greeting & Quick Actions */}
      <div className="relative bg-gradient-to-b from-purple-600/20 via-background to-background px-6 pt-6 pb-12">
        <div className="max-w-7xl mx-auto">
          {/* Greeting */}
          <h1 className="text-4xl md:text-5xl font-bold mb-2" suppressHydrationWarning>
            {mounted ? getGreeting() : 'Welcome'}
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            Welcome back! Here's what we think you'll love today.
          </p>

          {/* Quick Actions - Featured Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Link href="/suggest">
              <Card className="group relative overflow-hidden gradient-bg-purple text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-[1.02]">
                <CardContent className="p-8">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
                        <Lightbulb className="h-6 w-6" />
                        Discover by Mood
                      </h3>
                      <p className="text-white/90 text-sm mb-4">
                        Let AI suggest music based on how you're feeling
                      </p>
                      <div className="inline-flex items-center text-sm font-semibold bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
                        Try Suggest →
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/mood">
              <Card className="group relative overflow-hidden gradient-bg-mint text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-[1.02]">
                <CardContent className="p-8">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
                        <Camera className="h-6 w-6" />
                        Mood Detection
                      </h3>
                      <p className="text-white/90 text-sm mb-4">
                        Use your camera to detect your current mood
                      </p>
                      <div className="inline-flex items-center text-sm font-semibold bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
                        Detect Mood →
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Mood Genre Pills */}
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Browse by mood</h3>
            {selectedMood && (
              <button
                onClick={() => {
                  setSelectedMood(null);
                  // Reload default recommendations
                  const storedMood = localStorage.getItem('detected_mood');
                  let moodToUse = 'happy';
                  if (storedMood) {
                    try {
                      const parsed = JSON.parse(storedMood);
                      const age = Date.now() - new Date(parsed.timestamp).getTime();
                      if (age < 15 * 60 * 1000) {
                        moodToUse = parsed.mood || 'happy';
                      }
                    } catch (error) {
                      console.error('Failed to parse mood:', error);
                    }
                  }
                  fetchMoodRecommendations(moodToUse, languagePriorities);
                }}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Clear filter
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {moodGenres.map((genre) => (
              <button
                key={genre.name}
                onClick={async () => {
                  setSelectedMood(genre.mood);
                  setDetectedMood(genre.mood);
                  setIsLoading(true);
                  await fetchMoodRecommendations(genre.mood, languagePriorities);
                  setIsLoading(false);
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium text-white bg-gradient-to-r ${genre.color} hover:scale-105 transition-transform shadow-lg flex items-center gap-2 ${
                  selectedMood === genre.mood ? 'ring-2 ring-white ring-offset-2 ring-offset-background' : ''
                }`}
              >
                <span>{genre.icon}</span>
                <span>{genre.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 pb-8 max-w-7xl mx-auto space-y-10">
        {/* Mood-Based Recommendations */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold">
                {selectedMood ? `${selectedMood.charAt(0).toUpperCase() + selectedMood.slice(1)} Vibes` : detectedMood ? `${detectedMood.charAt(0).toUpperCase() + detectedMood.slice(1)} Vibes` : 'Recommended for You'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedMood ? `Music matching your ${selectedMood} mood` : detectedMood ? `Music matching your ${detectedMood} mood` : 'Personalized music recommendations'}
              </p>
            </div>
            <Button variant="ghost" className="font-semibold" asChild>
              <Link href="/suggest">Show all →</Link>
            </Button>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-16 bg-muted/30 rounded-xl">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Loading recommendations...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
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

        {/* Interest-Based Recommendations */}
        {userInterests.length > 0 && interestBasedTracks.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold">Based on Your Interests</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {userInterests.slice(0, 3).join(', ')} {userInterests.length > 3 ? `and ${userInterests.length - 3} more` : ''}
                </p>
              </div>
              <Button variant="ghost" className="font-semibold" asChild>
                <Link href="/account">Edit Interests →</Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
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

        {/* Recently Played */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold">Recently played</h2>
              <p className="text-sm text-muted-foreground mt-1">Your listening history</p>
            </div>
            <Button variant="ghost" className="font-semibold" asChild>
              <Link href="/library">Show all →</Link>
            </Button>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-16 bg-muted/30 rounded-xl">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Loading music...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
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

        {/* Trending Now */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold">Trending now</h2>
              <p className="text-sm text-muted-foreground mt-1">Popular tracks right now</p>
            </div>
            <Button variant="ghost" className="font-semibold" asChild>
              <Link href="/search">Explore →</Link>
            </Button>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-16 bg-muted/30 rounded-xl">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Loading trending...</span>
            </div>
          ) : trending.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
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
            <div className="text-center py-16 bg-muted/30 rounded-xl">
              <p className="text-muted-foreground">No trending tracks available</p>
            </div>
          )}
        </section>

        {/* Mood Playlists */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold">Mood Playlists</h2>
              <p className="text-sm text-muted-foreground mt-1">Curated collections for every emotion</p>
            </div>
            <Button variant="ghost" className="font-semibold" asChild>
              <Link href="/suggest">Explore moods →</Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/mood">
              <Card className="group relative overflow-hidden gradient-bg-coral text-white border-0 cursor-pointer hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl h-48">
                <CardContent className="p-6 h-full flex flex-col justify-between">
                  <div>
                    <div className="text-4xl mb-2">😊</div>
                    <h3 className="text-xl font-bold mb-1">Happy Vibes</h3>
                    <p className="text-sm text-white/80">Uplifting tracks to brighten your day</p>
                  </div>
                  {moodBasedTracks.length > 0 && (
                    <p className="text-xs text-white/60">{Math.floor(moodBasedTracks.length / 2)} tracks</p>
                  )}
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/mood">
              <Card className="group relative overflow-hidden gradient-bg-mint text-white border-0 cursor-pointer hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl h-48">
                <CardContent className="p-6 h-full flex flex-col justify-between">
                  <div>
                    <div className="text-4xl mb-2">🌊</div>
                    <h3 className="text-xl font-bold mb-1">Chill Out</h3>
                    <p className="text-sm text-white/80">Relaxing music for peaceful moments</p>
                  </div>
                  {moodBasedTracks.length > 0 && (
                    <p className="text-xs text-white/60">{Math.ceil(moodBasedTracks.length / 2)} tracks</p>
                  )}
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/suggest">
              <Card className="group relative overflow-hidden gradient-bg-purple text-white border-0 cursor-pointer hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl h-48">
                <CardContent className="p-6 h-full flex flex-col justify-between">
                  <div>
                    <div className="text-4xl mb-2">⚡</div>
                    <h3 className="text-xl font-bold mb-1">Energetic</h3>
                    <p className="text-sm text-white/80">High-energy beats to pump you up</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/suggest">
              <Card className="group relative overflow-hidden gradient-bg-vibrant text-white border-0 cursor-pointer hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl h-48">
                <CardContent className="p-6 h-full flex flex-col justify-between">
                  <div>
                    <div className="text-4xl mb-2">😢</div>
                    <h3 className="text-xl font-bold mb-1">Melancholy</h3>
                    <p className="text-sm text-white/80">Thoughtful tracks for introspective times</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>
      </div>

      <AutoMoodDetector />
    </div>
  );
}

