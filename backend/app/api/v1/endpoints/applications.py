import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, models
from app.api import deps
from app.core.money import salary_to_uzs
from app.models.job import JobStatus
from app.services.escrow_service import EscrowService

logger = logging.getLogger(__name__)
router = APIRouter()

COMMITTED_APP_STATUSES = ['hired', 'confirmed', 'in_progress', 'start_requested']


def _load_owned_application(db: Session, app_id: str, current_user: models.User):
    """Fetch an application together with its job, asserting the caller owns that job."""
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Ariza topilmadi")

    job = crud.job.get(db=db, id=app.jobId)
    if not job:
        raise HTTPException(status_code=404, detail="Ish e'loni topilmadi")

    if current_user.role != "admin" and job.employerId not in (current_user.id, current_user.uid):
        raise HTTPException(status_code=403, detail="Bu arizani boshqarish huquqingiz yo'q")

    return app, job


def _vacancies(job: models.Job) -> int:
    raw = (job.neededWorkers or "1").strip()
    return int(raw) if raw.isdigit() and int(raw) > 0 else 1


def _mask_phone(phone: str | None) -> str:
    """Show enough of a number to recognise it, not enough to call it."""
    if not phone or len(phone) < 4:
        return "+998 ** *** ** **"
    return f"{phone[:4]} ** *** ** {phone[-2:]}"


@router.get("/worker")
def get_worker_applications(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """All applications for the current worker, enriched with job details."""
    apps = (
        db.query(models.Application)
        .filter(models.Application.workerId.in_([current_user.id, current_user.uid]))
        .all()
    )
    if not apps:
        return []

    job_ids = {a.jobId for a in apps}
    jobs = db.query(models.Job).filter(models.Job.id.in_(job_ids)).all()
    job_map = {j.id: j for j in jobs}

    result = []
    for app in apps:
        job = job_map.get(app.jobId)
        if not job:
            continue

        # Earnings used to be computed by gluing every digit in the salary
        # string together, so "1 500 000 - 2 000 000" became 15000002000000.
        base_salary = salary_to_uzs(job.salary)

        result.append({
            "id": app.id,
            "jobId": app.jobId,
            "jobTitle": job.title,
            "jobCompany": job.company or "Baito",
            "jobLocation": job.location,
            "jobDate": str(job.workDate) if job.workDate else "",
            "status": app.status,
            "appliedDate": str(app.appliedDate) if app.appliedDate else None,
            "rating": app.rating,
            "review": app.review,
            "bonus": app.bonus,
            "earnedAmount": (base_salary + (app.bonus or 0)) if app.status == "completed" else 0,
            "expectedAmount": base_salary + (app.bonus or 0),
        })

    result.sort(key=lambda x: x.get("appliedDate") or "", reverse=True)
    return result


@router.get("/employer")
def get_employer_applications(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_employer),
) -> Any:
    """Applications for jobs posted by the current employer only."""
    employer_jobs = (
        db.query(models.Job)
        .filter(models.Job.employerId.in_([current_user.id, current_user.uid]))
        .all()
    )
    if not employer_jobs:
        return []

    job_map = {j.id: j for j in employer_jobs}

    apps = (
        db.query(models.Application)
        .filter(models.Application.jobId.in_(list(job_map.keys())))
        .all()
    )
    if not apps:
        return []

    worker_ids = {a.workerId for a in apps}
    workers = (
        db.query(models.User)
        .filter((models.User.id.in_(worker_ids)) | (models.User.uid.in_(worker_ids)))
        .all()
    )
    worker_map = {}
    for w in workers:
        worker_map[w.id] = w
        if w.uid:
            worker_map[w.uid] = w

    result = []
    for app in apps:
        worker = worker_map.get(app.workerId)
        job = job_map.get(app.jobId)
        # A candidate's phone number is revealed once they are actually hired,
        # not to anyone who happens to receive an application.
        contact_unlocked = app.status in COMMITTED_APP_STATUSES + ['completed']
        result.append({
            "id": app.id,
            "jobId": app.jobId,
            "jobTitle": job.title if job else "Ish e'loni",
            "workerId": app.workerId,
            "workerName": worker.name if worker else "Ishchi",
            "workerPhone": (
                (worker.phone if worker else None) if contact_unlocked
                else _mask_phone(worker.phone if worker else None)
            ),
            "contactUnlocked": contact_unlocked,
            "workerAvatar": worker.avatarUrl if worker else None,
            "workerRating": worker.rating if worker else 0.0,
            "workerCompletedJobs": worker.completedJobsCount if worker else 0,
            "workerBirthDate": worker.birthDate if worker else None,
            "workerGender": worker.gender if worker else None,
            "workerSkills": worker.skills if worker else [],
            "workerBio": worker.bio if worker else None,
            "status": app.status,
            "appliedDate": str(app.appliedDate) if app.appliedDate else None,
        })
    return result


@router.post("/{id}/hire")
def hire_applicant(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    current_user: models.User = Depends(deps.get_current_employer),
) -> Any:
    """Hire an applicant and put the wage into escrow."""
    app, job = _load_owned_application(db, id, current_user)

    if app.status in COMMITTED_APP_STATUSES:
        return {"success": True, "application_status": app.status}
    if app.status != 'applied':
        raise HTTPException(status_code=400, detail="Bu arizani yollab bo'lmaydi")
    if job.status in JobStatus.CLOSED_STATUSES:
        raise HTTPException(status_code=400, detail="Bu e'lon yopilgan")

    # Hiring was previously unbounded: a one-vacancy job could take on
    # unlimited workers.
    already_hired = (
        db.query(models.Application)
        .filter(
            models.Application.jobId == job.id,
            models.Application.status.in_(COMMITTED_APP_STATUSES + ['completed']),
        )
        .count()
    )
    vacancies = _vacancies(job)
    if already_hired >= vacancies:
        raise HTTPException(
            status_code=400,
            detail=f"Bu ish bo'yicha barcha {vacancies} ta o'rin to'lgan",
        )

    wage = salary_to_uzs(job.salary)
    escrow_held = False
    if wage > 0:
        # Freeze the wage now so the worker is not left chasing an employer
        # who has since spent the money.
        EscrowService.hold_funds(
            db, employer_id=job.employerId, job_id=job.id, amount_uzs=wage
        )
        escrow_held = True

    app.status = "hired"
    job.status = JobStatus.CONFIRMED
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
    from app.api.v1.endpoints.job_actions import get_job_dates_set

    job_dates = get_job_dates_set(job)
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
        "escrow_held": escrow_held,
        "escrow_amount": wage if escrow_held else 0,
    }


@router.post("/{id}/reject")
def reject_applicant(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    current_user: models.User = Depends(deps.get_current_employer),
) -> Any:
    """Reject an applicant for one of the caller's own jobs."""
    app, job = _load_owned_application(db, id, current_user)

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
