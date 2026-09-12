import logging
import re
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app import crud, models
from app.api import deps
from app.models.job import JobStatus
from app.services.escrow_service import EscrowService

logger = logging.getLogger(__name__)
router = APIRouter()

ACTIVE_APP_STATUSES = ['applied', 'hired', 'confirmed', 'in_progress', 'start_requested']
COMMITTED_APP_STATUSES = ['hired', 'confirmed', 'in_progress', 'start_requested']


class JobCompleteRequest(BaseModel):
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    review: Optional[str] = Field(default=None, max_length=2000)
    bonus: Optional[int] = Field(default=0, ge=0, le=50_000_000)


def _parse_single_date(token: str, reference: date) -> Optional[date]:
    """Parse one date token.

    A bare day number ("15") used to be resolved against *today's* month, so a
    posting made on the 28th for the 3rd landed in the past. It now rolls
    forward to the next month when the day has already gone by.
    """
    token = token.strip()
    if not token:
        return None

    if re.fullmatch(r"\d{1,2}", token):
        day = int(token)
        if not 1 <= day <= 31:
            return None
        year, month = reference.year, reference.month
        if day < reference.day:
            month += 1
            if month > 12:
                month = 1
                year += 1
        try:
            return date(year, month, day)
        except ValueError:
            return None

    for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(token, fmt).date()
        except ValueError:
            continue
    return None


def get_job_dates_set(job: Any) -> set:
    """Every calendar day a job occupies, as ``YYYY-MM-DD`` strings."""
    if not job or not job.workDate:
        return set()

    date_str = str(job.workDate).strip()
    reference = date.today()
    dates: set[str] = set()

    if ',' in date_str:
        for part in date_str.split(','):
            parsed = _parse_single_date(part, reference)
            if parsed:
                dates.add(parsed.strftime("%Y-%m-%d"))
        return dates

    # A range is written with '~', or with '-' between two bare day numbers.
    # A full ISO date also contains '-', so only treat '-' as a range separator
    # when neither side looks like a complete date.
    range_delim = None
    if '~' in date_str:
        range_delim = '~'
    elif date_str.count('-') == 1 and not re.fullmatch(r"\d{4}-\d{1,2}", date_str):
        range_delim = '-'

    if range_delim:
        parts = [p.strip() for p in date_str.split(range_delim)]
        if len(parts) == 2:
            start_dt = _parse_single_date(parts[0], reference)
            # The end of a range shares the start's month when it is a bare day.
            end_dt = _parse_single_date(parts[1], start_dt or reference)
            if start_dt and end_dt and start_dt <= end_dt:
                # Guard against a pathological range locking up the loop.
                if (end_dt - start_dt).days <= 366:
                    current = start_dt
                    while current <= end_dt:
                        dates.add(current.strftime("%Y-%m-%d"))
                        current += timedelta(days=1)
            return dates

    parsed = _parse_single_date(date_str, reference)
    if parsed:
        dates.add(parsed.strftime("%Y-%m-%d"))
    return dates


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
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    job = _get_job_or_404(db, id)

    if current_user.role != 'worker':
        raise HTTPException(status_code=403, detail="Faqat ishchilar ariza topshira oladi")

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
    """Worker signals they have arrived and are ready to begin.

    ``request-start``, ``confirm-start`` and ``start`` were all bound to a
    single handler that immediately flipped the job to ``in_progress``, so the
    employer's confirmation step did not exist — a worker could start a job on
    their own.
    """
    job = _get_job_or_404(db, id)

    app = _load_worker_application(db, id, current_user)
    if not app:
        raise HTTPException(status_code=403, detail="Siz bu ishga yollanmagansiz")

    if app.status == 'in_progress':
        return {"success": True, "status": "in_progress"}

    app.status = 'start_requested'
    db.add(app)
    db.add(models.Notification(
        id=str(uuid.uuid4()), userId=job.employerId,
        title="Ishchi ishni boshlashga tayyor",
        message=f"'{job.title}' ishi bo'yicha ishchi boshlashni so'radi. Tasdiqlang.",
        type="start_requested", relatedJobId=id,
    ))
    db.commit()
    return {"success": True, "status": "start_requested"}


@router.post("/{id}/confirm-start")
@router.post("/{id}/start")
def confirm_start_job(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Employer confirms the work has begun."""
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
    db.add(job)

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

    if job.employerId not in (current_user.id, current_user.uid) and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Faqat ish beruvchi ishni yakunlay oladi")

    if job.status == JobStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Bu ish allaqachon yakunlangan")
    if job.status == JobStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Bekor qilingan ishni yakunlab bo'lmaydi")
    if job.status != JobStatus.IN_PROGRESS:
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

    # The bonus is paid to every hired worker, so a two-worker job costs twice
    # what was typed. Nothing is escrowed for it — the wage was frozen at hire,
    # the bonus is decided now — so the employer is debited at this moment, and
    # that can fail.
    #
    # Checked here, before a single row changes. Refusing now costs the
    # employer one retry with a smaller figure; refusing halfway would leave a
    # job marked complete with some workers paid a bonus and others not, or
    # leave the wage unpaid over an optional tip.
    bonus_each = req.bonus or 0
    if bonus_each > 0:
        employer = (
            db.query(models.User)
            .filter(models.User.id.in_([job.employerId]))
            .first()
        )
        total_bonus = bonus_each * len(apps)
        if not employer or (employer.balance or 0) < total_bonus:
            available = (employer.balance or 0) if employer else 0
            raise HTTPException(
                status_code=400,
                detail=(
                    f"{len(apps)} ta ishchiga {bonus_each:,} so'mdan bonus uchun "
                    f"{total_bonus:,} so'm kerak, balansingizda {available:,} so'm bor. "
                    "Bonusni kamaytiring yoki hisobni to'ldiring."
                ).replace(",", " "),
            )

    job.status = JobStatus.COMPLETED
    job.completedAt = datetime.now(timezone.utc)
    db.add(job)

    paid, unpaid, bonus_paid = [], [], []
    for app in apps:
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

    db.commit()
    return {
        "success": True,
        "job_status": JobStatus.COMPLETED,
        "paid_workers": len(paid),
        "unpaid_workers": len(unpaid),
        "bonus_paid_workers": len(bonus_paid),
        "bonus_each": bonus_each,
    }


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
