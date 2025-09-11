'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlaylistCard } from '@/components/music/PlaylistCard';
import { SongCard } from '@/components/music/SongCard';
import { mockTracks, mockPlaylists } from '@/lib/mockData';
import { usePlayerStore } from '@/lib/store/playerStore';
import { Lightbulb, Clock } from 'lucide-react';
import Link from 'next/link';

/**
 * Home page with personalized content and mood highlights
 */
export default function HomePage() {
  const { playerService } = usePlayerStore();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const recentlyPlayed = mockTracks.slice(0, 6);
  const madeForYou = mockPlaylists.slice(0, 4);
  const trending = mockTracks.slice(3, 9);

  const handlePlayTrack = (track: typeof mockTracks[0]) => {
    playerService.playTrack(track, mockTracks);
  };

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {recentlyPlayed.map((track) => (
            <SongCard
              key={track.id}
              track={track}
              onPlay={() => handlePlayTrack(track)}
              showArtist
            />
          ))}
        </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {trending.map((track) => (
            <SongCard
              key={track.id}
              track={track}
              onPlay={() => handlePlayTrack(track)}
              showArtist
            />
          ))}
        </div>
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
          <Card className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white border-0 cursor-pointer hover:scale-105 transition-transform">
            <CardContent className="p-6 text-center">
              <h3 className="font-semibold mb-2">Happy Vibes</h3>
              <p className="text-sm opacity-90">Uplifting tracks to brighten your day</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white border-0 cursor-pointer hover:scale-105 transition-transform">
            <CardContent className="p-6 text-center">
              <h3 className="font-semibold mb-2">Chill Out</h3>
              <p className="text-sm opacity-90">Relaxing music for peaceful moments</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-red-400 to-pink-500 text-white border-0 cursor-pointer hover:scale-105 transition-transform">
            <CardContent className="p-6 text-center">
              <h3 className="font-semibold mb-2">Energetic</h3>
              <p className="text-sm opacity-90">High-energy beats to pump you up</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-gray-400 to-gray-600 text-white border-0 cursor-pointer hover:scale-105 transition-transform">
            <CardContent className="p-6 text-center">
              <h3 className="font-semibold mb-2">Melancholy</h3>
              <p className="text-sm opacity-90">Thoughtful tracks for introspective times</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
