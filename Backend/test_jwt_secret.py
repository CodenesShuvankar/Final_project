"""
Test script to verify Supabase JWT secret configuration
Run this to check if your JWT secret is correctly configured
"""
import os
import jwt
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_jwt_secret():
    """Test if the JWT secret can decode a Supabase token"""
    
    supabase_anon_key = os.getenv('SUPABASE_ANON_KEY')
    jwt_secret = os.getenv('SUPABASE_JWT_SECRET')
    
    print("=" * 60)
    print("JWT SECRET VERIFICATION TEST")
    print("=" * 60)
    
    if not jwt_secret:
        print("❌ SUPABASE_JWT_SECRET not found in .env")
        return
    
    print(f"✅ JWT Secret found (length: {len(jwt_secret)} chars)")
    print(f"   First 10 chars: {jwt_secret[:10]}...")
    print()
    
    if not supabase_anon_key:
        print("❌ SUPABASE_ANON_KEY not found in .env")
        return
    
    print(f"✅ Anon Key found")
    print()
    
    # Try to decode the anon key with the JWT secret
    print("Testing JWT secret with anon key...")
    try:
        decoded = jwt.decode(
            supabase_anon_key,
            jwt_secret,
            algorithms=["HS256"],
            options={"verify_signature": True, "verify_aud": False}
        )
        print("✅ JWT Secret is CORRECT!")
        print(f"   Decoded payload: {decoded}")
    except jwt.InvalidSignatureError:
        print("❌ JWT Secret is INCORRECT - Signature verification failed")
        print()
        print("To fix this:")
        print("1. Go to your Supabase Dashboard")
        print("2. Navigate to: Settings > API")
        print("3. Find 'JWT Secret' section")
        print("4. Copy the EXACT secret (it should be a long base64 string)")
        print("5. Update SUPABASE_JWT_SECRET in your .env file")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print("=" * 60)

if __name__ == "__main__":
    test_jwt_secret()
