from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.database import db
from app.models import HabitCreate, HabitResponse, HabitUpdate
from app.core.security import get_current_user
from bson import ObjectId

router = APIRouter(prefix="/habits", tags=["Habits"])

@router.get("/", response_model=List[HabitResponse])
async def list_habits(current_user: dict = Depends(get_current_user)):
    """List user habits."""
    cursor = db.habits.find({"user_id": str(current_user["id"])})
    habits = []
    async for habit in cursor:
        habit["id"] = str(habit["_id"])
        habits.append(habit)
    return habits

@router.post("/", response_model=HabitResponse)
async def create_habit(habit: HabitCreate, current_user: dict = Depends(get_current_user)):
    """Create habit with empty completed_dates array."""
    habit_data = habit.dict()
    habit_data["user_id"] = str(current_user["id"])
    habit_data["completed_dates"] = []  # ✅ IMPORTANT: Initialize as empty array
    
    result = await db.habits.insert_one(habit_data)
    created_habit = await db.habits.find_one({"_id": result.inserted_id})
    
    if not created_habit:
        raise HTTPException(status_code=500, detail="Failed to create habit")
    
    created_habit["id"] = str(created_habit["_id"])
    return created_habit

@router.put("/{habit_id}", response_model=HabitResponse)
async def update_habit(habit_id: str, habit: HabitUpdate, current_user: dict = Depends(get_current_user)):
    """Update habit."""
    result = await db.habits.update_one(
        {"_id": ObjectId(habit_id), "user_id": str(current_user["id"])},
        {"$set": habit.dict(exclude_unset=True)}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    updated_habit = await db.habits.find_one({"_id": ObjectId(habit_id)})
    updated_habit["id"] = str(updated_habit["_id"])
    return updated_habit

@router.delete("/{habit_id}")
async def delete_habit(habit_id: str, current_user: dict = Depends(get_current_user)):
    """Delete habit."""
    result = await db.habits.delete_one({
        "_id": ObjectId(habit_id),
        "user_id": str(current_user["id"])
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    return {"message": "Habit deleted"}

@router.post("/seed")
async def seed_habits(current_user: dict = Depends(get_current_user)):
    """Seed default habits."""
    default_habits = [
        {"name": "Morning Exercise", "completed_dates": []},
        {"name": "Read", "completed_dates": []},
        {"name": "Meditate", "completed_dates": []},
    ]
    
    for habit_data in default_habits:
        habit_data["user_id"] = str(current_user["id"])
        await db.habits.insert_one(habit_data)
    
    return {"message": "Habits seeded"}