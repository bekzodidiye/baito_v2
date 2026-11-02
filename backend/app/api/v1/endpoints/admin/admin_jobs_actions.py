from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app import models
from app.api import deps
from app.core.money import salary_to_uzs
from app.models.job import JobStatus
from app.models.job_day import JobDayStatus
from app.services import job_days

from .admin_users import get_admin_user
from .audit import record_admin_action

router = APIRouter()

VALID_STATUSES = {
    JobStatus.OPEN, JobStatus.CONFIRMED, JobStatus.IN_PROGRESS,
    JobStatus.COMPLETED, JobStatus.CANCELLED,
}


class JobStatusPayload(BaseModel):
    status: str
    reason: Optional[str] = Field(default=None, max_length=500)


class JobWorkerPayload(BaseModel):
    workerId: Optional[str] = None
    reason: Optional[str] = Field(default=None, max_length=500)












@router.patch("/jobs/{job_id}/status")
def change_job_status(
    job_id: str,
    payload: JobStatusPayload,
    request: Request,
    db: Session = Depends(deps.get_db),
    admin: models.User = Depends(get_admin_user),
) -> Any:
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Ish topilmadi")

    # An untyped dict used to let any string through, so a typo could put a
    # job into a status no query would ever match again.
    if payload.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Noma'lum holat. Ruxsat etilgan: {', '.join(sorted(VALID_STATUSES))}",
        )

    # Marking a posting finished from this dropdown used to set the column and
    # nothing else: the day rows stayed pending and the worker was credited for
    # none of them. The posting read as done while nobody was owed anything —
    # production has one in exactly that state.
    #
    # Rather than credit somebody from a status dropdown, this refuses and
    # points at the flow that settles the work properly. Completing a day is
    # what credits that day's wage, and only the employer finishing the work
    # can say it happened.
    if payload.status == JobStatus.COMPLETED and job.status != JobStatus.COMPLETED:
        payable = job_days.payable_days(db, job.id)
        if payable:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Bu ishning {len(payable)} kuni hali yakunlanmagan. Holatni "
                    "shu yerdan o'zgartirish ishchiga hech narsa hisoblamaydi. "
                    "Ishni kunlar bo'yicha yakunlang yoki bekor qiling."
                ),
            )

    previous = job.status
    job.status = payload.status

    if payload.status == JobStatus.OPEN:
        job.hiredWorkerId = None
        active_apps = (
            db.query(models.Application)
            .filter(
                models.Application.jobId == job_id,
                models.Application.status.in_(["hired", "confirmed", "in_progress", "start_requested", "completed"]),
            )
            .all()
        )
        for app in active_apps:
            app.status = "rejected"
            db.add(models.Notification(
                userId=app.workerId,
                title="Ish holati o'zgardi",
                message=f"'{job.title}' ishi qaytadan ochiq holatga o'tkazildi.",
                type="system",
                relatedJobId=job.id,
            ))
    elif payload.status == JobStatus.CANCELLED:
        job.hiredWorkerId = None
        active_apps = (
            db.query(models.Application)
            .filter(
                models.Application.jobId == job_id,
                models.Application.status.in_(["hired", "confirmed", "in_progress", "start_requested"]),
            )
            .all()
        )
        for app in active_apps:
            app.status = "cancelled"

        # The employer's own cancel closes the days; doing it from here has
        # to mean the same thing, or a cancelled posting keeps offering work.

        for day in job_days.days_of(db, job.id):
            if day.status == JobDayStatus.PENDING:
                day.status = JobDayStatus.CANCELLED
                db.add(day)

    record_admin_action(
        db, admin, "job.status", target_type="job", target_id=job.id,
        details={"from": previous, "to": payload.status},
        request=request, note=payload.reason,
    )
    db.commit()
    return {"success": True, "status": job.status}


@router.patch("/jobs/{job_id}/worker")
def change_job_worker(
    job_id: str,
    payload: JobWorkerPayload,
    request: Request,
    db: Session = Depends(deps.get_db),
    admin: models.User = Depends(get_admin_user),
) -> Any:
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Ish topilmadi")

    worker = None
    worker_ids = []
    if payload.workerId:
        worker = db.query(models.User).filter(or_(models.User.id == payload.workerId, models.User.uid == payload.workerId)).first()
        if not worker:
            raise HTTPException(status_code=404, detail="Ishchi topilmadi")
        if worker.role != "worker":
            raise HTTPException(status_code=400, detail="Bu foydalanuvchi ishchi emas")
        worker_ids = [uid for uid in [worker.id, getattr(worker, 'uid', None)] if uid]
        new_worker_id = worker.id
    else:
        new_worker_id = None

    current_apps = (
        db.query(models.Application)
        .filter(
            models.Application.jobId == job_id,
            models.Application.status.in_(["hired", "confirmed", "in_progress", "start_requested", "completed"]),
        )
        .all()
    )
    for app in current_apps:
        if app.workerId not in worker_ids:
            app.status = "rejected"
            db.add(models.Notification(
                userId=app.workerId,
                title="Ish tayinlanishi o'zgardi",
                message=f"'{job.title}' ishi bo'yicha tayinlov administrator tomonidan o'zgartirildi.",
                type="system",
                relatedJobId=job.id,
            ))

    if new_worker_id:
        new_app = (
            db.query(models.Application)
            .filter(
                models.Application.jobId == job_id,
                models.Application.workerId.in_(worker_ids),
            )
            .first()
        )
        if new_app:
            new_app.status = "hired"
        else:
            db.add(models.Application(jobId=job_id, workerId=new_worker_id, status="hired"))

        db.add(models.Notification(
            userId=new_worker_id,
            title="Sizni ishga tayinlashdi",
            message=f"'{job.title}' ishiga administrator tomonidan tayinlandingiz.",
            type="hired",
            relatedJobId=job.id,
        ))

        job.hiredWorkerId = new_worker_id
        if job.status == JobStatus.OPEN:
            job.status = JobStatus.CONFIRMED

        # The wage each day is worth, pinned now rather than read from the
        # posting later: editing the salary afterwards must not restate a day
        # already agreed. Nothing is taken from the employer — the worker is
        # credited as each day is worked, and the company invoiced after.
        wage = salary_to_uzs(job.salary)
        if wage > 0:
            for day in job_days.sync_days(db, job):
                if not day.amount:
                    day.amount = wage
                    db.add(day)

    else:
        job.hiredWorkerId = None
        if job.status != JobStatus.CANCELLED:
            job.status = JobStatus.OPEN


    record_admin_action(
        db, admin, "job.worker", target_type="job", target_id=job.id,
        details={"workerId": new_worker_id}, request=request, note=payload.reason,
    )
    db.commit()
    return {"success": True}


@router.delete("/jobs/{job_id}")
def delete_job(
    job_id: str,
    request: Request,
    db: Session = Depends(deps.get_db),
    admin: models.User = Depends(get_admin_user),
) -> Any:
    """Cancel a job.

    ``db.delete(job)`` left applications, chats, bookmarks and transactions
    pointing at a missing row — and on PostgreSQL the foreign keys made the
    delete fail outright once anyone had applied.
    """
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Ish topilmadi")

    affected = (
        db.query(models.Application)
        .filter(
            models.Application.jobId == job_id,
            models.Application.status.notin_(["rejected", "cancelled", "completed"]),
        )
        .all()
    )
    for app in affected:
        app.status = "cancelled"
        db.add(models.Notification(
            userId=app.workerId,
            title="Ish e'loni bekor qilindi",
            message=f"'{job.title}' e'loni administrator tomonidan bekor qilindi.",
            type="system",
            relatedJobId=job.id,
        ))

    job.status = JobStatus.CANCELLED

    record_admin_action(
        db, admin, "job.cancel", target_type="job", target_id=job.id,
        details={"affectedApplications": len(affected)}, request=request,
    )
    db.commit()
    return {"success": True, "status": JobStatus.CANCELLED}
