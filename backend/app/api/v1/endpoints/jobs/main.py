import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.core.limiter import limiter
from app.models.job import JobStatus
from app.redis_client import redis_client
from app.services import job_days
from app.models.job_day import JobDayStatus
from app.services.spam_detector import SpamFraudDetector, keywords_from_settings

logger = logging.getLogger(__name__)
router = APIRouter()

HIRED_STATUSES = ['hired', 'confirmed', 'completed', 'in_progress', 'start_requested']

# One counted view per viewer per job per hour.
VIEW_DEDUPE_TTL_SECONDS = 3600


def _trigger_job_translation(job_id: str):
    """Trigger background job translation via Celery with direct thread fallback."""
    try:
        from app.tasks import translate_job_task
        translate_job_task.delay(job_id)
    except Exception as e:
        logger.warning("Celery translation dispatch failed, running directly: %s", e)
        from app.db.session import SessionLocal
        from app.services.ai_translator import translate_and_save_job
        bg_db = SessionLocal()
        try:
            translate_and_save_job(bg_db, job_id)
        except Exception as err:
            logger.error("Direct translation failed for job %s: %s", job_id, err)
        finally:
            bg_db.close()


@router.post("/", response_model=schemas.Job)
@limiter.limit("20/hour")
def create_job(
    request: Request,
    background_tasks: BackgroundTasks,
    *,
    db: Session = Depends(deps.get_db),
    job_in: schemas.JobCreate,
    current_user: models.User = Depends(deps.get_verified_employer),
) -> Any:
    """Create a new job posting, screening it for fraud first."""
    if not all([current_user.name, current_user.phone, current_user.region, current_user.email, current_user.bio]):
        raise HTTPException(
            status_code=403,
            detail="Iltimos, ish yaratishdan oldin profilingizni to'liq to'ldiring"
        )
    verdict = SpamFraudDetector.analyze_job_posting(
        job_in.title, job_in.description, job_in.salary,
        keywords=keywords_from_settings(db),
    )
    if verdict["is_spam"]:
        logger.warning(
            "Rejected suspicious job posting from %s: %s", current_user.id, verdict["flags"]
        )
        raise HTTPException(
            status_code=400,
            detail="E'lon shubhali deb topildi: " + "; ".join(verdict["flags"]),
        )

    job_in_dict = job_in.model_dump()
    # Never take these from the request body.
    job_in_dict.pop("views", None)
    job_in_dict["employerId"] = current_user.id
    job_in_dict["status"] = JobStatus.OPEN
    job_in_dict["views"] = 0
    if not job_in_dict.get("company") or job_in_dict["company"] == "Ish beruvchi":
        job_in_dict["company"] = current_user.companyName or current_user.name or "Ish beruvchi"

    # One posting, however many days it runs for.
    #
    # A five-day shift was briefly created as five separate Job rows, one per
    # day, each labelled "1 kunlik". That put five identical cards in front of
    # every worker searching, asked them to apply five times for one piece of
    # work, and made five postings that were really
    # one — none of which the splitting was needed for. The day rows below
    # already carry a day's status and a day's wage, which is what lets a
    # worker finish Monday without finishing Tuesday.
    db_job = models.Job(**job_in_dict)
    db.add(db_job)
    db.flush()
    # A five-day posting becomes five day rows here, not at hire: the calendar,
    # the admin's day-by-day view and the employer's own list all need the days
    # before anybody has been taken on.
    job_days.sync_days(db, db_job)
    db.commit()
    db.refresh(db_job)
    background_tasks.add_task(_trigger_job_translation, db_job.id)
    return db_job




@router.put("/{job_id}", response_model=schemas.Job)
def update_job(
    job_id: str,
    job_in: schemas.JobUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_verified_employer),
) -> Any:
    """Edit a posting.

    There was no update route at all, so fixing a typo meant deleting the job
    and losing every application attached to it.
    """
    job = crud.job.get(db=db, id=job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Ish e'loni topilmadi")

    is_admin = current_user.role == 'admin'
    employer_ids = [uid for uid in [current_user.id, getattr(current_user, 'uid', None)] if uid]
    if not is_admin and job.employerId not in employer_ids:
        raise HTTPException(status_code=403, detail="Bu e'lonni tahrirlash huquqingiz yo'q")

    if job.status in JobStatus.CLOSED_STATUSES and not is_admin:
        raise HTTPException(status_code=400, detail="Yakunlangan e'lonni tahrirlab bo'lmaydi")

    update_data = job_in.model_dump(exclude_unset=True)
    update_data.pop("views", None)

    # Only an admin may move a job between lifecycle states directly.
    requested_status = update_data.pop("status", None)
    if requested_status is not None:
        if not is_admin:
            raise HTTPException(status_code=403, detail="Holatni faqat administrator o'zgartiradi")
        if requested_status not in (
            JobStatus.OPEN, JobStatus.CONFIRMED, JobStatus.IN_PROGRESS,
            JobStatus.COMPLETED, JobStatus.CANCELLED,
        ):
            raise HTTPException(status_code=400, detail="Noma'lum holat")
        job.status = requested_status

    if {"title", "description", "salary"} & set(update_data):
        verdict = SpamFraudDetector.analyze_job_posting(
            update_data.get("title", job.title),
            update_data.get("description", job.description),
            update_data.get("salary", job.salary),
            keywords=keywords_from_settings(db),
        )
        if verdict["is_spam"]:
            raise HTTPException(
                status_code=400,
                detail="E'lon shubhali deb topildi: " + "; ".join(verdict["flags"]),
            )

    for field, value in update_data.items():
        setattr(job, field, value)

    db.add(job)
    if "workDate" in update_data:
        # Editing the dates moves the day rows with them. sync_days leaves any
        # day that has already been worked and paid alone — that is history,
        # and a typo fixed in the date field must not be able to erase it.
        db.flush()
        job_days.sync_days(db, job)
    db.commit()
    db.refresh(job)
    if {"title", "description", "responsibilities", "requirements", "importantNote"} & set(update_data):
        background_tasks.add_task(_trigger_job_translation, job.id)
    return job


@router.post("/{job_id}/view")
@limiter.limit("60/minute")
def view_job(
    request: Request,
    job_id: str,
    db: Session = Depends(deps.get_db),
    current_user: Optional[models.User] = Depends(deps.get_current_user_optional),
):
    """Count a job view, at most once per viewer per hour.

    This was previously unauthenticated, unlimited and undeduplicated: a loop
    could inflate the counter indefinitely and write to the database on every
    request.
    """
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Ish e'loni topilmadi")

    viewer = current_user.id if current_user else (
        request.client.host if request.client else "anonymous"
    )
    dedupe_key = f"job_view:{job_id}:{viewer}"

    try:
        already_counted = redis_client.get(dedupe_key) is not None
        if not already_counted:
            redis_client.setex(dedupe_key, VIEW_DEDUPE_TTL_SECONDS, "1")
    except Exception:
        already_counted = False

    if already_counted:
        return {"status": "ok", "views": job.views or 0, "counted": False}

    job.views = (job.views or 0) + 1
    db.add(job)
    db.commit()
    return {"status": "ok", "views": job.views, "counted": True}


@router.delete("/{id}")
def delete_job(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Cancel a job posting.

    A hard delete used to remove the row and its applications outright, leaving
    chats, bookmarks, notifications and transactions pointing at a job id that
    no longer existed — and telling the affected workers nothing.
    """
    job = crud.job.get(db=db, id=id)
    if not job:
        raise HTTPException(status_code=404, detail="Ish e'loni topilmadi")
    employer_ids = [uid for uid in [current_user.id, getattr(current_user, 'uid', None)] if uid]
    if job.employerId not in employer_ids and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Bu e'lonni o'chirish huquqingiz yo'q")

    if job.status == "dispute":
        raise HTTPException(
            status_code=400,
            detail="Nizo holatidagi ishni bekor qilib bo'lmaydi, avval nizoni hal qiling",
        )
    if job.status == JobStatus.CANCELLED:
        raise HTTPException(
            status_code=400,
            detail="Bu ish allaqachon bekor qilingan",
        )
    if job.status == JobStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=400,
            detail="Boshlangan ishni bekor qilib bo'lmaydi, avval uni yakunlang",
        )
    # Work that is finished cannot be un-finished. Only the started case was
    # refused, so a completed posting could be flipped to cancelled while its
    # days stayed completed and the worker kept the money credited for them —
    # a record that contradicts itself and says the work never happened.
    if job.status == JobStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail="Yakunlangan ishni bekor qilib bo'lmaydi",
        )

    affected = (
        db.query(models.Application)
        .filter(
            models.Application.jobId == id,
            models.Application.status.notin_(['rejected', 'cancelled', 'completed']),
        )
        .all()
    )
    for app in affected:
        app.status = 'cancelled'
        db.add(app)
        db.add(models.Notification(
            userId=app.workerId,
            title="Ish e'loni bekor qilindi",
            message=f"'{job.title}' e'loni ish beruvchi tomonidan bekor qilindi.",
            type="system",
            relatedJobId=job.id,
        ))

    job.status = JobStatus.CANCELLED
    db.add(job)

    # The days go with it, so a cancelled posting stops offering work.
    for day in job_days.days_of(db, job.id):
        if day.status == JobDayStatus.PENDING:
            day.status = JobDayStatus.CANCELLED
            db.add(day)

    db.commit()
    return {
        "success": True,
        "status": JobStatus.CANCELLED,
        "notified": len(affected),
    }
