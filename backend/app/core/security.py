"""Security utilities: JWT, password hashing, token management."""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.config import settings
import logging
import traceback

logger = logging.getLogger(__name__)

# ✅ FIXED: Password hashing with bcrypt - use only bcrypt scheme
try:
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
except Exception as e:
    logger.error(f"❌ CryptContext initialization error: {str(e)}")
    # Fallback in case of issues
    pwd_context = CryptContext(schemes=["bcrypt"])

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against hashed password."""
    try:
        # Limit to 72 bytes for bcrypt compatibility
        limited_password = plain_password[:72]
        return pwd_context.verify(limited_password, hashed_password)
    except Exception as e:
        logger.error(f"❌ Password verification error: {str(e)}")
        return False


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt."""
    try:
        # Limit to 72 bytes BEFORE hashing
        limited_password = password[:72]
        
        # Use try-except to catch bcrypt-specific errors
        hashed = pwd_context.hash(limited_password)
        
        if not hashed:
            raise ValueError("Password hashing returned empty result")
        
        return hashed
    except Exception as e:
        logger.error(f"❌ Password hashing error: {str(e)}")
        # Re-raise with a clean message
        raise ValueError("Password hashing failed. Please try again.")


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create JWT access token (short-lived: 15 minutes)."""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # Default: 15 minutes
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire, "type": "access"})
    
    try:
        encoded_jwt = jwt.encode(
            to_encode,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        return encoded_jwt
    except Exception as e:
        logger.error(f"❌ Access token creation error: {str(e)}")
        raise ValueError("Failed to create access token")


def create_refresh_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create JWT refresh token (long-lived: 7 days)."""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # Default: 7 days
        expire = datetime.utcnow() + timedelta(days=7)
    
    to_encode.update({"exp": expire, "type": "refresh"})
    
    try:
        encoded_jwt = jwt.encode(
            to_encode,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        return encoded_jwt
    except Exception as e:
        logger.error(f"❌ Refresh token creation error: {str(e)}")
        raise ValueError("Failed to create refresh token")


def verify_token(token: str, token_type: str = "access") -> Dict[str, Any]:
    """Verify JWT token and return payload."""
    logger.info(f"📍 Verifying {token_type} token...")
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        logger.info(f"📍 Decoding JWT token...")
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        
        logger.info(f"📍 Token decoded successfully. Payload keys: {payload.keys()}")
        
        # Check token type
        if payload.get("type") != token_type:
            logger.warning(f"⚠️ Token type mismatch. Expected: {token_type}, Got: {payload.get('type')}")
            raise credentials_exception
        
        email: str = payload.get("sub")
        if email is None:
            logger.error(f"❌ No 'sub' (email) in token payload")
            raise credentials_exception
        
        logger.info(f"✅ Token verified for email: {email}")
        return payload
    
    except JWTError as e:
        logger.warning(f"⚠️ Token verification failed (JWTError): {str(e)}")
        raise credentials_exception
    except Exception as e:
        logger.error(f"❌ Unexpected token error: {str(e)}")
        logger.error(traceback.format_exc())
        raise credentials_exception


async def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    """Get current authenticated user from token."""
    logger.info(f"📍 get_current_user called with token: {token[:20]}...")
    
    try:
        # ✅ FIX: Import database here to avoid circular imports
        from app import database
        
        logger.info(f"📍 Verifying token...")
        payload = verify_token(token, token_type="access")
        email: str = payload.get("sub")
        
        logger.info(f"📍 Email from token: {email}")
        
        if database.users_collection is None:
            logger.error(f"❌ Database users_collection is None")
            raise HTTPException(status_code=500, detail="Database error")
        
        logger.info(f"📍 Fetching user from database with email: {email}")
        user = await database.users_collection.find_one({"email": email})
        
        if user is None:
            logger.warning(f"⚠️ User not found in database: {email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        logger.info(f"✅ User found in database: {email}")
        user["id"] = str(user.get("_id", ""))
        
        return user
    
    except HTTPException:
        logger.error(f"❌ HTTPException in get_current_user")
        raise
    except Exception as e:
        logger.error(f"❌ get_current_user error: {str(e)}")
        logger.error(f"❌ Error type: {type(e).__name__}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication failed: {str(e)}"
        )
