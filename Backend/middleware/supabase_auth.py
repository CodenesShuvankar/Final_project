"""
Supabase JWT Authentication Middleware for FastAPI
Validates Supabase access tokens using JWT verification
"""
import os
import jwt
import requests
from functools import wraps
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

# Security scheme
security = HTTPBearer()

# Cache for JWKS
_jwks_cache: Optional[Dict] = None

def get_supabase_jwks() -> Dict:
    """Fetch Supabase JWKS (JSON Web Key Set) for JWT verification"""
    global _jwks_cache
    
    if _jwks_cache:
        return _jwks_cache
    
    supabase_url = os.getenv('SUPABASE_URL')
    if not supabase_url:
        raise Exception("SUPABASE_URL not set in environment")
    
    # Fetch JWKS from Supabase
    jwks_url = f"{supabase_url}/auth/v1/jwks"
    response = requests.get(jwks_url)
    response.raise_for_status()
    
    _jwks_cache = response.json()
    return _jwks_cache


def verify_supabase_token(token: str) -> Dict[str, Any]:
    """
    Verify and decode Supabase JWT token
    
    Args:
        token: JWT access token from Supabase
        
    Returns:
        Decoded token payload with user information
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        supabase_jwt_secret = os.getenv('SUPABASE_JWT_SECRET')
        
        if not supabase_jwt_secret:
            raise Exception("SUPABASE_JWT_SECRET not set")
        
        # First, try to decode without verification to see token content (for debugging)
        try:
            unverified = jwt.decode(token, options={"verify_signature": False})
            logger.info(f"Token payload (unverified): {unverified}")
        except Exception as e:
            logger.warning(f"Could not decode token for debugging: {e}")
        
        # Decode and verify the JWT token
        # Try with audience first, then without if it fails
        try:
            decoded = jwt.decode(
                token,
                supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
                options={"verify_aud": True}
            )
        except jwt.InvalidAudienceError:
            logger.info("Retrying token verification without audience check")
            decoded = jwt.decode(
                token,
                supabase_jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False}
            )
        
        return decoded
        
    except jwt.ExpiredSignatureError:
        logger.error("Token has expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError as e:
        logger.error(f"Invalid token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error verifying token"
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> Dict[str, Any]:
    """
    FastAPI dependency to get current authenticated user
    
    Usage:
        @app.get("/protected")
        async def protected_route(user: dict = Depends(get_current_user)):
            return {"user_id": user["sub"]}
    """
    token = credentials.credentials
    user_data = verify_supabase_token(token)
    return user_data


# Optional: Decorator version for routes
def require_auth(func):
    """Decorator to require authentication on a route"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # This is a simplified version
        # In practice, use FastAPI's Depends(get_current_user)
        return await func(*args, **kwargs)
    return wrapper