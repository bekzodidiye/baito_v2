from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models
from app.api import deps
from .admin_users import get_admin_user
import datetime

router = APIRouter()

@router.get("/promotions")
def get_promotions(
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    promos = db.query(models.Promotion).all()
    result = []
    for p in promos:
        result.append({
            "id": p.id,
            "code": p.code,
            "discountType": p.discountType,
            "amount": p.amount,
            "usageCount": p.usageCount,
            "maxUsage": p.maxUsage,
            "expiresAt": p.expiresAt,
            "isActive": p.isActive,
            "forNewUsersOnly": p.forNewUsersOnly,
        })
    return result

@router.post("/promotions")
def create_promotion(
    payload: dict,
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    promo = models.Promotion(
        code=payload.get("code"),
        discountType=payload.get("discountType"),
        amount=payload.get("amount"),
        usageCount=payload.get("usageCount", 0),
        maxUsage=payload.get("maxUsage", 100),
        expiresAt=payload.get("expiresAt"),
        isActive=payload.get("isActive", True),
        forNewUsersOnly=payload.get("forNewUsersOnly", False),
    )
    db.add(promo)
    db.commit()
    db.refresh(promo)
    return {
        "id": promo.id,
        "code": promo.code,
        "discountType": promo.discountType,
        "amount": promo.amount,
        "usageCount": promo.usageCount,
        "maxUsage": promo.maxUsage,
        "expiresAt": promo.expiresAt,
        "isActive": promo.isActive,
        "forNewUsersOnly": promo.forNewUsersOnly,
    }

@router.delete("/promotions/{promo_id}")
def delete_promotion(
    promo_id: str,
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    promo = db.query(models.Promotion).filter(models.Promotion.id == promo_id).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Promokod topilmadi")
    db.delete(promo)
    db.commit()
    return {"success": True}

@router.patch("/promotions/{promo_id}")
def update_promotion(
    promo_id: str,
    payload: dict,
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    promo = db.query(models.Promotion).filter(models.Promotion.id == promo_id).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Promokod topilmadi")
        
    if "isActive" in payload:
        promo.isActive = payload["isActive"]
    db.commit()
    db.refresh(promo)
    return {"success": True}
