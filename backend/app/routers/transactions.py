"""Transactions router."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from datetime import datetime
from app import database
from app.core.security import get_current_user
from bson import ObjectId

router = APIRouter(prefix="/transactions", tags=["Transactions"])

class TransactionCreate(BaseModel):
    note: str
    amount: float
    category: str
    account: str
    type: str  # "income" or "expense"
    date: str = None

class TransactionResponse(TransactionCreate):
    id: str
    user_id: str
    created_at: str

@router.get("/")
async def list_transactions(current_user: dict = Depends(get_current_user)):
    """List all transactions for the current user."""
    if database.transactions is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    try:
        user_id = str(current_user.get("_id") or current_user.get("id"))
        print(f"🔍 Fetching transactions for user_id: {user_id}")
        
        transactions_list = []
        cursor = database.transactions.find({"user_id": user_id}).sort("created_at", -1)
        
        async for tx in cursor:
            tx["id"] = str(tx["_id"])
            del tx["_id"]
            transactions_list.append(tx)
        
        print(f"📋 Found {len(transactions_list)} transactions")
        return {"transactions": transactions_list}
    
    except Exception as e:
        print(f"❌ Error fetching transactions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def create_transaction(txn: TransactionCreate, current_user: dict = Depends(get_current_user)):
    """Create a new transaction."""
    if database.transactions is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    try:
        user_id = str(current_user.get("_id") or current_user.get("id"))
        
        txn_data = {
            "note": txn.note,
            "amount": txn.amount,
            "category": txn.category,
            "account": txn.account,
            "type": txn.type,
            "date": txn.date or datetime.now().isoformat(),
            "user_id": user_id,
            "created_at": datetime.now().isoformat()
        }
        
        result = await database.transactions.insert_one(txn_data)
        
        created_txn = await database.transactions.find_one({"_id": result.inserted_id})
        
        if not created_txn:
            raise HTTPException(status_code=500, detail="Failed to create transaction")
        
        created_txn["id"] = str(created_txn["_id"])
        del created_txn["_id"]
        
        print(f"✅ Transaction created: {created_txn}")
        return created_txn
    
    except Exception as e:
        print(f"❌ Error creating transaction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{transaction_id}")
async def update_transaction(transaction_id: str, txn: TransactionCreate, current_user: dict = Depends(get_current_user)):
    """Update a transaction."""
    if database.transactions is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    try:
        obj_id = ObjectId(transaction_id)
        user_id = str(current_user.get("_id") or current_user.get("id"))
        
        result = await database.transactions.update_one(
            {"_id": obj_id, "user_id": user_id},
            {"$set": txn.dict()}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        updated_txn = await database.transactions.find_one({"_id": obj_id})
        updated_txn["id"] = str(updated_txn["_id"])
        del updated_txn["_id"]
        
        return updated_txn
    
    except Exception as e:
        print(f"❌ Error updating transaction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{transaction_id}")
async def delete_transaction(transaction_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a transaction."""
    if database.transactions is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    try:
        obj_id = ObjectId(transaction_id)
        user_id = str(current_user.get("_id") or current_user.get("id"))
        
        result = await database.transactions.delete_one({
            "_id": obj_id,
            "user_id": user_id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        return {"message": "Transaction deleted successfully"}
    
    except Exception as e:
        print(f"❌ Error deleting transaction: {e}")
        raise HTTPException(status_code=500, detail=str(e))