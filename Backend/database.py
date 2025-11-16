"""
Prisma Database Client
Singleton instance for database operations
"""
from prisma import Prisma
from contextlib import asynccontextmanager
import logging
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

# Global Prisma client instance
db = Prisma(auto_register=True)

# Initialize Supabase client for direct queries
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

if not supabase:
    logger.warning("⚠️ Supabase client not initialized - missing SUPABASE_URL or SUPABASE_KEY")

@asynccontextmanager
async def get_db():
    """
    Context manager for database connection
    Usage:
        async with get_db() as db:
            users = await db.user.find_many()
    """
    if not db.is_connected():
        await db.connect()
    try:
        yield db
    finally:
        pass  # Keep connection alive for reuse

async def connect_db():
    """Connect to database"""
    if not db.is_connected():
        await db.connect()
        logger.info("✅ Connected to database via Prisma")

async def disconnect_db():
    """Disconnect from database"""
    if db.is_connected():
        await db.disconnect()
        logger.info("👋 Disconnected from database")
