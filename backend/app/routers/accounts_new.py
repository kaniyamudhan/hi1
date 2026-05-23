from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.database import db
from pydantic import BaseModel
from app.core.security import get_current_user

router = APIRouter(prefix="/accounts", tags=["Accounts"])

class AccountCreate(BaseModel):
    name: str
    type: str
    balance: float

class AccountResponse(AccountCreate):
    id: str

@router.get("/", response_model=List[AccountResponse])
async def get_accounts(current_user: dict = Depends(get_current_user)):
    cursor = db.accounts.find({"user_id": str(current_user["id"])})
    accounts = []
    async for acc in cursor:
        acc["id"] = str(acc["id"])
        accounts.append(acc)
    return accounts

@router.post("/", response_model=AccountResponse)
async def create_account(account: AccountCreate, current_user: dict = Depends(get_current_user)):
    acc_data = account.dict()
    acc_data["user_id"] = str(current_user["id"])
    
    new_acc = await db.accounts.insert_one(acc_data)
    created_acc = await db.accounts.find_one({"id": new_acc.inserted_id})
    
    if not created_acc:
        raise HTTPException(status_code=500, detail="Failed to create account")
    created_acc["id"] = str(created_acc["id"])
    return created_acc

@router.delete("/{account_id}")
async def delete_account(account_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.accounts.delete_one({
        "id": account_id,
        "user_id": str(current_user["id"])
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    return {\"message\": \"Account deleted\"}
