/**
 * Language filtering utility for Spotify tracks
 * 
 * Filters tracks based on user's language preferences by checking
 * track names and artist names for language-specific characters
 */

interface Track {
  name: string;
  artists: string[];
  [key: string]: any;
}

// Language character detection patterns
const LANGUAGE_PATTERNS = {
  Bengali: /[\u0980-\u09FF]/,
  Hindi: /[\u0900-\u097F]/,
  Tamil: /[\u0B80-\u0BFF]/,
  Telugu: /[\u0C00-\u0C7F]/,
  Kannada: /[\u0C80-\u0CFF]/,
  Malayalam: /[\u0D00-\u0D7F]/,
  Gujarati: /[\u0A80-\u0AFF]/,
  Punjabi: /[\u0A00-\u0A7F]/,
  Marathi: /[\u0900-\u097F]/, // Same as Hindi (Devanagari script)
  Urdu: /[\u0600-\u06FF]/,
  Korean: /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/,
  Japanese: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/,
  Chinese: /[\u4E00-\u9FFF]/,
  Arabic: /[\u0600-\u06FF]/,
  Thai: /[\u0E00-\u0E7F]/,
  Russian: /[\u0400-\u04FF]/,
  Greek: /[\u0370-\u03FF]/,
  Hebrew: /[\u0590-\u05FF]/,
  // English uses Latin script, detected by absence of other scripts
  English: /^[a-zA-Z0-9\s\-.,!?'":()&]+$/,
};

// Common language keywords/terms to help identify songs
const LANGUAGE_KEYWORDS: Record<string, string[]> = {
  Bengali: ['bangla', 'bengali', 'kolkata', 'dhaka'],
  Hindi: ['hindi', 'bollywood', 'mumbai', 'desi'],
  Tamil: ['tamil', 'kollywood', 'chennai'],
  Telugu: ['telugu', 'tollywood', 'hyderabad'],
  Kannada: ['kannada', 'sandalwood', 'bangalore'],
  Malayalam: ['malayalam', 'mollywood', 'kerala'],
  Punjabi: ['punjabi', 'bhangra'],
  Korean: ['korean', 'k-pop', 'kpop', 'seoul'],
  Japanese: ['japanese', 'j-pop', 'jpop', 'anime'],
  Spanish: ['spanish', 'latino', 'latina', 'reggaeton', 'español'],
  French: ['french', 'français', 'francais'],
};

/**
 * Detect the primary language of a track based on its name and artists
 */
export function detectTrackLanguage(track: Track): string {
  const textToCheck = `${track.name} ${track.artists.join(' ')}`.toLowerCase();
  
  // Check for non-Latin scripts first (more specific)
  for (const [language, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
    if (language === 'English') continue; // Skip English for now
    if (pattern.test(track.name) || track.artists.some(artist => pattern.test(artist))) {
      return language;
    }
  }
  
  // Check for language keywords
  for (const [language, keywords] of Object.entries(LANGUAGE_KEYWORDS)) {
    if (keywords.some(keyword => textToCheck.includes(keyword))) {
      return language;
    }
  }
  
  // Default to English if all text is Latin script
  if (LANGUAGE_PATTERNS.English.test(track.name)) {
    return 'English';
  }
  
  // Unknown if we can't determine
  return 'Unknown';
}

/**
 * Check if a track matches any of the preferred languages
 */
export function matchesLanguagePreference(
  track: Track,
  preferredLanguages: string[]
): boolean {
  // If no preferences set, allow all
  if (!preferredLanguages || preferredLanguages.length === 0) {
    return true;
  }
  
  const trackLanguage = detectTrackLanguage(track);
  
  // Allow if track language matches any preferred language
  // Also allow Unknown tracks (could be instrumental or unable to detect)
  return (
    preferredLanguages.some(
      lang => lang.toLowerCase() === trackLanguage.toLowerCase()
    ) ||
    trackLanguage === 'Unknown'
  );
}

/**
 * Filter an array of tracks by language preferences
 */
export function filterTracksByLanguage<T extends Track>(
  tracks: T[],
  preferredLanguages: string[]
): T[] {
  // If no preferences, return all tracks
  if (!preferredLanguages || preferredLanguages.length === 0) {
    return tracks;
  }
  
  const filtered = tracks.filter(track => 
    matchesLanguagePreference(track, preferredLanguages)
  );
  
  // Log filtering results for debugging
  if (filtered.length < tracks.length) {
    const removedCount = tracks.length - filtered.length;
    console.log(
      `🌍 Language filter: Removed ${removedCount} songs not matching preferences [${preferredLanguages.join(', ')}]`
    );
  }
  
  return filtered;
}

/**
 * Get language distribution of tracks
 * Useful for debugging and showing user what languages are present
 */
export function getLanguageDistribution(tracks: Track[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  
  for (const track of tracks) {
    const language = detectTrackLanguage(track);
    distribution[language] = (distribution[language] || 0) + 1;
  }
  
  return distribution;
}
