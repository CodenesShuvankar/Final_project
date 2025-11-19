# Language Filtering Feature

## Overview

The language filtering feature automatically filters Spotify search results and recommendations to match the user's preferred languages. This ensures users only see songs in languages they understand and enjoy.

## How It Works

### 1. Language Detection

The system detects song languages using two methods:

**Character-based Detection:**
- Uses Unicode ranges to identify non-Latin scripts (Bengali, Hindi, Korean, Japanese, Chinese, Arabic, etc.)
- Checks both song names and artist names for language-specific characters
- Most accurate for languages with unique character sets

**Keyword-based Detection:**
- Identifies languages through keywords like "bollywood", "k-pop", "hindi", "tamil", etc.
- Useful for songs with Latin script titles but specific language associations
- Covers cases where the language isn't obvious from characters alone

**English Detection:**
- Songs with purely Latin characters are classified as English
- Default fallback for songs that can't be classified

### 2. User Preferences

Users set their language preferences in their profile settings:

```typescript
{
  language_priorities: ['Bengali', 'English', 'Hindi']
}
```

The first language in the array is the primary language used for backend recommendations.

### 3. Filtering Pipeline

**Backend Level:**
```
User searches → Backend receives language param → Spotify API searches with language keywords → Returns language-specific results
```

**Frontend Level:**
```
Backend results → Language detection on each track → Filter by user preferences → Display filtered results
```

This dual-layer approach ensures maximum filtering accuracy.

## Supported Languages

### Indian Languages
- Bengali (বাংলা) - Unicode range: 0980-09FF
- Hindi (हिन्दी) - Unicode range: 0900-097F
- Tamil (தமிழ்) - Unicode range: 0B80-0BFF
- Telugu (తెలుగు) - Unicode range: 0C00-0C7F
- Kannada (ಕನ್ನಡ) - Unicode range: 0C80-0CFF
- Malayalam (മലയാളം) - Unicode range: 0D00-0D7F
- Gujarati (ગુજરાતી) - Unicode range: 0A80-0AFF
- Punjabi (ਪੰਜਾਬੀ) - Unicode range: 0A00-0A7F
- Marathi (मराठी) - Unicode range: 0900-097F (Devanagari)
- Urdu (اردو) - Unicode range: 0600-06FF

### International Languages
- Korean (한국어) - Unicode ranges: AC00-D7AF, 1100-11FF, 3130-318F
- Japanese (日本語) - Unicode ranges: 3040-309F, 30A0-30FF, 4E00-9FAF
- Chinese (中文) - Unicode range: 4E00-9FFF
- Arabic (العربية) - Unicode range: 0600-06FF
- Thai (ภาษาไทย) - Unicode range: 0E00-0E7F
- Russian (Русский) - Unicode range: 0400-04FF
- Greek (Ελληνικά) - Unicode range: 0370-03FF
- Hebrew (עברית) - Unicode range: 0590-05FF
- English and other Latin-script languages

## Implementation

### Files Created/Modified

**Created:**
- `Frontend/src/lib/utils/languageFilter.ts` - Core language detection and filtering logic
- `Frontend/src/lib/utils/__tests__/languageFilter.test.ts` - Unit tests

**Modified:**
- `Frontend/src/lib/services/spotify.ts` - Added language filtering to search and recommendations
- `Frontend/src/app/(main)/page.tsx` - Added language filtering to main page (trending, mood, recent)
- `Frontend/src/app/(main)/search/page.tsx` - Added language filtering to search results

### API Integration

The backend Spotify service already supports language parameters:

```python
# Backend: server_api.py
@app.get("/recommendations")
async def get_recommendations(limit: int = 20, language: str = None):
    recommendations = spotify_service.get_general_recommendations(limit, language)
    # Returns language-specific recommendations

@app.get("/recommendations/mood/{mood}")
async def get_mood_recommendations(mood: str, limit: int = 20, language: str = None):
    search_mood = f"{mood} {language}" if language else mood
    recommendations = spotify_service.get_mood_recommendations(search_mood, limit)
    # Returns mood + language specific recommendations
```

Frontend passes language preferences to these endpoints and applies additional client-side filtering.

## Usage Examples

### Main Page - Trending Section
```typescript
// Automatically loads user's language preferences
const preferences = await loadUserInterests();
// preferences.language_priorities = ['Bengali', 'English']

// Fetches trending songs in Bengali
await fetchTrending(['Bengali', 'English']);
// Backend returns Bengali songs + English fallback

// Client-side filtering ensures only preferred languages
const filtered = filterTracksByLanguage(tracks, ['Bengali', 'English']);
```

### Search Page
```typescript
// User searches for "romantic songs"
const result = await spotifyService.searchMusic('romantic songs', 20, ['Hindi', 'English']);
// Returns Hindi and English romantic songs

// Filters out any Korean, Spanish, or other language songs
// that might have been returned
```

### Recently Played
```typescript
// User's listening history is filtered by their preferences
let tracks = fetchListeningHistory();
// Before: [Bengali song, English song, Korean song, Hindi song, Spanish song]

tracks = filterTracksByLanguage(tracks, ['Bengali', 'English']);
// After: [Bengali song, English song]
```

## Debugging

The system includes extensive console logging:

```
🌍 Filtering search results by languages: ['Bengali', 'English']
🌍 Language filter: 20 → 15 tracks
📊 Language distribution: { Bengali: 8, English: 7 }
```

Language distribution shows how many songs of each language were found, helping users understand their results.

## Edge Cases

**Instrumental/Unknown Tracks:**
- Songs that can't be classified are marked as "Unknown"
- Unknown tracks are **allowed** through filters (could be instrumental)
- Prevents over-filtering of legitimate content

**Multi-language Songs:**
- Detected based on first identifiable language
- Example: "Dil Dhadakne Do" (Hindi title) by "A.R. Rahman" → Hindi

**Romanized Titles:**
- "Tum Hi Ho" (Latin script but Hindi keyword "bollywood") → Detected as Hindi
- "Gangnam Style" (Latin but contains Korean artist) → Detected as Korean

**No Preferences Set:**
- If user hasn't set language preferences, **no filtering** occurs
- All songs from Spotify API are shown
- Default fallback: ['English']

## Performance

**Client-side filtering:**
- O(n) complexity where n = number of tracks
- Unicode regex matching is fast (< 1ms per track)
- Minimal performance impact even with 100+ tracks

**Backend integration:**
- Language parameter added to search query improves relevance
- Reduces need for aggressive client-side filtering
- Better user experience with fewer irrelevant results

## Future Enhancements

1. **Machine Learning Detection:**
   - Train model on song metadata to detect language more accurately
   - Handle edge cases like bilingual songs better

2. **User Feedback:**
   - Allow users to mark incorrect language detection
   - Improve detection algorithm based on user corrections

3. **Language Distribution UI:**
   - Show users language breakdown of results
   - Visual indicator: "15 Bengali songs, 5 English songs found"

4. **Auto-detect from History:**
   - Analyze user's listening history to auto-suggest language preferences
   - "We noticed you listen to a lot of Tamil music. Add it to preferences?"

5. **Regional Variants:**
   - Support regional language variants (Mexican Spanish vs. Spanish Spanish)
   - Dialect-specific filtering for languages like Chinese (Mandarin vs. Cantonese)

## Testing

Run the test suite:

```bash
npm test -- languageFilter.test.ts
```

Tests cover:
- Character-based detection for all supported languages
- Keyword-based detection
- Preference matching logic
- Filter function with various preference combinations
- Edge cases (empty preferences, unknown languages)

## Configuration

No configuration needed! The feature works automatically based on:
1. User's language preferences from profile settings
2. Default fallback to English if no preferences set
3. Automatic language detection on all Spotify results

Users can update their language preferences in:
```
Profile → Settings → Language Preferences
```
