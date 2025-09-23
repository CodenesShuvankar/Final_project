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
import { Lightbulb, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';

/**
 * Home page with personalized content and mood highlights
 */
export default function HomePage() {
  const { playerService } = usePlayerStore();
  const [recentlyPlayed, setRecentlyPlayed] = useState<SpotifyTrack[]>([]);
  const [trending, setTrending] = useState<SpotifyTrack[]>([]);
  const [happyTracks, setHappyTracks] = useState<SpotifyTrack[]>([]);
  const [chillTracks, setChillTracks] = useState<SpotifyTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const spotifyService = SpotifyMusicService.getInstance();

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
        // Load trending music (search for popular tracks)
        const trendingResult = await spotifyService.searchMusic('trending hits 2024', 6);
        if (trendingResult) {
          setTrending(trendingResult.tracks);
        }

        // Load recently played (using popular tracks as substitute)
        const recentResult = await spotifyService.searchMusic('popular songs', 6);
        if (recentResult) {
          setRecentlyPlayed(recentResult.tracks);
        }

        // Load mood-based tracks for mood highlights
        const happyResult = await spotifyService.getMoodRecommendations('happy', 4);
        if (happyResult) {
          setHappyTracks(happyResult.results.tracks);
        }

        const chillResult = await spotifyService.getMoodRecommendations('calm', 4);
        if (chillResult) {
          setChillTracks(chillResult.results.tracks);
        }

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
        setHappyTracks(mockTracks.slice(10, 14).map(track => ({
          id: track.id,
          name: track.title,
          artists: [track.artist],
          album: track.album,
          duration_ms: track.duration * 1000,
          preview_url: undefined,
          external_urls: { spotify: '#' },
          image_url: track.coverUrl,
        })));
        setChillTracks(mockTracks.slice(15, 19).map(track => ({
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

    loadSpotifyData();
  }, []);

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
        <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white border-0">
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

        <Card className="bg-gradient-to-br from-green-500 to-teal-500 text-white border-0">
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

      {/* Recently Played */}
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
            <Card className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white border-0 cursor-pointer hover:scale-105 transition-transform">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold mb-2">Happy Vibes</h3>
                <p className="text-sm opacity-90">Uplifting tracks to brighten your day</p>
                {happyTracks.length > 0 && (
                  <p className="text-xs opacity-70 mt-2">{happyTracks.length} tracks loaded</p>
                )}
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/mood">
            <Card className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white border-0 cursor-pointer hover:scale-105 transition-transform">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold mb-2">Chill Out</h3>
                <p className="text-sm opacity-90">Relaxing music for peaceful moments</p>
                {chillTracks.length > 0 && (
                  <p className="text-xs opacity-70 mt-2">{chillTracks.length} tracks loaded</p>
                )}
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/suggest">
            <Card className="bg-gradient-to-br from-red-400 to-pink-500 text-white border-0 cursor-pointer hover:scale-105 transition-transform">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold mb-2">Energetic</h3>
                <p className="text-sm opacity-90">High-energy beats to pump you up</p>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/suggest">
            <Card className="bg-gradient-to-br from-gray-400 to-gray-600 text-white border-0 cursor-pointer hover:scale-105 transition-transform">
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
