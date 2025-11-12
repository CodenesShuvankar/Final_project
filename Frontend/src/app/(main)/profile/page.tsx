'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { User, Calendar, Music, Heart, TrendingUp, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { mockUser, mockListeningHistory } from '@/lib/mockData';

/**
 * Profile page with user stats and listening analytics
 */
export default function ProfilePage() {
  const [user] = useState(mockUser);
  const [listeningHistory] = useState(mockListeningHistory);

  // Calculate stats
  const totalMinutes = listeningHistory.reduce((sum: number, entry: any) => sum + entry.duration, 0);
  const totalHours = Math.round(totalMinutes / 60);
  const uniqueArtists = new Set(listeningHistory.map((entry: any) => entry.track?.artist).filter(Boolean)).size;
  const uniqueTracks = new Set(listeningHistory.map((entry: any) => entry.track.id)).size;

  // Top genres data
  const genreStats = listeningHistory.reduce((acc: Record<string, number>, entry: any) => {
    if (entry.track?.genres) {
      entry.track.genres.forEach((genre: string) => {
        acc[genre] = (acc[genre] || 0) + entry.duration;
      });
    }
    return acc;
  }, {} as Record<string, number>);

  const topGenres = Object.entries(genreStats)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([genre, minutes]) => ({
      name: genre,
      value: Math.round(minutes / 60),
      percentage: Math.round((minutes / totalMinutes) * 100)
    }));

  // Listening activity by hour
  const hourlyActivity = Array.from({ length: 24 }, (_, hour) => {
    const count = listeningHistory.filter(entry => {
      const entryHour = new Date(entry.playedAt).getHours();
      return entryHour === hour;
    }).length;
    
    return {
      hour: hour.toString().padStart(2, '0') + ':00',
      plays: count
    };
  });

  // Monthly listening data
  const monthlyData = Array.from({ length: 12 }, (_, month) => {
    const monthMinutes = listeningHistory
      .filter(entry => new Date(entry.playedAt).getMonth() === month)
      .reduce((sum, entry) => sum + entry.duration, 0);
    
    return {
      month: new Date(2024, month).toLocaleDateString('en-US', { month: 'short' }),
      hours: Math.round(monthMinutes / 60)
    };
  });

  // Top artists
  const artistStats = listeningHistory.reduce((acc, entry) => {
    const artist = entry.track.artist;
    acc[artist] = (acc[artist] || 0) + entry.duration;
    return acc;
  }, {} as Record<string, number>);

  const topArtists = Object.entries(artistStats)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([artist, minutes]) => ({
      name: artist,
      hours: Math.round(minutes / 60)
    }));

  const COLORS = ['#1db954', '#1ed760', '#1aa34a', '#168f3a', '#137a2b'];

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex items-start gap-6">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
          <User className="h-16 w-16 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{user.name}</h1>
          <p className="text-muted-foreground mt-1">@{user.email.split('@')[0]}</p>
          <div className="flex items-center gap-4 mt-4">
            <Badge className="text-xs bg-secondary text-secondary-foreground">
              {totalHours} hours • {user.createdAt ? new Date(user.createdAt).getFullYear() : 2023}
            </Badge>
            <Badge className="text-xs border border-border bg-background">
              {user.playlists || 0} playlists
            </Badge>
            <Badge className="text-xs border border-border bg-background">
              {user.likedSongs || 0} liked songs
            </Badge>
          </div>
        </div>
        <Button className="border border-border bg-background hover:bg-accent">Edit Profile</Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Listening Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours}h</div>
            <p className="text-xs text-muted-foreground">
              {Math.round(totalMinutes / listeningHistory.length)} min avg per session
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Artists</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueArtists}</div>
            <p className="text-xs text-muted-foreground">
              Across {topGenres.length} genres
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Songs Played</CardTitle>
            <Music className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueTracks}</div>
            <p className="text-xs text-muted-foreground">
              {listeningHistory.length} total plays
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Genre</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topGenres[0]?.name || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              {topGenres[0]?.percentage || 0}% of listening time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="genres" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="genres">Top Genres</TabsTrigger>
          <TabsTrigger value="artists">Top Artists</TabsTrigger>
          <TabsTrigger value="activity">Daily Activity</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="genres" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Top Genres</CardTitle>
              <p className="text-sm text-muted-foreground">
                Based on your listening history
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={topGenres}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {topGenres.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}h`, 'Listening Time']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {topGenres.map((genre, index) => (
                    <div key={genre.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">{genre.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{genre.value}h</div>
                        <div className="text-xs text-muted-foreground">{genre.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="artists" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Top Artists</CardTitle>
              <p className="text-sm text-muted-foreground">
                Artists you listen to the most
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topArtists} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip formatter={(value) => [`${value}h`, 'Listening Time']} />
                    <Bar dataKey="hours" fill="#1db954" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Listening Activity</CardTitle>
              <p className="text-sm text-muted-foreground">
                When you listen to music throughout the day
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}`, 'Plays']} />
                    <Bar dataKey="plays" fill="#1db954" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Listening Trends</CardTitle>
              <p className="text-sm text-muted-foreground">
                Your listening habits over the year
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}h`, 'Listening Time']} />
                    <Line 
                      type="monotone" 
                      dataKey="hours" 
                      stroke="#1db954" 
                      strokeWidth={2}
                      dot={{ fill: '#1db954' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
