from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models
from app.api import deps
from .admin_users import get_admin_user

router = APIRouter()

@router.get("/settings")
def get_settings(
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    settings = db.query(models.SystemSetting).filter(models.SystemSetting.id == "singleton").first()
    if not settings:
        settings = models.SystemSetting(id="singleton")
        db.add(settings)
        db.commit()
        db.refresh(settings)
        
    return {
        "platformFeePercent": settings.platformFeePercent,
        "minHourlyRate": settings.minHourlyRate,
        "maintenanceMode": settings.maintenanceMode,
        "autoApproveJobs": settings.autoApproveJobs,
        "autoExpireJobs": settings.autoExpireJobs,
        "autoExpireDays": settings.autoExpireDays,
        "autoDeleteSpamJobs": settings.autoDeleteSpamJobs,
    }

@router.post("/settings")
def update_settings(
    payload: dict,
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    settings = db.query(models.SystemSetting).filter(models.SystemSetting.id == "singleton").first()
    if not settings:
        settings = models.SystemSetting(id="singleton")
        db.add(settings)
        
    for k, v in payload.items():
        if hasattr(settings, k):
            setattr(settings, k, v)
            
    db.commit()
    db.refresh(settings)
    return {
        "platformFeePercent": settings.platformFeePercent,
        "minHourlyRate": settings.minHourlyRate,
        "maintenanceMode": settings.maintenanceMode,
        "autoApproveJobs": settings.autoApproveJobs,
        "autoExpireJobs": settings.autoExpireJobs,
        "autoExpireDays": settings.autoExpireDays,
        "autoDeleteSpamJobs": settings.autoDeleteSpamJobs,
    }
