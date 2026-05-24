from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app import database
from pydantic import BaseModel
from app.core.security import get_current_user
from bson import ObjectId

router = APIRouter(prefix="/accounts", tags=["Accounts"])

class AccountCreate(BaseModel):
    name: str
    type: str
    balance: float = 0

class AccountResponse(BaseModel):
    id: str
    name: str
    type: str
    balance: float
    user_id: str

@router.get("/")
async def get_accounts(current_user: dict = Depends(get_current_user)):
    """Fetch all accounts for the current user from database."""
    if database.accounts is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    try:
        user_id = str(current_user.get("_id") or current_user.get("id"))
        print(f"🔍 Fetching accounts for user_id: {user_id}")
        
        # Find all accounts for this user
        accounts_list = []
        cursor = database.accounts.find({"user_id": user_id})
        
        async for acc in cursor:
            acc["id"] = str(acc["_id"])
            del acc["_id"]
            accounts_list.append(acc)
        
        print(f"📋 Found {len(accounts_list)} accounts")
        return {"accounts": accounts_list}
    
    except Exception as e:
        print(f"❌ Error fetching accounts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def create_account(account: AccountCreate, current_user: dict = Depends(get_current_user)):
    """Create a new account for the current user."""
    if database.accounts is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    try:
        user_id = str(current_user.get("_id") or current_user.get("id"))
        
        acc_data = {
            "name": account.name,
            "type": account.type,
            "balance": account.balance,
            "user_id": user_id
        }
        
        # Insert into database
        result = await database.accounts.insert_one(acc_data)
        
        # Fetch the created account
        created_acc = await database.accounts.find_one({"_id": result.inserted_id})
        
        if not created_acc:
            raise HTTPException(status_code=500, detail="Failed to create account")
        
        created_acc["id"] = str(created_acc["_id"])
        del created_acc["_id"]
        
        print(f"✅ Account created: {created_acc}")
        return created_acc
    
    except Exception as e:
        print(f"❌ Error creating account: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{account_id}")
async def delete_account(account_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an account by ID."""
    if database.accounts is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    try:
        obj_id = ObjectId(account_id)
        user_id = str(current_user.get("_id") or current_user.get("id"))
        
        result = await database.accounts.delete_one({
            "_id": obj_id,
            "user_id": user_id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Account not found or unauthorized")
        
        return {"message": "Account deleted successfully"}
    
    except Exception as e:
        print(f"❌ Error deleting account: {e}")
        raise HTTPException(status_code=500, detail=str(e))