import logging
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.api import deps
from app.models.job import JobStatus
from app.services.ai_matcher import AIMatchmaker

logger = logging.getLogger(__name__)
router = APIRouter()

HIRED_STATUSES = ['hired', 'confirmed', 'completed', 'in_progress', 'start_requested']

# One counted view per viewer per job per hour.
VIEW_DEDUPE_TTL_SECONDS = 3600





@router.get("/recommended")
def get_recommended_jobs(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
    limit: int = Query(20, ge=1, le=50),
) -> Any:
    """AI-assisted job recommendations for the logged-in worker."""
    active_jobs = (
        db.query(models.Job)
        .filter(models.Job.status.in_(JobStatus.OPEN_STATUSES))
        .order_by(models.Job.createdAt.desc(), models.Job.id.desc())
        .limit(100)
        .all()
    )
    if not active_jobs:
        return []

    ranked = AIMatchmaker.rank_jobs_for_worker(current_user, active_jobs)

    # The admin panel's "minimum match threshold" used to be a slider bound to
    # React state and nothing else. It filters the recommendations now.
    row = (
        db.query(models.SystemSetting)
        .filter(models.SystemSetting.id == "singleton")
        .first()
    )
    threshold = getattr(row, "matchMinScore", None) if row else None
    if threshold:
        above = [item for item in ranked if item["match_score"] >= threshold]
        # Never hand back an empty screen because the threshold is set high;
        # fall back to the best matches there are.
        ranked = above or ranked[:limit]

    ranked = ranked[:limit]
    # Same serialisation problem as /nearby: the matcher returns ORM objects.
    return [
        {**item, "job": schemas.Job.model_validate(item["job"])}
        for item in ranked
    ]

















