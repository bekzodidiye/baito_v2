import logging
from typing import Any, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app import models
from app.api import deps
from app.models.job import JobStatus
from app.models.job_day import JobDayStatus
from app.services import job_days
from app.services.earnings_service import WorkerEarnings
from app.core.money import salary_to_uzs

from .admin_users import get_admin_user
from .audit import record_admin_action

logger = logging.getLogger(__name__)
router = APIRouter()

COMMITTED_APP_STATUSES = ['hired', 'confirmed', 'in_progress', 'start_requested']


class DisputeUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern="^(open|in_progress|pending|resolved|rejected|closed)$")
    adminNotes: Optional[str] = Field(None, max_length=2000)
    winner: Optional[str] = Field(None, pattern="^(employer|worker)$")


class DisputeResolve(BaseModel):
    winner: str = Field(pattern="^(employer|worker)$")
    reason: Optional[str] = Field(None, max_length=2000)


def _resolve_dispute(
    db: Session,
    dispute: models.Dispute,
    winner: str,
    reason: Optional[str],
    admin: models.User,
    request: Request,
) -> dict:
    job = db.query(models.Job).filter(models.Job.id == dispute.jobId).first()
    if not job:
        raise HTTPException(status_code=404, detail="Ish e'loni topilmadi")

    apps = (
        db.query(models.Application)
        .filter(
            models.Application.jobId == job.id,
            models.Application.status.in_(COMMITTED_APP_STATUSES + ['completed']),
        )
        .all()
    )

    target_worker_ids = [dispute.workerId] if dispute.workerId else [app.workerId for app in apps]
    disputed_apps = [a for a in apps if a.workerId in target_worker_ids] or apps

    now = datetime.now(timezone.utc)
    if winner == "worker":
        payable = job_days.payable_days(db, job.id)
        if payable:
            for day in payable:
                day.status = JobDayStatus.COMPLETED
                day.completedAt = now
                db.add(day)
                is_last_day = (day == payable[-1])
                for w_id in target_worker_ids:
                    try:
                        wage = int(day.amount) if getattr(day, "amount", None) else salary_to_uzs(job.salary)
                        WorkerEarnings.credit_worker(
                            db, job=job, worker_id=w_id, amount_uzs=wage, job_day_id=day.id, count_completed_job=is_last_day
                        )
                    except Exception as e:
                        logger.warning("Dispute credit failed for worker %s: %s", w_id, e)
        else:
            for w_id in target_worker_ids:
                try:
                    WorkerEarnings.credit_worker(
                        db, job=job, worker_id=w_id, amount_uzs=salary_to_uzs(job.salary), count_completed_job=True
                    )
                except Exception as e:
                    logger.warning("Dispute credit failed: %s", e)

        job.status = JobStatus.COMPLETED
        job.completedAt = now
        db.add(job)

        for app in disputed_apps:
            app.status = "completed"
            db.add(app)

        dispute.status = "resolved"
        dispute.adminNotes = reason or "Ishchi foydasiga hal qilindi"
        db.add(dispute)

        for w_id in target_worker_ids:
            db.add(models.Notification(
                userId=w_id,
                title="Nizo hal qilindi",
                message=f"'{job.title}' ishi bo'yicha nizo sizning foydangizga hal qilindi va to'lov hisobingizga o'tkazildi.",
                type="completed",
                relatedJobId=job.id,
            ))
        db.add(models.Notification(
            userId=job.employerId,
            title="Nizo hal qilindi",
            message=f"'{job.title}' ishi bo'yicha nizo ishchi foydasiga hal qilindi.",
            type="system",
            relatedJobId=job.id,
        ))
    else:  # winner == "employer"
        for day in job_days.days_of(db, job.id):
            if day.status == JobDayStatus.PENDING:
                day.status = JobDayStatus.CANCELLED
                db.add(day)

        job.status = JobStatus.CANCELLED
        db.add(job)

        for app in disputed_apps:
            app.status = "cancelled"
            db.add(app)

        dispute.status = "resolved"
        dispute.adminNotes = reason or "Ish beruvchi foydasiga hal qilindi"
        db.add(dispute)

        db.add(models.Notification(
            userId=job.employerId,
            title="Nizo hal qilindi",
            message=f"'{job.title}' ishi bo'yicha nizo sizning foydangizga hal qilindi.",
            type="system",
            relatedJobId=job.id,
        ))
        for w_id in target_worker_ids:
            db.add(models.Notification(
                userId=w_id,
                title="Nizo hal qilindi",
                message=f"'{job.title}' ishi bo'yicha nizo ish beruvchi foydasiga hal qilindi.",
                type="system",
                relatedJobId=job.id,
            ))

    record_admin_action(
        db, admin, "dispute.resolve", target_type="dispute", target_id=dispute.id,
        details={"winner": winner, "jobId": job.id, "reason": reason},
        request=request, note=reason,
    )
    db.commit()
    db.refresh(dispute)
    return {"success": True, "disputeStatus": dispute.status, "jobStatus": job.status}


@router.get("/disputes")
def get_disputes(
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    disputes = db.query(models.Dispute).all()

    job_ids = {d.jobId for d in disputes if d.jobId}
    employer_ids = {d.employerId for d in disputes if d.employerId}
    worker_ids = {d.workerId for d in disputes if d.workerId}

    jobs = {j.id: j for j in db.query(models.Job).filter(models.Job.id.in_(job_ids)).all()} if job_ids else {}
    users = {u.id: u for u in db.query(models.User).filter(models.User.id.in_(employer_ids | worker_ids)).all()} if employer_ids or worker_ids else {}

    result = []
    for d in disputes:
        job = jobs.get(d.jobId)
        employer = users.get(d.employerId)
        worker = users.get(d.workerId)
        result.append({
            "id": d.id,
            "jobId": d.jobId,
            "jobTitle": job.title if job else "",
            "employerId": d.employerId,
            "employerName": employer.name if employer else "",
            "workerId": d.workerId,
            "workerName": worker.name if worker else "",
            "reason": d.reason,
            "status": d.status,
            "adminNotes": d.adminNotes,
        })
    return result


@router.post("/disputes/{dispute_id}/resolve")
def resolve_dispute_endpoint(
    dispute_id: str,
    payload: DisputeResolve,
    request: Request,
    db: Session = Depends(deps.get_db),
    admin: models.User = Depends(get_admin_user),
) -> Any:
    dispute = db.query(models.Dispute).filter(models.Dispute.id == dispute_id).first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Nizo topilmadi")
    return _resolve_dispute(db, dispute, payload.winner, payload.reason, admin, request)


@router.patch("/disputes/{dispute_id}")
def update_dispute(
    dispute_id: str,
    payload: DisputeUpdate,
    request: Request,
    db: Session = Depends(deps.get_db),
    admin: models.User = Depends(get_admin_user),
) -> Any:
    dispute = db.query(models.Dispute).filter(models.Dispute.id == dispute_id).first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Nizo topilmadi")

    if payload.winner:
        return _resolve_dispute(db, dispute, payload.winner, payload.adminNotes, admin, request)

    old_status = dispute.status
    if payload.status is not None:
        dispute.status = payload.status
    if payload.adminNotes is not None:
        dispute.adminNotes = payload.adminNotes

    if payload.status and payload.status != old_status:
        notice_users = [uid for uid in (dispute.workerId, dispute.employerId) if uid]
        status_text = "hal qilindi" if payload.status == "resolved" else "rad etildi" if payload.status == "rejected" else payload.status
        for uid in notice_users:
            db.add(models.Notification(
                userId=uid,
                title="Nizo holati o'zgardi",
                message=f"Siz ishtirok etgan nizo bo'yicha qaror qabul qilindi: {status_text}.",
                type="system",
            ))

    record_admin_action(
        db, admin, "dispute.update", target_type="dispute", target_id=dispute.id,
        details={"oldStatus": old_status, "newStatus": dispute.status, "notes": dispute.adminNotes},
        request=request,
    )

    db.commit()
    return {"success": True}


