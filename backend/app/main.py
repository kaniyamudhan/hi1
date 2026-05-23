"""FastAPI main application - MongoDB only."""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from slowapi import Limiter
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.routers import auth, transactions, ai, accounts, goals, budget, habits, mis, excel_export, admin
from app.database import connect_to_mongo, close_mongo_connection
from app.services.mis_logic import run_daily_mis_cleanup
from app.config import settings
import logging
import uvicorn
import asyncio

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="RupeeRiser API", version="1.0.0")

# ============================================================================
# CUSTOM ERROR HANDLER FOR VALIDATION ERRORS
# ============================================================================
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Convert Pydantic validation errors to user-friendly format."""
    errors = {}
    for error in exc.errors():
        field = ".".join(str(x) for x in error["loc"][1:])  # Skip "body"
        message = error["msg"]
        errors[field] = message
    
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": {
                "message": "Validation failed",
                "details": errors
            }
        }
    )

# ============================================================================
# Rate Limiter Setup
# ============================================================================
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

# ============================================================================
# CORS Configuration (from .env)
# ============================================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Global Exception Handler for Rate Limiting
# ============================================================================
@app.exception_handler(RateLimitExceeded)
async def rate_limit_exception_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "success": False,
            "error": {
                "message": "Rate limit exceeded. Please try again later."
            }
        }
    )

# ============================================================================
# MIS Background Task
# ============================================================================
_mis_task = None

async def mis_scheduler():
    """Background task that runs MIS cleanup once per day at midnight."""
    while True:
        try:
            logger.info("⏰ MIS Scheduler: Running daily cleanup...")
            await run_daily_mis_cleanup()
        except Exception as e:
            logger.error(f"❌ MIS Scheduler error: {e}")
        
        # Wait 24 hours
        await asyncio.sleep(24 * 60 * 60)

# ============================================================================
# Startup & Shutdown Events
# ============================================================================

@app.on_event("startup")
async def startup_db_client():
    global _mis_task
    await connect_to_mongo()
    logger.info(f"🚀 Starting RupeeRiser API in {settings.ENVIRONMENT} mode")
    logger.info(f"🗄️  Database: MongoDB")
    logger.info(f"📊 Rate limiting: {'ENABLED' if settings.RATE_LIMIT_ENABLED else 'DISABLED'}")
    _mis_task = asyncio.create_task(mis_scheduler())
    logger.info("⏰ MIS daily cleanup scheduler started")

@app.on_event("shutdown")
async def shutdown_event():
    global _mis_task
    if _mis_task:
        _mis_task.cancel()
        logger.info("⏰ MIS scheduler stopped")
    await close_mongo_connection()

# ============================================================================
# Include Routers
# ============================================================================

app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(ai.router)
app.include_router(accounts.router)
app.include_router(goals.router)
app.include_router(budget.router)
app.include_router(habits.router) 
app.include_router(mis.router)
app.include_router(excel_export.router)
app.include_router(admin.router)

# ============================================================================
# Health Check Endpoints
# ============================================================================

@app.get("/")
def read_root(request: Request):
    """Root endpoint."""
    return {
        "message": "🚀 RupeeRiser API is running",
        "version": "1.0.0",
        "database": "MongoDB",
        "status": "ok"
    }

@app.get("/health")
def health_check(request: Request):
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "RupeeRiser API",
        "database": "MongoDB"
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)