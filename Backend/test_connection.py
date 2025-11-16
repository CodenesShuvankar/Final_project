"""
Test database connection and Prisma setup
"""
import asyncio
import sys
from database import db, connect_db, disconnect_db

async def test_connection():
    """Test Prisma database connection"""
    try:
        print("🔌 Attempting to connect to database...")
        await connect_db()
        print("✅ Successfully connected to database!")
        
        # Try a simple query
        print("\n📊 Testing database query...")
        user_count = await db.user.count()
        print(f"✅ Found {user_count} users in the database")
        
        # Test playlists table
        playlist_count = await db.playlist.count()
        print(f"✅ Found {playlist_count} playlists in the database")
        
        # Test history table
        history_count = await db.listeninghistory.count()
        print(f"✅ Found {history_count} listening history entries")
        
        print("\n🎉 All tests passed! Database is properly connected.")
        return True
        
    except Exception as e:
        print(f"\n❌ Connection test failed: {e}")
        print("\n🔧 Troubleshooting:")
        print("1. Check DATABASE_URL in .env file")
        print("2. Make sure you ran the migration.sql in Supabase SQL Editor")
        print("3. Verify prisma generate was run successfully")
        return False
    finally:
        await disconnect_db()

if __name__ == "__main__":
    result = asyncio.run(test_connection())
    sys.exit(0 if result else 1)
