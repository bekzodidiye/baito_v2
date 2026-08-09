from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models
from app.api import deps
from .admin_users import get_admin_user

router = APIRouter()

@router.get("/categories")
def get_categories(
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    cats = db.query(models.Category).all()
    result = []
    for c in cats:
        result.append({
            "id": c.id,
            "name": c.name,
            "icon": c.icon,
            "description": c.description,
            "commissionPercent": c.commissionPercent,
            "skills": c.skills,
            "activeWorkersCount": c.activeWorkersCount,
            "activeJobsCount": c.activeJobsCount,
        })
    return result

@router.post("/categories")
def create_category(
    payload: dict,
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    cat = models.Category(
        name=payload.get("name"),
        icon=payload.get("icon"),
        description=payload.get("description"),
        commissionPercent=payload.get("commissionPercent", 0),
        skills=payload.get("skills", []),
        activeWorkersCount=payload.get("activeWorkersCount", 0),
        activeJobsCount=payload.get("activeJobsCount", 0),
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return {
        "id": cat.id,
        "name": cat.name,
        "icon": cat.icon,
        "description": cat.description,
        "commissionPercent": cat.commissionPercent,
        "skills": cat.skills,
        "activeWorkersCount": cat.activeWorkersCount,
        "activeJobsCount": cat.activeJobsCount,
    }

@router.delete("/categories/{cat_id}")
def delete_category(
    cat_id: str,
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    cat = db.query(models.Category).filter(models.Category.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Kategoriya topilmadi")
    db.delete(cat)
    db.commit()
    return {"success": True}
