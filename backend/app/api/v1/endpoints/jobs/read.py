import hashlib
import json
import logging
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.models.job import JobStatus
from app.redis_client import redis_client
from app.services.geo_service import GeoSpatialService

logger = logging.getLogger(__name__)
router = APIRouter()

HIRED_STATUSES = ['hired', 'confirmed', 'completed', 'in_progress', 'start_requested']

# One counted view per viewer per job per hour.
VIEW_DEDUPE_TTL_SECONDS = 3600











@router.get("/", response_model=List[schemas.JobWithApplicationStatus])
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

    user_ids = [uid for uid in [current_user.id, getattr(current_user, 'uid', None)] if uid] if current_user else []

    if employer_id:
        # Browsing another employer's full posting history — including their
        # closed and cancelled jobs — is not public information.
        if not (is_admin or (current_user and employer_id in user_ids)):
            raise HTTPException(status_code=403, detail="Bu ma'lumotni ko'rish huquqingiz yo'q")
        query = query.filter(models.Job.employerId == employer_id)
    elif is_employer:
        query = query.filter(models.Job.employerId.in_(user_ids))
    elif not is_admin:
        # Job seekers see live postings — plus the jobs they are personally
        # committed to, whatever state those have reached.
        visible = models.Job.status.in_(JobStatus.OPEN_STATUSES)
        if current_user:
            own = (
                db.query(models.Application.jobId)
                .filter(models.Application.workerId.in_(user_ids))
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
                models.Application.workerId.in_(user_ids),
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
                models.Bookmark.userId.in_(user_ids),
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

        for app in hired_apps:
            user = user_map.get(app.workerId)
            if not user:
                continue
            # Workers and employers must not see each other's phone numbers.
            # Only platform admins or the worker themselves may see their own phone.
            may_see_phone = bool(
                is_admin
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
        elif current_user and job.employerId in user_ids:
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


@router.get("/location-counts", response_model=schemas.JobLocationCounts)
def get_job_location_counts(
    response: Response,
    request: Request,
    db: Session = Depends(deps.get_db),
) -> Any:
    """Aggregated open job counts per region and district for map labels and badges.
    Caches calculation in Redis with 30s TTL and HTTP ETag / Cache-Control headers
    to completely eliminate repetitive client-side string-matching loops.
    """
    cache_key = "cache:jobs:location_counts"
    cached = None
    try:
        cached = redis_client.get(cache_key)
    except Exception as e:
        logger.warning("Redis lookup failed in location-counts: %s", e)

    if cached:
        try:
            raw_text = cached.decode("utf-8") if isinstance(cached, bytes) else str(cached)
            data = json.loads(raw_text)
            etag = f'"{hashlib.md5(raw_text.encode("utf-8")).hexdigest()}"'
            response.headers["Cache-Control"] = "public, max-age=15, stale-while-revalidate=30"
            response.headers["ETag"] = etag
            if request.headers.get("if-none-match") == etag:
                return Response(
                    status_code=304,
                    headers={
                        "ETag": etag,
                        "Cache-Control": "public, max-age=15, stale-while-revalidate=30",
                    },
                )
            return data
        except Exception as e:
            logger.warning("Failed to decode cached location counts: %s", e)

    open_jobs = (
        db.query(
            models.Job.location,
            models.Job.rawLocation,
            models.Job.coordinateX,
            models.Job.coordinateY,
        )
        .filter(models.Job.status.in_(JobStatus.OPEN_STATUSES))
        .all()
    )

    counts = GeoSpatialService.aggregate_location_counts(open_jobs)
    payload_str = json.dumps(counts)

    try:
        redis_client.set(cache_key, payload_str, ex=30)
    except Exception as e:
        logger.warning("Redis store failed in location-counts: %s", e)

    etag = f'"{hashlib.md5(payload_str.encode("utf-8")).hexdigest()}"'
    response.headers["Cache-Control"] = "public, max-age=15, stale-while-revalidate=30"
    response.headers["ETag"] = etag
    if request.headers.get("if-none-match") == etag:
        return Response(
            status_code=304,
            headers={
                "ETag": etag,
                "Cache-Control": "public, max-age=15, stale-while-revalidate=30",
            },
        )

    return counts


@router.get("/map", response_model=List[schemas.JobMapPin])
def get_map_jobs(
    response: Response,
    request: Request,
    db: Session = Depends(deps.get_db),
    current_user: Optional[models.User] = Depends(deps.get_current_user_optional),
    min_lat: Optional[float] = Query(None, ge=-90.0, le=90.0),
    max_lat: Optional[float] = Query(None, ge=-90.0, le=90.0),
    min_lng: Optional[float] = Query(None, ge=-180.0, le=180.0),
    max_lng: Optional[float] = Query(None, ge=-180.0, le=180.0),
    location: Optional[str] = Query(None, max_length=200),
    category: Optional[str] = Query(None, max_length=100),
    search: Optional[str] = Query(None, max_length=200),
    limit: int = Query(500, ge=1, le=1000),
) -> Any:
    """High-performance lightweight map pins for interactive GIS map and clustering.
    Excludes heavy text columns (description, requirements, etc.) and unneeded user profiles,
    reducing payload size by >80% to eliminate UI freezing during panning/zooming.
    Supports spatial bounding-box filtering and HTTP caching with ETag.
    """
    query = db.query(models.Job)

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                models.Job.title.ilike(term),
                models.Job.company.ilike(term),
                models.Job.location.ilike(term),
            )
        )
    if location:
        query = query.filter(models.Job.location.ilike(f"%{location.strip()}%"))
    if category:
        query = query.filter(models.Job.category == category)

    if min_lat is not None and max_lat is not None:
        query = query.filter(models.Job.coordinateX.between(min_lat, max_lat))
    if min_lng is not None and max_lng is not None:
        query = query.filter(models.Job.coordinateY.between(min_lng, max_lng))

    visible = models.Job.status.in_(JobStatus.OPEN_STATUSES)
    user_ids = [uid for uid in [current_user.id, getattr(current_user, 'uid', None)] if uid] if current_user else []

    if current_user:
        own = (
            db.query(models.Application.jobId)
            .filter(models.Application.workerId.in_(user_ids))
            .subquery()
        )
        visible = or_(visible, models.Job.id.in_(select(own.c.jobId)))
    query = query.filter(visible)

    jobs = (
        query.order_by(models.Job.createdAt.desc(), models.Job.id.desc())
        .limit(limit)
        .all()
    )

    response.headers["Cache-Control"] = "public, max-age=15, stale-while-revalidate=30"

    if not jobs:
        return []

    etag_source = f"{len(jobs)}-{jobs[0].id}-{getattr(jobs[0], 'createdAt', '')}"
    etag = f'"{hashlib.md5(etag_source.encode()).hexdigest()}"'
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers={"ETag": etag, "Cache-Control": "public, max-age=15, stale-while-revalidate=30"})
    response.headers["ETag"] = etag

    job_ids = [j.id for j in jobs]

    worker_apps_map = {}
    bookmarked_ids: set[str] = set()
    if current_user:
        worker_apps = (
            db.query(models.Application)
            .filter(
                models.Application.workerId.in_(user_ids),
                models.Application.jobId.in_(job_ids),
            )
            .all()
        )
        worker_apps_map = {a.jobId: a for a in worker_apps}

        bookmarked_ids = {
            b.jobId
            for b in db.query(models.Bookmark.jobId)
            .filter(
                models.Bookmark.userId.in_(user_ids),
                models.Bookmark.jobId.in_(job_ids),
            )
            .all()
        }

    hired_apps = (
        db.query(models.Application.jobId)
        .filter(
            models.Application.jobId.in_(job_ids),
            models.Application.status.in_(HIRED_STATUSES),
        )
        .all()
    )
    hired_counts: dict[str, int] = {}
    for app in hired_apps:
        hired_counts[app.jobId] = hired_counts.get(app.jobId, 0) + 1

    result = []
    for job in jobs:
        app_item = worker_apps_map.get(job.id)
        job_status = job.status
        if app_item:
            if app_item.status in ('in_progress', 'completed', 'start_requested', 'hired', 'applied'):
                job_status = app_item.status

        vacancies_num = job.vacancies
        hired_cnt = hired_counts.get(job.id, 0)
        if job.status == JobStatus.OPEN and job.hiredWorkerId is None and vacancies_num <= 1:
            hired_cnt = 0

        is_filled = (
            (job.status != JobStatus.OPEN and hired_cnt >= vacancies_num)
            or (job.status in (JobStatus.COMPLETED, JobStatus.IN_PROGRESS))
        )
        if is_filled and not app_item:
            continue

        result.append(schemas.JobMapPin(
            id=job.id,
            title=job.title,
            company=job.company,
            salary=job.salary,
            salaryCurrency=job.salaryCurrency or 'UZS',
            location=job.location,
            rawLocation=job.rawLocation,
            logoUrl=job.logoUrl,
            imageUrl=job.imageUrl,
            tags=job.tags,
            category=job.category,
            workDate=job.workDate,
            workTime=job.workTime,
            neededWorkers=job.neededWorkers or '1',
            coordinateX=job.coordinateX,
            coordinateY=job.coordinateY,
            latitude=job.coordinateX,
            longitude=job.coordinateY,
            urgent=job.urgent or False,
            status=job_status,
            applied=bool(app_item),
            bookmarked=job.id in bookmarked_ids,
            hiredCount=hired_cnt,
            vacancies=vacancies_num,
        ))

    return result


@router.get("/{job_id}", response_model=schemas.JobWithApplicationStatus)
def read_job(
    job_id: str,
    db: Session = Depends(deps.get_db),
    current_user: Optional[models.User] = Depends(deps.get_current_user_optional),
) -> Any:
    """Fetch a single job with application status for the caller."""
    job = crud.job.get(db=db, id=job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Ish e'loni topilmadi")

    user_ids = [uid for uid in [current_user.id, getattr(current_user, 'uid', None)] if uid] if current_user else []
    is_owner = bool(current_user and job.employerId in user_ids)
    is_admin = bool(current_user and current_user.role == 'admin')

    app_item = None
    if current_user:
        app_item = (
            db.query(models.Application)
            .filter(
                models.Application.jobId == job_id,
                models.Application.workerId.in_(user_ids),
            )
            .first()
        )

    if (job.status in JobStatus.CLOSED_STATUSES or job.status == JobStatus.PENDING) and not (is_owner or is_admin or app_item):
        raise HTTPException(status_code=404, detail="Ish e'loni topilmadi")

    job_dict = schemas.JobWithApplicationStatus.model_validate(job)
    job_status = job.status
    if app_item:
        job_dict.applied = True
        job_dict.appliedDate = app_item.appliedDate
        if app_item.status in ('hired', 'confirmed', 'in_progress', 'completed', 'start_requested'):
            job_status = app_item.status
        elif app_item.status == 'applied':
            job_status = 'applied'
    job_dict.status = job_status

    if current_user:
        job_dict.bookmarked = (
            db.query(models.Bookmark.id)
            .filter(
                models.Bookmark.userId.in_(user_ids),
                models.Bookmark.jobId == job_id,
            )
            .first()
            is not None
        )

    return job_dict






