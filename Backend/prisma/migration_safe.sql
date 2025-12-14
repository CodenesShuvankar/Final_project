-- Safe Migration: Add Prisma schema to Supabase
-- This version checks for existing objects before creating them

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PLAYLISTS TABLE (Enhanced)
-- =============================================
CREATE TABLE IF NOT EXISTS public.playlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    cover_url TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON public.playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_created_at ON public.playlists(created_at DESC);

-- =============================================
-- PLAYLIST SONGS TABLE (Enhanced)
-- =============================================
CREATE TABLE IF NOT EXISTS public.playlist_songs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
    song_id TEXT NOT NULL,
    song_name TEXT NOT NULL,
    artist_name TEXT NOT NULL,
    album_name TEXT,
    duration_ms INTEGER,
    image_url TEXT,
    spotify_url TEXT,
    preview_url TEXT,
    position INTEGER DEFAULT 0,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint only if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'playlist_songs_playlist_id_song_id_key'
    ) THEN
        ALTER TABLE public.playlist_songs 
        ADD CONSTRAINT playlist_songs_playlist_id_song_id_key UNIQUE(playlist_id, song_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_playlist_songs_playlist_id ON public.playlist_songs(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_added_at ON public.playlist_songs(added_at DESC);

-- =============================================
-- LISTENING HISTORY TABLE (NEW)
-- =============================================
CREATE TABLE IF NOT EXISTS public.listening_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    song_id TEXT NOT NULL,
    song_name TEXT NOT NULL,
    artist_name TEXT NOT NULL,
    album_name TEXT,
    image_url TEXT,
    spotify_url TEXT,
    played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_ms INTEGER,
    completed BOOLEAN DEFAULT false,
    mood_detected TEXT
);

CREATE INDEX IF NOT EXISTS idx_history_user_id ON public.listening_history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_played_at ON public.listening_history(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_user_played ON public.listening_history(user_id, played_at DESC);

-- =============================================
-- MOOD ANALYSIS TABLE (NEW)
-- =============================================
CREATE TABLE IF NOT EXISTS public.mood_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    detected_mood TEXT NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    voice_emotion TEXT,
    voice_confidence DOUBLE PRECISION,
    face_emotion TEXT,
    face_confidence DOUBLE PRECISION,
    agreement TEXT,
    analysis_type TEXT NOT NULL,
    valence_score TEXT,
    arousal_score TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mood_user_id ON public.mood_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_created_at ON public.mood_analysis(created_at DESC);

-- =============================================
-- LIKED SONGS TABLE (NEW)
-- =============================================
CREATE TABLE IF NOT EXISTS public.liked_songs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    song_id TEXT NOT NULL,
    song_name TEXT NOT NULL,
    artist_name TEXT NOT NULL,
    album_name TEXT,
    image_url TEXT,
    spotify_url TEXT,
    duration_ms INTEGER,
    liked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint only if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'liked_songs_user_id_song_id_key'
    ) THEN
        ALTER TABLE public.liked_songs 
        ADD CONSTRAINT liked_songs_user_id_song_id_key UNIQUE(user_id, song_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_liked_songs_user_id ON public.liked_songs(user_id);
CREATE INDEX IF NOT EXISTS idx_liked_songs_liked_at ON public.liked_songs(liked_at DESC);
CREATE INDEX IF NOT EXISTS idx_liked_songs_user_song ON public.liked_songs(user_id, song_id);

-- =============================================
-- USER PREFERENCES TABLE (NEW)
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'system',
    auto_mood_detection BOOLEAN DEFAULT false,
    explicit_content BOOLEAN DEFAULT true,
    preferred_genres TEXT[],
    language_priorities TEXT[],
    profile_photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add language_priorities column if it doesn't exist (for existing tables)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_preferences' 
        AND column_name = 'language_priorities'
    ) THEN
        ALTER TABLE public.user_preferences 
        ADD COLUMN language_priorities TEXT[];
        RAISE NOTICE '✅ Added language_priorities column to user_preferences table';
    ELSE
        RAISE NOTICE 'ℹ️ language_priorities column already exists in user_preferences table';
    END IF;
END $$;

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Playlists RLS
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own playlists" ON public.playlists;
CREATE POLICY "Users can view own playlists"
ON public.playlists FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own playlists" ON public.playlists;
CREATE POLICY "Users can create own playlists"
ON public.playlists FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own playlists" ON public.playlists;
CREATE POLICY "Users can update own playlists"
ON public.playlists FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own playlists" ON public.playlists;
CREATE POLICY "Users can delete own playlists"
ON public.playlists FOR DELETE
USING (auth.uid() = user_id);

-- Playlist Songs RLS
ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view songs in own playlists" ON public.playlist_songs;
CREATE POLICY "Users can view songs in own playlists"
ON public.playlist_songs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.playlists
        WHERE playlists.id = playlist_songs.playlist_id
        AND playlists.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can add songs to own playlists" ON public.playlist_songs;
CREATE POLICY "Users can add songs to own playlists"
ON public.playlist_songs FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.playlists
        WHERE playlists.id = playlist_songs.playlist_id
        AND playlists.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can delete songs from own playlists" ON public.playlist_songs;
CREATE POLICY "Users can delete songs from own playlists"
ON public.playlist_songs FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.playlists
        WHERE playlists.id = playlist_songs.playlist_id
        AND playlists.user_id = auth.uid()
    )
);

-- Listening History RLS
ALTER TABLE public.listening_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own history" ON public.listening_history;
CREATE POLICY "Users can view own history"
ON public.listening_history FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own history" ON public.listening_history;
CREATE POLICY "Users can create own history"
ON public.listening_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own history" ON public.listening_history;
CREATE POLICY "Users can delete own history"
ON public.listening_history FOR DELETE
USING (auth.uid() = user_id);

-- Mood Analysis RLS
ALTER TABLE public.mood_analysis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own mood analysis" ON public.mood_analysis;
CREATE POLICY "Users can view own mood analysis"
ON public.mood_analysis FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own mood analysis" ON public.mood_analysis;
CREATE POLICY "Users can create own mood analysis"
ON public.mood_analysis FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- User Preferences RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
CREATE POLICY "Users can view own preferences"
ON public.user_preferences FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own preferences" ON public.user_preferences;
CREATE POLICY "Users can create own preferences"
ON public.user_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
CREATE POLICY "Users can update own preferences"
ON public.user_preferences FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Liked Songs RLS
ALTER TABLE public.liked_songs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own liked songs" ON public.liked_songs;
CREATE POLICY "Users can view own liked songs"
ON public.liked_songs FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add own liked songs" ON public.liked_songs;
CREATE POLICY "Users can add own liked songs"
ON public.liked_songs FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own liked songs" ON public.liked_songs;
CREATE POLICY "Users can delete own liked songs"
ON public.liked_songs FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers (DROP first to avoid conflicts)
DROP TRIGGER IF EXISTS update_playlists_updated_at ON public.playlists;
CREATE TRIGGER update_playlists_updated_at
BEFORE UPDATE ON public.playlists
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER update_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- GRANT PERMISSIONS
-- =============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.playlists TO authenticated;
GRANT ALL ON public.playlist_songs TO authenticated;
GRANT ALL ON public.listening_history TO authenticated;
GRANT ALL ON public.mood_analysis TO authenticated;
GRANT ALL ON public.user_preferences TO authenticated;
GRANT ALL ON public.liked_songs TO authenticated;

GRANT SELECT ON public.playlists TO anon;
GRANT SELECT ON public.playlist_songs TO anon;

-- =============================================
-- COMPLETION MESSAGE
-- =============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE 'Created tables: playlists, playlist_songs, listening_history, mood_analysis, user_preferences, liked_songs';
    RAISE NOTICE 'RLS policies enabled for all tables';
    RAISE NOTICE 'Triggers configured for updated_at columns';
END $$;
