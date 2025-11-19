import { mockPlaylists, mockTracks } from "@/lib/mockData"
import { SpotifyAuthService } from "@/lib/services/spotifyAuth"
import { filterTracksByLanguage, getLanguageDistribution } from "@/lib/utils/languageFilter"

export interface SpotifyTrack {
  id: string
  name: string
  artists: string[]
  album: string
  duration_ms: number
  preview_url: string | null
  image_url: string | null
  external_urls?: { spotify?: string }
  popularity?: number
}

export interface SpotifySearchResult {
  tracks: SpotifyTrack[]
  source: "spotify" | "mock"
}

export interface MusicRecommendationResult {
  results: {
    tracks: SpotifyTrack[]
    mood?: string
  }
  source: "spotify" | "mock"
}

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1485579149621-3123dd979885?auto=format&fit=crop&w=400&q=80"

class SpotifyMusicServiceImpl {
  private static instance: SpotifyMusicServiceImpl

  static getInstance(): SpotifyMusicServiceImpl {
    if (!SpotifyMusicServiceImpl.instance) {
      SpotifyMusicServiceImpl.instance = new SpotifyMusicServiceImpl()
    }
    return SpotifyMusicServiceImpl.instance
  }

  async searchMusic(query: string, limit: number = 20, languagePreferences?: string[]): Promise<SpotifySearchResult | null> {
    if (!query.trim()) {
      return null
    }

    try {
      // Always use backend API
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      console.log(`🔗 Calling backend search API: ${apiUrl}/spotify/search?query=${query}&limit=${limit}`)
      
      const response = await fetch(
        `${apiUrl}/spotify/search?query=${encodeURIComponent(query)}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Backend search response:', data)
        
        if (data.success && data.results) {
          // Map backend results to SpotifyTrack format
          let tracks = data.results.map((item: any) => ({
            id: item.id || item.track_id || Math.random().toString(),
            name: item.name || item.track_name || 'Unknown Track',
            artists: Array.isArray(item.artists) ? item.artists : [item.artist || item.artist_name || 'Unknown Artist'],
            album: item.album || item.album_name || 'Unknown Album',
            duration_ms: item.duration_ms || 180000,
            preview_url: item.preview_url || null,
            image_url: item.image_url || item.album_art || item.album_cover || null,
            external_urls: item.external_urls || { spotify: item.spotify_url || item.external_url || '#' },
            popularity: item.popularity || 50,
          }))
          
          // Apply language filtering if preferences provided
          if (languagePreferences && languagePreferences.length > 0) {
            console.log('🌍 Filtering search results by languages:', languagePreferences)
            const beforeCount = tracks.length
            tracks = filterTracksByLanguage(tracks, languagePreferences)
            console.log(`🌍 Language filter: ${beforeCount} → ${tracks.length} tracks`)
            
            if (tracks.length > 0) {
              const distribution = getLanguageDistribution(tracks)
              console.log('📊 Language distribution:', distribution)
            }
          }
          
          return {
            tracks,
            source: 'spotify',
          }
        }
      }
      
      console.warn("[SpotifyMusicService] Backend search failed, falling back to mock data", response.status)
    } catch (error) {
      console.error("[SpotifyMusicService] Backend search error:", error)
    }

    // Fallback to mock data
    return this.searchMockTracks(query, limit)
  }

  async getMoodRecommendations(mood: string, limit: number = 12, languagePreferences?: string[]): Promise<MusicRecommendationResult | null> {
    try {
      // Try backend API first
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      
      // Extract mood and language if combined (e.g., "happy Hindi" -> mood="happy", language="Hindi")
      const parts = mood.trim().split(' ')
      const baseMood = parts[0]
      const language = parts.length > 1 ? parts.slice(1).join(' ') : null
      
      const url = language 
        ? `${apiUrl}/recommendations/mood/${baseMood}?limit=${limit}&language=${encodeURIComponent(language)}`
        : `${apiUrl}/recommendations/mood/${baseMood}?limit=${limit}`
      
      console.log(`🔗 Calling backend API with language: ${url}`)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Backend API response:', data)
        
        if (data.success && data.recommendations) {
          // Map backend recommendations to SpotifyTrack format
          let tracks = data.recommendations.map((rec: any) => ({
            id: rec.id || rec.track_id || Math.random().toString(),
            name: rec.name || rec.track_name || 'Unknown Track',
            artists: Array.isArray(rec.artists) ? rec.artists : [rec.artist || 'Unknown Artist'],
            album: rec.album || 'Unknown Album',
            duration_ms: rec.duration_ms || 180000,
            preview_url: rec.preview_url || null,
            image_url: rec.image_url || rec.album_art || null,
            external_urls: rec.external_urls || { spotify: rec.spotify_url || '#' },
            popularity: rec.popularity || 50,
          }))
          
          // Apply client-side language filtering as additional filter
          if (languagePreferences && languagePreferences.length > 0) {
            console.log('🌍 Applying additional language filter:', languagePreferences)
            const beforeCount = tracks.length
            tracks = filterTracksByLanguage(tracks, languagePreferences)
            console.log(`🌍 Client filter: ${beforeCount} → ${tracks.length} tracks`)
            
            if (tracks.length > 0) {
              const distribution = getLanguageDistribution(tracks)
              console.log('📊 Language distribution:', distribution)
            }
          }
          
          return {
            results: { tracks, mood },
            source: 'spotify',
          }
        }
      }
      
      console.warn('⚠️ Backend API failed, falling back to mock data')
    } catch (error) {
      console.error('❌ Backend API error:', error)
      console.log('📦 Falling back to mock data')
    }

    // Fallback to mock data
    const moodKey = mood.toLowerCase()
    const filtered = mockTracks.filter((track) =>
      track.mood.some((entry) => entry.toLowerCase() === moodKey),
    )

    const pool = filtered.length > 0 ? filtered : mockTracks
    const sampled = pool.slice(0, limit).map((track) => this.mapMockTrack(track))

    return {
      results: {
        tracks: sampled,
        mood,
      },
      source: "mock",
    }
  }

  openInSpotify(track: { external_urls?: { spotify?: string }; name?: string; artists?: string[] }) {
    if (typeof window === "undefined") return

    const url =
      track.external_urls?.spotify ??
      `https://open.spotify.com/search/${encodeURIComponent(
        `${track.name ?? "Unknown"} ${track.artists?.join(" ") ?? ""}`,
      )}`

    window.open(url, "_blank", "noopener,noreferrer")
  }

  formatDuration(durationMs: number): string {
    const totalSeconds = Math.floor(durationMs / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  async getFeaturedPlaylists(limit: number = 4): Promise<typeof mockPlaylists> {
    // Placeholder implementation: In future, fetch from Spotify Browse endpoint
    return mockPlaylists.slice(0, limit)
  }

  private async getAccessToken(): Promise<string | null> {
    try {
      const authService = SpotifyAuthService.getInstance()
      const token = await authService.getAccessToken()
      return token
    } catch (error) {
      console.warn("[SpotifyMusicService] Unable to obtain access token", error)
      return null
    }
  }

  private searchMockTracks(query: string, limit: number): SpotifySearchResult {
    const normalized = query.toLowerCase()
    const results = mockTracks
      .filter(
        (track) =>
          track.title.toLowerCase().includes(normalized) ||
          track.artist.toLowerCase().includes(normalized) ||
          track.album.toLowerCase().includes(normalized),
      )
      .slice(0, limit)
      .map((track) => this.mapMockTrack(track))

    return {
      tracks: results,
      source: "mock",
    }
  }

  private mapSpotifyTrack(item: any): SpotifyTrack {
    const images = item?.album?.images
    return {
      id: item?.id,
      name: item?.name,
      artists: Array.isArray(item?.artists) ? item.artists.map((artist: any) => artist.name) : [],
      album: item?.album?.name ?? "Unknown Album",
      duration_ms: item?.duration_ms ?? 0,
      preview_url: item?.preview_url ?? null,
      image_url: images && images.length > 0 ? images[0].url : DEFAULT_IMAGE,
      external_urls: item?.external_urls,
      popularity: item?.popularity,
    }
  }

  private mapMockTrack(track: (typeof mockTracks)[number]): SpotifyTrack {
    return {
      id: track.id,
      name: track.title,
      artists: [track.artist],
      album: track.album,
      duration_ms: track.duration * 1000,
      preview_url: track.previewUrl ?? null,
      image_url: track.coverUrl || DEFAULT_IMAGE,
      external_urls: {
        spotify: `https://open.spotify.com/search/${encodeURIComponent(`${track.title} ${track.artist}`)}`,
      },
      popularity: Math.round(track.energy * 100),
    }
  }
}

export const SpotifyMusicService = SpotifyMusicServiceImpl

