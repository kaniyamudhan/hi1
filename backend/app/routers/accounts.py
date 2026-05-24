"""Accounts router - Production-grade implementation."""

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
        # ✅ Extract user_id from token payload
        user_id = str(current_user.get("_id") or current_user.get("id") or current_user.get("sub"))
        print(f"🔍 [GET /accounts] Fetching accounts for user_id: {user_id}")
        
        # ✅ Find all accounts for this user
        accounts_list = []
        async for acc in database.accounts.find({"user_id": user_id}):
            acc["id"] = str(acc["_id"])
            del acc["_id"]
            accounts_list.append(acc)
        
        print(f"✅ [GET /accounts] Found {len(accounts_list)} accounts: {[acc['name'] for acc in accounts_list]}")
        return {"accounts": accounts_list}
    
    except Exception as e:
        print(f"❌ [GET /accounts] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch accounts: {str(e)}")

@router.post("/")
async def create_account(account: AccountCreate, current_user: dict = Depends(get_current_user)):
    """Create a new account for the current user."""
    if database.accounts is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    try:
        # ✅ Extract user_id from token payload
        user_id = str(current_user.get("_id") or current_user.get("id") or current_user.get("sub"))
        print(f"🏦 [POST /accounts] Creating account: {account.name} (type: {account.type}) for user: {user_id}")
        
        # ✅ Check if account name already exists for this user
        existing = await database.accounts.find_one({
            "name": account.name,
            "user_id": user_id
        })
        
        if existing:
            raise HTTPException(status_code=400, detail=f"Account '{account.name}' already exists")
        
        # ✅ Create account data
        acc_data = {
            "name": account.name.strip(),
            "type": account.type.strip(),
            "balance": float(account.balance),
            "user_id": user_id
        }
        
        print(f"💾 [POST /accounts] Inserting into DB: {acc_data}")
        
        # ✅ Insert into database
        result = await database.accounts.insert_one(acc_data)
        print(f"✅ [POST /accounts] Inserted with ID: {result.inserted_id}")
        
        # ✅ Fetch the created account to confirm
        created_acc = await database.accounts.find_one({"_id": result.inserted_id})
        
        if not created_acc:
            raise HTTPException(status_code=500, detail="Failed to create account - could not retrieve created record")
        
        # ✅ Format response
        created_acc["id"] = str(created_acc["_id"])
        del created_acc["_id"]
        
        print(f"✅ [POST /accounts] Account created successfully: {created_acc}")
        return created_acc
    
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"❌ [POST /accounts] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create account: {str(e)}")

@router.delete("/{account_id}")
async def delete_account(account_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an account by ID."""
    if database.accounts is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    try:
        # ✅ Convert account_id to ObjectId
        try:
            obj_id = ObjectId(account_id)
        except Exception:
            raise HTTPException(status_code=400, detail=f"Invalid account ID format: {account_id}")
        
        user_id = str(current_user.get("_id") or current_user.get("id") or current_user.get("sub"))
        print(f"🗑️  [DELETE /accounts/{account_id}] Deleting for user: {user_id}")
        
        result = await database.accounts.delete_one({
            "_id": obj_id,
            "user_id": user_id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Account not found or unauthorized")
        
        print(f"✅ [DELETE /accounts/{account_id}] Deleted successfully")
        return {"message": "Account deleted successfully"}
    
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"❌ [DELETE /accounts/{account_id}] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete account: {str(e)}")
