# mis_logic.py — MIS Monthly Aggregation Logic
# REWRITTEN: Data is NEVER deleted.
# The system only filters transactions by month for calculations. All history is retained permanently.

import logging
from datetime import datetime, timedelta
from calendar import monthrange
from app import database

logger = logging.getLogger(__name__)

def get_previous_month_info():
    """
    Returns (year, month, total_days) of the previous month.
    """
    today = datetime.now()
    first_of_current = today.replace(day=1)
    last_of_previous = first_of_current - timedelta(days=1)
    
    prev_year = last_of_previous.year
    prev_month = last_of_previous.month
    total_days = monthrange(prev_year, prev_month)[1]
    
    return prev_year, prev_month, total_days


async def run_daily_mis_cleanup():
    """
    OBSOLETE: This function previously deleted data. 
    It now safely does nothing to protect the user's financial history.
    """
    logger.info("✅ MIS: Daily cleanup skipped. Data is retained permanently.")
    return {
        "status": "skipped - data protected",
        "message": "Data deletion has been permanently disabled.",
        "deleted_count": 0
    }

async def run_mis_cleanup_all_at_once():
    """
    OBSOLETE: This function previously wiped all previous month data.
    It now safely does nothing.
    """
    logger.info("✅ MIS: Bulk cleanup skipped. Data is retained permanently.")
    return {
        "status": "skipped - data protected",
        "message": "Bulk data deletion has been permanently disabled.",
        "deleted_count": 0
    }

async def get_mis_status():
    """
    Returns the current status of the MIS system (reporting only).
    """
    today = datetime.now()
    prev_year, prev_month, _ = get_previous_month_info()
    
    # We could theoretically calculate a summary here, 
    # but for now we just return safe status.
    return {
        "current_date": today.strftime("%Y-%m-%d"),
        "previous_month": f"{prev_year}-{prev_month:02d}",
        "message": "MIS Engine is in safe reporting mode. No data will ever be deleted."
    }

def get_mis_history():
    """Returns an empty history log as cleanups no longer occur."""
    return []