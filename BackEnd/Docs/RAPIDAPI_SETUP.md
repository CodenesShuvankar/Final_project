# 🎵 RapidAPI Spotify Integration - Complete Setup

## ✅ What Changed

**Switched from Official Spotify API → RapidAPI Spotify**

### Why RapidAPI?
- ✅ **No OAuth required** - Just one API key
- ✅ **Simpler setup** - No Client ID/Secret dance
- ✅ **Easier to use** - Direct REST API calls
- ✅ **Your code reference** - Matches your existing implementation

---

## 🚀 Quick Setup (2 minutes)

### Step 1: Get RapidAPI Key
1. Go to: https://rapidapi.com/Glavier/api/spotify81
2. Click **"Subscribe to Test"**
3. Choose a plan (Free tier available)
4. Copy your **API Key**

### Step 2: Update .env File
Your `.env` already has the structure, just update the key if needed:

```env
RAPIDAPI_KEY=c1fc65f563mshc74c0c259f2c4bap182e0bjsn4f0c0ec78084
RAPIDAPI_HOST=spotify81.p.rapidapi.com
RAPIDAPI_URL=https://spotify81.p.rapidapi.com
```

### Step 3: Install Requirements (if needed)
```bash
pip install requests python-dotenv
```

### Step 4: Test It
```bash
python test_rapidapi.py
```

### Step 5: Start Server
```bash
python -m uvicorn server_api:app --reload
```

---

## 📡 API Endpoints (Same as Before)

### 1. General Recommendations (Home Page)
```http
GET http://127.0.0.1:8000/recommendations?limit=20
```

### 2. Mood-Based Recommendations
```http
GET http://127.0.0.1:8000/recommendations/mood/happy?limit=20
```

### 3. Search
```http
GET http://127.0.0.1:8000/spotify/search?query=happy%20songs&limit=10
```

---

## 🎯 How It Works Now

### Emotion → Query Mapping
```python
EMOTION_TO_QUERY = {
    'happy': 'happy upbeat songs',
    'sad': 'sad emotional songs',
    'angry': 'angry rock metal songs',
    'calm': 'relaxing calm songs',
    'excited': 'energetic party songs',
    # ... etc
}
```

When you request `/recommendations/mood/happy`:
1. Maps "happy" → "happy upbeat songs"
2. Calls RapidAPI: `https://spotify81.p.rapidapi.com/search?q=happy upbeat songs`
3. Parses and returns track data

---

## 🧪 Testing

### Automated Test
```bash
python test_rapidapi.py
```

Expected output:
```
✓ RAPIDAPI_KEY found
✓ Found 5 tracks
✓ Got 5 general recommendations
✓ Happy: 3 recommendations
✓ Sad: 3 recommendations
✅ All tests passed!
```

### Manual Test via Browser
```
http://127.0.0.1:8000/docs
```
Then try the endpoints interactively!

### Test with curl
```bash
# Test mood recommendations
curl "http://127.0.0.1:8000/recommendations/mood/happy?limit=5"

# Test search
curl "http://127.0.0.1:8000/spotify/search?query=coldplay&limit=5"

# Test general recommendations
curl "http://127.0.0.1:8000/recommendations?limit=10"
```

---

## 📦 What's in the Response

```json
{
  "success": true,
  "mood": "happy",
  "count": 20,
  "recommendations": [
    {
      "id": "spotify_track_id",
      "name": "Happy Song",
      "artists": ["Artist Name"],
      "album": "Album Name",
      "duration_ms": 240000,
      "preview_url": "spotify:track:...",
      "external_url": "https://open.spotify.com/track/...",
      "image_url": "https://i.scdn.co/image/...",
      "popularity": 0,
      "mood": "happy"
    }
  ]
}
```

---

## 🔧 Customization

### Add More Emotions
Edit `services/spotify_service.py`:

```python
EMOTION_TO_QUERY = {
    'your_emotion': 'search query for that emotion',
    'relaxed': 'chill relaxing music',
    'energetic': 'high energy workout songs',
    # ... add more
}
```

### Adjust Search Queries
Fine-tune the queries for better results:

```python
'happy': 'upbeat pop dance happy songs',  # More specific
'sad': 'emotional sad ballads piano',     # More keywords
```

---

## 🐛 Troubleshooting

### "RAPIDAPI_KEY not found"
- Check `.env` file exists in `BackEnd/` folder
- Make sure no extra spaces: `RAPIDAPI_KEY=your_key` (no spaces around =)
- Restart the server after changing .env

### "401 Unauthorized"
- Your API key might be invalid
- Check you're subscribed to the API on RapidAPI
- Verify the key in your RapidAPI dashboard

### "No results found"
- Check your internet connection
- Verify the API is working: https://rapidapi.com/Glavier/api/spotify81
- Try a different search query

### Rate Limiting
- Free tier: 500 requests/month
- Basic tier: 10,000 requests/month
- Consider caching responses for popular queries

---

## 💡 Pro Tips

1. **Cache Responses**: Store mood recommendations for 5-10 minutes
2. **Fallback Queries**: If mood query fails, fallback to generic search
3. **Error Handling**: Always check `success: true` in response
4. **Limit Wisely**: Don't request 100 songs at once, 20 is good

---

## 📊 Comparison: Before vs After

| Feature | Old (Official API) | New (RapidAPI) |
|---------|-------------------|----------------|
| Setup | OAuth + Client ID + Secret | Just API Key |
| Auth | Complex token flow | Simple header |
| Code | ~200 lines | ~150 lines |
| Dependencies | spotipy | requests (standard) |
| Rate Limits | 180/min | 500/month (free) |
| Maintenance | Complex | Simple |

---

## 🎉 You're Ready!

Your Spotify integration is now:
- ✅ Simpler
- ✅ Based on your reference code
- ✅ Using RapidAPI (no OAuth headaches)
- ✅ Easy to maintain

**Just run:**
```bash
python -m uvicorn server_api:app --reload
```

And test:
```bash
curl "http://127.0.0.1:8000/recommendations/mood/happy?limit=20"
```

🚀 **Enjoy your music recommendations!**
