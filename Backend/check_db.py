import asyncio
from database import db

async def check_data():
    await db.connect()
    
    # Check listening history
    lh = await db.listeninghistory.find_many(
        take=10,
        order={'played_at': 'desc'}
    )
    
    # Check mood analysis
    ma = await db.moodanalysis.find_many(
        take=10,
        order={'created_at': 'desc'}
    )
    
    print(f'\n📊 DATABASE CHECK')
    print(f'=' * 50)
    print(f'Listening history entries: {len(lh)}')
    print(f'Mood analysis entries: {len(ma)}')
    
    if lh:
        print(f'\n🎵 Latest listening history:')
        for i, entry in enumerate(lh[:5], 1):
            print(f'  {i}. {entry.song_name} by {entry.artist_name}')
            print(f'     User: {entry.user_id[:8]}... | Mood: {entry.mood_detected or "N/A"}')
    else:
        print('\n⚠️  NO listening history found!')
    
    if ma:
        print(f'\n😊 Latest mood detections:')
        for i, mood in enumerate(ma[:5], 1):
            print(f'  {i}. {mood.detected_mood} ({mood.confidence:.2%})')
            print(f'     User: {mood.user_id[:8]}... | Type: {mood.analysis_type}')
    else:
        print('\n⚠️  NO mood analysis found!')
    
    await db.disconnect()

if __name__ == '__main__':
    asyncio.run(check_data())
