import asyncio
from database import db

async def show_user_details():
    await db.connect()
    
    # Get all data
    lh_all = await db.listeninghistory.find_many(order={'played_at': 'desc'})
    ma_all = await db.moodanalysis.find_many(order={'created_at': 'desc'})
    
    # Get unique users
    lh_users = {}
    for entry in lh_all:
        if entry.user_id not in lh_users:
            lh_users[entry.user_id] = []
        lh_users[entry.user_id].append(entry)
    
    ma_users = {}
    for mood in ma_all:
        if mood.user_id not in ma_users:
            ma_users[mood.user_id] = []
        ma_users[mood.user_id].append(mood)
    
    print(f'\n📊 DETAILED USER REPORT')
    print(f'=' * 70)
    
    all_user_ids = set(list(lh_users.keys()) + list(ma_users.keys()))
    
    for user_id in all_user_ids:
        print(f'\n👤 User ID: {user_id}')
        print(f'-' * 70)
        
        if user_id in lh_users:
            songs = lh_users[user_id]
            print(f'🎵 Listening History: {len(songs)} songs')
            print(f'   Latest 5 songs:')
            for i, song in enumerate(songs[:5], 1):
                print(f'     {i}. {song.song_name} by {song.artist_name}')
                print(f'        Played: {song.played_at} | Mood: {song.mood_detected or "N/A"}')
        else:
            print(f'🎵 Listening History: 0 songs (NO DATA)')
        
        if user_id in ma_users:
            moods = ma_users[user_id]
            print(f'\n😊 Mood Detections: {len(moods)} detections')
            print(f'   Latest 5 moods:')
            for i, mood in enumerate(moods[:5], 1):
                print(f'     {i}. {mood.detected_mood} ({mood.confidence:.1%})')
                print(f'        Type: {mood.analysis_type} | Voice: {mood.voice_emotion} | Face: {mood.face_emotion}')
                print(f'        Created: {mood.created_at}')
        else:
            print(f'\n😊 Mood Detections: 0 detections (NO DATA)')
        
        print()
    
    print(f'\n💡 SOLUTION:')
    print(f'=' * 70)
    print(f'If you want to see your listening history and analytics:')
    print(f'1. Check which user you are currently logged in as')
    print(f'2. Play songs and detect moods while logged in with THAT user')
    print(f'3. The data will be associated with your current user ID')
    print()
    
    await db.disconnect()

if __name__ == '__main__':
    asyncio.run(show_user_details())
