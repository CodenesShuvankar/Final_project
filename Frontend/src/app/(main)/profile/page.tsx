'use client';

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Calendar, Music, LogOut, Plus, Trash2, History, TrendingUp, BarChart3, Loader2, Compass } from 'lucide-react';
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

// Centralized emotion-to-valence mapping (−1 to +1 scale)
const EMOTION_VALENCE: Record<string, number> = {
  happy: 0.8,
  surprise: 0.4,
  neutral: 0.0,
  sad: -0.7,
  angry: -0.8,
  fear: -0.9,
  disgust: -0.6
};

const EMOTION_AROUSAL: Record<string, number> = {
  happy: 0.7,
  surprise: 0.8,
  neutral: 0.0,
  sad: -0.4,
  angry: 0.8,
  fear: 0.9,
  disgust: 0.5
};

// Valence thresholds for classification
const VALENCE_THRESHOLDS = {
  positive: 0.3,  // >= 0.3 is Positive
  negative: -0.3  // <= -0.3 is Negative
};

const parseScore = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const parsed = parseFloat(String(value));
  return Number.isNaN(parsed) ? null : parsed;
};

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

  // ============================================
  // INTERACTIVE DASHBOARD FILTERS (Power BI style)
  // ============================================
  const [dashboardFilter, setDashboardFilter] = useState<{
    type: 'emotion' | 'date' | 'genre' | 'valenceCategory' | null;
    value: string | null;
  }>({ type: null, value: null });

  // Clear all filters
  const clearFilters = () => setDashboardFilter({ type: null, value: null });

  // Toggle filter (click same item again to deselect)
  const toggleFilter = (type: 'emotion' | 'date' | 'genre' | 'valenceCategory', value: string) => {
    if (dashboardFilter.type === type && dashboardFilter.value === value) {
      clearFilters();
    } else {
      setDashboardFilter({ type, value });
    }
  };

  // Check if a specific filter is active
  const isFilterActive = (type: string, value: string) => 
    dashboardFilter.type === type && dashboardFilter.value === value;

  // Genre to mood mapping (reverse of moodToGenres)
  const genreToMoods: Record<string, string[]> = {
    'Pop': ['happy', 'surprise'],
    'Dance': ['happy', 'surprise'],
    'Electronic': ['happy', 'surprise'],
    'Indie': ['sad', 'fear'],
    'R&B': ['sad'],
    'Classical': ['sad', 'fear'],
    'Rock': ['angry', 'disgust'],
    'Hip Hop': ['angry'],
    'Metal': ['angry'],
    'Lo-Fi': ['neutral'],
    'Jazz': ['neutral'],
    'Ambient': ['neutral', 'fear'],
    'Alternative': ['disgust'],
    'Punk': ['disgust']
  };

  const matchesActiveFilter = (entry: { detected_mood?: string; dateStr?: string; valence?: number }) => {
    if (!dashboardFilter.type) return true;
    const mood = (entry.detected_mood || '').toLowerCase();
    switch (dashboardFilter.type) {
      case 'emotion':
        return dashboardFilter.value ? mood === dashboardFilter.value.toLowerCase() : true;
      case 'date':
        return dashboardFilter.value ? entry.dateStr === dashboardFilter.value : true;
      case 'genre':
        if (!dashboardFilter.value) return true;
        const allowed = genreToMoods[dashboardFilter.value] || [];
        return allowed.includes(mood);
      case 'valenceCategory': {
        if (!dashboardFilter.value) return true;
        const valence = typeof entry.valence === 'number' ? entry.valence : 0;
        if (dashboardFilter.value === 'Positive') return valence >= VALENCE_THRESHOLDS.positive;
        if (dashboardFilter.value === 'Negative') return valence <= VALENCE_THRESHOLDS.negative;
        if (dashboardFilter.value === 'Neutral') {
          return valence > VALENCE_THRESHOLDS.negative && valence < VALENCE_THRESHOLDS.positive;
        }
        return true;
      }
      default:
        return true;
    }
  };

  // ============================================
  // CENTRALIZED DASHBOARD DATA (computed once)
  // ============================================
  const dashboardData = useMemo(() => {
    if (moodHistory.length === 0) {
      return {
        moodWithValence: [],
        filteredMoods: [],
        moodByDate: {} as Record<string, { valence: number; count: number; avgValence: number; moods: string[] }>,
        emotionCounts: {} as Record<string, number>,
        filteredEmotionCounts: {} as Record<string, number>,
        totalMoods: 0,
        filteredTotal: 0,
        averageValence: 0,
        filteredAverageValence: 0,
        last24h: {
          moods: [] as any[],
          avgValence: 0,
          count: 0
        },
        valenceCategory: {
          category: 'N/A' as 'Positive' | 'Neutral' | 'Negative' | 'N/A',
          emoji: '⚪',
          textColor: 'text-muted-foreground',
          timeFrame: 'No data'
        },
        months: [] as { name: string; year: number; month: number; days: Date[] }[]
      };
    }

    // 1. Add valence to each mood entry
    const moodWithValence = moodHistory.map(m => {
      const moodKey = (m.detected_mood || '').toLowerCase();
      const valenceFromDb = parseScore((m as any).valence);
      const arousalFromDb = parseScore((m as any).arousal);
      const valence = valenceFromDb ?? (EMOTION_VALENCE[moodKey] ?? 0);
      const arousal = arousalFromDb ?? (EMOTION_AROUSAL[moodKey] ?? 0);
      return {
        ...m,
        valence,
        arousal,
        dateStr: new Date(m.created_at).toISOString().split('T')[0]
      };
    });

    // 2. Apply filters to get filtered moods
    let filteredMoods = [...moodWithValence];
    
    if (dashboardFilter.type === 'emotion' && dashboardFilter.value) {
      filteredMoods = filteredMoods.filter(m => 
        m.detected_mood.toLowerCase() === dashboardFilter.value?.toLowerCase()
      );
    } else if (dashboardFilter.type === 'date' && dashboardFilter.value) {
      filteredMoods = filteredMoods.filter(m => m.dateStr === dashboardFilter.value);
    } else if (dashboardFilter.type === 'genre' && dashboardFilter.value) {
      const allowedMoods = genreToMoods[dashboardFilter.value] || [];
      filteredMoods = filteredMoods.filter(m => 
        allowedMoods.includes(m.detected_mood.toLowerCase())
      );
    } else if (dashboardFilter.type === 'valenceCategory' && dashboardFilter.value) {
      if (dashboardFilter.value === 'Positive') {
        filteredMoods = filteredMoods.filter(m => m.valence >= VALENCE_THRESHOLDS.positive);
      } else if (dashboardFilter.value === 'Negative') {
        filteredMoods = filteredMoods.filter(m => m.valence <= VALENCE_THRESHOLDS.negative);
      } else if (dashboardFilter.value === 'Neutral') {
        filteredMoods = filteredMoods.filter(m => 
          m.valence > VALENCE_THRESHOLDS.negative && m.valence < VALENCE_THRESHOLDS.positive
        );
      }
    }

    // 3. Count emotions (both total and filtered)
    const emotionCounts: Record<string, number> = {};
    moodWithValence.forEach(m => {
      const mood = m.detected_mood.toLowerCase();
      emotionCounts[mood] = (emotionCounts[mood] || 0) + 1;
    });

    const filteredEmotionCounts: Record<string, number> = {};
    filteredMoods.forEach(m => {
      const mood = m.detected_mood.toLowerCase();
      filteredEmotionCounts[mood] = (filteredEmotionCounts[mood] || 0) + 1;
    });

    // 4. Aggregate by date (for calendar) - include mood list for filtering
    const moodByDate: Record<string, { valence: number; count: number; avgValence: number; moods: string[] }> = {};
    moodWithValence.forEach(m => {
      if (moodByDate[m.dateStr]) {
        moodByDate[m.dateStr].valence += m.valence;
        moodByDate[m.dateStr].count += 1;
        moodByDate[m.dateStr].moods.push(m.detected_mood.toLowerCase());
      } else {
        moodByDate[m.dateStr] = { 
          valence: m.valence, 
          count: 1, 
          avgValence: 0,
          moods: [m.detected_mood.toLowerCase()]
        };
      }
    });
    Object.keys(moodByDate).forEach(date => {
      moodByDate[date].avgValence = moodByDate[date].valence / moodByDate[date].count;
    });

    // 5. Average valence (total and filtered)
    const totalValence = moodWithValence.reduce((sum, m) => sum + m.valence, 0);
    const averageValence = totalValence / moodWithValence.length;
    
    const filteredTotalValence = filteredMoods.reduce((sum, m) => sum + m.valence, 0);
    const filteredAverageValence = filteredMoods.length > 0 
      ? filteredTotalValence / filteredMoods.length 
      : 0;

    // 6. Last 24 hours data
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last24hMoods = moodWithValence.filter(m => new Date(m.created_at) >= last24Hours);
    const last24hAvgValence = last24hMoods.length > 0
      ? last24hMoods.reduce((sum, m) => sum + m.valence, 0) / last24hMoods.length
      : averageValence;

    // 7. Valence category (for KPI card)
    const valenceToUse = last24hMoods.length > 0 ? last24hAvgValence : (moodWithValence[0]?.valence ?? 0);
    let category: 'Positive' | 'Neutral' | 'Negative' | 'N/A' = 'Neutral';
    let emoji = '🟡';
    let textColor = 'text-yellow-600 dark:text-yellow-400';
    
    if (valenceToUse >= VALENCE_THRESHOLDS.positive) {
      category = 'Positive';
      emoji = '🟢';
      textColor = 'text-green-600 dark:text-green-400';
    } else if (valenceToUse <= VALENCE_THRESHOLDS.negative) {
      category = 'Negative';
      emoji = '🔴';
      textColor = 'text-red-600 dark:text-red-400';
    }

    const timeFrame = last24hMoods.length > 0 ? 'Last 24h' : 'Latest reading';

    // 8. Generate last 6 months for calendar
    const today = new Date();
    const months: { name: string; year: number; month: number; days: Date[] }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = d.toLocaleString('default', { month: 'short' });
      const year = d.getFullYear();
      const month = d.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const days: Date[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dayDate = new Date(year, month, day);
        if (dayDate <= today) {
          days.push(dayDate);
        }
      }
      months.push({ name: monthName, year, month, days });
    }

    return {
      moodWithValence,
      filteredMoods,
      moodByDate,
      emotionCounts,
      filteredEmotionCounts,
      totalMoods: moodHistory.length,
      filteredTotal: filteredMoods.length,
      averageValence,
      filteredAverageValence,
      last24h: {
        moods: last24hMoods,
        avgValence: last24hAvgValence,
        count: last24hMoods.length
      },
      valenceCategory: {
        category,
        emoji,
        textColor,
        timeFrame
      },
      months
    };
  }, [moodHistory, dashboardFilter, genreToMoods]);

  // Helper function to get calendar day color (with filter awareness)
  const getCalendarDayColor = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const data = dashboardData.moodByDate[dateStr];
    if (!data) return 'bg-muted/30';
    
    // Check if this date is selected
    const isSelected = isFilterActive('date', dateStr);
    
    // Check if this date should be dimmed due to filter
    let isDimmed = false;
    if (dashboardFilter.type && dashboardFilter.type !== 'date') {
      // Check if any mood on this date matches the filter
      if (dashboardFilter.type === 'emotion') {
        isDimmed = !data.moods.includes(dashboardFilter.value?.toLowerCase() || '');
      } else if (dashboardFilter.type === 'genre' && dashboardFilter.value) {
        const allowedMoods = genreToMoods[dashboardFilter.value] || [];
        isDimmed = !data.moods.some(m => allowedMoods.includes(m));
      } else if (dashboardFilter.type === 'valenceCategory') {
        if (dashboardFilter.value === 'Positive') {
          isDimmed = data.avgValence < VALENCE_THRESHOLDS.positive;
        } else if (dashboardFilter.value === 'Negative') {
          isDimmed = data.avgValence > VALENCE_THRESHOLDS.negative;
        } else if (dashboardFilter.value === 'Neutral') {
          isDimmed = data.avgValence >= VALENCE_THRESHOLDS.positive || data.avgValence <= VALENCE_THRESHOLDS.negative;
        }
      }
    }
    
    let baseColor = 'bg-yellow-500';
    if (data.avgValence >= VALENCE_THRESHOLDS.positive) baseColor = 'bg-green-500';
    else if (data.avgValence <= VALENCE_THRESHOLDS.negative) baseColor = 'bg-red-500';
    
    if (isSelected) return `${baseColor} ring-2 ring-white ring-offset-2 ring-offset-background`;
    if (isDimmed) return `${baseColor} opacity-20`;
    return baseColor;
  };

  // Helper function to get calendar day tooltip
  const getCalendarDayTooltip = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const data = dashboardData.moodByDate[dateStr];
    const formattedDate = date.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' });
    if (!data) return `${formattedDate}: No mood data`;
    
    let category = 'Neutral';
    if (data.avgValence >= VALENCE_THRESHOLDS.positive) category = 'Positive';
    else if (data.avgValence <= VALENCE_THRESHOLDS.negative) category = 'Negative';
    
    return `${formattedDate}: ${category} (${data.count} check${data.count > 1 ? 's' : ''})`;
  };

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
      
      console.log('🔍 Loading mood history (last 30 days)...');
      console.log('  - API URL:', apiUrl);
      console.log('  - Has session:', !!session);
      console.log('  - Has token:', !!session?.access_token);
      
      if (!session?.access_token) {
        console.log('❌ No access token, skipping mood history');
        setDebugInfo(prev => prev + '\n✗ Mood history: No access token');
        return;
      }
      
      // Request mood history (up to 100 records for performance)
      const url = `${apiUrl}/mood-history?days=30&limit=100`;
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
            {/* Active Filter Indicator */}
            {dashboardFilter.type && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <span className="text-sm font-medium">🔍 Filtering by:</span>
                <Badge variant="secondary" className="capitalize">
                  {dashboardFilter.type === 'emotion' && `Emotion: ${dashboardFilter.value}`}
                  {dashboardFilter.type === 'date' && `Date: ${new Date(dashboardFilter.value!).toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                  {dashboardFilter.type === 'genre' && `Genre: ${dashboardFilter.value}`}
                  {dashboardFilter.type === 'valenceCategory' && `Valence: ${dashboardFilter.value}`}
                </Badge>
                <span className="text-xs text-muted-foreground ml-2">
                  ({dashboardData.filteredTotal} of {dashboardData.totalMoods} records)
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearFilters}
                  className="ml-auto h-7 px-2 text-xs"
                >
                  ✕ Clear Filter
                </Button>
              </div>
            )}

            {/* Mood Analytics Stats Cards */}
            {moodHistory.length > 0 && (
              <div className="grid gap-4 md:grid-cols-4">
                <Card className={dashboardFilter.type ? 'ring-1 ring-primary/30' : ''}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Songs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats?.total_plays || 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">Songs played</p>
                  </CardContent>
                </Card>
                
                <Card className={dashboardFilter.type ? 'ring-1 ring-primary/30' : ''}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {dashboardFilter.type ? 'Filtered Moods' : 'Mood Checks'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {dashboardFilter.type ? (
                        <span>{dashboardData.filteredTotal} <span className="text-lg text-muted-foreground font-normal">/ {moodHistory.length}</span></span>
                      ) : (
                        moodHistory.length
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {dashboardFilter.type ? 'Matching filter' : 'Times analyzed'}
                    </p>
                  </CardContent>
                </Card>
                
                <Card className={dashboardFilter.type ? 'ring-1 ring-primary/30' : ''}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {dashboardFilter.type ? 'Filtered Primary' : 'Primary Mood'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold capitalize flex items-center gap-2">
                      {(() => {
                        // Use filtered or total emotion counts based on filter state
                        const counts = dashboardFilter.type ? dashboardData.filteredEmotionCounts : dashboardData.emotionCounts;
                        const topMood = Object.entries(counts).sort(([,a], [,b]) => b - a)[0];
                        const moodEmojis: Record<string, string> = {
                          happy: '😊', sad: '😢', angry: '😠', neutral: '😐',
                          fear: '😨', disgust: '🤢', surprise: '😲'
                        };
                        return topMood ? <>{moodEmojis[topMood[0].toLowerCase()] || '😊'} {topMood[0]}</> : 'N/A';
                      })()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {dashboardFilter.type ? 'In filtered data' : 'Most frequent'}
                    </p>
                  </CardContent>
                </Card>
                
                <Card className={dashboardFilter.type ? 'ring-1 ring-primary/30' : ''}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {dashboardFilter.type ? 'Filtered Valence' : 'Valence Category'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold capitalize">
                      {(() => {
                        // Calculate valence category based on filter state
                        if (dashboardFilter.type && dashboardData.filteredMoods.length > 0) {
                          const avgValence = dashboardData.filteredAverageValence;
                          let category = 'Neutral';
                          let emoji = '🟡';
                          let textColor = 'text-yellow-600 dark:text-yellow-400';
                          
                          if (avgValence >= VALENCE_THRESHOLDS.positive) {
                            category = 'Positive';
                            emoji = '🟢';
                            textColor = 'text-green-600 dark:text-green-400';
                          } else if (avgValence <= VALENCE_THRESHOLDS.negative) {
                            category = 'Negative';
                            emoji = '🔴';
                            textColor = 'text-red-600 dark:text-red-400';
                          }
                          
                          return (
                            <span className={textColor}>
                              {emoji} {category}
                            </span>
                          );
                        }
                        
                        return (
                          <span className={dashboardData.valenceCategory.textColor}>
                            {dashboardData.valenceCategory.emoji} {dashboardData.valenceCategory.category}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {dashboardFilter.type 
                        ? `Avg: ${dashboardData.filteredAverageValence.toFixed(2)}`
                        : dashboardData.valenceCategory.timeFrame
                      }
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

            {/* Emotion Distribution and Valence Charts */}
            {moodHistory.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2">
                {/* Card 1: Emotion Distribution Donut Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Emotion Distribution
                    </CardTitle>
                    <CardDescription>Click a segment to filter dashboard</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const moodCounts: Record<string, number> = {};
                      moodHistory.forEach((m: any) => {
                        moodCounts[m.detected_mood] = (moodCounts[m.detected_mood] || 0) + 1;
                      });
                      const total = moodHistory.length;
                      const moodEmojis: Record<string, string> = {
                        happy: '😊', sad: '😢', angry: '😠', neutral: '😐',
                        fear: '😨', disgust: '🤢', surprise: '😲'
                      };
                      const moodColors: Record<string, string> = {
                        happy: '#22c55e', sad: '#3b82f6', angry: '#ef4444',
                        neutral: '#94a3b8', fear: '#f59e0b', disgust: '#10b981',
                        surprise: '#8b5cf6'
                      };
                      
                      const sortedMoods = Object.entries(moodCounts).sort(([,a], [,b]) => b - a);
                      const totalAngle = 360;
                      let currentAngle = 0;
                      
                      return (
                        <div className="space-y-6">
                          {/* Donut Chart */}
                          <div className="flex items-center justify-center">
                            <div className="relative w-64 h-64">
                              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90" style={{ pointerEvents: 'all' }}>
                                {sortedMoods.map(([mood, count], index) => {
                                  const percentage = (count / total) * 100;
                                  const angle = (count / total) * totalAngle;
                                  const startAngle = currentAngle;
                                  currentAngle += angle;
                                  
                                  // Calculate arc path
                                  const startRad = (startAngle * Math.PI) / 180;
                                  const endRad = (currentAngle * Math.PI) / 180;
                                  const largeArc = angle > 180 ? 1 : 0;
                                  
                                  const outerRadius = 45;
                                  const innerRadius = 28;
                                  
                                  const x1 = 50 + outerRadius * Math.cos(startRad);
                                  const y1 = 50 + outerRadius * Math.sin(startRad);
                                  const x2 = 50 + outerRadius * Math.cos(endRad);
                                  const y2 = 50 + outerRadius * Math.sin(endRad);
                                  const x3 = 50 + innerRadius * Math.cos(endRad);
                                  const y3 = 50 + innerRadius * Math.sin(endRad);
                                  const x4 = 50 + innerRadius * Math.cos(startRad);
                                  const y4 = 50 + innerRadius * Math.sin(startRad);
                                  
                                  const pathData = [
                                    `M ${x1} ${y1}`,
                                    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2}`,
                                    `L ${x3} ${y3}`,
                                    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
                                    'Z'
                                  ].join(' ');
                                  
                                  // Check if this emotion is selected or should be dimmed
                                  const isSelected = isFilterActive('emotion', mood.toLowerCase());
                                  const isDimmed = dashboardFilter.type && !isSelected;
                                  
                                  return (
                                    <path
                                      key={mood}
                                      d={pathData}
                                      fill={moodColors[mood.toLowerCase()] || '#94a3b8'}
                                      style={{ 
                                        cursor: 'pointer', 
                                        pointerEvents: 'all',
                                        opacity: isDimmed ? 0.25 : 1,
                                        transition: 'all 0.2s ease',
                                        stroke: isSelected ? 'white' : 'transparent',
                                        strokeWidth: isSelected ? 2 : 0
                                      }}
                                      onMouseEnter={(e) => { if (!isDimmed) e.currentTarget.style.opacity = '0.8'; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.opacity = isDimmed ? '0.25' : '1'; }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFilter('emotion', mood.toLowerCase());
                                      }}
                                    />
                                  );
                                })}
                              </svg>
                              
                              {/* Center text */}
                              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <div className="text-3xl font-bold">{dashboardFilter.type ? dashboardData.filteredTotal : total}</div>
                                <div className="text-xs text-muted-foreground">
                                  {dashboardFilter.type ? 'Filtered' : 'Total Moods'}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Legend - Horizontal Button Array */}
                          <div className="flex gap-2 justify-center overflow-x-auto pb-1">
                            {sortedMoods.map(([mood, count]) => {
                              const percentage = Math.round((count / total) * 100);
                              const isSelected = isFilterActive('emotion', mood.toLowerCase());
                              const isDimmed = dashboardFilter.type && !isSelected;
                              return (
                                <button 
                                  key={mood}
                                  type="button"
                                  className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all border ${isSelected ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-muted/30 hover:bg-muted/60 border-border'} ${isDimmed ? 'opacity-30' : ''}`}
                                  onClick={() => toggleFilter('emotion', mood.toLowerCase())}
                                >
                                  <div 
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: isSelected ? 'white' : (moodColors[mood.toLowerCase()] || '#94a3b8') }}
                                  />
                                  <span className="capitalize whitespace-nowrap">
                                    {moodEmojis[mood.toLowerCase()] || '😊'} {mood}
                                  </span>
                                  <span className={`${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                    {percentage}%
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Card 2: Mood Compass */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Compass className="h-5 w-5" />
                      Mood Compass
                    </CardTitle>
                    <CardDescription>Valence and Arousal Model </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const clampScore = (value: number) => Math.max(-1, Math.min(1, value));
                      const rawPoints = dashboardData.moodWithValence
                        .filter((m: any) => typeof m.valence === 'number' && typeof m.arousal === 'number')
                        .slice(0, 40);

                      if (rawPoints.length === 0) {
                        return (
                          <div className="p-6 text-center text-sm text-muted-foreground bg-muted/30 rounded-lg">
                            Run a few mood detections to unlock your valence–arousal map.
                          </div>
                        );
                      }

                      type QuadrantKey = 'HAPV' | 'LAPV' | 'HANV' | 'LANV';
                      const annotated = rawPoints.map((m: any, idx: number) => {
                        const valence = clampScore(m.valence);
                        const arousal = clampScore(m.arousal);
                        const quadrant: QuadrantKey = valence >= 0 && arousal >= 0 ? 'HAPV'
                          : valence >= 0 && arousal < 0 ? 'LAPV'
                          : valence < 0 && arousal >= 0 ? 'HANV'
                          : 'LANV';
                        const category = valence >= VALENCE_THRESHOLDS.positive ? 'Positive'
                          : valence <= VALENCE_THRESHOLDS.negative ? 'Negative'
                          : 'Neutral';
                        return {
                          ...m,
                          valence,
                          arousal,
                          quadrant,
                          category,
                          x: 60 + valence * 38,
                          y: 60 - arousal * 38,
                          isLatest: idx === 0,
                        };
                      });

                      const quadrantMeta: Record<QuadrantKey, { label: string; detail: string; description: string }> = {
                        HAPV: { label: 'HAPV', detail: 'Excited · Happy', description: 'High arousal • Positive valence' },
                        LAPV: { label: 'LAPV', detail: 'Calm · Relaxed', description: 'Low arousal • Positive valence' },
                        HANV: { label: 'HANV', detail: 'Anxious · Angry', description: 'High arousal • Negative valence' },
                        LANV: { label: 'LANV', detail: 'Sad · Tired', description: 'Low arousal • Negative valence' },
                      };

                      const colors: Record<QuadrantKey, string> = {
                        HAPV: '#22c55e',
                        LAPV: '#0ea5e9',
                        HANV: '#f97316',
                        LANV: '#6366f1',
                      };

                      const latest = annotated[0];

                      return (
                        <div className="space-y-4">
                          <div className="relative h-80">
                            <svg viewBox="0 0 120 120" className="w-full h-full">
                              <defs>
                                <radialGradient id="compassGlow" cx="50%" cy="50%" r="50%">
                                  <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
                                  <stop offset="100%" stopColor="rgba(15,23,42,0.08)" />
                                </radialGradient>
                              </defs>
                              <circle cx="60" cy="60" r="48" fill="url(#compassGlow)" stroke="rgba(148,163,184,0.4)" strokeWidth="0.6" />
                              <line x1="12" x2="108" y1="60" y2="60" stroke="rgba(148,163,184,0.65)" strokeWidth="0.7" />
                              <line x1="60" x2="60" y1="12" y2="108" stroke="rgba(148,163,184,0.65)" strokeWidth="0.7" />
                              <line x1="12" x2="108" y1="30" y2="30" stroke="rgba(148,163,184,0.25)" strokeDasharray="3,3" strokeWidth="0.4" />
                              <line x1="12" x2="108" y1="90" y2="90" stroke="rgba(148,163,184,0.25)" strokeDasharray="3,3" strokeWidth="0.4" />
                              <line x1="30" x2="30" y1="12" y2="108" stroke="rgba(148,163,184,0.25)" strokeDasharray="3,3" strokeWidth="0.4" />
                              <line x1="90" x2="90" y1="12" y2="108" stroke="rgba(148,163,184,0.25)" strokeDasharray="3,3" strokeWidth="0.4" />
                              <text x="95" y="64" fontSize="4" fill="rgba(148,163,184,0.9)">Valence →</text>
                              <text x="63" y="18" fontSize="4" fill="rgba(148,163,184,0.9)">High arousal</text>
                              <text x="63" y="106" fontSize="4" fill="rgba(148,163,184,0.9)">Low arousal</text>

                              {annotated.slice().reverse().map((point, i) => {
                                const pointColor = colors[point.quadrant as QuadrantKey];
                                const matchesFilter = matchesActiveFilter({
                                  detected_mood: point.detected_mood,
                                  dateStr: point.dateStr,
                                  valence: point.valence,
                                });
                                const isDimmed = dashboardFilter.type ? !matchesFilter : false;
                                const isSelected = dashboardFilter.type === 'valenceCategory' && dashboardFilter.value === point.category;
                                return (
                                  <g key={`${point.created_at}-${i}`} className="cursor-pointer" onClick={() => toggleFilter('valenceCategory', point.category)}>
                                    <circle
                                      cx={point.x}
                                      cy={point.y}
                                      r={point.isLatest ? 3.5 : 2.6}
                                      fill={pointColor}
                                      opacity={isDimmed ? 0.1 : 0.18}
                                    />
                                    <circle
                                      cx={point.x}
                                      cy={point.y}
                                      r={point.isLatest ? 2.4 : 1.7}
                                      fill={pointColor}
                                      className={`transition-opacity ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
                                      stroke={point.isLatest ? 'white' : 'transparent'}
                                      strokeWidth={point.isLatest ? 0.5 : 0}
                                    />
                                    <circle cx={point.x} cy={point.y} r={5} fill="transparent" />
                                    <title>
                                      {`${point.detected_mood} · v ${point.valence.toFixed(2)} / a ${point.arousal.toFixed(2)} (${new Date(point.created_at).toLocaleString()})`}
                                    </title>
                                  </g>
                                );
                              })}
                            </svg>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2 text-xs">
                            {Object.entries(quadrantMeta).map(([key, meta]) => (
                              <div key={key} className="flex items-start gap-2 rounded-lg border border-border/40 p-3 bg-muted/20">
                                <div
                                  className="w-2 h-2 rounded-full mt-1"
                                  style={{ backgroundColor: colors[key as QuadrantKey] }}
                                />
                                <div>
                                  <p className="text-sm font-semibold text-foreground">{meta.label} · {meta.detail}</p>
                                  <p className="text-[11px] text-muted-foreground">{meta.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex flex-wrap gap-2 text-xs justify-center sm:justify-start">
                            {[
                              { label: 'Positive', color: 'bg-green-500' },
                              { label: 'Neutral', color: 'bg-slate-400' },
                              { label: 'Negative', color: 'bg-red-500' },
                            ].map((chip) => {
                              const active = isFilterActive('valenceCategory', chip.label);
                              const dimmed = dashboardFilter.type && !active && dashboardFilter.type === 'valenceCategory';
                              return (
                                <button
                                  key={chip.label}
                                  type="button"
                                  onClick={() => toggleFilter('valenceCategory', chip.label)}
                                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-foreground/80 transition ${active ? 'border-primary bg-primary/10' : 'border-border/50 hover:bg-muted/40'} ${dimmed ? 'opacity-40' : ''}`}
                                >
                                  <span className={`w-2 h-2 rounded-full ${chip.color}`}></span>
                                  {chip.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Mood Patterns Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Mood & Listening Patterns
                    </CardTitle>
                    <CardDescription>How your emotions influence your music choices</CardDescription>
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
                              const maxVariety = 7; // 7 valid emotions: happy, sad, angry, neutral, fear, disgust, surprise
                              const varietyScore = Math.min(Math.round((uniqueMoods / maxVariety) * 100), 100);
                              return `${varietyScore}%`;
                            })()}
                          </span>
                        </div>
                        <div className="bg-secondary rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-primary via-cyan-500 to-primary/60 rounded-full h-2 transition-all" 
                            style={{
                              width: `${(() => {
                                const uniqueMoods = new Set(moodHistory.map((m: any) => m.detected_mood.toLowerCase())).size;
                                return Math.min(Math.round((uniqueMoods / 7) * 100), 100);
                              })()}%`
                            }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {(() => {
                            const uniqueMoods = new Set(moodHistory.map((m: any) => m.detected_mood.toLowerCase())).size;
                            const maxMoods = 7;
                            if (uniqueMoods === 0) return 'No mood detections yet';
                            if (uniqueMoods === maxMoods) return `All ${maxMoods} emotions detected - highly varied!`;
                            return `${uniqueMoods} of ${maxMoods} different emotions detected`;
                          })()}
                        </p>
                      </div>

                      {/* Grid of insights */}
                      <div className="grid grid-cols-3 gap-2">
                        {/* Active Streak */}
                        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Active Days</p>
                          <p className="text-2xl font-bold mt-1">
                            {(() => {
                              if (moodHistory.length === 0) return '0';
                              const uniqueDates = new Set(
                                moodHistory.map((m: any) => new Date(m.created_at).toDateString())
                              );
                              return uniqueDates.size;
                            })()}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
                        </div>

                        {/* Peak Hour */}
                        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                          <p className="text-xs font-semibold text-purple-600 dark:text-purple-400">Peak Time</p>
                          <p className="text-2xl font-bold mt-1">
                            {(() => {
                              if (moodHistory.length === 0) return 'N/A';
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
                          <p className="text-xs text-muted-foreground mt-1">Most active</p>
                        </div>

                        {/* Songs per Mood */}
                        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                          <p className="text-xs font-semibold text-green-600 dark:text-green-400">Avg Songs</p>
                          <p className="text-2xl font-bold mt-1">
                            {(() => {
                              if (!stats || stats.total_plays === 0 || moodHistory.length === 0) return '0';
                              const songsPerMood = Math.round(stats.total_plays / moodHistory.length);
                              return songsPerMood;
                            })()}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Per mood check</p>
                        </div>
                      </div>

                      {/* Insights Section */}
                      <div className="space-y-3">
                        {/* Mood-Music Correlation */}
                        <div className="p-4 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
                          <div className="flex items-start gap-3">
                            <div className="text-2xl">🎵</div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold mb-1">Music Listening Pattern</p>
                              <p className="text-xs text-muted-foreground">
                                {(() => {
                                  if (!stats || stats.total_plays === 0) {
                                    return 'Start playing music to see how your mood influences your music choices.';
                                  }
                                  
                                  if (moodHistory.length === 0) {
                                    return 'Use mood detection to discover how your emotions shape your music preferences!';
                                  }
                                  
                                  // Calculate most common mood
                                  const moodCounts: Record<string, number> = {};
                                  moodHistory.forEach((m: any) => {
                                    moodCounts[m.detected_mood.toLowerCase()] = (moodCounts[m.detected_mood.toLowerCase()] || 0) + 1;
                                  });
                                  const topMood = Object.entries(moodCounts).sort(([,a], [,b]) => b - a)[0];
                                  
                                  if (!topMood) return 'Keep using mood detection to discover patterns!';
                                  
                                  const moodPercentage = Math.round((topMood[1] / moodHistory.length) * 100);
                                  const avgSongs = Math.round(stats.total_plays / moodHistory.length);
                                  const uniqueMoods = new Set(moodHistory.map((m: any) => m.detected_mood.toLowerCase())).size;
                                  
                                  // Different insights based on mood variety
                                  if (uniqueMoods === 1) {
                                    return `You've only detected ${topMood[0]} mood so far. Try checking your mood at different times to discover how your emotions vary and explore diverse music recommendations!`;
                                  } else if (uniqueMoods <= 3) {
                                    return `You've experienced ${uniqueMoods} different moods (mostly ${topMood[0]} at ${moodPercentage}%). Try mood detection during different activities to unlock more varied music suggestions!`;
                                  } else if (moodPercentage > 60) {
                                    return `You're predominantly ${topMood[0]} (${moodPercentage}% of checks). You listen to ${avgSongs} songs per mood check. The app curates music to match your emotional patterns.`;
                                  } else {
                                    return `Great emotional variety! You've experienced ${uniqueMoods} different moods, with ${topMood[0]} being most common (${moodPercentage}%). Average ${avgSongs} songs per mood check.`;
                                  }
                                })()}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Mood Trend Insight */}
                        <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/5 to-blue-500/10 border border-blue-500/20">
                          <div className="flex items-start gap-3">
                            <div className="text-2xl">
                              {(() => {
                                const positiveEmotions = ['happy', 'surprise', 'energetic'];
                                const recentMoods = moodHistory.slice(0, Math.ceil(moodHistory.length / 3));
                                const olderMoods = moodHistory.slice(Math.ceil(moodHistory.length / 3));
                                
                                if (olderMoods.length === 0) return '📊';
                                
                                const recentPositive = recentMoods.filter((m: any) => 
                                  positiveEmotions.includes(m.detected_mood.toLowerCase())
                                ).length / recentMoods.length;
                                
                                const olderPositive = olderMoods.filter((m: any) => 
                                  positiveEmotions.includes(m.detected_mood.toLowerCase())
                                ).length / olderMoods.length;
                                
                                if (recentPositive > olderPositive + 0.15) return '📈';
                                if (recentPositive < olderPositive - 0.15) return '📉';
                                return '➡️';
                              })()}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold mb-1">Emotional Trend</p>
                              <p className="text-xs text-muted-foreground">
                                {(() => {
                                  const positiveEmotions = ['happy', 'surprise'];
                                  const neutralEmotions = ['neutral'];
                                  const negativeEmotions = ['sad', 'angry', 'fear', 'disgust'];
                                  
                                  if (moodHistory.length === 0) return 'Start using mood detection to track your emotional trends over time.';
                                  if (moodHistory.length < 3) return 'Check your mood more often to see emotional trends over time.';
                                  
                                  const recentMoods = moodHistory.slice(0, Math.ceil(moodHistory.length / 3));
                                  const olderMoods = moodHistory.slice(Math.ceil(moodHistory.length / 3));
                                  
                                  if (olderMoods.length === 0) return 'Keep checking your mood to see how your emotions evolve!';
                                  
                                  const recentPositive = recentMoods.filter((m: any) => 
                                    positiveEmotions.includes(m.detected_mood.toLowerCase())
                                  ).length / recentMoods.length;
                                  
                                  const olderPositive = olderMoods.filter((m: any) => 
                                    positiveEmotions.includes(m.detected_mood.toLowerCase())
                                  ).length / olderMoods.length;
                                  
                                  const recentPercent = Math.round(recentPositive * 100);
                                  const change = Math.round((recentPositive - olderPositive) * 100);
                                  
                                  // Count recent negative moods
                                  const recentNegative = recentMoods.filter((m: any) => 
                                    negativeEmotions.includes(m.detected_mood.toLowerCase())
                                  ).length / recentMoods.length;
                                  
                                  if (recentPositive > olderPositive + 0.15) {
                                    return `Your mood is trending upward! 📈 Recent positive emotions are ${recentPercent}%, up ${Math.abs(change)}% from earlier. Keep using mood-based music to maintain this positive trend!`;
                                  }
                                  if (recentPositive < olderPositive - 0.15) {
                                    return `You've been experiencing fewer positive moods lately (${recentPercent}%, down ${Math.abs(change)}%). 💡 Recommendation: Try listening to uplifting or energetic music to boost your mood, or explore calming tracks if you're feeling stressed.`;
                                  }
                                  if (recentNegative > 0.5) {
                                    return `You've had more challenging emotions recently (${Math.round(recentNegative * 100)}% negative). Music therapy can help - try mood-matching playlists that gradually shift to more positive tones.`;
                                  }
                                  if (recentPercent < 20 && recentPercent > 0) {
                                    return `Low positive mood detection (${recentPercent}%). Consider: Start with calming music when stressed, then gradually transition to uplifting tracks. Mood-based music can significantly impact emotional well-being.`;
                                  }
                                  return `Your emotional state has been relatively stable with ${recentPercent}% positive moods recently. The app adapts to your emotional patterns for optimal music recommendations.`;
                                })()}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Personalized Recommendation */}
                        {stats && stats.top_artists.length > 0 && (
                          <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/5 to-purple-500/10 border border-purple-500/20">
                            <div className="flex items-start gap-3">
                              <div className="text-2xl">🎤</div>
                              <div className="flex-1">
                                <p className="text-sm font-semibold mb-1">Top Artist Connection</p>
                                <p className="text-xs text-muted-foreground">
                                  {(() => {
                                    const topArtist = stats.top_artists[0];
                                    const moodCounts: Record<string, number> = {};
                                    moodHistory.forEach((m: any) => {
                                      moodCounts[m.detected_mood.toLowerCase()] = (moodCounts[m.detected_mood.toLowerCase()] || 0) + 1;
                                    });
                                    const topMood = Object.entries(moodCounts).sort(([,a], [,b]) => b - a)[0];
                                    
                                    if (!topMood) return `You've listened to ${topArtist.name} ${topArtist.plays} times this month.`;
                                    
                                    return `Your favorite artist ${topArtist.name} (${topArtist.plays} plays) pairs well with your most common ${topMood[0]} mood. The app learns from these patterns to suggest similar artists.`;
                                  })()}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Mood Calendar - Last 6 Months */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Mood Calendar
                    </CardTitle>
                    <CardDescription>Click a day to filter by date</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* 2x3 Grid of months */}
                      <div className="grid grid-cols-3 gap-4">
                        {dashboardData.months.map((monthData, idx) => {
                          // Get first day of month (0 = Sunday, 1 = Monday, etc.)
                          const firstDayOfMonth = new Date(monthData.year, monthData.month, 1).getDay();
                          
                          return (
                            <div key={idx} className="space-y-2">
                              <div className="text-xs font-medium text-center text-muted-foreground">
                                {monthData.name} {monthData.year}
                              </div>
                              {/* Day labels */}
                              <div className="grid grid-cols-7 gap-[2px] text-[8px] text-muted-foreground text-center mb-1">
                                <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                              </div>
                              {/* Calendar grid */}
                              <div className="grid grid-cols-7 gap-[2px]">
                                {/* Empty cells for offset */}
                                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                                  <div key={`empty-${i}`} className="aspect-square rounded-sm" />
                                ))}
                                {/* Day cells */}
                                {monthData.days.map((day, dayIdx) => {
                                  const dateStr = day.toISOString().split('T')[0];
                                  const hasMoodData = !!dashboardData.moodByDate[dateStr];
                                  return (
                                    <div
                                      key={dayIdx}
                                      className={`aspect-square rounded-sm ${getCalendarDayColor(day)} transition-all hover:scale-125 hover:z-10 ${hasMoodData ? 'cursor-pointer' : ''}`}
                                      title={getCalendarDayTooltip(day)}
                                      onClick={() => hasMoodData && toggleFilter('date', dateStr)}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Legend */}
                      <div className="flex items-center justify-center gap-4 pt-2 border-t">
                        <div 
                          className={`flex items-center gap-1.5 cursor-pointer p-1 rounded transition-all ${isFilterActive('valenceCategory', 'Positive') ? 'bg-green-500/20 ring-1 ring-green-500/50' : 'hover:bg-muted/50'} ${dashboardFilter.type && !isFilterActive('valenceCategory', 'Positive') ? 'opacity-40' : ''}`}
                          onClick={() => toggleFilter('valenceCategory', 'Positive')}
                        >
                          <div className="w-3 h-3 rounded-sm bg-green-500" />
                          <span className="text-xs text-muted-foreground">Positive</span>
                        </div>
                        <div 
                          className={`flex items-center gap-1.5 cursor-pointer p-1 rounded transition-all ${isFilterActive('valenceCategory', 'Neutral') ? 'bg-yellow-500/20 ring-1 ring-yellow-500/50' : 'hover:bg-muted/50'} ${dashboardFilter.type && !isFilterActive('valenceCategory', 'Neutral') ? 'opacity-40' : ''}`}
                          onClick={() => toggleFilter('valenceCategory', 'Neutral')}
                        >
                          <div className="w-3 h-3 rounded-sm bg-yellow-500" />
                          <span className="text-xs text-muted-foreground">Neutral</span>
                        </div>
                        <div 
                          className={`flex items-center gap-1.5 cursor-pointer p-1 rounded transition-all ${isFilterActive('valenceCategory', 'Negative') ? 'bg-red-500/20 ring-1 ring-red-500/50' : 'hover:bg-muted/50'} ${dashboardFilter.type && !isFilterActive('valenceCategory', 'Negative') ? 'opacity-40' : ''}`}
                          onClick={() => toggleFilter('valenceCategory', 'Negative')}
                        >
                          <div className="w-3 h-3 rounded-sm bg-red-500" />
                          <span className="text-xs text-muted-foreground">Negative</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-sm bg-muted/30" />
                          <span className="text-xs text-muted-foreground">No data</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Top Genres & Top Artists - side by side */}
            {(moodHistory.length > 0 || (stats && stats.top_artists.length > 0)) && (
              <div className="grid gap-4 md:grid-cols-2">
                {/* Top Genres - Treemap */}
                {moodHistory.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Music className="h-5 w-5" />
                        Top Genres
                      </CardTitle>
                      <CardDescription>Click a genre to filter dashboard</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        // Map moods to likely genre preferences
                        const moodToGenres: Record<string, string[]> = {
                          happy: ['Pop', 'Dance', 'Electronic'],
                          sad: ['Indie', 'R&B', 'Classical'],
                          angry: ['Rock', 'Hip Hop', 'Metal'],
                          neutral: ['Lo-Fi', 'Jazz', 'Ambient'],
                          fear: ['Classical', 'Ambient', 'Indie'],
                          disgust: ['Rock', 'Alternative', 'Punk'],
                          surprise: ['Electronic', 'Dance', 'Pop']
                        };

                        const genreColors: Record<string, string> = {
                          'Pop': 'bg-pink-500 hover:bg-pink-400',
                          'Rock': 'bg-blue-500 hover:bg-blue-400',
                          'Hip Hop': 'bg-green-500 hover:bg-green-400',
                          'Electronic': 'bg-orange-500 hover:bg-orange-400',
                          'Jazz': 'bg-purple-500 hover:bg-purple-400',
                          'Classical': 'bg-gray-500 hover:bg-gray-400',
                          'Indie': 'bg-rose-500 hover:bg-rose-400',
                          'R&B': 'bg-indigo-500 hover:bg-indigo-400',
                          'Country': 'bg-emerald-500 hover:bg-emerald-400',
                          'Lo-Fi': 'bg-amber-500 hover:bg-amber-400',
                          'Dance': 'bg-cyan-500 hover:bg-cyan-400',
                          'Metal': 'bg-red-500 hover:bg-red-400',
                          'Ambient': 'bg-teal-500 hover:bg-teal-400',
                          'Alternative': 'bg-violet-500 hover:bg-violet-400',
                          'Punk': 'bg-red-600 hover:bg-red-500'
                        };

                        // Calculate genre scores based on mood frequency
                        // Use filtered data when filter is active (except genre filter itself)
                        const genreScores: Record<string, number> = {};
                        const moodsToUse = (dashboardFilter.type && dashboardFilter.type !== 'genre') 
                          ? dashboardData.filteredMoods 
                          : moodHistory;
                        
                        moodsToUse.forEach((m: any) => {
                          const mood = m.detected_mood.toLowerCase();
                          const genres = moodToGenres[mood] || ['Pop', 'Rock', 'Jazz'];
                          
                          genres.forEach((genre, index) => {
                            const weight = 1 / (index + 1);
                            genreScores[genre] = (genreScores[genre] || 0) + weight;
                          });
                        });

                        // Get top 8 genres for treemap
                        const topGenres = Object.entries(genreScores)
                          .sort(([,a], [,b]) => b - a)
                          .slice(0, 8);

                        if (topGenres.length === 0) {
                          return (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              {dashboardFilter.type ? 'No genres match this filter' : 'No genre data available yet. Keep using mood detection!'}
                            </p>
                          );
                        }

                        const totalScore = topGenres.reduce((sum, [, score]) => sum + score, 0);

                        // Calculate treemap layout (simplified squarified algorithm)
                        const treemapData = topGenres.map(([genre, score]) => ({
                          genre,
                          score,
                          percentage: Math.round((score / totalScore) * 100),
                          color: genreColors[genre] || 'bg-primary hover:bg-primary/80'
                        }));

                        return (
                          <div className="space-y-3">
                            {/* Treemap Container */}
                            <div className="relative h-64 rounded-lg overflow-hidden border border-border/50 bg-background p-1 flex flex-col gap-1">
                              {/* Row 1: Top 2 genres */}
                              <div className="flex h-[50%] gap-1">
                                {treemapData.slice(0, 2).map((item, idx) => {
                                  const width = treemapData.length > 1 
                                    ? (item.percentage / (treemapData[0].percentage + (treemapData[1]?.percentage || 0))) * 100
                                    : 100;
                                  const isSelected = isFilterActive('genre', item.genre);
                                  const isDimmed = dashboardFilter.type === 'genre' && !isSelected;
                                  return (
                                    <div
                                      key={item.genre}
                                      className={`${item.color} relative flex flex-col items-center justify-center p-2 transition-all cursor-pointer group rounded-md ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-background' : ''} ${isDimmed ? 'opacity-30' : ''}`}
                                      style={{ width: `${width}%` }}
                                      title={`${item.genre}: ${item.percentage}%`}
                                      onClick={() => toggleFilter('genre', item.genre)}
                                    >
                                      <span className="text-white font-bold text-lg drop-shadow-md">{item.genre}</span>
                                      <span className="text-white/90 text-sm font-medium">{item.percentage}%</span>
                                      {/* Hover overlay */}
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all rounded-md" />
                                    </div>
                                  );
                                })}
                              </div>
                              
                              {/* Row 2: Middle genres (3-5) */}
                              {treemapData.length > 2 && (
                                <div className="flex h-[30%] gap-1">
                                  {treemapData.slice(2, 5).map((item, idx) => {
                                    const rowItems = treemapData.slice(2, 5);
                                    const rowTotal = rowItems.reduce((sum, g) => sum + g.percentage, 0);
                                    const width = (item.percentage / rowTotal) * 100;
                                    const isSelected = isFilterActive('genre', item.genre);
                                    const isDimmed = dashboardFilter.type === 'genre' && !isSelected;
                                    return (
                                      <div
                                        key={item.genre}
                                        className={`${item.color} relative flex flex-col items-center justify-center p-1 transition-all cursor-pointer group rounded-md ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-background' : ''} ${isDimmed ? 'opacity-30' : ''}`}
                                        style={{ width: `${width}%` }}
                                        title={`${item.genre}: ${item.percentage}%`}
                                        onClick={() => toggleFilter('genre', item.genre)}
                                      >
                                        <span className="text-white font-semibold text-sm drop-shadow-md truncate max-w-full px-1">{item.genre}</span>
                                        <span className="text-white/90 text-xs">{item.percentage}%</span>
                                        {/* Hover overlay */}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all rounded-md" />
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Row 3: Bottom genres (6-8) */}
                              {treemapData.length > 5 && (
                                <div className="flex h-[20%] gap-1">
                                  {treemapData.slice(5, 8).map((item, idx) => {
                                    const rowItems = treemapData.slice(5, 8);
                                    const rowTotal = rowItems.reduce((sum, g) => sum + g.percentage, 0);
                                    const width = (item.percentage / rowTotal) * 100;
                                    const isSelected = isFilterActive('genre', item.genre);
                                    const isDimmed = dashboardFilter.type === 'genre' && !isSelected;
                                    return (
                                      <div
                                        key={item.genre}
                                        className={`${item.color} relative flex flex-col items-center justify-center p-1 transition-all cursor-pointer group rounded-md ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-background' : ''} ${isDimmed ? 'opacity-30' : ''}`}
                                        style={{ width: `${width}%` }}
                                        title={`${item.genre}: ${item.percentage}%`}
                                        onClick={() => toggleFilter('genre', item.genre)}
                                      >
                                        <span className="text-white font-medium text-xs drop-shadow-md truncate max-w-full px-1">{item.genre}</span>
                                        <span className="text-white/80 text-[10px]">{item.percentage}%</span>
                                        {/* Hover overlay */}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all rounded-md" />
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Legend */}
                            <div className="flex flex-wrap gap-2 justify-center pt-1">
                              {treemapData.slice(0, 8).map((item) => {
                                const isSelected = isFilterActive('genre', item.genre);
                                const isDimmed = dashboardFilter.type === 'genre' && !isSelected;
                                return (
                                  <div 
                                    key={item.genre} 
                                    className={`flex items-center gap-1.5 cursor-pointer p-1 rounded transition-all ${isSelected ? 'bg-muted ring-1 ring-primary/50' : 'hover:bg-muted/50'} ${isDimmed ? 'opacity-30' : ''}`}
                                    onClick={() => toggleFilter('genre', item.genre)}
                                  >
                                    <div className={`w-3 h-3 rounded-sm ${item.color.split(' ')[0]}`} />
                                    <span className="text-xs text-muted-foreground">{item.genre}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
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
                  <div className="max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {history.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors border border-border/50"
                        >
                          {entry.image_url && (
                            <img
                              src={entry.image_url}
                              alt={entry.song_name}
                              className="w-12 h-12 rounded object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-sm">{entry.song_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{entry.artist_name}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(entry.played_at).toLocaleTimeString()}
                              </span>
                              {entry.mood_detected && (
                                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                  {getMoodEmoji(entry.mood_detected)} {entry.mood_detected}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {history.length > 20 && (
                      <p className="text-xs text-center text-muted-foreground pt-3 mt-3 border-t">
                        Total: {history.length} songs played
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
                  <div className="max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {moodHistory.map((mood: any) => {
                        const confidencePercent = Math.round(mood.confidence * 100);
                        const moodEmojis: Record<string, string> = {
                          happy: '😊', sad: '😢', angry: '😠', neutral: '😐',
                          fear: '😨', disgust: '🤢', surprise: '😲', energetic: '⚡', calm: '😌'
                        };
                        const moodEmoji = moodEmojis[mood.detected_mood.toLowerCase()] || '😊';
                        
                        return (
                          <div key={mood.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors border border-border/40">
                            <div className="text-2xl flex-shrink-0">{moodEmoji}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-medium capitalize text-sm">{mood.detected_mood}</p>
                                <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                                  {confidencePercent}%
                                </Badge>
                                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                  {mood.analysis_type}
                                </Badge>
                              </div>
                              {mood.voice_emotion && mood.face_emotion && (
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  🎤 {mood.voice_emotion} ({Math.round(mood.voice_confidence * 100)}%) • 
                                  📷 {mood.face_emotion} ({Math.round(mood.face_confidence * 100)}%)
                                </p>
                              )}
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {new Date(mood.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {moodHistory.length > 20 && (
                      <p className="text-xs text-center text-muted-foreground pt-3 mt-3 border-t">
                        Total: {moodHistory.length} detections
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
