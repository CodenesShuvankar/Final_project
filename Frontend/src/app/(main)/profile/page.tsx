'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Calendar, Music, LogOut, Plus, Trash2, History, TrendingUp, BarChart3, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AuthService } from '@/lib/services/auth';
import { PlaylistService } from '@/lib/services/playlistService';
import { HistoryService, HistoryEntry, ListeningStats } from '@/lib/services/historyService';
import { Playlist } from '@/lib/supabaseClient';

/**
 * Profile page with user info, playlist management, and listening history
 */
export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [stats, setStats] = useState<ListeningStats | null>(null);
  const [moodHistory, setMoodHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const authService = AuthService.getInstance();
      const userProfile = await authService.getUserProfile();
      
      if (!userProfile) {
        router.push('/login');
        return;
      }

      console.log('👤 Current user:', userProfile.id, userProfile.email);
      setUser(userProfile);
      setDebugInfo(prev => prev + `\n✓ User: ${userProfile.email} (${userProfile.id.substring(0, 8)}...)`);
      
      // Load playlists
      const userPlaylists = await PlaylistService.getUserPlaylists();
      setPlaylists(userPlaylists);
      setDebugInfo(prev => prev + `\n✓ Playlists loaded: ${userPlaylists.length}`);

      // Load listening history
      const { history: listeningHistory, total } = await HistoryService.getHistory(20);
      console.log('📜 Loaded listening history:', listeningHistory.length, 'entries');
      console.log('  First entry:', listeningHistory[0]);
      setHistory(listeningHistory);
      setDebugInfo(prev => prev + `\n✓ History loaded: ${listeningHistory.length}/${total} entries`);

      // Load statistics
      const listeningStats = await HistoryService.getStats(30);
      console.log('📊 Loaded stats:', listeningStats);
      if (listeningStats) {
        console.log('  - Total plays:', listeningStats.total_plays);
        console.log('  - Unique songs:', listeningStats.unique_songs);
        console.log('  - Top artists:', listeningStats.top_artists.length);
        console.log('  - Mood distribution:', Object.keys(listeningStats.mood_distribution).length, 'moods');
        setDebugInfo(prev => prev + `\n✓ Stats: ${listeningStats.total_plays} plays, ${listeningStats.unique_songs} songs, ${listeningStats.unique_artists} artists`);
      } else {
        setDebugInfo(prev => prev + `\n✗ Stats: null/empty response`);
      }
      setStats(listeningStats);
      
      // Load mood history
      await loadMoodHistory();
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadMoodHistory = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const authService = AuthService.getInstance();
      const session = await authService.getSession();
      
      console.log('🔍 Loading mood history...');
      console.log('  - API URL:', apiUrl);
      console.log('  - Has session:', !!session);
      console.log('  - Has token:', !!session?.access_token);
      
      if (!session?.access_token) {
        console.log('❌ No access token, skipping mood history');
        setDebugInfo(prev => prev + '\n✗ Mood history: No access token');
        return;
      }
      
      const url = `${apiUrl}/mood-history`;
      console.log('  - Fetching from:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      console.log('  - Response status:', response.status);
      console.log('  - Response OK:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('  - Response data:', data);
        console.log('  - Success:', data.success);
        console.log('  - History count:', data.count);
        console.log('  - History length:', data.history?.length);
        
        if (data.success) {
          setMoodHistory(data.history);
          console.log('✅ Loaded mood history:', data.history.length, 'entries');
          setDebugInfo(prev => prev + `\n✓ Mood history: ${data.history.length} detections`);
          if (data.history.length > 0) {
            console.log('  - First mood:', data.history[0]);
          }
        } else {
          console.log('❌ Success=false:', data.error);
          setDebugInfo(prev => prev + `\n✗ Mood history error: ${data.error}`);
        }
      } else {
        const errorText = await response.text();
        console.log('❌ Response not OK:', errorText);
        setDebugInfo(prev => prev + `\n✗ Mood history HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to load mood history:', error);
      setDebugInfo(prev => prev + `\n✗ Mood history exception: ${error}`);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;

    setCreating(true);
    try {
      const playlist = await PlaylistService.createPlaylist(
        newPlaylistName,
        newPlaylistDescription
      );
      
      if (playlist) {
        setPlaylists([playlist, ...playlists]);
        setNewPlaylistName('');
        setNewPlaylistDescription('');
        setCreateDialogOpen(false);
      }
    } catch (error) {
      console.error('Error creating playlist:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;

    const success = await PlaylistService.deletePlaylist(playlistId);
    if (success) {
      setPlaylists(playlists.filter(p => p.id !== playlistId));
    }
  };

  const handleLogout = async () => {
    try {
      const authService = AuthService.getInstance();
      await authService.logout();
      
      // Force a full page reload to clear all state
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
      // Still redirect even if logout fails
      window.location.href = '/login';
    }
  };

  const getMoodEmoji = (mood: string) => {
    const moodMap: Record<string, string> = {
      happy: '😊',
      sad: '😢',
      angry: '😠',
      neutral: '😐',
      fear: '😨',
      surprise: '😲',
      disgust: '🤢',
    };
    return moodMap[mood.toLowerCase()] || '😊';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Music className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Profile Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <User className="h-12 w-12 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{user.displayName || 'User'}</h1>
            <p className="text-muted-foreground mt-1">{user.email}</p>
            <div className="flex items-center gap-3 mt-3">
              {user.dateOfBirth && (
                <Badge variant="outline" className="text-xs">
                  <Calendar className="h-3 w-3 mr-1" />
                  {new Date(user.dateOfBirth).toLocaleDateString()}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                <Music className="h-3 w-3 mr-1" />
                {playlists.length} playlists
              </Badge>
              {stats && (
                <Badge variant="outline" className="text-xs">
                  <History className="h-3 w-3 mr-1" />
                  {stats.total_plays} plays
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Button variant="destructive" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>

      {/* Tabs for different sections */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard">
            <BarChart3 className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
          <TabsTrigger value="playlists">
            <Music className="h-4 w-4 mr-2" />
            Playlists
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab - Analytics Overview */}
        <TabsContent value="dashboard">
          <div className="space-y-6">
            {/* Mood Analytics Stats Cards */}
            {moodHistory.length > 0 && (
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Songs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats?.total_plays || 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">Songs played</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Mood Checks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{moodHistory.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">Times analyzed</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Primary Mood</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold capitalize flex items-center gap-2">
                      {(() => {
                        const moodCounts: Record<string, number> = {};
                        moodHistory.forEach((m: any) => {
                          moodCounts[m.detected_mood] = (moodCounts[m.detected_mood] || 0) + 1;
                        });
                        const topMood = Object.entries(moodCounts).sort(([,a], [,b]) => b - a)[0];
                        const moodEmojis: Record<string, string> = {
                          happy: '😊', sad: '😢', angry: '😠', neutral: '😐',
                          fear: '😨', disgust: '🤢', surprise: '😲'
                        };
                        return topMood ? <>{moodEmojis[topMood[0].toLowerCase()] || '😊'} {topMood[0]}</> : 'N/A';
                      })()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Most frequent</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Recent Mood</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold capitalize flex items-center gap-2">
                      {(() => {
                        const latest = moodHistory[0];
                        const moodEmojis: Record<string, string> = {
                          happy: '😊', sad: '😢', angry: '😠', neutral: '😐',
                          fear: '😨', disgust: '🤢', surprise: '😲'
                        };
                        return latest ? <>{moodEmojis[latest.detected_mood.toLowerCase()] || '😊'} {latest.detected_mood}</> : 'N/A';
                      })()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {moodHistory[0] ? new Date(moodHistory[0].created_at).toLocaleDateString() : 'Never'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* No data state */}
            {moodHistory.length === 0 && (!stats || stats.total_plays === 0) && (
              <Card className="border-dashed border-2 border-primary/50 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <div className="text-6xl">📊🎵😊</div>
                    <div>
                      <h3 className="font-semibold text-xl mb-2">Welcome to Your Dashboard!</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Start building your personalized music analytics:
                      </p>
                      <div className="text-left max-w-md mx-auto space-y-3 text-sm text-muted-foreground">
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-background">
                          <span className="text-2xl">🎭</span>
                          <div>
                            <p className="font-semibold text-foreground">Detect Your Mood</p>
                            <p>Use voice or camera to analyze your current emotion</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-background">
                          <span className="text-2xl">🎵</span>
                          <div>
                            <p className="font-semibold text-foreground">Play Songs</p>
                            <p>Browse and play music - it's automatically tracked</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-background">
                          <span className="text-2xl">📈</span>
                          <div>
                            <p className="font-semibold text-foreground">See Your Patterns</p>
                            <p>Watch your emotional and listening trends emerge</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 justify-center pt-4">
                      <Button asChild variant="default" size="lg">
                        <Link href="/mood">🎭 Detect Mood</Link>
                      </Button>
                      <Button asChild variant="outline" size="lg">
                        <Link href="/suggest">🎵 Get Songs</Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Mood Distribution Chart */}
            {moodHistory.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Emotion Distribution
                    </CardTitle>
                    <CardDescription>Breakdown of your detected moods</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(() => {
                        const moodCounts: Record<string, number> = {};
                        moodHistory.forEach((m: any) => {
                          moodCounts[m.detected_mood] = (moodCounts[m.detected_mood] || 0) + 1;
                        });
                        const total = moodHistory.length;
                        const moodEmojis: Record<string, string> = {
                          happy: '😊', sad: '😢', angry: '😠', neutral: '😐',
                          fear: '😨', disgust: '🤢', surprise: '😲', energetic: '⚡', calm: '😌'
                        };
                        
                        return Object.entries(moodCounts)
                          .sort(([,a], [,b]) => b - a)
                          .map(([mood, count]) => {
                            const percentage = Math.round((count / total) * 100);
                            return (
                              <div key={mood} className="flex items-center gap-3">
                                <div className="text-2xl">{moodEmojis[mood.toLowerCase()] || '😊'}</div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="font-medium capitalize">{mood}</p>
                                    <span className="text-sm text-muted-foreground">{count} times ({percentage}%)</span>
                                  </div>
                                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          });
                      })()}
                    </div>
                  </CardContent>
                </Card>

                {/* Mood Patterns Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Mood Patterns
                    </CardTitle>
                    <CardDescription>Your emotional insights & trends</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Emotional Variety */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Emotional Variety</span>
                          <span className="text-lg font-bold">
                            {(() => {
                              const uniqueMoods = new Set(moodHistory.map((m: any) => m.detected_mood.toLowerCase())).size;
                              const maxVariety = 7;
                              const varietyScore = Math.round((uniqueMoods / maxVariety) * 100);
                              return `${varietyScore}%`;
                            })()}
                          </span>
                        </div>
                        <div className="bg-secondary rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-primary to-primary/60 rounded-full h-2 transition-all" 
                            style={{
                              width: `${(() => {
                                const uniqueMoods = new Set(moodHistory.map((m: any) => m.detected_mood.toLowerCase())).size;
                                return Math.round((uniqueMoods / 7) * 100);
                              })()}%`
                            }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Set(moodHistory.map((m: any) => m.detected_mood.toLowerCase())).size} different emotions detected
                        </p>
                      </div>

                      {/* Grid of insights */}
                      <div className="grid grid-cols-3 gap-2">
                        {/* Active Streak */}
                        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Active Streak</p>
                          <p className="text-2xl font-bold mt-1">
                            {(() => {
                              const sortedDates = moodHistory
                                .map((m: any) => new Date(m.created_at).toDateString())
                                .filter((v, i, a) => a.indexOf(v) === i);
                              
                              let currentStreak = 0;
                              for (let i = 0; i < 30; i++) {
                                const checkDate = new Date();
                                checkDate.setDate(checkDate.getDate() - i);
                                if (sortedDates.includes(checkDate.toDateString())) {
                                  currentStreak++;
                                } else if (i === 0) {
                                  continue;
                                } else {
                                  break;
                                }
                              }
                              return currentStreak;
                            })()} days
                          </p>
                        </div>

                        {/* Peak Hour */}
                        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                          <p className="text-xs font-semibold text-purple-600 dark:text-purple-400">Peak Time</p>
                          <p className="text-2xl font-bold mt-1">
                            {(() => {
                              const hourCounts: Record<number, number> = {};
                              moodHistory.forEach((m: any) => {
                                const hour = new Date(m.created_at).getHours();
                                hourCounts[hour] = (hourCounts[hour] || 0) + 1;
                              });
                              const peakHour = Object.entries(hourCounts).sort(([,a], [,b]) => b - a)[0];
                              if (!peakHour) return 'N/A';
                              const hour = parseInt(peakHour[0]);
                              const period = hour >= 12 ? 'PM' : 'AM';
                              const displayHour = hour % 12 || 12;
                              return `${displayHour}${period}`;
                            })()}
                          </p>
                        </div>

                        {/* Mood Trend */}
                        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                          <p className="text-xs font-semibold text-green-600 dark:text-green-400">Recent Trend</p>
                          <p className="text-2xl font-bold mt-1">
                            {(() => {
                              const positiveEmotions = ['happy', 'surprise'];
                              const recentMoods = moodHistory.slice(0, 5);
                              const olderMoods = moodHistory.slice(5, 10);
                              
                              if (olderMoods.length === 0) return '📊';
                              
                              const recentPositive = recentMoods.filter((m: any) => 
                                positiveEmotions.includes(m.detected_mood.toLowerCase())
                              ).length / recentMoods.length;
                              
                              const olderPositive = olderMoods.filter((m: any) => 
                                positiveEmotions.includes(m.detected_mood.toLowerCase())
                              ).length / olderMoods.length;
                              
                              if (recentPositive > olderPositive + 0.1) return '📈';
                              if (recentPositive < olderPositive - 0.1) return '📉';
                              return '➡️';
                            })()}
                          </p>
                        </div>
                      </div>

                      {/* Trend Description */}
                      <div className="text-center text-xs text-muted-foreground">
                        {(() => {
                          const positiveEmotions = ['happy', 'surprise'];
                          const recentMoods = moodHistory.slice(0, 5);
                          const olderMoods = moodHistory.slice(5, 10);
                          
                          if (olderMoods.length === 0) return 'Keep checking your mood to see trends!';
                          
                          const recentPositive = recentMoods.filter((m: any) => 
                            positiveEmotions.includes(m.detected_mood.toLowerCase())
                          ).length / recentMoods.length;
                          
                          const olderPositive = olderMoods.filter((m: any) => 
                            positiveEmotions.includes(m.detected_mood.toLowerCase())
                          ).length / olderMoods.length;
                          
                          if (recentPositive > olderPositive + 0.1) return 'Your recent moods are more positive than before!';
                          if (recentPositive < olderPositive - 0.1) return 'Your mood has been less positive lately.';
                          return 'Your mood has been stable recently.';
                        })()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Top Genres & Top Artists - side by side */}
            {(moodHistory.length > 0 || (stats && stats.top_artists.length > 0)) && (
              <div className="grid gap-4 md:grid-cols-2">
                {/* Top Genres */}
                {moodHistory.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Music className="h-5 w-5" />
                        Top Genres
                      </CardTitle>
                      <CardDescription>Your favorite music genres</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {(() => {
                          // Map moods to likely genre preferences
                          const moodToGenres: Record<string, string[]> = {
                            happy: ['Pop', 'Dance', 'Electronic'],
                            sad: ['Indie', 'R&B', 'Classical'],
                            angry: ['Rock', 'Hip Hop', 'Metal'],
                            neutral: ['Lo-Fi', 'Jazz', 'Ambient'],
                            fear: ['Classical', 'Ambient', 'Indie'],
                            disgust: ['Rock', 'Alternative', 'Punk'],
                            surprise: ['Electronic', 'Dance', 'Pop'],
                            energetic: ['Electronic', 'Hip Hop', 'Dance'],
                            calm: ['Jazz', 'Classical', 'Lo-Fi']
                          };

                          const genreColors: Record<string, string> = {
                            'Pop': 'bg-pink-500',
                            'Rock': 'bg-blue-500',
                            'Hip Hop': 'bg-green-500',
                            'Electronic': 'bg-orange-500',
                            'Jazz': 'bg-purple-500',
                            'Classical': 'bg-gray-500',
                            'Indie': 'bg-rose-500',
                            'R&B': 'bg-indigo-500',
                            'Country': 'bg-emerald-500',
                            'Lo-Fi': 'bg-amber-500',
                            'Dance': 'bg-cyan-500',
                            'Metal': 'bg-red-500',
                            'Ambient': 'bg-teal-500',
                            'Alternative': 'bg-violet-500',
                            'Punk': 'bg-red-600'
                          };

                          // Calculate genre scores based on mood frequency
                          const genreScores: Record<string, number> = {};
                          
                          moodHistory.forEach((m: any) => {
                            const mood = m.detected_mood.toLowerCase();
                            const genres = moodToGenres[mood] || ['Pop', 'Rock', 'Jazz'];
                            
                            genres.forEach((genre, index) => {
                              // First genre gets more weight
                              const weight = 1 / (index + 1);
                              genreScores[genre] = (genreScores[genre] || 0) + weight;
                            });
                          });

                          // Get top 5 genres
                          const topGenres = Object.entries(genreScores)
                            .sort(([,a], [,b]) => b - a)
                            .slice(0, 5);

                          const maxScore = topGenres[0]?.[1] || 1;

                          return topGenres.length > 0 ? topGenres.map(([genre, score], index) => {
                            const percentage = Math.round((score / maxScore) * 100);
                            const displayPercentage = Math.round((score / moodHistory.length) * 100);
                            
                            return (
                              <div key={genre} className="flex items-center gap-3">
                                <div className={`flex-shrink-0 w-12 h-12 rounded-lg ${genreColors[genre] || 'bg-primary'} flex items-center justify-center text-white font-bold text-xs shadow-md`}>
                                  {genre.slice(0, 3).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="font-medium">{genre}</p>
                                    <span className="text-sm text-muted-foreground">{displayPercentage}%</span>
                                  </div>
                                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={`h-full ${genreColors[genre] || 'bg-primary'} rounded-full transition-all`}
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          }) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No genre data available yet. Keep using mood detection!
                            </p>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Top Artists */}
                {stats && stats.top_artists.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Music className="h-5 w-5" />
                        Top Artists
                      </CardTitle>
                      <CardDescription>Your most played artists (last 30 days)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {stats.top_artists.slice(0, 5).map((artist, index) => {
                          // Split artist names if multiple (e.g., "Artist1, Artist2, Artist3")
                          const artistNames = artist.name.split(',').map((a: string) => a.trim());
                          const displayName = artistNames.length > 2 
                            ? `${artistNames[0]}, ${artistNames[1]} +${artistNames.length - 2} more`
                            : artist.name;
                          
                          // Artist initials for square badge
                          const initials = artist.name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
                          
                          // Generate color based on artist name
                          const colors = ['bg-pink-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500', 
                                         'bg-indigo-500', 'bg-rose-500', 'bg-cyan-500', 'bg-amber-500', 'bg-teal-500'];
                          const colorIndex = artist.name.charCodeAt(0) % colors.length;
                          
                          return (
                            <div key={artist.name} className="flex items-center gap-3">
                              <div className={`flex-shrink-0 w-12 h-12 rounded-lg ${colors[colorIndex]} flex items-center justify-center text-white font-bold text-xs shadow-md`}>
                                {initials}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="font-medium truncate" title={artist.name}>
                                    {displayName}
                                  </p>
                                  <span className="text-sm text-muted-foreground">{artist.plays} plays</span>
                                </div>
                                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${colors[colorIndex]} rounded-full transition-all`}
                                    style={{
                                      width: `${(artist.plays / (stats.top_artists[0]?.plays || 1)) * 100}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* History Tab - Combined Listening + Mood History */}
        <TabsContent value="history">
          <div className="space-y-6">
            {/* Listening History Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Music className="h-5 w-5" />
                      Listening History
                    </CardTitle>
                    <CardDescription>Songs you've recently played</CardDescription>
                  </div>
                  {history.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (confirm('Clear all listening history?')) {
                          const success = await HistoryService.clearHistory();
                          if (success) {
                            setHistory([]);
                            setStats(null);
                          }
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <div className="text-center py-12">
                    <Music className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                    <p className="mt-4 text-muted-foreground">No songs played yet</p>
                    <p className="text-sm text-muted-foreground">Start playing music to see your history</p>
                    <Button asChild variant="outline" size="sm" className="mt-4">
                      <Link href="/search">Browse Music</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.slice(0, 10).map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        {entry.image_url && (
                          <img
                            src={entry.image_url}
                            alt={entry.song_name}
                            className="w-12 h-12 rounded object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{entry.song_name}</p>
                          <p className="text-sm text-muted-foreground truncate">{entry.artist_name}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-muted-foreground">
                              {new Date(entry.played_at).toLocaleString()}
                            </span>
                            {entry.mood_detected && (
                              <Badge variant="secondary" className="text-xs">
                                {getMoodEmoji(entry.mood_detected)} {entry.mood_detected}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {history.length > 10 && (
                      <p className="text-xs text-center text-muted-foreground pt-2">
                        Showing 10 of {history.length} songs
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mood Detection History Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Mood Detection History
                </CardTitle>
                <CardDescription>Your recent emotion analyses</CardDescription>
              </CardHeader>
              <CardContent>
                {moodHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">😊😢😠😐</div>
                    <p className="mt-4 text-muted-foreground">No mood detections yet</p>
                    <p className="text-sm text-muted-foreground">Visit the Mood page to analyze your emotions</p>
                    <Button asChild variant="outline" size="sm" className="mt-4">
                      <Link href="/mood">Detect Mood</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {moodHistory.slice(0, 15).map((mood: any) => {
                      const confidencePercent = Math.round(mood.confidence * 100);
                      const moodEmojis: Record<string, string> = {
                        happy: '😊', sad: '😢', angry: '😠', neutral: '😐',
                        fear: '😨', disgust: '🤢', surprise: '😲', energetic: '⚡', calm: '😌'
                      };
                      const moodEmoji = moodEmojis[mood.detected_mood.toLowerCase()] || '😊';
                      
                      return (
                        <div key={mood.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                          <div className="text-3xl">{moodEmoji}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium capitalize">{mood.detected_mood}</p>
                              <Badge variant="outline" className="text-xs">
                                {confidencePercent}%
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {mood.analysis_type}
                              </Badge>
                            </div>
                            {mood.voice_emotion && mood.face_emotion && (
                              <p className="text-xs text-muted-foreground mt-1">
                                🎤 {mood.voice_emotion} ({Math.round(mood.voice_confidence * 100)}%) • 
                                📷 {mood.face_emotion} ({Math.round(mood.face_confidence * 100)}%)
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(mood.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {moodHistory.length > 15 && (
                      <p className="text-xs text-center text-muted-foreground pt-2">
                        Showing 15 of {moodHistory.length} detections
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Playlists Tab */}
        <TabsContent value="playlists">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>My Playlists</CardTitle>
                  <CardDescription>Create and manage your music playlists</CardDescription>
                </div>
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Playlist
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Playlist</DialogTitle>
                      <DialogDescription>
                        Add a name and description for your new playlist
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium">
                          Playlist Name
                        </label>
                        <Input
                          id="name"
                          placeholder="My Awesome Playlist"
                          value={newPlaylistName}
                          onChange={(e) => setNewPlaylistName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="description" className="text-sm font-medium">
                          Description (optional)
                        </label>
                        <Input
                          id="description"
                          placeholder="A collection of my favorite songs"
                          value={newPlaylistDescription}
                          onChange={(e) => setNewPlaylistDescription(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setCreateDialogOpen(false)}
                        disabled={creating}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleCreatePlaylist} disabled={creating || !newPlaylistName.trim()}>
                        {creating ? 'Creating...' : 'Create'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {playlists.length === 0 ? (
                <div className="text-center py-12">
                  <Music className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                  <p className="mt-4 text-muted-foreground">No playlists yet</p>
                  <p className="text-sm text-muted-foreground">Create your first playlist to get started</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {playlists.map((playlist) => (
                    <Card key={playlist.id} className="hover:bg-accent/50 transition-colors">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg truncate">{playlist.name}</CardTitle>
                            {playlist.description && (
                              <CardDescription className="line-clamp-2">
                                {playlist.description}
                              </CardDescription>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeletePlaylist(playlist.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Music className="h-4 w-4" />
                          <span>Playlist</span>
                          <span>•</span>
                          <span>{new Date(playlist.created_at).toLocaleDateString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
