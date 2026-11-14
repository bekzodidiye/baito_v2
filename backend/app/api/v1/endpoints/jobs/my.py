import logging
from typing import Any, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.api import deps

logger = logging.getLogger(__name__)
router = APIRouter()

HIRED_STATUSES = ['hired', 'confirmed', 'completed', 'in_progress', 'start_requested']

# One counted view per viewer per job per hour.
VIEW_DEDUPE_TTL_SECONDS = 3600









@router.get("/my", response_model=List[schemas.JobWithApplicationStatus])
def get_my_jobs(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
) -> Any:
    """Retrieve all jobs posted by the currently authenticated employer only."""
    employer_ids = [uid for uid in [current_user.id, getattr(current_user, 'uid', None)] if uid]

    jobs = (
        db.query(models.Job)
        .filter(models.Job.employerId.in_(employer_ids))
        .order_by(models.Job.createdAt.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    job_ids = [j.id for j in jobs]
    apps = (
        db.query(models.Application)
        .filter(
            models.Application.jobId.in_(job_ids),
            models.Application.status.in_(["hired", "confirmed", "in_progress", "completed", "start_requested"]),
        )
        .all()
    ) if job_ids else []

    hired_counts = {}
    job_hired_workers = {}
    if apps:
        for a in apps:
            hired_counts[a.jobId] = hired_counts.get(a.jobId, 0) + 1

        worker_ids = list({a.workerId for a in apps if a.workerId})
        if worker_ids:
            hired_users = db.query(models.User).filter(models.User.id.in_(worker_ids)).all()
            user_map = {u.id: u for u in hired_users}
            for a in apps:
                u = user_map.get(a.workerId)
                if u:
                    job_hired_workers.setdefault(a.jobId, []).append({
                        "id": u.id,
                        "name": u.name or "Foydalanuvchi",
                        "phone": None,
                        "avatarUrl": u.avatarUrl,
                    })

    # One query for every job on the page rather than one per card. Only jobs
    # that have actually been invoiced appear here; the rest get None, which is
    # what tells the card there is nothing to pay yet.
    payouts = {}
    if job_ids:
        for p in (
            db.query(models.JobPayout)
            .filter(models.JobPayout.jobId.in_(job_ids))
            .order_by(models.JobPayout.paidAt.asc())
            .all()
        ):
            if p.invoiceNumber:
                payouts[p.jobId] = p

    result = []
    for job in jobs:
        vacancies_num = job.vacancies
        hired_cnt = hired_counts.get(job.id, 0)

        job_data = schemas.Job.model_validate(job).model_dump()
        job_data.update({
            "applied": False,
            "bookmarked": False,
            "hiredCount": hired_cnt,
            "vacancies": vacancies_num,
            "appliedDate": None,
            "hiredWorkers": job_hired_workers.get(job.id, []),
        })

        payout = payouts.get(job.id)
        job_data.update({
            "payoutStatus": payout.status if payout else None,
            "invoiceNumber": payout.invoiceNumber if payout else None,
            "invoiceAmount": (payout.invoiceAmount or payout.amount) if payout else None,
        })
        result.append(job_data)

    return result













