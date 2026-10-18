import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, models
from app.api import deps
from app.core.money import parse_salary_amounts, salary_to_uzs
from app.services.earnings_service import fee_for, job_fee_percent
from app.models.job import JobStatus
from app.services import job_days
from app.services.work_dates import get_job_dates_set

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


@router.post("/{id}/hire")
def hire_applicant(
    *,
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


@router.post("/{id}/reject")
def reject_applicant(
    *,
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
