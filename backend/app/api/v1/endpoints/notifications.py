from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, models, schemas
from app.api import deps

router = APIRouter()

@router.get("", response_model=List[schemas.Notification])
def read_notifications(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve notifications for current user.
    """
    return crud.notification.get_multi_by_user(db=db, user_id=current_user.id)

@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Mark all notifications as read.
    """
    crud.notification.mark_all_as_read(db=db, user_id=current_user.id)
    return {"success": True}

@router.post("", response_model=schemas.Notification)
def create_notification(
    *,
    db: Session = Depends(deps.get_db),
    notification_in: schemas.NotificationCreate,
    _: models.User = Depends(deps.get_current_admin),
) -> Any:
    """
    Create a notification for any user. Admin only — the payload names its own
    recipient, so letting ordinary users call this would allow spoofed messages.
    """
    return crud.notification.create(db=db, obj_in=notification_in)
