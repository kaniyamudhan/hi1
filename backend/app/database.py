"""MongoDB database connection and collections."""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# MongoDB client and database
client: AsyncIOMotorClient = None
db: AsyncIOMotorDatabase = None

# ✅ New collection variables - used by routers
users = None
transactions = None
accounts = None
goals = None
habits = None
budget_settings = None
password_resets = None

# ✅ BACKWARD COMPATIBILITY: Old collection names for imports in other files
users_collection = None
transactions_collection = None
accounts_collection = None
goals_collection = None
habits_collection = None
budget_settings_collection = None
password_resets_collection = None


async def connect_to_mongo():
    """Connect to MongoDB and initialize collections."""
    
    global client, db
    global users, transactions, accounts, goals, habits, budget_settings, password_resets
    global users_collection, transactions_collection, accounts_collection
    global goals_collection, habits_collection, budget_settings_collection
    global password_resets_collection

    try:
        logger.info(f"🔌 Connecting to MongoDB: {settings.MONGODB_URL[:50]}...")
        
        client = AsyncIOMotorClient(settings.MONGODB_URL)
        db = client[settings.MONGODB_DB_NAME]

        # Initialize collections with both new and old names
        users = db["users"]
        transactions = db["transactions"]
        accounts = db["accounts"]
        goals = db["goals"]
        habits = db["habits"]
        budget_settings = db["budget_settings"]
        password_resets = db["password_resets"]
        
        # ✅ Backward compatibility aliases
        users_collection = users
        transactions_collection = transactions
        accounts_collection = accounts
        goals_collection = goals
        habits_collection = habits
        budget_settings_collection = budget_settings
        password_resets_collection = password_resets

        # Test connection
        await client.admin.command("ping")
        logger.info("✅ Connected to MongoDB successfully!")
        logger.info(f"📊 Database: {settings.MONGODB_DB_NAME}")
        logger.info("📚 Collections initialized:")
        logger.info(f"   ✓ users")
        logger.info(f"   ✓ transactions")
        logger.info(f"   ✓ accounts")
        logger.info(f"   ✓ goals")
        logger.info(f"   ✓ habits")
        logger.info(f"   ✓ budget_settings")
        logger.info(f"   ✓ password_resets")
        
        return True

    except Exception as e:
        logger.error(f"❌ Failed to connect to MongoDB: {str(e)}")
        logger.error(f"Connection string format: mongodb+srv://user:pass@cluster.mongodb.net/dbname")
        logger.error(f"Check your MONGODB_URL in .env file")
        raise


async def close_mongo_connection():
    """Close MongoDB connection."""

    global client

    if client:
        client.close()
        logger.info("✅ Closed MongoDB connection")


# Convenience function to get db object
def get_db():
    """Get database object."""
    if db is None:
        raise RuntimeError("❌ Database not connected. Call connect_to_mongo() first.")
    return db