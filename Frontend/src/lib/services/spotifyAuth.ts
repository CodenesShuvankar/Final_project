const TOKEN_STORAGE_KEY = "vibetune_spotify_tokens"
const STATE_STORAGE_KEY = "vibetune_spotify_oauth_state"

interface StoredTokens {
  accessToken: string
  refreshToken: string | null
  expiresAt: number
  tokenType: string
  scope?: string
}

interface SpotifyUserProfile {
  id: string
  display_name: string
  email?: string
  product?: string
  images?: Array<{ url: string }>
}

const readTokens = (): StoredTokens | null => {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(TOKEN_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredTokens
  } catch (error) {
    console.warn("[SpotifyAuthService] Failed to parse stored tokens", error)
    return null
  }
}

const writeTokens = (tokens: StoredTokens | null) => {
  if (typeof window === "undefined") return
  if (!tokens) {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    return
  }
  window.localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens))
}

const readState = (): string | null => {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(STATE_STORAGE_KEY)
}

const writeState = (state: string | null) => {
  if (typeof window === "undefined") return
  if (!state) {
    window.localStorage.removeItem(STATE_STORAGE_KEY)
  } else {
    window.localStorage.setItem(STATE_STORAGE_KEY, state)
  }
}

class SpotifyAuthServiceImpl {
  private static instance: SpotifyAuthServiceImpl

  static getInstance(): SpotifyAuthServiceImpl {
    if (!SpotifyAuthServiceImpl.instance) {
      SpotifyAuthServiceImpl.instance = new SpotifyAuthServiceImpl()
    }
    return SpotifyAuthServiceImpl.instance
  }

  isAuthenticated(): boolean {
    const tokens = readTokens()
    if (!tokens) return false
    return tokens.expiresAt > Date.now()
  }

  async beginAuth(): Promise<boolean> {
    if (typeof window === "undefined") {
      return false
    }

    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
    const redirectUri =
      process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI ??
      `${window.location.origin}/callback`

    if (!clientId) {
      console.warn("[SpotifyAuthService] Missing NEXT_PUBLIC_SPOTIFY_CLIENT_ID")
      return false
    }

    const scopes = [
      "user-read-email",
      "user-read-private",
      "user-read-playback-state",
      "user-modify-playback-state",
      "playlist-read-private",
      "playlist-modify-private",
      "playlist-modify-public",
    ]

    const state = crypto.randomUUID()
    writeState(state)

    const authorizeUrl = new URL("https://accounts.spotify.com/authorize")
    authorizeUrl.searchParams.set("client_id", clientId)
    authorizeUrl.searchParams.set("response_type", "code")
    authorizeUrl.searchParams.set("redirect_uri", redirectUri)
    authorizeUrl.searchParams.set("scope", scopes.join(" "))
    authorizeUrl.searchParams.set("state", state)
    authorizeUrl.searchParams.set("show_dialog", "true")

    window.location.href = authorizeUrl.toString()
    return true
  }

  async handleCallback(code: string, state: string): Promise<boolean> {
    if (typeof window === "undefined") return false

    const storedState = readState()
    if (!storedState || storedState !== state) {
      console.warn("[SpotifyAuthService] State mismatch during callback")
      return false
    }

    writeState(null)

    try {
      const redirectUri =
        process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI ??
        `${window.location.origin}/callback`

      const response = await fetch("/api/auth/spotify/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          redirect_uri: redirectUri,
        }),
      })

      if (!response.ok) {
        console.error("[SpotifyAuthService] Token exchange failed", response.status)
        return false
      }

      const payload = await response.json()
      const expiresIn = payload.expires_in ?? 3600
      const expiresAt = Date.now() + expiresIn * 1000

      const tokens: StoredTokens = {
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token ?? null,
        expiresAt,
        tokenType: payload.token_type ?? "Bearer",
        scope: payload.scope,
      }

      writeTokens(tokens)
      return true
    } catch (error) {
      console.error("[SpotifyAuthService] handleCallback error:", error)
      return false
    }
  }

  async getAccessToken(): Promise<string | null> {
    const tokens = readTokens()
    if (!tokens) {
      return null
    }

    if (tokens.expiresAt > Date.now() + 60_000) {
      return tokens.accessToken
    }

    if (!tokens.refreshToken) {
      return null
    }

    try {
      const response = await fetch("/api/auth/spotify/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refresh_token: tokens.refreshToken,
        }),
      })

      if (!response.ok) {
        console.error("[SpotifyAuthService] Refresh token failed", response.status)
        return null
      }

      const payload = await response.json()
      const expiresIn = payload.expires_in ?? 3600
      const updatedTokens: StoredTokens = {
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token ?? tokens.refreshToken,
        expiresAt: Date.now() + expiresIn * 1000,
        tokenType: payload.token_type ?? tokens.tokenType,
        scope: payload.scope ?? tokens.scope,
      }

      writeTokens(updatedTokens)
      return updatedTokens.accessToken
    } catch (error) {
      console.error("[SpotifyAuthService] getAccessToken error:", error)
      return null
    }
  }

  async getUserProfile(): Promise<SpotifyUserProfile | null> {
    const token = await this.getAccessToken()
    if (!token) {
      return null
    }

    try {
      const response = await fetch("https://api.spotify.com/v1/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        console.warn("[SpotifyAuthService] Failed to load user profile", response.status)
        return null
      }

      return (await response.json()) as SpotifyUserProfile
    } catch (error) {
      console.error("[SpotifyAuthService] getUserProfile error:", error)
      return null
    }
  }

  async hasPremium(): Promise<boolean> {
    const profile = await this.getUserProfile()
    if (!profile) return false
    return profile.product?.toLowerCase() === "premium"
  }

  logout() {
    writeTokens(null)
  }
}

export const SpotifyAuthService = SpotifyAuthServiceImpl

