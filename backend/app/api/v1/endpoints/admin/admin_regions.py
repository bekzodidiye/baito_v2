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
            "commissionPercent": r.commissionPercent,
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
        # The region half of the employer's commission; the category carries the
        # other half and a job is charged their sum.
        commissionPercent=payload.get("commissionPercent", 0) or 0,
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
        "commissionPercent": reg.commissionPercent,
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
    if "commissionPercent" in payload:
        # Bounded the same way the platform-wide rate is: a value typed by hand
        # must not be able to pay a worker a negative wage.
        try:
            reg.commissionPercent = max(0.0, min(100.0, float(payload["commissionPercent"])))
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Komissiya foizi noto'g'ri")
    db.commit()
    db.refresh(reg)
    return {"success": True}
