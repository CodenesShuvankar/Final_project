'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Calendar, Music, LogOut, Plus, Trash2, History, TrendingUp, BarChart3 } from 'lucide-react';
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

      setUser(userProfile);
      
      // Load playlists
      const userPlaylists = await PlaylistService.getUserPlaylists();
      setPlaylists(userPlaylists);

      // Load listening history
      const { history: listeningHistory } = await HistoryService.getHistory(20);
      setHistory(listeningHistory);

      // Load statistics
      const listeningStats = await HistoryService.getStats(30);
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
      
      if (!session?.access_token) return;
      
      const response = await fetch(`${apiUrl}/mood-history?limit=20`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMoodHistory(data.history);
          console.log('✅ Loaded mood history:', data.history.length, 'entries');
        }
      }
    } catch (error) {
      console.error('Failed to load mood history:', error);
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
      <Tabs defaultValue="playlists" className="space-y-6">
        <TabsList>
          <TabsTrigger value="playlists">
            <Music className="h-4 w-4 mr-2" />
            Playlists
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            Listening History
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

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
                          <span>{playlist.song_count || 0} songs</span>
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

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Listening History</CardTitle>
                  <CardDescription>Songs you&apos;ve recently played</CardDescription>
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
                    Clear History
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-12">
                  <History className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                  <p className="mt-4 text-muted-foreground">No listening history yet</p>
                  <p className="text-sm text-muted-foreground">Start playing songs to see them here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((entry) => (
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
                        <div className="flex items-center gap-2 mt-1">
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
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats">
          <div className="space-y-6">
            {/* Overall Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Plays</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats?.total_plays || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Unique Songs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats?.unique_songs || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Different tracks</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Artists</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats?.unique_artists || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Different artists</p>
                </CardContent>
              </Card>
            </div>

            {/* Top Artists */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Top Artists
                </CardTitle>
                <CardDescription>Your most played artists in the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                {!stats || stats.top_artists.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
                ) : (
                  <div className="space-y-3">
                    {stats.top_artists.map((artist, index) => (
                      <div key={artist.name} className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{artist.name}</p>
                          <p className="text-sm text-muted-foreground">{artist.plays} plays</p>
                        </div>
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{
                              width: `${(artist.plays / (stats.top_artists[0]?.plays || 1)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mood Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Mood Detection History
                </CardTitle>
                <CardDescription>Your recent mood detections</CardDescription>
              </CardHeader>
              <CardContent>
                {moodHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No mood detections yet. Visit the Mood page to detect your current mood!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {moodHistory.slice(0, 10).map((mood: any) => {
                      const confidencePercent = Math.round(mood.confidence * 100);
                      const moodEmoji = {
                        happy: '😊',
                        sad: '😢',
                        angry: '😠',
                        neutral: '😐',
                        fear: '😨',
                        disgust: '🤢',
                        surprise: '😲',
                        energetic: '⚡',
                        calm: '😌'
                      }[mood.detected_mood.toLowerCase()] || '😊';
                      
                      return (
                        <div key={mood.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="text-3xl">{moodEmoji}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium capitalize">{mood.detected_mood}</p>
                              <Badge variant="outline" className="text-xs">
                                {confidencePercent}% confidence
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {mood.analysis_type}
                              </Badge>
                            </div>
                            {mood.voice_emotion && mood.face_emotion && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Voice: {mood.voice_emotion} ({Math.round(mood.voice_confidence * 100)}%) • 
                                Face: {mood.face_emotion} ({Math.round(mood.face_confidence * 100)}%)
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(mood.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Old Mood Distribution from listening stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Mood Distribution
                </CardTitle>
                <CardDescription>What moods you listen to music in</CardDescription>
              </CardHeader>
              <CardContent>
                {!stats || Object.keys(stats.mood_distribution).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Enable mood detection to see your mood patterns
                  </p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(stats.mood_distribution)
                      .sort(([, a], [, b]) => b - a)
                      .map(([mood, count]) => {
                        const total = Object.values(stats.mood_distribution).reduce((a, b) => a + b, 0);
                        const percentage = Math.round((count / total) * 100);
                        
                        return (
                          <div key={mood} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="flex items-center gap-2">
                                <span className="text-lg">{getMoodEmoji(mood)}</span>
                                <span className="font-medium capitalize">{mood}</span>
                              </span>
                              <span className="text-muted-foreground">
                                {count} plays ({percentage}%)
                              </span>
                            </div>
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
