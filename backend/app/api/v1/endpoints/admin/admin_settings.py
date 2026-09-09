from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
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
    # The automation screens' controls. They had no storage at all, so every
    # one of them reset on reload.
    "spamKeywords",
    "spamAutoFineAmount",
    "spamAutoBanHours",
    "escrowAutoReleaseEnabled",
    "escrowAutoReleaseHours",
    "telegramDigestEnabled",
    "telegramDigestChannel",
    "matchMinScore",
    "matchMaxDistanceKm",
    "matchMinWorkerRating",
    "notifVerifiedTemplate",
    "notifRejectedTemplate",
    # Our own bank details. The payout invoice prints these; without storage
    # the account number would have to be hard-coded into the template.
    "payoutCompanyName",
    "payoutBankName",
    "payoutBankAccount",
    "payoutBankMfo",
    "payoutCompanyInn",
    "payoutCompanyAddress",
)


class SettingsPayload(BaseModel):
    platformFeePercent: Optional[int] = Field(default=None, ge=0, le=50)
    minHourlyRate: Optional[int] = Field(default=None, ge=0, le=10_000_000)
    maintenanceMode: Optional[bool] = None
    autoApproveJobs: Optional[bool] = None
    autoExpireJobs: Optional[bool] = None
    autoExpireDays: Optional[int] = Field(default=None, ge=1, le=365)
    autoDeleteSpamJobs: Optional[bool] = None

    # Newline-separated; stored as text so the list can be edited as a whole.
    spamKeywords: Optional[str] = Field(default=None, max_length=8000)
    spamAutoFineAmount: Optional[int] = Field(default=None, ge=0, le=100_000_000)
    spamAutoBanHours: Optional[int] = Field(default=None, ge=0, le=8760)
    escrowAutoReleaseEnabled: Optional[bool] = None
    escrowAutoReleaseHours: Optional[int] = Field(default=None, ge=1, le=720)
    telegramDigestEnabled: Optional[bool] = None
    telegramDigestChannel: Optional[str] = Field(default=None, max_length=200)
    matchMinScore: Optional[int] = Field(default=None, ge=0, le=100)
    matchMaxDistanceKm: Optional[int] = Field(default=None, ge=1, le=1000)
    matchMinWorkerRating: Optional[float] = Field(default=None, ge=0, le=5)
    notifVerifiedTemplate: Optional[str] = Field(default=None, max_length=1000)
    notifRejectedTemplate: Optional[str] = Field(default=None, max_length=1000)
    payoutCompanyName: Optional[str] = Field(default=None, max_length=200)
    payoutBankName: Optional[str] = Field(default=None, max_length=200)
    payoutBankAccount: Optional[str] = Field(default=None, max_length=40)
    payoutBankMfo: Optional[str] = Field(default=None, max_length=20)
    payoutCompanyInn: Optional[str] = Field(default=None, max_length=20)
    payoutCompanyAddress: Optional[str] = Field(default=None, max_length=500)


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


@router.post("/reports/digest")
def send_digest_now(
    db: Session = Depends(deps.get_db),
    admin: models.User = Depends(get_admin_user),
) -> Any:
    """Send the Telegram digest immediately.

    The button for this used to set a flag and pop "muvaffaqiyatli yuborildi"
    after 1.2 seconds without sending anything, so an administrator was told a
    message had gone out that never had.
    """
    from app.tasks import send_telegram_digest

    row = _get_or_create(db)
    if not row.telegramDigestEnabled or not row.telegramDigestChannel:
        raise HTTPException(
            status_code=400,
            detail="Avval Telegram kanalini kiriting va hisobotni yoqing",
        )

    sent = bool(send_telegram_digest())
    if not sent:
        raise HTTPException(
            status_code=502,
            detail="Hisobotni yuborib bo'lmadi. Kanal nomi va bot sozlamalarini tekshiring.",
        )
    return {"success": True, "channel": row.telegramDigestChannel}
