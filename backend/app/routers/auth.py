"""Authentication endpoints - MongoDB only, secure token system."""

from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends, Request
from pydantic import BaseModel, EmailStr
import logging
import traceback

from app.config import settings
from app import database
from app.models import UserCreate, UserLogin
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    verify_token,
    get_current_user,
)
from app.core.errors import AuthenticationError, ValidationError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Auth"])


class TokenResponse(BaseModel):
    """Token response with access and refresh tokens."""
    access_token: str
    refresh_token: str
    token_type: str
    user_name: str


class UserUpdate(BaseModel):
    """User profile update."""
    name: str
    phone: str = ""
    dob: str = ""
    gender: str = ""
    address: str = ""
    city: str = ""
    state: str = ""
    pincode: str = ""


class PasswordUpdate(BaseModel):
    """Password change request."""
    current_password: str
    new_password: str


class RefreshTokenRequest(BaseModel):
    """Refresh token request."""
    refresh_token: str


# ============================================================================
# SIGNUP
# ============================================================================

@router.post("/signup", response_model=TokenResponse)
async def signup(user: UserCreate, request: Request):
    """Register a new user - SECURE: No plain-text password storage."""
    
    if database.users_collection is None:
        logger.error("❌ Database connection failed - users_collection is None")
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    try:
        # Check if email already exists
        existing = await database.users_collection.find_one({"email": user.email.lower()})
        if existing:
            logger.warning(f"⚠️ Signup attempted with existing email: {user.email}")
            raise ValidationError("Email already registered")
        
        # Validate password length is within bcrypt limit BEFORE hashing
        if len(user.password.encode('utf-8')) > 72:
            logger.warning(f"⚠️ Password too long for user: {user.email}")
            raise ValidationError("Password cannot exceed 72 characters")
        
        # Hash password (ONLY hash - NO plain-text storage)
        try:
            hashed_pw = get_password_hash(user.password)
        except ValueError as ve:
            logger.error(f"❌ Password hashing failed: {str(ve)}")
            raise ValidationError(str(ve))
        
        # Create user document
        user_doc = {
            "name": user.name.strip(),
            "email": user.email.lower(),
            "hashed_password": hashed_pw,
            "is_verified": False,
            "phone": "",
            "dob": "",
            "gender": "",
            "address": "",
            "city": "",
            "state": "",
            "pincode": "",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        
        result = await database.users_collection.insert_one(user_doc)
        
        # Create tokens
        access_token = create_access_token(data={"sub": user.email.lower()})
        refresh_token = create_refresh_token(data={"sub": user.email.lower()})
        
        logger.info(f"✅ User registered successfully: {user.email}")
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user_name=user.name
        )
    
    except ValidationError:
        raise
    except Exception as e:
        logger.error(f"❌ Signup error: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Registration failed. Please try again.")


# ============================================================================
# LOGIN
# ============================================================================

@router.post("/login", response_model=TokenResponse)
async def login(user_data: UserLogin, request: Request):
    """Authenticate user - Returns short-lived access + long-lived refresh tokens."""
    
    if database.users_collection is None:
        logger.error("❌ Database connection failed - users_collection is None")
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    try:
        # Find user by email (case-insensitive)
        user = await database.users_collection.find_one({"email": user_data.email.lower()})
        if not user:
            logger.warning(f"⚠️ Login attempt with non-existent email: {user_data.email}")
            raise AuthenticationError("Invalid email or password")
        
        # Verify password
        if not verify_password(user_data.password, user["hashed_password"]):
            logger.warning(f"⚠️ Failed login attempt for: {user_data.email}")
            raise AuthenticationError("Invalid email or password")
        
        # Create tokens
        access_token = create_access_token(data={"sub": user["email"]})
        refresh_token = create_refresh_token(data={"sub": user["email"]})
        
        # Update last login
        await database.users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"updated_at": datetime.utcnow()}}
        )
        
        logger.info(f"✅ User logged in: {user_data.email}")
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user_name=user["name"]
        )
    
    except AuthenticationError:
        raise
    except Exception as e:
        logger.error(f"❌ Login error: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Login failed")


# ============================================================================
# REFRESH TOKEN
# ============================================================================

@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(request: RefreshTokenRequest):
    """Use refresh token to get new access token without re-logging in."""
    
    if database.users_collection is None:
        raise HTTPException(status_code=500, detail="Database error")
    
    try:
        payload = verify_token(request.refresh_token, token_type="refresh")
        email = payload.get("sub")
        
        user = await database.users_collection.find_one({"email": email})
        if not user:
            raise AuthenticationError("User not found")
        
        # Create new access token
        new_access_token = create_access_token(data={"sub": email})
        
        logger.info(f"✅ Token refreshed for: {email}")
        
        return TokenResponse(
            access_token=new_access_token,
            refresh_token=request.refresh_token,
            token_type="bearer",
            user_name=user["name"]
        )
    
    except AuthenticationError:
        raise
    except Exception as e:
        logger.error(f"❌ Token refresh error: {str(e)}")
        logger.error(traceback.format_exc())
        raise AuthenticationError("Invalid or expired refresh token")


# ============================================================================
# GET CURRENT USER
# ============================================================================

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user profile."""
    
    logger.info(f"📍 GET /me endpoint called with current_user: {current_user}")
    
    if database.users_collection is None:
        logger.error("❌ Database error - users_collection is None")
        raise HTTPException(status_code=500, detail="Database error")
    
    try:
        # ✅ FIX: current_user already has the user data from get_current_user
        # But we need to fetch fresh data from DB to get all fields
        email = current_user.get("email")
        
        logger.info(f"📍 Extracted email from token: {email}")
        
        if not email:
            logger.error(f"❌ No email in token payload. current_user keys: {current_user.keys()}")
            raise HTTPException(status_code=401, detail="Invalid token - no email found")
        
        # Fetch from database using email (safer than _id)
        logger.info(f"📍 Fetching user from DB with email: {email}")
        user = await database.users_collection.find_one({"email": email})
        
        if not user:
            logger.warning(f"⚠️ User not found in DB: {email}")
            raise HTTPException(status_code=404, detail="User not found in database")
        
        logger.info(f"✅ User found in DB: {email}")
        
        # Remove sensitive fields
        user.pop("hashed_password", None)
        
        # Convert MongoDB ObjectId to string
        if "_id" in user:
            user["_id"] = str(user["_id"])
        
        logger.info(f"✅ Returning user profile for: {email}")
        
        return user
    
    except HTTPException as he:
        logger.error(f"❌ HTTPException in /me: {he.detail}")
        raise
    except Exception as e:
        logger.error(f"❌ Get user error: {str(e)}")
        logger.error(f"❌ Error type: {type(e).__name__}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to fetch user: {str(e)}")


# ============================================================================
# UPDATE PROFILE
# ============================================================================

@router.put("/profile")
async def update_profile(data: UserUpdate, current_user: dict = Depends(get_current_user)):
    """Update user profile information."""
    
    if database.users_collection is None:
        raise HTTPException(status_code=500, detail="Database error")
    
    try:
        email = current_user.get("email")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        update_data = data.dict(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        
        result = await database.users_collection.update_one(
            {"email": email},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        logger.info(f"✅ Profile updated for: {email}")
        
        return {"message": "Profile updated successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Profile update error: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to update profile")


# ============================================================================
# CHANGE PASSWORD
# ============================================================================

@router.put("/password")
async def change_password(data: PasswordUpdate, current_user: dict = Depends(get_current_user)):
    """Change user password."""
    
    if database.users_collection is None:
        raise HTTPException(status_code=500, detail="Database error")
    
    try:
        email = current_user.get("email")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Fetch user
        user = await database.users_collection.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Verify current password
        if not verify_password(data.current_password, user["hashed_password"]):
            logger.warning(f"⚠️ Failed password change attempt for: {email}")
            raise AuthenticationError("Current password is incorrect")
        
        # Validate new password length
        if len(data.new_password.encode('utf-8')) > 72:
            raise ValidationError("New password is too long (max 72 characters)")
        
        # Hash new password
        try:
            new_hashed = get_password_hash(data.new_password)
        except ValueError as ve:
            raise ValidationError(str(ve))
        
        # Update password
        result = await database.users_collection.update_one(
            {"email": email},
            {"$set": {"hashed_password": new_hashed, "updated_at": datetime.utcnow()}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        logger.info(f"✅ Password changed for: {email}")
        
        return {"message": "Password updated successfully"}
    
    except (AuthenticationError, ValidationError):
        raise
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Password change error: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to change password")


# ============================================================================
# DELETE ACCOUNT
# ============================================================================

@router.delete("/me")
async def delete_account(current_user: dict = Depends(get_current_user)):
    """Delete user account and all associated data."""
    
    if database.users_collection is None:
        raise HTTPException(status_code=500, detail="Database error")
    
    try:
        email = current_user.get("email")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Fetch user to get ID
        user = await database.users_collection.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_id = str(user["_id"])
        
        # Delete user
        await database.users_collection.delete_one({"email": email})
        
        # Delete all associated data
        if database.transactions_collection:
            await database.transactions_collection.delete_many({"user_id": user_id})
        if database.accounts_collection:
            await database.accounts_collection.delete_many({"user_id": user_id})
        if database.goals_collection:
            await database.goals_collection.delete_many({"user_id": user_id})
        if database.habits_collection:
            await database.habits_collection.delete_many({"user_id": user_id})
        if database.budget_settings_collection:
            await database.budget_settings_collection.delete_many({"user_id": user_id})
        
        logger.info(f"✅ Account deleted for: {email}")
        
        return {"message": "Account successfully deleted"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Account deletion error: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to delete account")