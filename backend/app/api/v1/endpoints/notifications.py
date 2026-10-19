from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps

router = APIRouter()


@router.get("/", response_model=List[schemas.Notification])
def read_notifications(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
) -> Any:
    """Retrieve notifications for the current user."""
    return crud.notification.get_multi_by_user(
        db=db, user_id=current_user.id, skip=skip, limit=limit
    )


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """How many notifications are still unread."""
    count = (
        db.query(func.count(models.Notification.id))
        .filter(
            models.Notification.userId == current_user.id,
            models.Notification.isRead == False,  # noqa: E712
        )
        .scalar()
    )
    return {"count": count or 0}


@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Mark all notifications as read."""
    crud.notification.mark_all_as_read(db=db, user_id=current_user.id)
    return {"success": True}


@router.post("/{notification_id}/read")
def mark_one_read(
    notification_id: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Mark a single notification as read.

    Only ``read-all`` existed, so opening one notification meant clearing the
    badge for every other one too.
    """
    notification = (
        db.query(models.Notification)
        .filter(
            models.Notification.id == notification_id,
            models.Notification.userId == current_user.id,
        )
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Bildirishnoma topilmadi")

    notification.isRead = True
    db.commit()
    return {"success": True}


@router.post("/", response_model=schemas.Notification)
def create_notification(
    *,
    db: Session = Depends(deps.get_db),
    notification_in: schemas.NotificationCreate,
    _: models.User = Depends(deps.get_current_admin),
) -> Any:
    """Create a notification for any user. Admin only — the payload names its
    own recipient, so letting ordinary users call this would allow spoofed
    messages."""
    return crud.notification.create(db=db, obj_in=notification_in)
