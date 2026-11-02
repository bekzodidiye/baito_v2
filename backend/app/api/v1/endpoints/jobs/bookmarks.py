from typing import Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.api import deps

router = APIRouter()

@router.get("/bookmarked", response_model=List[schemas.Job])
def get_bookmarked_jobs(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """The jobs this user has saved."""
    user_ids = [uid for uid in [current_user.id, getattr(current_user, 'uid', None)] if uid]
    return (
        db.query(models.Job)
        .join(models.Bookmark, models.Bookmark.jobId == models.Job.id)
        .filter(models.Bookmark.userId.in_(user_ids))
        .order_by(models.Bookmark.createdAt.desc())
        .all()
    )
