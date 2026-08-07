from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, models, schemas
from app.api import deps
from app.core.security import get_password_hash
import uuid

router = APIRouter()

@router.get("/me", response_model=schemas.User)
def read_user_me(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get current user.
    """
    return current_user

@router.post("", response_model=schemas.User)
def create_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: schemas.UserCreate,
) -> Any:
    """
    Create new user. Frontend sends phone as email for login.
    Auto-generates uid if not provided.
    """
    # Check if user already exists by email/phone
    if user_in.email:
        existing = crud.user.get_by_email(db, email=user_in.email)
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Bu email allaqachon ro'yxatdan o'tgan",
            )
    if user_in.phone:
        existing = crud.user.get_by_phone(db, phone=user_in.phone)
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Bu raqam allaqachon ro'yxatdan o'tgan",
            )
    
    # Auto-generate uid if not provided
    uid = user_in.uid if user_in.uid else str(uuid.uuid4())
    
    db_obj = models.User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        name=user_in.name,
        uid=uid,
        phone=user_in.phone,
        role=user_in.role or 'worker',
        companyName=user_in.companyName,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.put("/me", response_model=schemas.User)
def update_user_me(
    *,
    db: Session = Depends(deps.get_db),
    user_in: schemas.UserUpdate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update current user profile.
    """
    update_data = user_in.model_dump(exclude_unset=True)
    
    if "password" in update_data and update_data["password"]:
        hashed_password = get_password_hash(update_data["password"])
        del update_data["password"]
        update_data["hashed_password"] = hashed_password
        
    for field, value in update_data.items():
        setattr(current_user, field, value)
        
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user
