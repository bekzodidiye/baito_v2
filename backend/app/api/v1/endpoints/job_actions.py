import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app import crud, models
from app.api import deps
from app.models.job import JobStatus
from app.models.job_payout import JobPayout, PayoutStatus
from app.services.escrow_service import EscrowService
from app.services import job_days as job_days_service
from app.models.job_day import JobDay, JobDayStatus
from app.services.work_dates import get_job_dates_set  # noqa: F401  (re-exported)
ACTIVE_APP_STATUSES = ['applied', 'hired', 'confirmed', 'in_progress', 'start_requested']
COMMITTED_APP_STATUSES = ['hired', 'confirmed', 'in_progress', 'start_requested']

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


def _get_job_or_404(db: Session, id: str) -> models.Job:
    job = crud.job.get(db=db, id=id)
    if not job:
        raise HTTPException(status_code=404, detail="Ish e'loni topilmadi")
    return job


def _hired_count(db: Session, job_id: str) -> int:
    return (
        db.query(models.Application)
        .filter(
            models.Application.jobId == job_id,
            models.Application.status.in_(COMMITTED_APP_STATUSES + ['completed']),
        )
        .count()
    )


def _vacancies(job: models.Job) -> int:
    raw = (job.neededWorkers or "1").strip()
    return int(raw) if raw.isdigit() and int(raw) > 0 else 1


@router.post("/{id}/apply")
def apply_to_job(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    # Being a worker is no longer enough: the documents have to have been
    # checked. A worker turns up at a stranger's address, and the employer is
    # entitled to know somebody looked at who that is.
    current_user: models.User = Depends(deps.get_verified_worker),
) -> Any:
    job = _get_job_or_404(db, id)

    # Applying to a cancelled or finished posting was previously allowed.
    if job.status not in JobStatus.OPEN_STATUSES:
        raise HTTPException(status_code=400, detail="Bu e'lon endi ariza qabul qilmaydi")

    if _hired_count(db, job.id) >= _vacancies(job):
        raise HTTPException(status_code=400, detail="Bu ish bo'yicha o'rinlar to'lgan")

    existing_app = (
        db.query(models.Application)
        .filter(
            models.Application.jobId == id,
            models.Application.workerId == current_user.id,
        )
        .first()
    )

    if existing_app:
        return {
            "success": True,
            "id": existing_app.id,
            "jobId": existing_app.jobId,
            "status": existing_app.status,
        }

    # Max 2 applications per day, and none at all once a job that day is confirmed.
    target_dates = get_job_dates_set(job)
    worker_apps = (
        db.query(models.Application)
        .filter(
            models.Application.workerId == current_user.id,
            models.Application.status.in_(ACTIVE_APP_STATUSES),
        )
        .all()
    )

    if target_dates and worker_apps:
        app_job_ids = {a.jobId for a in worker_apps}
        app_jobs = db.query(models.Job).filter(models.Job.id.in_(app_job_ids)).all()
        app_job_map = {j.id: j for j in app_jobs}

        for t_date in target_dates:
            same_day_count = 0
            has_confirmed_job = False
            for app in worker_apps:
                app_dates = get_job_dates_set(app_job_map.get(app.jobId))
                if t_date in app_dates:
                    same_day_count += 1
                    if app.status in COMMITTED_APP_STATUSES:
                        has_confirmed_job = True

            if has_confirmed_job:
                raise HTTPException(
                    status_code=400,
                    detail="Siz bu kun uchun allaqachon tasdiqlangan ishga egasiz!",
                )
            if same_day_count >= 2:
                raise HTTPException(
                    status_code=400,
                    detail="Bir kunda ko'pi bilan 2 ta ishga ariza topshirishingiz mumkin!",
                )

    db_app = models.Application(
        id=str(uuid.uuid4()), jobId=id, workerId=current_user.id, status="applied"
    )
    db.add(db_app)
    db.add(models.Notification(
        id=str(uuid.uuid4()), userId=job.employerId, title="Yangi ariza keldi",
        message=f"Ishchi '{job.title}' ishiga ariza topshirdi.",
        type="apply", relatedJobId=id,
    ))
    db.commit()
    db.refresh(db_app)
    return {"success": True, "id": db_app.id, "jobId": db_app.jobId, "status": db_app.status}


def _load_worker_application(db: Session, job_id: str, user: models.User):
    return (
        db.query(models.Application)
        .filter(
            models.Application.jobId == job_id,
            models.Application.workerId == user.id,
            models.Application.status.in_(COMMITTED_APP_STATUSES),
        )
        .first()
    )


@router.post("/{id}/request-start")
def request_start_job(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """The worker starts the shift. Nobody confirms it afterwards.

    This used to only raise a hand: the application went to ``start_requested``
    and waited for the employer to press a button before the work counted as
    begun. The wait bought nothing. The wage is frozen at hiring and released at
    completion, so the employer's press moved no money and could withhold none.
    What it did do was leave a worker standing on site unable to show they had
    started, and leave every application nobody confirmed stuck at
    ``start_requested`` for good.

    The route keeps its name so an older client still reaches it, and an
    application left at ``start_requested`` by the old flow is moved on by the
    same call.
    """
    job = _get_job_or_404(db, id)

    app = _load_worker_application(db, id, current_user)
    if not app:
        raise HTTPException(status_code=403, detail="Siz bu ishga yollanmagansiz")

    if job.status in JobStatus.CLOSED_STATUSES:
        raise HTTPException(status_code=400, detail="Bu ish allaqachon yakunlangan")

    if app.status == 'in_progress':
        return {"success": True, "status": "in_progress"}

    # This worker has begun — deliberately not every hired worker on the
    # posting. On a multi-vacancy shift one person arriving says nothing about
    # the others, and marking them all started would put a time against people
    # who are not there. That is what confirm-start does, and why it is still
    # the employer's route rather than this one.
    app.status = 'in_progress'
    db.add(app)

    job.status = JobStatus.IN_PROGRESS
    # Written once, by whoever arrives first: the posting began when the first
    # person started on it, not when the last one did.
    if job.startedAt is None:
        job.startedAt = datetime.now(timezone.utc)
    db.add(job)

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    day = (
        db.query(JobDay)
        .filter(JobDay.jobId == job.id, JobDay.status == JobDayStatus.PENDING)
        .order_by(JobDay.workDate)
        .first()
    )
    if day is not None and day.startedAt is None and day.workDate <= today:
        day.startedAt = datetime.now(timezone.utc)
        db.add(day)

    # Free this worker's day: withdraw their own pending applications that
    # collide with it. Marked withdrawn rather than deleted, so they can still
    # see what happened.
    job_dates = get_job_dates_set(job)
    if job_dates:
        others = (
            db.query(models.Application)
            .filter(
                models.Application.workerId == app.workerId,
                models.Application.jobId != id,
                models.Application.status == "applied",
            )
            .all()
        )
        other_jobs = {
            j.id: j
            for j in db.query(models.Job)
            .filter(models.Job.id.in_({a.jobId for a in others}))
            .all()
        } if others else {}
        for other in others:
            if job_dates & get_job_dates_set(other_jobs.get(other.jobId)):
                other.status = "withdrawn"
                db.add(other)

    db.add(models.Notification(
        id=str(uuid.uuid4()), userId=job.employerId,
        title="Ish boshlandi",
        message=f"'{job.title}' ishi bo'yicha ishchi ishni boshladi.",
        type="start_confirmed", relatedJobId=id,
    ))
    db.commit()
    return {"success": True, "status": JobStatus.IN_PROGRESS}


@router.post("/{id}/confirm-start")
@router.post("/{id}/start")
def confirm_start_job(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Start the shift on the workers' behalf.

    No longer a gate the work waits behind — the worker starts it themselves.
    This stays for what the other route cannot cover: a worker who cannot reach
    their phone, and an administrator putting a job right. It advances every
    hired worker at once, which is exactly why it is not what a worker calls.
    """
    job = _get_job_or_404(db, id)

    is_employer = job.employerId in (current_user.id, current_user.uid)
    if not (is_employer or current_user.role == 'admin'):
        raise HTTPException(status_code=403, detail="Faqat ish beruvchi ishni tasdiqlay oladi")

    if job.status in JobStatus.CLOSED_STATUSES:
        raise HTTPException(status_code=400, detail="Bu ish allaqachon yakunlangan")

    apps = (
        db.query(models.Application)
        .filter(
            models.Application.jobId == id,
            models.Application.status.in_(COMMITTED_APP_STATUSES),
        )
        .all()
    )
    if not apps:
        raise HTTPException(status_code=400, detail="Bu ishga hali hech kim yollanmagan")

    job.status = JobStatus.IN_PROGRESS
    # The moment the work actually began, against which lateness is read. Only
    # written once: a posting that is confirmed started twice — the endpoint is
    # reachable while the job is in progress — must keep the first time, not
    # move its start to whenever somebody last pressed the button.
    if job.startedAt is None:
        job.startedAt = datetime.now(timezone.utc)
    db.add(job)

    # The day being worked gets the same stamp. On a multi-day posting the
    # job-level one only ever describes the first day.
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    day = (
        db.query(JobDay)
        .filter(JobDay.jobId == job.id, JobDay.status == JobDayStatus.PENDING)
        .order_by(JobDay.workDate)
        .first()
    )
    if day is not None and day.startedAt is None and day.workDate <= today:
        day.startedAt = datetime.now(timezone.utc)
        db.add(day)

    job_dates = get_job_dates_set(job)

    # Previously only the first application was advanced, so on a multi-worker
    # job everyone but one person stayed stuck in 'hired'.
    for app in apps:
        app.status = "in_progress"
        db.add(app)

        db.add(models.Notification(
            id=str(uuid.uuid4()), userId=app.workerId, title="Ish boshlandi!",
            message=f"'{job.title}' ishi rasman boshlandi.",
            type="start_confirmed", relatedJobId=id,
        ))

        # Free the worker's day: withdraw their other pending applications for
        # the same date(s). They are marked withdrawn rather than deleted, so
        # the worker can still see what happened.
        if not job_dates:
            continue
        other_apps = (
            db.query(models.Application)
            .filter(
                models.Application.workerId == app.workerId,
                models.Application.jobId != id,
                models.Application.status == "applied",
            )
            .all()
        )
        if not other_apps:
            continue
        other_job_ids = {a.jobId for a in other_apps}
        other_job_map = {
            j.id: j for j in db.query(models.Job).filter(models.Job.id.in_(other_job_ids)).all()
        }
        for other_app in other_apps:
            if job_dates & get_job_dates_set(other_job_map.get(other_app.jobId)):
                other_app.status = "withdrawn"
                db.add(other_app)

    db.add(models.Notification(
        id=str(uuid.uuid4()), userId=job.employerId, title="Ish boshlandi!",
        message=f"'{job.title}' ishi rasman boshlandi.",
        type="start_confirmed", relatedJobId=id,
    ))

    db.commit()
    return {"success": True, "status": JobStatus.IN_PROGRESS}


@router.get("/{id}/days")
def list_job_days(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """The days this posting covers, each with its own status and wage."""
    job = _get_job_or_404(db, id)
    return [job_days_service.serialise(d) for d in job_days_service.days_of(db, job.id)]


@router.post("/{id}/days/{day_id}/complete")
def complete_job_day(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    day_id: str,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Finish one day of a posting and pay for that day alone.

    The reason this exists: a three-day shift used to be one row with one
    status, so marking the first day done marked all three done and released a
    single payment for the lot. A day is worked, and paid, on its own.

    The posting itself only closes when its last day does — and the review, the
    rating and any bonus belong to that moment, not to this one, so they stay
    on ``/complete``.
    """
    job = _get_job_or_404(db, id)

    if job.employerId not in (current_user.id, current_user.uid) and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Faqat ish beruvchi ishni yakunlay oladi")

    if job.status == JobStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Bekor qilingan ishni yakunlab bo'lmaydi")
    if job.status not in (JobStatus.IN_PROGRESS, JobStatus.CONFIRMED):
        raise HTTPException(
            status_code=400,
            detail="Kunni yakunlash uchun avval ishni boshlash kerak",
        )

    day = (
        db.query(JobDay)
        .filter(JobDay.id == day_id, JobDay.jobId == job.id)
        .first()
    )
    if not day:
        raise HTTPException(status_code=404, detail="Bu ish kuni topilmadi")
    if day.status == JobDayStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Bu kun allaqachon yakunlangan")
    if day.status == JobDayStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Bu kun bekor qilingan")

    apps = (
        db.query(models.Application)
        .filter(
            models.Application.jobId == job.id,
            models.Application.status.in_(COMMITTED_APP_STATUSES),
        )
        .all()
    )
    if not apps:
        raise HTTPException(status_code=400, detail="Yakunlash uchun yollangan ishchi yo'q")

    remaining_after = [
        d for d in job_days_service.payable_days(db, job.id) if d.id != day.id
    ]
    is_last_day = not remaining_after

    day.status = JobDayStatus.COMPLETED
    day.completedAt = datetime.now(timezone.utc)
    db.add(day)

    paid, unpaid = [], []
    for app in apps:
        try:
            EscrowService.release_funds(
                db, job_id=job.id, worker_id=app.workerId, job_day_id=day.id,
                # One posting is one completed job on a worker's profile,
                # however many days it ran for. Counted when the last day lands.
                count_completed_job=is_last_day,
            )
            paid.append(app.workerId)
        except HTTPException as e:
            logger.warning("Escrow release skipped for job %s day %s / worker %s: %s",
                           job.id, day.workDate, app.workerId, e.detail)
            unpaid.append(app.workerId)

        if app.workerId in paid:
            message = (
                f"'{job.title}' ishining {day.workDate} kuni yakunlandi, "
                "shu kun uchun to'lov hisobingizga o'tkazildi."
            )
        else:
            message = (
                f"'{job.title}' ishining {day.workDate} kuni yakunlandi. "
                "To'lov ish beruvchi tomonidan alohida amalga oshiriladi."
            )
        db.add(models.Notification(
            id=str(uuid.uuid4()), userId=app.workerId, title="Ish kuni yakunlandi",
            message=message, type="completed", relatedJobId=job.id,
        ))

    # The posting closes only when nothing is left to work. Left IN_PROGRESS
    # otherwise, which is what keeps the remaining days visible and payable.
    if is_last_day:
        job.status = JobStatus.COMPLETED
        job.completedAt = datetime.now(timezone.utc)
        for app in apps:
            app.status = "completed"
            db.add(app)
        db.add(job)
    else:
        # Reset back to confirmed so the next day can be started
        job.status = JobStatus.CONFIRMED
        for app in apps:
            app.status = "confirmed"
            db.add(app)
        db.add(job)

    db.commit()
    return {
        "success": True,
        "dayId": day.id,
        "workDate": day.workDate,
        "day_status": JobDayStatus.COMPLETED,
        "job_status": job.status,
        "remaining_days": len(remaining_after),
        "paid_workers": len(paid),
        "unpaid_workers": len(unpaid),
    }


@router.post("/{id}/complete")
def complete_job(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    req: JobCompleteRequest,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Finish a job: release escrow, pay the workers, record the review.

    The old version only flipped statuses and then told the worker "to'lov
    amalga oshirildi" — no money ever moved. It also accepted repeat calls,
    overwriting the rating each time, and never touched the worker's profile
    rating or completed-jobs counter.
    """
    job = _get_job_or_404(db, id)

    is_employer = job.employerId in (current_user.id, getattr(current_user, 'uid', None)) or current_user.role == 'admin'

    caller_apps = (
        db.query(models.Application)
        .filter(
            models.Application.jobId == id,
            models.Application.workerId.in_([current_user.id, getattr(current_user, 'uid', None)]),
            models.Application.status.in_(COMMITTED_APP_STATUSES),
        )
        .all()
    )
    is_hired_worker = bool(caller_apps)

    if not is_employer and not is_hired_worker:
        raise HTTPException(status_code=403, detail="Faqat ish beruvchi yoki tayinlangan ishchi ishni yakunlay oladi")

    if job.status == JobStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Bu ish allaqachon yakunlangan")
    if job.status == JobStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Bekor qilingan ishni yakunlab bo'lmaydi")
    if job.status not in (JobStatus.IN_PROGRESS, JobStatus.CONFIRMED):
        raise HTTPException(
            status_code=400,
            detail="Ishni yakunlash uchun avval uni boshlash kerak",
        )

    apps = (
        db.query(models.Application)
        .filter(
            models.Application.jobId == id,
            models.Application.status.in_(COMMITTED_APP_STATUSES),
        )
        .all()
    )
    if not apps:
        raise HTTPException(status_code=400, detail="Yakunlash uchun yollangan ishchi yo'q")

    # Bonus is only applicable if the employer calls this. Workers cannot debit employer's balance.
    bonus_each = (req.bonus or 0) if is_employer else 0
    if bonus_each > 0:
        employer = (
            db.query(models.User)
            .filter(models.User.id.in_([job.employerId]))
            .first()
        )
        if not employer:
            raise HTTPException(status_code=404, detail="Ish beruvchi topilmadi")

    # Whatever days were never ticked off one by one are settled here. 
    # For multi-day jobs, we complete only one day at a time.
    remaining = job_days_service.payable_days(db, job.id)
    now = datetime.now(timezone.utc)
    
    is_single_day_completion = False
    
    if remaining:
        original_remaining_count = len(remaining)
        today_str = now.strftime("%Y-%m-%d")
        
        # Complete the day corresponding to today, or fallback to the first uncompleted day
        first_day = next((d for d in remaining if d.workDate == today_str), remaining[0])
        
        first_day.status = JobDayStatus.COMPLETED
        first_day.completedAt = now
        db.add(first_day)
        
        remaining = [first_day] # Process only this day for escrow
        
        if original_remaining_count > 1: # There are still more days after this one
            is_single_day_completion = True
            job.status = JobStatus.CONFIRMED
            # do not set job.completedAt
        else:
            job.status = JobStatus.COMPLETED
            job.completedAt = now
        db.add(job)
    else:
        # no remaining days (might be a legacy job without job days)
        job.status = JobStatus.COMPLETED
        job.completedAt = now
        db.add(job)

    paid, unpaid, bonus_paid = [], [], []
    for app in apps:
        if is_single_day_completion:
            app.status = "confirmed"
        else:
            app.status = "completed"
            app.rating = req.rating
            app.review = req.review
            app.bonus = req.bonus or 0
        db.add(app)
        # SessionLocal is created with autoflush=False, so the rating just set
        # above is invisible to the aggregate query below without this.
        db.flush()

        worker = db.query(models.User).filter(models.User.id == app.workerId).first()
        if worker:
            # completedJobsCount is incremented by EscrowService.release_funds
            # below; doing it here as well double-counted every finished job.
            if req.rating:
                rated = (
                    db.query(models.Application.rating)
                    .filter(
                        models.Application.workerId == worker.id,
                        models.Application.rating.isnot(None),
                    )
                    .all()
                )
                values = [r[0] for r in rated if r[0]]
                if values:
                    worker.rating = round(sum(values) / len(values), 2)
            db.add(worker)

        try:
            if remaining:
                for index, day in enumerate(remaining):
                    EscrowService.release_funds(
                        db, job_id=job.id, worker_id=app.workerId, job_day_id=day.id,
                        # One posting, one completed job on the profile.
                        count_completed_job=(index == 0),
                    )
            else:
                # Either every day was already ticked off, or the posting
                # predates day records and still holds one lump for the lot.
                EscrowService.release_funds(db, job_id=job.id, worker_id=app.workerId)
            paid.append(app.workerId)
            # The wage is released first: it is owed for work already done and
            # must not be held up by an optional tip. The balance check above
            # means this cannot fail for want of funds.
            if bonus_each > 0:
                EscrowService.pay_completion_bonus(
                    db, job_id=job.id, employer_id=job.employerId,
                    worker_id=app.workerId, amount_uzs=bonus_each,
                )
                bonus_paid.append(app.workerId)
        except HTTPException as e:
            # No escrow was held for this job (it predates escrow, or the
            # employer never funded it). Complete the job anyway, but say so
            # instead of claiming a payment happened.
            logger.warning("Escrow release skipped for job %s / worker %s: %s",
                           job.id, app.workerId, e.detail)
            unpaid.append(app.workerId)

        if app.workerId in paid:
            message = f"'{job.title}' ishi bo'yicha to'lov hisobingizga o'tkazildi."
            if app.workerId in bonus_paid:
                message += f" Ish beruvchi qo'shimcha {bonus_each} so'm bonus qo'shdi."
        else:
            message = (
                f"'{job.title}' ishi yakunlandi. "
                "To'lov ish beruvchi tomonidan alohida amalga oshiriladi."
            )
        db.add(models.Notification(
            id=str(uuid.uuid4()), userId=app.workerId, title="Ish yakunlandi",
            message=message, type="completed", relatedJobId=id,
        ))

    if is_hired_worker:
        db.add(models.Notification(
            id=str(uuid.uuid4()),
            userId=job.employerId,
            title="Ish yakunlandi",
            message=f"'{job.title}' ishi ishchi tomonidan yakunlandi. Iltimos, ishchiga baho va sharh qoldiring.",
            type="job_completed",
            relatedJobId=id,
        ))

    db.commit()
    return {
        "success": True,
        "job_status": job.status,
        "is_single_day_completion": is_single_day_completion,
        "paid_workers": len(paid),
        "unpaid_workers": len(unpaid),
        "bonus_paid_workers": len(bonus_paid),
        "bonus_each": bonus_each,
    }


@router.post("/{id}/review")
def review_job(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    req: JobReviewRequest,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Employer reviews the hired worker(s) after job completion."""
    job = _get_job_or_404(db, id)
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
        employer = (
            db.query(models.User)
            .filter(models.User.id.in_([job.employerId]))
            .first()
        )
        total_bonus = bonus_each * len(apps)
        if not employer:
            raise HTTPException(status_code=404, detail="Ish beruvchi topilmadi")
        employer.balance = (employer.balance or 0) - total_bonus
        db.add(employer)

    for app in apps:
        app.status = "completed"
        app.rating = req.rating
        app.review = req.review
        if bonus_each > 0:
            app.bonus = (app.bonus or 0) + bonus_each
            worker = db.query(models.User).filter(models.User.id == app.workerId).first()
            if worker:
                worker.balance = (worker.balance or 0) + bonus_each
                db.add(worker)
                db.add(models.Transaction(
                    userId=app.workerId,
                    employerId=job.employerId,
                    jobId=job.id,
                    amount=bonus_each,
                    type="bonus",
                    status="completed",
                    description=f"Bonus: '{job.title}'",
                ))
        db.add(app)
        db.flush()

        worker = db.query(models.User).filter(models.User.id == app.workerId).first()
        if worker and req.rating:
            rated = (
                db.query(models.Application.rating)
                .filter(
                    models.Application.workerId == worker.id,
                    models.Application.rating.isnot(None),
                )
                .all()
            )
            values = [r[0] for r in rated if r[0]]
            if values:
                worker.rating = round(sum(values) / len(values), 2)
            db.add(worker)

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
    _get_job_or_404(db, id)

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


class PayoutDeclarationRequest(BaseModel):
    """What an employer says when settling an invoice from inside the app."""

    method: str = Field(min_length=1, max_length=40)
    reference: Optional[str] = Field(default=None, max_length=120)
    receiptUrl: Optional[str] = Field(default=None, max_length=500)


def _payout_state(payout: "JobPayout | None") -> dict:
    """The shape the employer's job card reads.

    Only what the payer needs: how much, which invoice, and where it has got
    to. Deliberately not the worker-side columns - what we paid the worker and
    the receipt for it are not the employer's business.
    """
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
    """Invoice state for one of the caller's own jobs."""
    job = _get_job_or_404(db, id)
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
    """Record that the employer says this invoice is paid.

    The same declaration the tokenised link in the invoice email makes, for the
    employer who is already signed in and would rather do it from the job card
    than go and find the email. Sets ``payment_declared``: this has the payer's
    word and a receipt image, which is not the same as the money arriving, and
    an administrator still has to reconcile it.
    """
    job = _get_job_or_404(db, id)
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
