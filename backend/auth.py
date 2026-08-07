from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session
from .database import get_db
from .models import User

async def get_current_user(
    x_user_role: str = Header("worker"),
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    uid = None
    if authorization and authorization.startswith("Bearer "):
        uid = authorization.split("Bearer ")[1]

    if uid:
        user = db.query(User).filter(User.uid == uid).first()
        if user:
            return user
    
    # Fallback to role-based selection for development if UID is not found or not provided
    user = db.query(User).filter(User.role == x_user_role).first()
    if user:
        return user
        
    raise HTTPException(status_code=401, detail="Unauthorized")
