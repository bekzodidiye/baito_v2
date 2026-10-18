import logging
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.models.job import JobStatus

logger = logging.getLogger(__name__)
router = APIRouter()

HIRED_STATUSES = ['hired', 'confirmed', 'completed', 'in_progress', 'start_requested']

# One counted view per viewer per job per hour.
VIEW_DEDUPE_TTL_SECONDS = 3600











@router.get("", response_model=List[schemas.JobWithApplicationStatus])
def read_jobs(
    db: Session = Depends(deps.get_db),
    current_user: Optional[models.User] = Depends(deps.get_current_user_optional),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    employer_id: Optional[str] = None,
    search: Optional[str] = Query(None, max_length=200),
    location: Optional[str] = Query(None, max_length=200),
    category: Optional[str] = Query(None, max_length=100),
) -> Any:
    """Retrieve jobs. If the caller is logged in, attach their application status.

    ``search``, ``location`` and ``category`` narrow the query in SQL. Without
    them the endpoint only ever returned the first page and the client filtered
    that in the browser, so a job past the limit could not be found at all.
    """
    query = db.query(models.Job)

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                models.Job.title.ilike(term),
                models.Job.company.ilike(term),
                models.Job.description.ilike(term),
                models.Job.location.ilike(term),
            )
        )
    if location:
        query = query.filter(models.Job.location.ilike(f"%{location.strip()}%"))
    if category:
        query = query.filter(models.Job.category == category)

    is_admin = bool(current_user and current_user.role == 'admin')
    is_employer = bool(current_user and current_user.role == 'employer')

    if employer_id:
        # Browsing another employer's full posting history — including their
        # closed and cancelled jobs — is not public information.
        if not (is_admin or (current_user and employer_id == current_user.id)):
            raise HTTPException(status_code=403, detail="Bu ma'lumotni ko'rish huquqingiz yo'q")
        query = query.filter(models.Job.employerId == employer_id)
    elif is_employer:
        query = query.filter(models.Job.employerId == current_user.id)
    elif not is_admin:
        # Job seekers see live postings — plus the jobs they are personally
        # committed to, whatever state those have reached.
        #
        # Without the second half a worker's calendar was empty: the moment
        # they were hired the posting left OPEN_STATUSES, so their own shift
        # vanished from the only feed the calendar reads. A worker could not
        # see the work they had been hired for, were in the middle of, or had
        # finished.
        #
        # This widens visibility only to rows the caller already has an
        # application on; nobody gains sight of anyone else's closed postings.
        visible = models.Job.status.in_(JobStatus.OPEN_STATUSES)
        if current_user:
            own = (
                db.query(models.Application.jobId)
                .filter(models.Application.workerId.in_(
                    [current_user.id]
                ))
                .subquery()
            )
            visible = or_(visible, models.Job.id.in_(select(own.c.jobId)))
        query = query.filter(visible)

    # createdAt alone is not a total order — several postings can share a
    # timestamp, and Postgres is then free to return the tied rows in any
    # order, so an offset page could repeat one job and skip another.
    jobs = (
        query.order_by(models.Job.createdAt.desc(), models.Job.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    if not jobs:
        return []

    job_ids = [j.id for j in jobs]

    worker_apps = []
    if current_user:
        worker_apps = (
            db.query(models.Application)
            .filter(
                models.Application.workerId == current_user.id,
                models.Application.jobId.in_(job_ids),
            )
            .all()
        )

    # Bookmarks were written to the table and never read back, so the flag only
    # lived in the browser: saving a job and reloading lost it.
    bookmarked_ids: set[str] = set()
    if current_user:
        bookmarked_ids = {
            b.jobId
            for b in db.query(models.Bookmark.jobId)
            .filter(
                models.Bookmark.userId == current_user.id,
                models.Bookmark.jobId.in_(job_ids),
            )
            .all()
        }

    hired_apps = (
        db.query(models.Application)
        .filter(
            models.Application.jobId.in_(job_ids),
            models.Application.status.in_(HIRED_STATUSES),
        )
        .all()
    )

    hired_counts: dict[str, int] = {}
    job_hired_workers: dict[str, list] = {}
    if hired_apps:
        for app in hired_apps:
            hired_counts[app.jobId] = hired_counts.get(app.jobId, 0) + 1

        hired_worker_ids = list({app.workerId for app in hired_apps})
        hired_users = (
            db.query(models.User).filter(models.User.id.in_(hired_worker_ids)).all()
        )
        user_map = {user.id: user for user in hired_users}

        from app.schemas.job import HiredWorkerInfo

        employer_job_ids = {j.id for j in jobs if j.employerId in
                            ((current_user.id,) if current_user else ())}

        for app in hired_apps:
            user = user_map.get(app.workerId)
            if not user:
                continue
            # A hired worker's phone number is contact detail for the employer
            # who hired them (and for the worker themselves), not something to
            # hand to every anonymous visitor browsing the job board.
            may_see_phone = bool(
                is_admin
                or app.jobId in employer_job_ids
                or (current_user and current_user.id == user.id)
            )
            job_hired_workers.setdefault(app.jobId, []).append(HiredWorkerInfo(
                id=user.id,
                name=user.name or "Foydalanuvchi",
                phone=user.phone if may_see_phone else None,
                avatarUrl=user.avatarUrl,
            ))

    worker_apps_map = {a.jobId: a for a in worker_apps}
    job_hired_apps_map = {}
    for a in hired_apps:
        job_hired_apps_map.setdefault(a.jobId, []).append(a)

    result = []
    for job in jobs:
        app_item = worker_apps_map.get(job.id)
        job_status = job.status
        if app_item:
            if app_item.status == 'in_progress' or job.status == JobStatus.IN_PROGRESS:
                job_status = 'in_progress'
            elif app_item.status == 'completed' or job.status == JobStatus.COMPLETED:
                job_status = 'completed'
            elif app_item.status == 'start_requested' or job.status == 'start_requested':
                job_status = 'start_requested'
            elif app_item.status == 'hired':
                job_status = 'hired'
            elif app_item.status == 'applied':
                job_status = 'applied'
        elif current_user and job.employerId == current_user.id:
            job_apps = job_hired_apps_map.get(job.id, [])
            if job.status not in (JobStatus.IN_PROGRESS, JobStatus.COMPLETED, JobStatus.CANCELLED):
                if any(a.status == 'in_progress' for a in job_apps):
                    job_status = 'in_progress'
                elif any(a.status == 'start_requested' for a in job_apps):
                    job_status = 'start_requested'

        job_dict = schemas.JobWithApplicationStatus.model_validate(job)
        job_dict.status = job_status
        job_dict.applied = bool(app_item)
        job_dict.bookmarked = job.id in bookmarked_ids
        if app_item:
            job_dict.appliedDate = app_item.appliedDate

        vacancies_num = job.vacancies
        hired_cnt = hired_counts.get(job.id, 0)
        if job.status == JobStatus.OPEN and job.hiredWorkerId is None and vacancies_num <= 1:
            hired_cnt = 0

        job_dict.hiredCount = hired_cnt
        job_dict.vacancies = vacancies_num
        job_dict.hiredWorkers = job_hired_workers.get(job.id, [])

        is_filled = (
            (job.status != JobStatus.OPEN and hired_cnt >= vacancies_num)
            or (job.status in (JobStatus.COMPLETED, JobStatus.IN_PROGRESS))
        )

        if not (is_admin or is_employer):
            if is_filled and not app_item:
                continue

        result.append(job_dict)

    return result





@router.get("/{job_id}", response_model=schemas.Job)
def read_job(
    job_id: str,
    db: Session = Depends(deps.get_db),
    current_user: Optional[models.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """Fetch a single job."""
    job = crud.job.get(db=db, id=job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Ish e'loni topilmadi")

    is_owner = bool(current_user and job.employerId == current_user.id)
    is_admin = bool(current_user and current_user.role == 'admin')
    if job.status in JobStatus.CLOSED_STATUSES and not (is_owner or is_admin):
        raise HTTPException(status_code=404, detail="Ish e'loni topilmadi")

    return job






