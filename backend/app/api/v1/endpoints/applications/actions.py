from .main import _load_owned_application
import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from app.core.limiter import limiter
from sqlalchemy.orm import Session

from app import models
from app.api import deps
from app.core.money import parse_salary_amounts, salary_to_uzs
from app.services.earnings_service import fee_for, job_fee_percent
from app.models.job import JobStatus
from app.services import job_days
from app.services.work_dates import get_job_dates_set

COMMITTED_APP_STATUSES = ['hired', 'confirmed', 'in_progress', 'start_requested']

logger = logging.getLogger(__name__)
router = APIRouter()












@limiter.limit('5/minute')
@router.post("/{id}/hire")
def hire_applicant(
    *,
    request: Request,
    db: Session = Depends(deps.get_db),
    id: str,
    current_user: models.User = Depends(deps.get_current_employer),
) -> Any:
    """Hire an applicant.

    Takes nothing from the employer. The wage is credited to the worker as
    each day is worked, and the company is invoiced for it afterwards.
    """
    app, _ = _load_owned_application(db, id, current_user)
    db.refresh(app)
    # Lock the job row to serialize hiring and prevent exceeding vacancies
    job = db.query(models.Job).filter(models.Job.id == app.jobId).populate_existing().with_for_update().first()

    if app.status in COMMITTED_APP_STATUSES:
        return {"success": True, "application_status": app.status}
    if app.status != 'applied':
        raise HTTPException(status_code=400, detail="Bu arizani yollab bo'lmaydi")
    if job.status in JobStatus.CLOSED_STATUSES:
        raise HTTPException(status_code=400, detail="Bu e'lon yopilgan")

    already_hired = (
        db.query(models.Application)
        .filter(
            models.Application.jobId == job.id,
            models.Application.status.in_(COMMITTED_APP_STATUSES + ['completed']),
        )
        .count()
    )
    vacancies = job.vacancies
    if already_hired >= vacancies:
        raise HTTPException(
            status_code=400,
            detail=f"Bu ish bo'yicha barcha {vacancies} ta o'rin to'lgan",
        )

    job_dates = get_job_dates_set(job)
    if job_dates:
        committed_jobs = (
            db.query(models.Job)
            .join(models.Application, models.Application.jobId == models.Job.id)
            .filter(
                models.Application.workerId == app.workerId,
                models.Application.id != app.id,
                models.Application.status.in_(COMMITTED_APP_STATUSES),
            )
            .all()
        )
        if any(job_dates & get_job_dates_set(other_job) for other_job in committed_jobs):
            raise HTTPException(
                status_code=400,
                detail="Ishchi bu kun uchun allaqachon tasdiqlangan ishga ega",
            )

    wage = salary_to_uzs(job.salary)
    if wage <= 0 and parse_salary_amounts(job.salary, bounded=False):
        # A figure was written but the parser cannot represent it, so the wage
        # collapses to zero. The worker would then be credited nothing while the
        # listing still advertised the full amount, and the worker was owed
        # nothing for the work. A salary with no figure at all ("kelishilgan
        # holda") is a different case and still hires, owing nothing fixed.
        raise HTTPException(
            status_code=400,
            detail="E'londagi maosh tizim qabul qila oladigan chegaradan tashqarida, "
                   "yollashdan oldin uni to'g'rilang",
        )

    # The wage on a posting is what one day is worth. A three-day shift is
    # three days of work and three days of pay, so it takes three holds — one
    # per day, each releasable on its own. Before this, hiring froze a single
    # day's wage for the whole run and the worker was paid once for all of it.
    days = job_days.sync_days(db, job)

    # What the posting will cost the company, day by day. Nothing is taken
    # now: the wage is credited to the worker as each day is worked, and the
    # company is invoiced for it afterwards. Money used to leave the employer's
    # balance here as well, and the invoice raised later billed the same shift
    # again with nothing ever giving the first back.
    day_count = max(1, len(days))
    fee_per_day = fee_for(wage, job_fee_percent(db, job))
    if wage > 0 and days:
        for day in days:
            # Pinned here rather than read from the posting later: an employer
            # editing the salary afterwards must not change what is owed for a
            # day already agreed.
            day.amount = wage
            db.add(day)

    app.status = "hired"
    job.status = JobStatus.CONFIRMED
    # The settlement task reads this to decide who to pay. Nothing wrote it,
    # so that task fell through "nobody to pay" on every run.
    if job.hiredWorkerId is None:
        job.hiredWorkerId = app.workerId
    db.add(job)
    db.add(app)

    db.add(models.Notification(
        id=str(uuid.uuid4()), userId=app.workerId, title="Sizni ishga qabul qilishdi!",
        message=f"'{job.title}' ishiga qabul qilindingiz. Tafsilotlarni ko'ring.",
        type="hired", relatedJobId=job.id,
    ))

    # A worker can only hold one job per day: withdraw their other pending
    # applications that collide with this job's date(s). They used to be
    # hard-deleted, which silently removed history the worker could see.
    if job_dates:
        other_apps = (
            db.query(models.Application)
            .filter(
                models.Application.workerId == app.workerId,
                models.Application.id != app.id,
                models.Application.status == "applied",
            )
            .all()
        )
        if other_apps:
            other_job_ids = {a.jobId for a in other_apps}
            other_job_map = {
                j.id: j
                for j in db.query(models.Job).filter(models.Job.id.in_(other_job_ids)).all()
            }
            for other_app in other_apps:
                other_j = other_job_map.get(other_app.jobId)
                if not other_j:
                    continue
                if job_dates & get_job_dates_set(other_j):
                    other_app.status = "withdrawn"
                    db.add(other_app)

    db.commit()
    db.refresh(app)

    return {
        "success": True,
        "application_status": "hired",
        # What actually left the employer's balance: the wage plus the
        # commission charged on top of it, for every day of the posting.
        "expected_invoice": (wage + fee_per_day) * day_count if wage > 0 else 0,
        "expected_wage": wage * day_count if wage > 0 else 0,
        "expected_fee": fee_per_day * day_count if wage > 0 else 0,
    }


@limiter.limit('10/minute')
@router.post("/{id}/reject")
def reject_applicant(
    *,
    request: Request,
    db: Session = Depends(deps.get_db),
    id: str,
    current_user: models.User = Depends(deps.get_current_employer),
) -> Any:
    """Reject an applicant for one of the caller's own jobs."""
    app, job = _load_owned_application(db, id, current_user)
    db.refresh(app)

    if app.status in COMMITTED_APP_STATUSES + ['completed']:
        raise HTTPException(
            status_code=400,
            detail="Yollangan ishchini rad etib bo'lmaydi, avval ishni bekor qiling",
        )

    app.status = "rejected"
    db.add(app)
    # The worker was previously never told; their application simply stopped
    # moving.
    db.add(models.Notification(
        id=str(uuid.uuid4()), userId=app.workerId, title="Ariza rad etildi",
        message=f"'{job.title}' ishi bo'yicha arizangiz rad etildi.",
        type="rejected", relatedJobId=job.id,
    ))
    db.commit()
    db.refresh(app)

    return {"success": True, "application_status": "rejected"}


@limiter.limit('10/minute')
@router.post("/{id}/withdraw")
def withdraw_application(
    *,
    request: Request,
    db: Session = Depends(deps.get_db),
    id: str,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """A worker withdraws their own pending application."""
    app = db.query(models.Application).filter(models.Application.id == id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Ariza topilmadi")

    worker_ids = [uid for uid in [current_user.id, getattr(current_user, 'uid', None)] if uid]
    if app.workerId not in worker_ids and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Bu arizani qaytarib olish huquqingiz yo'q")

    if app.status != "applied":
        raise HTTPException(
            status_code=400,
            detail="Faqat ko'rib chiqilayotgan (kutilayotgan) arizani qaytarib olish mumkin",
        )

    job = crud.job.get(db=db, id=app.jobId)
    app.status = "withdrawn"
    db.add(app)

    if job:
        db.add(models.Notification(
            id=str(uuid.uuid4()),
            userId=job.employerId,
            title="Ariza qaytarib olindi",
            message=f"Ishchi '{job.title}' ishiga topshirgan arizasini qaytarib oldi.",
            type="system",
            relatedJobId=job.id,
        ))

    db.commit()
    db.refresh(app)

    return {"success": True, "application_status": "withdrawn"}
