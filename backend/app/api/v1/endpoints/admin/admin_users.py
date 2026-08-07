from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models
from app.api import deps
from app.core.security import get_password_hash
import uuid

router = APIRouter()

def get_admin_user(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> models.User:
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin huquqi talab etiladi")
    return current_user


@router.get("/users")
def get_users(
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
    skip: int = 0,
    limit: int = 200,
) -> Any:
    users = db.query(models.User).offset(skip).limit(limit).all()
    result = []
    for u in users:
        result.append({
            "id": u.id,
            "name": u.name,
            "phone": u.phone,
            "email": u.email,
            "role": u.role,
            "companyName": u.companyName,
            "avatarUrl": u.avatarUrl,
            "balance": u.balance,
            "isBanned": u.isBanned,
            "isVerified": u.isVerified,
            "createdAt": str(u.createdAt) if u.createdAt else None,
            "region": u.region,
            "category": u.category,
            "bio": u.bio,
            "skills": u.skills,
            "rating": u.rating,
            "completedJobsCount": u.completedJobsCount,
            "passportSeries": u.passportSeries,
            "passportJshshir": u.passportJshshir,
            "passportDocFront": u.passportDocFront,
            "passportDocBack": u.passportDocBack,
            "selfieWithDoc": u.selfieWithDoc,
            "bankCardMask": u.bankCardMask,
            "sourceApp": u.sourceApp,
        })
    return result


@router.patch("/users/{user_id}/ban")
def ban_user(
    user_id: str,
    payload: dict,
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    user.isBanned = payload.get("isBanned", False)
    db.commit()
    return {"success": True, "isBanned": user.isBanned}


@router.patch("/users/{user_id}/role")
@router.post("/users/{user_id}/role")
def change_role(
    user_id: str,
    payload: dict,
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    if "role" in payload:
        user.role = payload["role"]
    if "isVerified" in payload:
        user.isVerified = payload["isVerified"]
    db.commit()
    return {"success": True, "role": user.role, "isVerified": user.isVerified}


@router.post("/users/{user_id}/balance")
def add_balance(
    user_id: str,
    payload: dict,
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    amount = payload.get("amount", 0)
    current = user.balance or 0
    user.balance = current + amount
    db.commit()
    return {"success": True, "balance": user.balance}


@router.post("/admin-user")
def create_admin_user(
    payload: dict,
    db: Session = Depends(deps.get_db),
) -> Any:
    existing = db.query(models.User).filter(models.User.role == 'admin').first()
    if existing:
        raise HTTPException(status_code=400, detail="Admin foydalanuvchi allaqachon mavjud")
    
    admin = models.User(
        id=str(uuid.uuid4()),
        uid=str(uuid.uuid4()),
        email=payload.get("email", "admin@baito.uz"),
        hashed_password=get_password_hash(payload.get("password", "admin123")),
        name=payload.get("name", "Admin"),
        phone=payload.get("phone", "admin"),
        role="admin",
        balance=0,
        isBanned=False,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return {"success": True, "id": admin.id, "email": admin.email}
