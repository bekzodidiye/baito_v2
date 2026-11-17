import logging
import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from app.core.limiter import limiter
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app import models, crud
from app.api import deps
from app.services.job_service import JobService, COMMITTED_APP_STATUSES
from app.services.earnings_service import WorkerEarnings
from app.models.job import JobStatus
from app.models.job_payout import PayoutStatus
from datetime import datetime, timezone
from app.core.map_cache import invalidate_user_map_cache

logger = logging.getLogger(__name__)
router = APIRouter()


class JobCompleteRequest(BaseModel):
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    review: Optional[str] = Field(default=None, max_length=2000)
    bonus: Optional[int] = Field(default=0, ge=0, le=50_000_000)


class JobReviewRequest(BaseModel):
    rating: int = Field(ge=1, le=5)
    review: str = Field(min_length=3, max_length=2000)
    bonus: Optional[int] = Field(default=0, ge=0, le=50_000_000)
    applicationId: Optional[str] = None


class JobDisputeRequest(BaseModel):
    reason: str = Field(min_length=5, max_length=2000)


class PayoutDeclarationRequest(BaseModel):
    method: str = Field(min_length=1, max_length=40)
    reference: Optional[str] = Field(default=None, max_length=120)
    receiptUrl: Optional[str] = Field(default=None, max_length=500)


@limiter.limit('5/minute')
@router.post("/{id}/apply")
def apply_to_job(
    *,
    request: Request,
    db: Session = Depends(deps.get_db),
    id: str,
    current_user: models.User = Depends(deps.get_verified_worker),
) -> Any:
    return JobService.apply_to_job(db, id, current_user)


@limiter.limit('10/minute')
@router.post("/{id}/request-start")
def request_start_job(
    *,
    request: Request,
    db: Session = Depends(deps.get_db),
    id: str,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    return JobService.request_start_job(db, id, current_user)


@limiter.limit('10/minute')
@router.post("/{id}/confirm-start")
@router.post("/{id}/start")
def confirm_start_job(
    *,
    request: Request,
    db: Session = Depends(deps.get_db),
    id: str,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    return JobService.confirm_start_job(db, id, current_user)


@router.get("/{id}/days")
def list_job_days(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    from app.services import job_days as job_days_service
    job = crud.job.get(db=db, id=id)
    if not job:
        raise HTTPException(status_code=404, detail="Ish e'loni topilmadi")
    return [job_days_service.serialise(d) for d in job_days_service.days_of(db, job.id)]


@limiter.limit('20/minute')
@router.post("/{id}/days/{day_id}/complete")
def complete_job_day(
    *,
    request: Request,
    db: Session = Depends(deps.get_db),
    id: str,
    day_id: str,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    return JobService.complete_job_day(db, id, day_id, current_user)


@limiter.limit('10/minute')
@router.post("/{id}/complete")
def complete_job(
    *,
    request: Request,
    db: Session = Depends(deps.get_db),
    id: str,
    req: JobCompleteRequest,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    return JobService.complete_job(db, id, req.rating, req.review, req.bonus, current_user)


@limiter.limit('5/hour')
@router.post("/{id}/dispute")
def dispute_job(
    *,
    request: Request,
    db: Session = Depends(deps.get_db),
    id: str,
    payload: JobDisputeRequest,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    job = JobService.get_job_or_fail(db, id)
    user_ids = [uid for uid in [current_user.id, getattr(current_user, 'uid', None)] if uid]
    is_employer = job.employerId in user_ids or current_user.role == 'admin'

    caller_apps = (
        db.query(models.Application)
        .filter(
            models.Application.jobId == id,
            models.Application.workerId.in_(user_ids),
            models.Application.status.in_(COMMITTED_APP_STATUSES + ['completed']),
        )
        .all()
    )
    is_worker = bool(caller_apps)

    if not is_employer and not is_worker:
        raise HTTPException(
            status_code=403,
            detail="Faqat ushbu ishning ish beruvchisi yoki tayinlangan ishchisi nizo ochishi mumkin",
        )

    if job.status == JobStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Bekor qilingan ish bo'yicha nizo ochib bo'lmaydi")

    if job.status == "dispute":
        raise HTTPException(status_code=400, detail="Ushbu ish bo'yicha faol nizo allaqachon ko'rib chiqilmoqda")

    existing_dispute = (
        db.query(models.Dispute)
        .filter(
            models.Dispute.jobId == id,
            models.Dispute.status.in_(["open", "in_progress", "pending"]),
        )
        .first()
    )
    if existing_dispute:
        raise HTTPException(
            status_code=400,
            detail="Ushbu ish bo'yicha faol nizo allaqachon ko'rib chiqilmoqda",
        )

    worker_id = None
    if is_worker:
        worker_id = current_user.id
    elif job.hiredWorkerId:
        worker_id = job.hiredWorkerId
    else:
        hired_app = (
            db.query(models.Application)
            .filter(
                models.Application.jobId == id,
                models.Application.status.in_(COMMITTED_APP_STATUSES + ['completed']),
            )
            .first()
        )
        if hired_app:
            worker_id = hired_app.workerId

    if not worker_id:
        raise HTTPException(
            status_code=400,
            detail="Ishda tayinlangan ishchi yo'q, nizo ochish mumkin emas",
        )

    dispute = models.Dispute(
        id=str(uuid.uuid4()),
        jobId=job.id,
        employerId=job.employerId,
        workerId=worker_id,
        reason=payload.reason.strip(),
        status="open",
    )
    db.add(dispute)

    job.status = "dispute"
    db.add(job)

    admins = db.query(models.User).filter(models.User.role == "admin").all()
    for a in admins:
        db.add(models.Notification(
            id=str(uuid.uuid4()),
            userId=a.id,
            title="Yangi nizo kelib tushdi",
            message=f"'{job.title}' ishi bo'yicha nizo ochildi. Sabab: {payload.reason[:100]}",
            type="dispute",
            relatedJobId=job.id,
        ))

    counterpart_id = worker_id if is_employer else job.employerId
    if counterpart_id:
        db.add(models.Notification(
            id=str(uuid.uuid4()),
            userId=counterpart_id,
            title="Ish bo'yicha nizo ochildi",
            message=f"'{job.title}' ishi bo'yicha nizo ochildi va moderatorlar ko'rib chiqmoqda.",
            type="dispute",
            relatedJobId=job.id,
        ))

    db.commit()
    db.refresh(dispute)
    return {
        "success": True,
        "disputeId": dispute.id,
        "status": dispute.status,
        "jobStatus": job.status,
    }



@router.post("/{id}/review")
def review_job(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    req: JobReviewRequest,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    job = crud.job.get(db, id=id)
    if not job:
        raise HTTPException(status_code=404, detail="Ish e'loni topilmadi")
    is_employer = job.employerId in (current_user.id, getattr(current_user, 'uid', None)) or current_user.role == 'admin'
    if not is_employer:
        raise HTTPException(status_code=403, detail="Faqat ish beruvchi sharh qoldira oladi")

    from app.models.job import JobStatus
    if job.status != JobStatus.COMPLETED:
        return JobService.complete_job(db, id, req.rating, req.review, req.bonus, current_user)

    apps_query = db.query(models.Application).filter(
        models.Application.jobId == id,
        models.Application.status.in_(["completed", "in_progress", "hired", "confirmed"]),
    )
    if req.applicationId:
        apps_query = apps_query.filter(models.Application.id == req.applicationId)
    apps = apps_query.all()
    if not apps:
        raise HTTPException(status_code=400, detail="Sharh qoldirish uchun ariza topilmadi")

    bonus_each = req.bonus or 0
    worker_ids = [app.workerId for app in apps]
    workers_map = {w.id: w for w in db.query(models.User).filter(models.User.id.in_(worker_ids)).all()}

    for app in apps:
        app.status = "completed"
        app.rating = req.rating
        app.review = req.review
        if bonus_each > 0:
            app.bonus = (app.bonus or 0) + bonus_each
            try:
                WorkerEarnings.pay_completion_bonus(
                    db, job=job, worker_id=app.workerId, amount_uzs=bonus_each,
                )
            except Exception as e:
                logger.warning(
                    "Completion bonus failed in review for job %s / worker %s: %s",
                    job.id, app.workerId, str(e),
                )
        db.add(app)
        db.add(models.Notification(
            userId=app.workerId,
            title="Ish beruvchi sharh qoldirdi",
            message=f"'{job.title}' ishi bo'yicha ish beruvchi sizga {req.rating} yulduzli baho va sharh qoldirdi.",
            type="system",
            relatedJobId=job.id,
        ))

    db.flush()

    if req.rating:
        from sqlalchemy import func
        avg_ratings_query = (
            db.query(models.Application.workerId, func.avg(models.Application.rating))
            .filter(
                models.Application.workerId.in_(worker_ids),
                models.Application.rating.isnot(None),
            )
            .group_by(models.Application.workerId)
            .all()
        )
        avg_ratings_map = {w_id: avg for w_id, avg in avg_ratings_query}
        for w_id, avg in avg_ratings_map.items():
            worker = workers_map.get(w_id)
            if worker and avg is not None:
                worker.rating = round(avg, 2)
                db.add(worker)

    db.commit()
    return {"success": True, "rating": req.rating, "review": req.review}


@router.post("/{id}/bookmark")
def toggle_bookmark(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    job = crud.job.get(db, id=id)
    if not job:
        raise HTTPException(status_code=404, detail="Ish e'loni topilmadi")

    user_ids = [uid for uid in [current_user.id, getattr(current_user, 'uid', None)] if uid]
    existing = (
        db.query(models.Bookmark)
        .filter(models.Bookmark.jobId == id, models.Bookmark.userId.in_(user_ids))
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()
        invalidate_user_map_cache(current_user.id)
        return {"success": True, "bookmarked": False}

    db.add(models.Bookmark(jobId=id, userId=current_user.id))
    db.commit()
    invalidate_user_map_cache(current_user.id)
    return {"success": True, "bookmarked": True}


def _payout_state(payout: "models.JobPayout | None") -> dict:
    if payout is None or not payout.invoiceNumber:
        return {"payoutStatus": None, "invoiceNumber": None, "invoiceAmount": None}
    return {
        "payoutStatus": payout.status,
        "invoiceNumber": payout.invoiceNumber,
        "invoiceAmount": payout.invoiceAmount or payout.amount,
        "invoiceSentAt": payout.invoiceSentAt,
        "invoicePaidDeclaredAt": payout.invoicePaidDeclaredAt,
        "invoiceConfirmedAt": payout.invoiceConfirmedAt,
    }


@router.get("/{id}/payout")
def get_job_payout_for_employer(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    job = crud.job.get(db, id=id)
    if not job:
        raise HTTPException(status_code=404, detail="Ish e'loni topilmadi")
    if job.employerId not in (current_user.id, getattr(current_user, "uid", None)) \
            and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Bu e'lon sizga tegishli emas")

    payout = (
        db.query(models.JobPayout)
        .filter(models.JobPayout.jobId == id)
        .order_by(models.JobPayout.paidAt.desc())
        .first()
    )
    return _payout_state(payout)


@router.post("/{id}/payout/declare")
def declare_job_payout(
    *,
    request: Request,
    db: Session = Depends(deps.get_db),
    id: str,
    req: PayoutDeclarationRequest,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    job = crud.job.get(db, id=id)
    if not job:
        raise HTTPException(status_code=404, detail="Ish e'loni topilmadi")
    if job.employerId not in (current_user.id, getattr(current_user, "uid", None)):
        raise HTTPException(status_code=403, detail="Bu e'lon sizga tegishli emas")

    payout = (
        db.query(models.JobPayout)
        .filter(models.JobPayout.jobId == id)
        .order_by(models.JobPayout.paidAt.desc())
        .first()
    )
    if payout is None or not payout.invoiceNumber:
        raise HTTPException(status_code=404, detail="Bu ish uchun hisob-faktura yuborilmagan")
    if payout.invoicePaidDeclaredAt:
        raise HTTPException(status_code=409, detail="To'lov allaqachon qayd etilgan")

    payout.invoicePaidMethod = req.method.strip()
    payout.invoicePaidReference = (req.reference or "").strip() or None
    payout.invoicePaidReceiptUrl = (req.receiptUrl or "").strip() or None
    payout.invoicePaidDeclaredAt = datetime.now(timezone.utc)
    payout.status = PayoutStatus.DECLARED
    db.add(payout)

    amount = f"{payout.invoiceAmount or payout.amount:,}".replace(",", " ")
    company = getattr(current_user, "companyName", None) or job.company or "Korxona"
    for admin in db.query(models.User).filter(models.User.role == "admin").all():
        db.add(models.Notification(
            userId=admin.id,
            title="Hisob-faktura to'landi deb belgilandi",
            message=f"{company} — {payout.invoiceNumber} · {amount} so'm. "
                    + ("Chek ilova qilingan. " if payout.invoicePaidReceiptUrl else "Chek ilova qilinmagan. ")
                    + "Bank ko'chirmasi bilan solishtiring.",
            type="payout",
            relatedJobId=job.id,
        ))

    db.commit()
    db.refresh(payout)
    return _payout_state(payout)
