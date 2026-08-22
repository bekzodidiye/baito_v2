from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models
from app.api import deps
from .admin_users import get_admin_user

router = APIRouter()

@router.get("/regions")
def get_regions(
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    regions = db.query(models.Region).all()
    result = []
    for r in regions:
        result.append({
            "id": r.id,
            "name": r.name,
            "type": r.type,
            "parentId": r.parentId,
            "isActive": r.isActive,
        })
    return result

@router.post("/regions")
def create_region(
    payload: dict,
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    reg = models.Region(
        name=payload.get("name"),
        type=payload.get("type", "region"),
        parentId=payload.get("parentId"),
        isActive=payload.get("isActive", True),
    )
    db.add(reg)
    db.commit()
    db.refresh(reg)
    return {
        "id": reg.id,
        "name": reg.name,
        "type": reg.type,
        "parentId": reg.parentId,
        "isActive": reg.isActive,
    }

@router.delete("/regions/{region_id}")
def delete_region(
    region_id: str,
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    reg = db.query(models.Region).filter(models.Region.id == region_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Hudud topilmadi")
    db.delete(reg)
    db.commit()
    return {"success": True}

@router.patch("/regions/{region_id}")
def update_region(
    region_id: str,
    payload: dict,
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    reg = db.query(models.Region).filter(models.Region.id == region_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Hudud topilmadi")
        
    if "isActive" in payload:
        reg.isActive = payload["isActive"]
    db.commit()
    db.refresh(reg)
    return {"success": True}
