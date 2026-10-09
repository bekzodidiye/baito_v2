import logging
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.core.limiter import limiter
from app.models.job import JobStatus
from app.redis_client import redis_client
from app.services.ai_matcher import AIMatchmaker
from app.services.geo_service import GeoSpatialService
from app.services import job_days
from app.models.job_day import JobDayStatus
from app.services.spam_detector import SpamFraudDetector, keywords_from_settings

logger = logging.getLogger(__name__)
router = APIRouter()

HIRED_STATUSES = ['hired', 'confirmed', 'completed', 'in_progress', 'start_requested']

# One counted view per viewer per job per hour.
VIEW_DEDUPE_TTL_SECONDS = 3600




@router.get("/bookmarked", response_model=List[schemas.Job])
def get_bookmarked_jobs(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """The jobs this user has saved.

    The toggle wrote to the bookmarks table from the start, but nothing ever
    read it back, so there was no way to see what had been saved.
    """
    return (
        db.query(models.Job)
        .join(models.Bookmark, models.Bookmark.jobId == models.Job.id)
        .filter(models.Bookmark.userId == current_user.id)
        .order_by(models.Bookmark.createdAt.desc())
        .all()
    )


@router.get("/recommended")
def get_recommended_jobs(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
    limit: int = Query(20, ge=1, le=50),
) -> Any:
    """AI-assisted job recommendations for the logged-in worker."""
    active_jobs = (
        db.query(models.Job)
        .filter(models.Job.status.in_(JobStatus.OPEN_STATUSES))
        .order_by(models.Job.createdAt.desc(), models.Job.id.desc())
        .limit(100)
        .all()
    )
    if not active_jobs:
        return []

    ranked = AIMatchmaker.rank_jobs_for_worker(current_user, active_jobs)

    # The admin panel's "minimum match threshold" used to be a slider bound to
    # React state and nothing else. It filters the recommendations now.
    row = (
        db.query(models.SystemSetting)
        .filter(models.SystemSetting.id == "singleton")
        .first()
    )
    threshold = getattr(row, "matchMinScore", None) if row else None
    if threshold:
        above = [item for item in ranked if item["match_score"] >= threshold]
        # Never hand back an empty screen because the threshold is set high;
        # fall back to the best matches there are.
        ranked = above or ranked[:limit]

    ranked = ranked[:limit]
    # Same serialisation problem as /nearby: the matcher returns ORM objects.
    return [
        {**item, "job": schemas.Job.model_validate(item["job"])}
        for item in ranked
    ]


@router.get("/nearby")
def get_nearby_jobs(
    lat: float = Query(..., ge=-90.0, le=90.0),
    lng: float = Query(..., ge=-180.0, le=180.0),
    radius_km: float = Query(10.0, ge=0.5, le=100.0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(deps.get_db),
) -> Any:
    """Jobs within a radius, with commute estimates.

    A coarse bounding box is applied in SQL first so the whole jobs table is no
    longer pulled into memory on every map pan.
    """
    # NOTE: despite the names, coordinateX holds LATITUDE and coordinateY holds
    # LONGITUDE — that is what the job-posting form writes and what
    # GeoSpatialService reads.
    #
    # 1 degree of latitude is ~111 km everywhere; longitude shrinks with
    # latitude, but a fixed generous factor is enough for a pre-filter because
    # the exact distance is computed afterwards.
    lat_delta = radius_km / 111.0
    lng_delta = radius_km / 40.0

    jobs = (
        db.query(models.Job)
        .filter(
            models.Job.status.in_(JobStatus.OPEN_STATUSES),
            models.Job.coordinateX.isnot(None),
            models.Job.coordinateY.isnot(None),
            models.Job.coordinateX.between(lat - lat_delta, lat + lat_delta),
            models.Job.coordinateY.between(lng - lng_delta, lng + lng_delta),
        )
        .limit(1000)
        .all()
    )

    matches = GeoSpatialService.filter_jobs_by_radius(lat, lng, jobs, radius_km)[:limit]
    # The service hands back ORM instances nested in a dict, which FastAPI
    # cannot serialise — this endpoint used to 500 on any non-empty result.
    return [
        {**m, "job": schemas.Job.model_validate(m["job"])}
        for m in matches
    ]


@router.get("/my", response_model=List[schemas.JobWithApplicationStatus])
def get_my_jobs(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
) -> Any:
    """Retrieve all jobs posted by the currently authenticated employer only."""
    employer_ids = [current_user.id]
    if getattr(current_user, 'uid', None):
        employer_ids.append(current_user.id)

    jobs = (
        db.query(models.Job)
        .filter(models.Job.employerId.in_(employer_ids))
        .order_by(models.Job.createdAt.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    job_ids = [j.id for j in jobs]
    apps = (
        db.query(models.Application)
        .filter(
            models.Application.jobId.in_(job_ids),
            models.Application.status.in_(["hired", "confirmed", "in_progress", "completed", "start_requested"]),
        )
        .all()
    ) if job_ids else []

    hired_counts = {}
    for a in apps:
        hired_counts[a.jobId] = hired_counts.get(a.jobId, 0) + 1

    # One query for every job on the page rather than one per card. Only jobs
    # that have actually been invoiced appear here; the rest get None, which is
    # what tells the card there is nothing to pay yet.
    payouts = {}
    if job_ids:
        for p in (
            db.query(models.JobPayout)
            .filter(models.JobPayout.jobId.in_(job_ids))
            .order_by(models.JobPayout.paidAt.asc())
            .all()
        ):
            if p.invoiceNumber:
                payouts[p.jobId] = p

    result = []
    for job in jobs:
        vacancies_num = job.vacancies
        hired_cnt = hired_counts.get(job.id, 0)

        job_data = schemas.Job.model_validate(job).model_dump()
        job_data.update({
            "applied": False,
            "bookmarked": False,
            "hiredCount": hired_cnt,
            "vacancies": vacancies_num,
            "appliedDate": None,
            "hiredWorkers": [],
        })

        payout = payouts.get(job.id)
        job_data.update({
            "payoutStatus": payout.status if payout else None,
            "invoiceNumber": payout.invoiceNumber if payout else None,
            "invoiceAmount": (payout.invoiceAmount or payout.amount) if payout else None,
        })
        result.append(job_data)

    return result


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



@router.post("", response_model=schemas.Job)
@limiter.limit("20/hour")
def create_job(
    request: Request,
    *,
    db: Session = Depends(deps.get_db),
    job_in: schemas.JobCreate,
    # Posting is what puts a stranger's address in front of workers and what
    # draws on a balance, so the account behind it has to have been
    # checked first.
    current_user: models.User = Depends(deps.get_current_employer),
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
    return db_job


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


@router.put("/{job_id}", response_model=schemas.Job)
def update_job(
    job_id: str,
    job_in: schemas.JobUpdate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_employer),
) -> Any:
    """Edit a posting.

    There was no update route at all, so fixing a typo meant deleting the job
    and losing every application attached to it.
    """
    job = crud.job.get(db=db, id=job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Ish e'loni topilmadi")

    is_admin = current_user.role == 'admin'
    if not is_admin and job.employerId != current_user.id:
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
    if job.employerId != current_user.id and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Bu e'lonni o'chirish huquqingiz yo'q")

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
