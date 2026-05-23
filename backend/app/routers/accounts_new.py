from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app import database  # ✅ Import module instead of 'db'
from pydantic import BaseModel
from app.core.security import get_current_user
from bson import ObjectId

router = APIRouter(prefix="/accounts", tags=["Accounts"])

class AccountCreate(BaseModel):
    name: str
    type: str
    balance: float

class AccountResponse(AccountCreate):
    id: str

@router.get("/", response_model=List[AccountResponse])
async def get_accounts(current_user: dict = Depends(get_current_user)):
    """Fetch all accounts for the current user."""
    if database.accounts is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    cursor = database.accounts.find({"user_id": str(current_user["id"])})
    accounts_list = []
    async for acc in cursor:
        acc["id"] = str(acc["_id"])
        accounts_list.append(acc)
    return accounts_list

@router.post("/", response_model=AccountResponse)
async def create_account(account: AccountCreate, current_user: dict = Depends(get_current_user)):
    """Create a new account for the current user."""
    if database.accounts is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    acc_data = account.dict()
    acc_data["user_id"] = str(current_user["id"])
    
    # Insert account
    new_acc = await database.accounts.insert_one(acc_data)
    
    # ✅ FIX: Use _id field that MongoDB creates
    created_acc = await database.accounts.find_one({"_id": new_acc.inserted_id})
    
    if not created_acc:
        raise HTTPException(status_code=500, detail="Failed to create account")
    
    # Convert ObjectId to string
    created_acc["id"] = str(created_acc["_id"])
    return created_acc

@router.delete("/{account_id}")
async def delete_account(account_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an account by ID."""
    if database.accounts is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    try:
        # Convert account_id to ObjectId for comparison
        obj_id = ObjectId(account_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid account ID format")
    
    result = await database.accounts.delete_one({
        "_id": obj_id,  # Use _id
        "user_id": str(current_user["id"])
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    
    return {"message": "Account deleted"}