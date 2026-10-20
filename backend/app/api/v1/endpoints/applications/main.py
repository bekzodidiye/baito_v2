import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from app.core.limiter import limiter
from sqlalchemy.orm import Session

from app import crud, models
from app.api import deps
from app.core.money import salary_to_uzs
from app.services.earnings_service import fee_for

COMMITTED_APP_STATUSES = ['hired', 'confirmed', 'in_progress', 'start_requested']

logger = logging.getLogger(__name__)
router = APIRouter()


def _load_owned_application(db: Session, app_id: str, current_user: models.User):
    """Fetch an application together with its job, asserting the caller owns that job."""
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Ariza topilmadi")

    job = crud.job.get(db=db, id=app.jobId)
    if not job:
        raise HTTPException(status_code=404, detail="Ish e'loni topilmadi")

    if current_user.role != "admin" and job.employerId != current_user.id:
        raise HTTPException(status_code=403, detail="Bu arizani boshqarish huquqingiz yo'q")

    return app, job




def _mask_phone(phone: str | None) -> str:
    """Show enough of a number to recognise it, not enough to call it."""
    if not phone or len(phone) < 4:
        return "+998 ** *** ** **"
    return f"{phone[:4]} ** *** ** {phone[-2:]}"


@limiter.limit('5/minute')
@router.get("/worker")
def get_worker_applications(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """All applications for the current worker, enriched with job details."""
    apps = (
        db.query(models.Application)
        .filter(models.Application.workerId == current_user.id)
        .all()
    )
    if not apps:
        return []

    job_ids = {a.jobId for a in apps}
    jobs = db.query(models.Job).filter(models.Job.id.in_(job_ids)).all()
    job_map = {j.id: j for j in jobs}

    # The commission is the company's: a worker is paid the wage the posting
    # advertised, in full. Days already worked have a row saying exactly what
    # was credited, which is what to quote — a posting edited since would
    # otherwise restate work already done at the new figure.
    # One query for the lot rather than one per application.
    earnings = (
        db.query(models.Transaction)
        .filter(
            models.Transaction.jobId.in_(job_ids),
            # The wage only. A bonus is carried on the application row and
            # added below, so counting it here too would double it.
            models.Transaction.type == "worker_earning",
        )
        .all()
    ) if job_ids else []
    credited: dict[str, int] = {}
    for e in earnings:
        credited[e.jobId] = credited.get(e.jobId, 0) + (e.amount or 0) // 100

    result = []
    for app in apps:
        job = job_map.get(app.jobId)
        if not job:
            continue

        # Earnings used to be computed by gluing every digit in the salary
        # string together, so "1 500 000 - 2 000 000" became 15000002000000.
        base_salary = salary_to_uzs(job.salary)
        # What the worker is told they earned has to be what reached their
        # balance. The commission is charged to the employer on top of the wage,
        # so for anyone hired since that changed the two are simply the posted
        # salary. A day already worked has its own row saying what was
        # credited, and quoting the posting's figure instead would restate it
        # at whatever the salary says today.
        net_wage = credited.get(job.id, base_salary)

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
            "earnedAmount": (net_wage + (app.bonus or 0)) if app.status == "completed" else 0,
            "expectedAmount": net_wage + (app.bonus or 0),
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
        .filter(models.Job.employerId == current_user.id)
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
        .filter(models.User.id.in_(worker_ids))
        .all()
    )
    worker_map = {w.id: w for w in workers}

    # Each job carries its own rate — its category's plus its region's.
    # We batch query categories and regions to avoid N+1 queries.
    from app.services.earnings_service import platform_fee_percent, _region_of
    
    cat_slugs = {j.category for j in employer_jobs if j.category}
    region_names = {_region_of(j.location) for j in employer_jobs if _region_of(j.location)}
    
    cat_map = {}
    if cat_slugs:
        categories = db.query(models.Category).filter(models.Category.slug.in_(cat_slugs)).all()
        cat_map = {c.slug: c for c in categories}
        
    region_map = {}
    if region_names:
        regions = db.query(models.Region).filter(models.Region.name.in_(region_names)).all()
        region_map = {r.name: r for r in regions}
        
    default_fee = platform_fee_percent(db)
    rate_by_job = {}
    
    for j in employer_jobs:
        if not j.category and not _region_of(j.location):
            rate_by_job[j.id] = default_fee
            continue
            
        c = cat_map.get(j.category)
        r = region_map.get(_region_of(j.location))
        
        if c is None and r is None:
            rate_by_job[j.id] = default_fee
        else:
            total = (getattr(c, "commissionPercent", 0) or 0) + (getattr(r, "commissionPercent", 0) or 0)
            rate_by_job[j.id] = max(0.0, min(100.0, float(total)))

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
            # The card offers "confirm start" off the application's own status,
            # which stays at start_requested forever. Without the job's status
            # beside it the button was still being offered on a shift that had
            # already finished, and the server answered 400 to every press.
            "jobStatus": job.status if job else None,
            # What hiring will actually freeze. Computed the same way /hire
            # computes it, so the confirmation the employer reads and the sum
            # taken out of their balance cannot drift apart — including the
            # commission, which the employer pays on top of the wage.
            "wageAmount": salary_to_uzs(job.salary) if job else 0,
            "feeAmount": fee_for(salary_to_uzs(job.salary), rate_by_job.get(job.id, 0)) if job else 0,
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
            "rating": app.rating,
            "review": app.review,
        })
    return result




