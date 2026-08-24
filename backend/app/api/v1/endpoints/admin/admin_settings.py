from typing import Any, Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app import models
from app.api import deps

from .admin_users import get_admin_user
from .audit import record_admin_action

router = APIRouter()

SETTING_FIELDS = (
    "platformFeePercent",
    "minHourlyRate",
    "maintenanceMode",
    "autoApproveJobs",
    "autoExpireJobs",
    "autoExpireDays",
    "autoDeleteSpamJobs",
)


class SettingsPayload(BaseModel):
    platformFeePercent: Optional[int] = Field(default=None, ge=0, le=50)
    minHourlyRate: Optional[int] = Field(default=None, ge=0, le=10_000_000)
    maintenanceMode: Optional[bool] = None
    autoApproveJobs: Optional[bool] = None
    autoExpireJobs: Optional[bool] = None
    autoExpireDays: Optional[int] = Field(default=None, ge=1, le=365)
    autoDeleteSpamJobs: Optional[bool] = None


def _get_or_create(db: Session) -> models.SystemSetting:
    settings_row = (
        db.query(models.SystemSetting)
        .filter(models.SystemSetting.id == "singleton")
        .first()
    )
    if not settings_row:
        settings_row = models.SystemSetting(id="singleton")
        db.add(settings_row)
        db.commit()
        db.refresh(settings_row)
    return settings_row


def _serialize(row: models.SystemSetting) -> dict:
    return {field: getattr(row, field) for field in SETTING_FIELDS}


@router.get("/settings")
def get_settings(
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    return _serialize(_get_or_create(db))


@router.post("/settings")
@router.put("/settings")
def update_settings(
    payload: SettingsPayload,
    request: Request,
    db: Session = Depends(deps.get_db),
    admin: models.User = Depends(get_admin_user),
) -> Any:
    row = _get_or_create(db)

    changes = {}
    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is None:
            continue
        current = getattr(row, field)
        if current != value:
            changes[field] = {"from": current, "to": value}
        setattr(row, field, value)

    if changes:
        record_admin_action(
            db, admin, "settings.update", target_type="settings",
            target_id="singleton", details=changes, request=request,
        )

    db.commit()
    db.refresh(row)
    return _serialize(row)
