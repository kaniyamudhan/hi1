"""Pydantic models for request/response validation."""

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Literal, Dict, Any


# ============================================================================
# AUTH MODELS
# ============================================================================

class UserCreate(BaseModel):
    """User signup request."""
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    
    @field_validator('password')
    @classmethod
    def validate_password_length(cls, v):
        """Ensure password doesn't exceed bcrypt's 72-byte limit."""
        if len(v.encode('utf-8')) > 72:
            raise ValueError('Password is too long (max 72 characters when encoded)')
        return v
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        """Ensure name is not empty or just whitespace."""
        if not v or not v.strip():
            raise ValueError('Name cannot be empty')
        return v.strip()


class AdminUserCreate(BaseModel):
    """Admin user creation."""
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    
    @field_validator('password')
    @classmethod
    def validate_password_length(cls, v):
        """Ensure password doesn't exceed bcrypt's 72-byte limit."""
        if len(v.encode('utf-8')) > 72:
            raise ValueError('Password is too long (max 72 characters when encoded)')
        return v


class UserLogin(BaseModel):
    """User login request."""
    email: EmailStr
    password: str


class Token(BaseModel):
    """Token response."""
    access_token: str
    token_type: str
    user_name: str


class UserProfileUpdate(BaseModel):
    """User profile update."""
    name: str
    phone: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None


class PasswordChange(BaseModel):
    """Password change request."""
    current_password: str
    new_password: str
    
    @field_validator('new_password')
    @classmethod
    def validate_password_length(cls, v):
        """Ensure password doesn't exceed bcrypt's 72-byte limit."""
        if len(v.encode('utf-8')) > 72:
            raise ValueError('Password is too long (max 72 characters when encoded)')
        return v


# ============================================================================
# TRANSACTION MODELS
# ============================================================================

class TransactionBase(BaseModel):
    """Base transaction model."""
    amount: float = Field(..., gt=0)
    category: str = Field(default="Other")
    note: str
    date: str
    type: Literal["income", "expense"]
    account: str = Field(default="wallet")


class TransactionCreate(TransactionBase):
    """Create transaction request."""
    pass


class TransactionResponse(TransactionBase):
    """Transaction response."""
    id: str
    user_id: str


class TransactionUpdate(BaseModel):
    """Update transaction."""
    amount: Optional[float] = None
    category: Optional[str] = None
    note: Optional[str] = None
    date: Optional[str] = None
    type: Optional[Literal["income", "expense"]] = None
    account: Optional[str] = None


# ============================================================================
# BUDGET & GOALS MODELS
# ============================================================================

class FixedCosts(BaseModel):
    """Fixed costs structure."""
    rent: float = 0
    travel: float = 0
    phone: float = 0
    subscriptions: float = 0


class BudgetSettings(BaseModel):
    """Budget settings."""
    salary: float = 0
    fixed_costs: FixedCosts = Field(default_factory=FixedCosts)
    config: str = ""


class GoalCreate(BaseModel):
    """Create goal request."""
    name: str = Field(..., min_length=1, max_length=100)
    amount: float = Field(..., gt=0)


class GoalResponse(GoalCreate):
    """Goal response."""
    id: str


class GoalUpdate(BaseModel):
    """Update goal."""
    name: Optional[str] = None
    amount: Optional[float] = None


# ============================================================================
# ACCOUNT MODELS
# ============================================================================

class AccountCreate(BaseModel):
    """Create account request."""
    name: str = Field(..., min_length=1, max_length=100)
    type: Literal["wallet", "bank", "upi", "investment"] = "wallet"
    balance: float = 0


class AccountResponse(AccountCreate):
    """Account response."""
    id: str


class AccountUpdate(BaseModel):
    """Update account."""
    name: Optional[str] = None
    type: Optional[Literal["wallet", "bank", "upi", "investment"]] = None
    balance: Optional[float] = None


# ============================================================================
# HABITS MODELS
# ============================================================================

class HabitCreate(BaseModel):
    """Create habit request."""
    name: str = Field(..., min_length=1, max_length=100)


class HabitResponse(HabitCreate):
    """Habit response."""
    id: str
    completed_dates: List[str] = Field(default_factory=list)


class HabitUpdate(BaseModel):
    """Update habit."""
    name: Optional[str] = None
    completed_dates: Optional[List[str]] = None


# ============================================================================
# AI MODELS
# ============================================================================

class NaturalLanguageInput(BaseModel):
    """Natural language input for AI."""
    text: str = Field(..., min_length=1, max_length=1000)


class ChatInput(BaseModel):
    """Chat input for AI coach."""
    message: str = Field(..., min_length=1, max_length=1000)


class BudgetProfile(BaseModel):
    """User budget profile for AI analysis."""
    salary: float
    fixed_costs: Dict[str, float]
    goals: List[Dict[str, Any]] = Field(default_factory=list)
    current_spending: Optional[float] = 0
    spending_summary: Optional[Dict[str, Any]] = Field(default_factory=dict)
    user_context: Optional[str] = ""
    period_context: Optional[str] = ""


# ============================================================================
# API RESPONSE MODELS
# ============================================================================

class SuccessResponse(BaseModel):
    """Generic success response."""
    success: bool = True
    data: Optional[Any] = None
    message: Optional[str] = None


class ErrorResponse(BaseModel):
    """Generic error response."""
    success: bool = False
    error: Dict[str, Any]


# ============================================================================
# PASSWORD RESET MODELS
# ============================================================================

class ForgotPasswordRequest(BaseModel):
    """Forgot password request."""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Password reset confirmation."""
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)
    
    @field_validator('new_password')
    @classmethod
    def validate_password_length(cls, v):
        """Ensure password doesn't exceed bcrypt's 72-byte limit."""
        if len(v.encode('utf-8')) > 72:
            raise ValueError('Password is too long (max 72 characters when encoded)')
        return v