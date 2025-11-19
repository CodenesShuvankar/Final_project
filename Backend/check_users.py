import asyncio
from database import db
import os
from dotenv import load_dotenv

load_dotenv()

async def check_all_users():
    await db.connect()
    
    # Get all unique user IDs from listening history
    lh_all = await db.listeninghistory.find_many()
    lh_users = set(entry.user_id for entry in lh_all)
    
    # Get all unique user IDs from mood analysis
    ma_all = await db.moodanalysis.find_many()
    ma_users = set(entry.user_id for entry in ma_all)
    
    print(f'\n👥 USER DATA REPORT')
    print(f'=' * 60)
    print(f'Total listening history entries: {len(lh_all)}')
    print(f'Total mood analysis entries: {len(ma_all)}')
    print(f'Unique users with listening history: {len(lh_users)}')
    print(f'Unique users with mood analysis: {len(ma_users)}')
    
    print(f'\n📋 USERS WITH LISTENING HISTORY:')
    for user_id in lh_users:
        user_entries = [e for e in lh_all if e.user_id == user_id]
        print(f'  User {user_id[:8]}...: {len(user_entries)} songs')
        # Show latest 2
        for entry in sorted(user_entries, key=lambda x: x.played_at, reverse=True)[:2]:
            print(f'    - {entry.song_name} by {entry.artist_name}')
    
    print(f'\n😊 USERS WITH MOOD ANALYSIS:')
    for user_id in ma_users:
        user_moods = [m for m in ma_all if m.user_id == user_id]
        print(f'  User {user_id[:8]}...: {len(user_moods)} detections')
        # Show latest 2
        for mood in sorted(user_moods, key=lambda x: x.created_at, reverse=True)[:2]:
            print(f'    - {mood.detected_mood} ({mood.confidence:.1%}) - {mood.analysis_type}')
    
    await db.disconnect()

if __name__ == '__main__':
    asyncio.run(check_all_users())
