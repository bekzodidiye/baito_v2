import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app import models, crud
from app.api import deps
from app.services.job_service import JobService

from app.models.job_payout import PayoutStatus
from datetime import datetime, timezone

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


class PayoutDeclarationRequest(BaseModel):
    method: str = Field(min_length=1, max_length=40)
    reference: Optional[str] = Field(default=None, max_length=120)
    receiptUrl: Optional[str] = Field(default=None, max_length=500)


@router.post("/{id}/apply")
def apply_to_job(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    current_user: models.User = Depends(deps.get_verified_worker),
) -> Any:
    return JobService.apply_to_job(db, id, current_user)


@router.post("/{id}/request-start")
def request_start_job(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    return JobService.request_start_job(db, id, current_user)


@router.post("/{id}/confirm-start")
@router.post("/{id}/start")
def confirm_start_job(
    *,
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


@router.post("/{id}/days/{day_id}/complete")
def complete_job_day(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    day_id: str,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    return JobService.complete_job_day(db, id, day_id, current_user)


@router.post("/{id}/complete")
def complete_job(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    req: JobCompleteRequest,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    return JobService.complete_job(db, id, req.rating, req.review, req.bonus, current_user)


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

    apps = (
        db.query(models.Application)
        .filter(
            models.Application.jobId == id,
            models.Application.status.in_(["completed", "in_progress", "hired", "confirmed"]),
        )
        .all()
    )
    if not apps:
        raise HTTPException(status_code=400, detail="Sharh qoldirish uchun ariza topilmadi")

    bonus_each = req.bonus or 0
    if bonus_each > 0:
        employer = db.query(models.User).filter(models.User.id == job.employerId).first()
        total_bonus = bonus_each * len(apps)
        if not employer:
            raise HTTPException(status_code=404, detail="Ish beruvchi topilmadi")
        employer.balance = (employer.balance or 0) - total_bonus
        db.add(employer)

    worker_ids = [app.workerId for app in apps]
    workers_map = {w.id: w for w in db.query(models.User).filter(models.User.id.in_(worker_ids)).all()}

    for app in apps:
        app.status = "completed"
        app.rating = req.rating
        app.review = req.review
        if bonus_each > 0:
            app.bonus = (app.bonus or 0) + bonus_each
            worker = workers_map.get(app.workerId)
            if worker:
                worker.balance = (worker.balance or 0) + bonus_each
                db.add(worker)
                import uuid
                db.add(models.Transaction(
                    id=str(uuid.uuid4()),
                    userId=app.workerId,
                    employerId=job.employerId,
                    jobId=job.id,
                    amount=bonus_each * 100,
                    type="bonus",
                    status="completed",
                    description=f"Bonus: '{job.title}'",
                ))
        db.add(app)
    
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

    from app.models.job import JobStatus
    if job.status != JobStatus.COMPLETED:
        job.status = JobStatus.COMPLETED
        job.completedAt = datetime.now(timezone.utc)
        db.add(job)

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

    existing = (
        db.query(models.Bookmark)
        .filter(models.Bookmark.jobId == id, models.Bookmark.userId == current_user.id)
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()
        return {"success": True, "bookmarked": False}

    db.add(models.Bookmark(jobId=id, userId=current_user.id))
    db.commit()
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
