import hashlib
import json
import logging
import math
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy import or_, select, func
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.db.session import SessionLocal
from app.core.map_cache import (
    get_map_cache_version,
    get_user_map_cache_version,
    get_map_cache_key_for_request,
    build_map_geojson_cache_key,
    CACHE_LOCATION_COUNTS_PREFIX,
    compute_pin_signature,
    verify_pin_signature,
    make_response_envelope,
    verify_response_envelope,
)
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

        hired_worker_ids = list({app.workerId for app in hired_apps if app.workerId})
        hired_users = (
            db.query(models.User)
            .filter(or_(models.User.id.in_(hired_worker_ids), models.User.uid.in_(hired_worker_ids)))
            .all()
        ) if hired_worker_ids else []
        user_map = {}
        for user in hired_users:
            user_map[user.id] = user
            if user.uid:
                user_map[user.uid] = user

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
    db: Optional[Session] = Depends(deps.get_db_optional),
) -> Any:
    """Aggregated open job counts per region and district for map labels and badges.
    Caches calculation in Redis with atomic versioning and HTTP ETag / Cache-Control headers
    to completely eliminate repetitive client-side string-matching loops and database load.
    Zero database connections are acquired when served from Redis cache.
    """
    version = get_map_cache_version()
    cache_key = f"{CACHE_LOCATION_COUNTS_PREFIX}:v{version}"
    cached = None
    try:
        cached = redis_client.get(cache_key)
    except Exception as e:
        logger.warning("Redis lookup failed in location-counts: %s", e)

    if cached:
        try:
            raw_text = cached.decode("utf-8") if isinstance(cached, bytes) else str(cached)
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
            return Response(
                content=raw_text,
                media_type="application/json",
                headers={
                    "ETag": etag,
                    "Cache-Control": "public, max-age=15, stale-while-revalidate=30",
                },
            )
        except Exception as e:
            logger.warning("Failed to decode cached location counts: %s", e)

    own_db = False
    active_db = db
    if active_db is None:
        active_db = SessionLocal()
        own_db = True
    try:
        open_jobs = (
            active_db.query(
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
    finally:
        if own_db and active_db:
            active_db.close()

    try:
        redis_client.set(cache_key, payload_str, ex=300)
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

    return Response(
        content=payload_str,
        media_type="application/json",
        headers={
            "ETag": etag,
            "Cache-Control": "public, max-age=15, stale-while-revalidate=30",
        },
    )


@router.get("/map/", include_in_schema=False)
@router.get("/map", response_model=List[schemas.JobMapPin])
def get_map_jobs(
    response: Response,
    request: Request,
    db: Optional[Session] = Depends(deps.get_db_optional),
    current_user: Optional[models.User] = Depends(deps.get_current_user_optional),
    min_lat: Optional[float] = Query(None, ge=-90.0, le=90.0),
    max_lat: Optional[float] = Query(None, ge=-90.0, le=90.0),
    min_lng: Optional[float] = Query(None, ge=-180.0, le=180.0),
    max_lng: Optional[float] = Query(None, ge=-180.0, le=180.0),
    location: Optional[str] = Query(None, max_length=200),
    category: Optional[str] = Query(None, max_length=100),
    search: Optional[str] = Query(None, max_length=200),
    limit: int = Query(500, ge=1, le=1000),
    clustered: bool = Query(False, description="Server-side spatial cluster aggregation for low zoom"),
) -> Any:
    """High-performance lightweight map pins for interactive GIS map and clustering.
    Excludes heavy text columns (description, requirements, etc.) and unneeded user profiles,
    reducing payload size by >80% to eliminate UI freezing during panning/zooming.
    Supports multi-tier Redis caching (base pins + user personalization), zero-DB fast path,
    spatial bounding-box filtering, coordinate quantization, and HTTP 304 ETag.
    """
    # Unwrap FastAPI Query defaults if called directly from other functions
    min_lat = min_lat.default if hasattr(min_lat, "default") else min_lat
    max_lat = max_lat.default if hasattr(max_lat, "default") else max_lat
    min_lng = min_lng.default if hasattr(min_lng, "default") else min_lng
    max_lng = max_lng.default if hasattr(max_lng, "default") else max_lng
    location = location.default if hasattr(location, "default") else location
    category = category.default if hasattr(category, "default") else category
    search = search.default if hasattr(search, "default") else search
    limit = limit.default if hasattr(limit, "default") else (limit or 500)
    clustered = clustered.default if hasattr(clustered, "default") else bool(clustered)

    version = get_map_cache_version()
    base_cache_key = get_map_cache_key_for_request(
        version=version,
        min_lat=min_lat,
        max_lat=max_lat,
        min_lng=min_lng,
        max_lng=max_lng,
        location=location,
        category=category,
        search=search,
        limit=limit,
        clustered=clustered,
    )

    # Derived strictly from verified identity via canonical deps.get_current_user_optional (FIX A)
    user_id = current_user.id if current_user else None

    if user_id:
        user_ver = get_user_map_cache_version(user_id)
        effective_cache_key = f"{base_cache_key}:u:{user_id}:uv{user_ver}"
        cache_control = "private, max-age=15, stale-while-revalidate=30"
    else:
        effective_cache_key = base_cache_key
        cache_control = "public, max-age=15, stale-while-revalidate=30"

    # 1. FAST PATH: Check effective cache key (works for BOTH authenticated and guest visitors)
    try:
        cached_bytes = redis_client.get(effective_cache_key)
        if cached_bytes:
            cached_str = cached_bytes.decode("utf-8") if isinstance(cached_bytes, bytes) else str(cached_bytes)
            try:
                cached_obj = json.loads(cached_str)
            except Exception:
                cached_obj = None

            cached_pins = verify_response_envelope(
                envelope=cached_obj,
                expected_key=effective_cache_key,
                expected_clustered=clustered,
                expected_user_id=user_id,
            )

            if cached_pins is None:
                try:
                    redis_client.delete(effective_cache_key)
                    redis_client.delete(base_cache_key)
                except Exception:
                    pass
                cached_bytes = None
            else:
                has_corrupt_cache = False
                seen_cluster_pids = set()
                seen_ordinary_pids = set()

                for p in cached_pins:
                    if not isinstance(p, dict):
                        has_corrupt_cache = True
                        break

                    # Fail closed on missing, blank, null, or non-string ID
                    p_id = p.get("id")
                    if not p_id or not isinstance(p_id, str) or not p_id.strip():
                        has_corrupt_cache = True
                        break

                    p_lat = p.get("coordinateX") if p.get("coordinateX") is not None else p.get("latitude")
                    p_lng = p.get("coordinateY") if p.get("coordinateY") is not None else p.get("longitude")
                    is_inside = False
                    if p_lat is not None and p_lng is not None:
                        try:
                            pf_lat = float(p_lat)
                            pf_lng = float(p_lng)
                            if not (math.isnan(pf_lat) or math.isnan(pf_lng) or math.isinf(pf_lat) or math.isinf(pf_lng)):
                                if not (pf_lat == 0.0 and pf_lng == 0.0):
                                    if GeoSpatialService.is_inside_uzbekistan(pf_lat, pf_lng):
                                        is_inside = True
                        except (ValueError, TypeError):
                            pass

                    if not is_inside:
                        has_corrupt_cache = True
                        break

                    if p.get("isCluster"):
                        pids = p.get("pinIds")
                        if not isinstance(pids, list) or len(pids) == 0:
                            has_corrupt_cache = True
                            break
                        if not all(isinstance(pid, str) and pid.strip() for pid in pids):
                            has_corrupt_cache = True
                            break
                        if len(set(pids)) != len(pids):
                            has_corrupt_cache = True
                            break
                        if p.get("count") != len(pids):
                            has_corrupt_cache = True
                            break
                        # Cross-cluster duplicate detection: Reject IDs repeated across multiple clusters
                        if any(pid in seen_cluster_pids for pid in pids):
                            has_corrupt_cache = True
                            break
                        if any(pid in seen_ordinary_pids for pid in pids):
                            has_corrupt_cache = True
                            break
                        seen_cluster_pids.update(pids)
                    else:
                        if p_id in seen_cluster_pids or p_id in seen_ordinary_pids:
                            has_corrupt_cache = True
                            break
                        seen_ordinary_pids.add(p_id)

                    # Authenticate every cached pin object (clusters and ordinary pins)
                    if not verify_pin_signature(p):
                        has_corrupt_cache = True
                        break

                if has_corrupt_cache:
                    try:
                        redis_client.delete(effective_cache_key)
                        redis_client.delete(base_cache_key)
                    except Exception:
                        pass
                    cached_bytes = None
                else:
                    payload_json = json.dumps(cached_pins)
                    etag = f'"{hashlib.md5(payload_json.encode("utf-8")).hexdigest()}"'
                    response.headers["Cache-Control"] = cache_control
                    response.headers["ETag"] = etag
                    if request.headers.get("if-none-match") == etag:
                        return Response(
                            status_code=304,
                            headers={
                                "ETag": etag,
                                "Cache-Control": cache_control,
                            },
                        )
                    return Response(
                        content=payload_json,
                        media_type="application/json",
                        headers={
                            "ETag": etag,
                            "Cache-Control": cache_control,
                        },
                    )
    except Exception as e:
        logger.warning("Redis lookup error in get_map_jobs: %s", e)

    # 2. FAST ASSEMBLY PATH FOR AUTHENTICATED USERS:
    # If public base pins are already cached in Redis, we do NOT query the jobs table at all.
    # We only query the user's specific applications and bookmarks (indexed, <0.2ms).
    cached_base = None
    if user_id:
        try:
            cached_base = redis_client.get(base_cache_key)
        except Exception:
            pass

    if user_id and cached_base:
        try:
            base_str = cached_base.decode("utf-8") if isinstance(cached_base, bytes) else str(cached_base)
            try:
                base_obj = json.loads(base_str)
            except Exception:
                base_obj = None

            raw_base_pins = verify_response_envelope(
                envelope=base_obj,
                expected_key=base_cache_key,
                expected_clustered=clustered,
                expected_user_id=None,
            )

            if raw_base_pins is None:
                try:
                    redis_client.delete(base_cache_key)
                    redis_client.delete(effective_cache_key)
                except Exception:
                    pass
                raise ValueError("base_pins cache missing or unverified envelope, falling back to Cold DB path")

            has_corrupt_base = False
            seen_base_cluster_pids = set()
            seen_base_ordinary_pids = set()

            for p in raw_base_pins:
                if not isinstance(p, dict):
                    has_corrupt_base = True
                    break

                p_id = p.get("id")
                if not p_id or not isinstance(p_id, str) or not p_id.strip():
                    has_corrupt_base = True
                    break

                p_lat = p.get("coordinateX") if p.get("coordinateX") is not None else p.get("latitude")
                p_lng = p.get("coordinateY") if p.get("coordinateY") is not None else p.get("longitude")
                is_inside = False
                if p_lat is not None and p_lng is not None:
                    try:
                        pf_lat = float(p_lat)
                        pf_lng = float(p_lng)
                        if not (math.isnan(pf_lat) or math.isnan(pf_lng) or math.isinf(pf_lat) or math.isinf(pf_lng)):
                            if not (pf_lat == 0.0 and pf_lng == 0.0):
                                if GeoSpatialService.is_inside_uzbekistan(pf_lat, pf_lng):
                                    is_inside = True
                    except (ValueError, TypeError):
                        pass

                if not is_inside:
                    has_corrupt_base = True
                    break

                if p.get("isCluster"):
                    pids = p.get("pinIds")
                    if not isinstance(pids, list) or len(pids) == 0:
                        has_corrupt_base = True
                        break
                    if not all(isinstance(pid, str) and pid.strip() for pid in pids):
                        has_corrupt_base = True
                        break
                    if len(set(pids)) != len(pids):
                        has_corrupt_base = True
                        break
                    if p.get("count") != len(pids):
                        has_corrupt_base = True
                        break
                    if any(pid in seen_base_cluster_pids for pid in pids):
                        has_corrupt_base = True
                        break
                    if any(pid in seen_base_ordinary_pids for pid in pids):
                        has_corrupt_base = True
                        break
                    seen_base_cluster_pids.update(pids)
                else:
                    if p_id in seen_base_cluster_pids or p_id in seen_base_ordinary_pids:
                        has_corrupt_base = True
                        break
                    seen_base_ordinary_pids.add(p_id)

                if not verify_pin_signature(p):
                    has_corrupt_base = True
                    break

            if has_corrupt_base:
                try:
                    redis_client.delete(base_cache_key)
                    redis_client.delete(effective_cache_key)
                except Exception:
                    pass
                raise ValueError("Stale or unverified base cluster cache detected, rebuilding via Cold DB path")

            base_pins = raw_base_pins
            own_db = False
            active_db = db
            if active_db is None:
                active_db = SessionLocal()
                own_db = True
            if user_id and not current_user:
                current_user = deps.get_current_user_optional(request, db=active_db)
            user_ids = [user_id]
            if current_user and getattr(current_user, 'uid', None):
                user_ids.append(current_user.uid)
            try:
                worker_apps = (
                    active_db.query(models.Application.jobId, models.Application.status)
                    .filter(models.Application.workerId.in_(user_ids))
                    .all()
                )
                worker_apps_map = {a[0]: a[1] for a in worker_apps}
                bookmarked_ids = {
                    b[0]
                    for b in active_db.query(models.Bookmark.jobId)
                    .filter(models.Bookmark.userId.in_(user_ids))
                    .all()
                }

                # Find any jobs the user applied to that are not in public base_pins (e.g. filled/in_progress jobs)
                base_job_ids = set()
                for p in base_pins:
                    if p.get("isCluster"):
                        base_job_ids.update(p.get("pinIds") or [])
                    else:
                        if p.get("id"):
                            base_job_ids.add(p.get("id"))

                missing_app_job_ids = [jid for jid in worker_apps_map if jid not in base_job_ids]
                extra_user_pins = []
                if missing_app_job_ids:
                    extra_query = active_db.query(
                        models.Job.id,
                        models.Job.title,
                        models.Job.company,
                        models.Job.salary,
                        models.Job.salaryCurrency,
                        models.Job.location,
                        models.Job.rawLocation,
                        models.Job.logoUrl,
                        models.Job.imageUrl,
                        models.Job.tags,
                        models.Job.category,
                        models.Job.workDate,
                        models.Job.workTime,
                        models.Job.neededWorkers,
                        models.Job.coordinateX,
                        models.Job.coordinateY,
                        models.Job.urgent,
                        models.Job.status,
                        models.Job.hiredWorkerId,
                        models.Job.createdAt,
                    ).filter(
                        models.Job.id.in_(missing_app_job_ids),
                        models.Job.status.in_(JobStatus.OPEN_STATUSES + (JobStatus.IN_PROGRESS, JobStatus.COMPLETED)),
                        models.Job.coordinateX.isnot(None),
                        models.Job.coordinateY.isnot(None),
                        or_(models.Job.coordinateX != 0.0, models.Job.coordinateY != 0.0),
                    )
                    if search:
                        term = f"%{search.strip()}%"
                        extra_query = extra_query.filter(
                            or_(
                                models.Job.title.ilike(term),
                                models.Job.company.ilike(term),
                                models.Job.location.ilike(term),
                            )
                        )
                    if location:
                        extra_query = extra_query.filter(models.Job.location.ilike(f"%{location.strip()}%"))
                    if category:
                        extra_query = extra_query.filter(models.Job.category == category)
                    if min_lat is not None and max_lat is not None:
                        extra_query = extra_query.filter(models.Job.coordinateX.between(min_lat, max_lat))
                    if min_lng is not None and max_lng is not None:
                        extra_query = extra_query.filter(models.Job.coordinateY.between(min_lng, max_lng))

                    extra_jobs = extra_query.all()
                    for ej in extra_jobs:
                        f_lat = float(ej.coordinateX)
                        f_lng = float(ej.coordinateY)
                        if not GeoSpatialService.is_inside_uzbekistan(f_lat, f_lng):
                            continue
                        app_st = worker_apps_map.get(ej.id)
                        ej_pin = {
                            "id": ej.id,
                            "title": ej.title,
                            "company": ej.company,
                            "salary": ej.salary,
                            "salaryCurrency": ej.salaryCurrency or "UZS",
                            "location": ej.location,
                            "rawLocation": ej.rawLocation,
                            "logoUrl": ej.logoUrl,
                            "imageUrl": ej.imageUrl,
                            "tags": ej.tags or [],
                            "category": ej.category,
                            "workDate": ej.workDate,
                            "workTime": ej.workTime,
                            "neededWorkers": ej.neededWorkers or "1",
                            "coordinateX": ej.coordinateX,
                            "coordinateY": ej.coordinateY,
                            "latitude": ej.coordinateX,
                            "longitude": ej.coordinateY,
                            "urgent": ej.urgent or False,
                            "status": app_st if app_st in ('in_progress', 'completed', 'start_requested', 'hired', 'applied') else ej.status,
                            "applied": True,
                            "bookmarked": ej.id in bookmarked_ids,
                            "hiredCount": 0,
                            "vacancies": 1,
                            "isCluster": False,
                            "count": 1,
                            "pinIds": [str(ej.id)],
                            "geo_verified": True,
                        }
                        ej_pin["geo_sig"] = compute_pin_signature(ej_pin)
                        extra_user_pins.append(ej_pin)
            finally:
                if own_db and active_db:
                    active_db.close()

            user_pins = []
            if not worker_apps_map and not bookmarked_ids and not extra_user_pins:
                user_pins = list(base_pins)
            else:
                for p in base_pins:
                    up = dict(p)
                    if up.get("isCluster"):
                        pin_ids = up.get("pinIds") or []
                        up["applied"] = any(pid in worker_apps_map for pid in pin_ids)
                        up["bookmarked"] = any(pid in bookmarked_ids for pid in pin_ids)
                    else:
                        jid = up.get("id")
                        app_status = worker_apps_map.get(jid)
                        if app_status:
                            up["applied"] = True
                            if app_status in ('in_progress', 'completed', 'start_requested', 'hired'):
                                up["status"] = app_status
                        if jid in bookmarked_ids:
                            up["bookmarked"] = True
                    up["geo_verified"] = True
                    up["geo_sig"] = compute_pin_signature(up)
                    user_pins.append(up)

                if extra_user_pins:
                    user_pins.extend(extra_user_pins)
                    if clustered:
                        user_pins = GeoSpatialService.cluster_pins(user_pins, grid_size=0.4)

            user_envelope = make_response_envelope(
                cache_key=effective_cache_key,
                payload=user_pins,
                clustered=clustered,
                user_id=user_id,
            )
            try:
                redis_client.set(effective_cache_key, json.dumps(user_envelope), ex=120)
            except Exception:
                pass

            user_payload_str = json.dumps(user_pins)

            etag = f'"{hashlib.md5(user_payload_str.encode("utf-8")).hexdigest()}"'
            response.headers["Cache-Control"] = cache_control
            response.headers["ETag"] = etag
            if request.headers.get("if-none-match") == etag:
                return Response(
                    status_code=304,
                    headers={
                        "ETag": etag,
                        "Cache-Control": cache_control,
                    },
                )
            return Response(
                content=user_payload_str,
                media_type="application/json",
                headers={
                    "ETag": etag,
                    "Cache-Control": cache_control,
                },
            )
        except Exception as e:
            logger.warning("Fast personalization failed in get_map_jobs, falling back: %s", e)

    # 3. DATABASE COLD START PATH (only when base pins are not in Redis)
    own_db = False
    active_db = db
    if active_db is None:
        active_db = SessionLocal()
        own_db = True
    try:
        query = active_db.query(
            models.Job.id,
            models.Job.title,
            models.Job.company,
            models.Job.salary,
            models.Job.salaryCurrency,
            models.Job.location,
            models.Job.rawLocation,
            models.Job.logoUrl,
            models.Job.imageUrl,
            models.Job.tags,
            models.Job.category,
            models.Job.workDate,
            models.Job.workTime,
            models.Job.neededWorkers,
            models.Job.coordinateX,
            models.Job.coordinateY,
            models.Job.urgent,
            models.Job.status,
            models.Job.hiredWorkerId,
            models.Job.createdAt,
        )

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

        # Base public query MUST strictly query OPEN_STATUSES, isolating public cache from user-specific shifts.
        query = query.filter(models.Job.status.in_(JobStatus.OPEN_STATUSES))

        if clustered:
            # Clustered nationwide view: include all matching active jobs with valid geographic coordinates inside Uzbekistan.
            # Do NOT apply .limit() so clustering aggregates the entire dataset across the nation.
            query = query.filter(
                models.Job.coordinateX.isnot(None),
                models.Job.coordinateY.isnot(None),
                models.Job.coordinateX.between(
                    GeoSpatialService.UZBEKISTAN_BBOX["min_lat"],
                    GeoSpatialService.UZBEKISTAN_BBOX["max_lat"]
                ),
                models.Job.coordinateY.between(
                    GeoSpatialService.UZBEKISTAN_BBOX["min_lng"],
                    GeoSpatialService.UZBEKISTAN_BBOX["max_lng"]
                ),
                or_(models.Job.coordinateX != 0.0, models.Job.coordinateY != 0.0),
            )
            jobs = query.order_by(models.Job.createdAt.desc(), models.Job.id.desc()).all()
        else:
            if min_lat is None and min_lng is None:
                query = query.filter(
                    models.Job.coordinateX.isnot(None),
                    models.Job.coordinateY.isnot(None),
                    models.Job.coordinateX.between(
                        GeoSpatialService.UZBEKISTAN_BBOX["min_lat"],
                        GeoSpatialService.UZBEKISTAN_BBOX["max_lat"]
                    ),
                    models.Job.coordinateY.between(
                        GeoSpatialService.UZBEKISTAN_BBOX["min_lng"],
                        GeoSpatialService.UZBEKISTAN_BBOX["max_lng"]
                    ),
                    or_(models.Job.coordinateX != 0.0, models.Job.coordinateY != 0.0),
                )

            # Batched candidate extraction:
            # Ensure foreign coordinates located inside the bounding box do not starve the requested limit.
            # Scans in batches up to max_scan = min(max(limit * 5, 500), 5000), stopping as soon as
            # limit valid Uzbekistan points are collected or matching candidates are exhausted.
            target_limit = limit
            jobs = []
            batch_size = max(target_limit, 100)
            max_scan = min(max(target_limit * 5, 500), 5000)
            offset = 0

            ordered_query = query.order_by(models.Job.createdAt.desc(), models.Job.id.desc())
            while len(jobs) < target_limit and offset < max_scan:
                batch = ordered_query.offset(offset).limit(batch_size).all()
                if not batch:
                    break
                for candidate in batch:
                    if candidate.coordinateX is None or candidate.coordinateY is None:
                        continue
                    try:
                        c_lat = float(candidate.coordinateX)
                        c_lng = float(candidate.coordinateY)
                        if math.isnan(c_lat) or math.isnan(c_lng) or math.isinf(c_lat) or math.isinf(c_lng):
                            continue
                        if c_lat == 0.0 and c_lng == 0.0:
                            continue
                        if GeoSpatialService.is_inside_uzbekistan(c_lat, c_lng):
                            jobs.append(candidate)
                            if len(jobs) >= target_limit:
                                break
                    except (ValueError, TypeError):
                        continue
                offset += len(batch)
                if len(batch) < batch_size:
                    break

            if len(jobs) < target_limit and offset >= max_scan:
                logger.warning(
                    "Bounded spatial scan cap reached (scanned=%d, cap=%d). Returning %d valid Uzbekistan jobs (requested target_limit=%d). Underfill is expected under heavy non-Uzbekistan coordinate clustering.",
                    offset, max_scan, len(jobs), target_limit
                )

        if not jobs:
            base_empty_envelope = make_response_envelope(
                cache_key=base_cache_key,
                payload=[],
                clustered=clustered,
                user_id=None,
            )
            try:
                redis_client.set(base_cache_key, json.dumps(base_empty_envelope), ex=60)
            except Exception:
                pass

            if not user_id:
                empty_str = "[]"
                empty_etag = f'"{hashlib.md5(empty_str.encode("utf-8")).hexdigest()}"'
                return Response(
                    content=empty_str,
                    media_type="application/json",
                    headers={"Cache-Control": cache_control, "ETag": empty_etag},
                )

        job_ids = [j.id for j in jobs]

        # Aggregated hired applications count via SQL GROUP BY (chunked in 500 to stay within SQL variable limits)
        hired_counts: dict[str, int] = {}
        if job_ids:
            chunk_size = 500
            for i in range(0, len(job_ids), chunk_size):
                chunk = job_ids[i:i + chunk_size]
                chunk_counts = (
                    active_db.query(models.Application.jobId, func.count(models.Application.id))
                    .filter(
                        models.Application.jobId.in_(chunk),
                        models.Application.status.in_(HIRED_STATUSES),
                    )
                    .group_by(models.Application.jobId)
                    .all()
                )
                for jid, cnt in chunk_counts:
                    hired_counts[jid] = cnt

        worker_apps_map = {}
        bookmarked_ids: set[str] = set()
        if user_id:
            if not current_user:
                current_user = deps.get_current_user_optional(request, db=active_db)
            user_ids = [user_id]
            if current_user and getattr(current_user, 'uid', None):
                user_ids.append(current_user.uid)
            worker_apps = (
                active_db.query(models.Application.jobId, models.Application.status)
                .filter(models.Application.workerId.in_(user_ids))
                .all()
            )
            worker_apps_map = {a[0]: a[1] for a in worker_apps}
            bookmarked_query = (
                active_db.query(models.Bookmark.jobId)
                .filter(models.Bookmark.userId.in_(user_ids))
                .all()
            )
            bookmarked_ids = {b[0] for b in bookmarked_query}

        base_pins = []
        user_pins = []
        for job in jobs:
            # Foreign and invalid coordinates MUST NEVER enter base_pins or user_pins
            if job.coordinateX is None or job.coordinateY is None:
                continue
            try:
                f_lat = float(job.coordinateX)
                f_lng = float(job.coordinateY)
                if math.isnan(f_lat) or math.isnan(f_lng) or math.isinf(f_lat) or math.isinf(f_lng):
                    continue
                if f_lat == 0.0 and f_lng == 0.0:
                    continue
                if not GeoSpatialService.is_inside_uzbekistan(f_lat, f_lng):
                    continue
            except (ValueError, TypeError):
                continue

            raw_needed = (job.neededWorkers or "1").strip()
            vacancies_num = int(raw_needed) if raw_needed.isdigit() and int(raw_needed) > 0 else 1
            hired_cnt = hired_counts.get(job.id, 0)
            if job.status == JobStatus.OPEN and job.hiredWorkerId is None and vacancies_num <= 1:
                hired_cnt = 0

            is_filled = (
                (job.status != JobStatus.OPEN and hired_cnt >= vacancies_num)
                or (job.status in (JobStatus.COMPLETED, JobStatus.IN_PROGRESS))
            )

            base_pin = {
                "id": job.id,
                "title": job.title,
                "company": job.company,
                "salary": job.salary,
                "salaryCurrency": job.salaryCurrency or "UZS",
                "location": job.location,
                "rawLocation": job.rawLocation,
                "logoUrl": job.logoUrl,
                "imageUrl": job.imageUrl,
                "tags": job.tags or [],
                "category": job.category,
                "workDate": job.workDate,
                "workTime": job.workTime,
                "neededWorkers": job.neededWorkers or "1",
                "coordinateX": job.coordinateX,
                "coordinateY": job.coordinateY,
                "latitude": job.coordinateX,
                "longitude": job.coordinateY,
                "urgent": job.urgent or False,
                "status": job.status,
                "applied": False,
                "bookmarked": False,
                "hiredCount": hired_cnt,
                "vacancies": vacancies_num,
                "isCluster": False,
                "count": 1,
                "pinIds": [str(job.id)],
                "geo_verified": True,
            }
            base_pin["geo_sig"] = compute_pin_signature(base_pin)

            # Public base pins must NEVER include filled jobs or depend on user-specific applications.
            # Strictly restrict to OPEN_STATUSES and not filled.
            if job.status in JobStatus.OPEN_STATUSES and not is_filled:
                base_pins.append(base_pin)

            # User pins include open unfilled jobs, plus any active shift the user personally applied to
            if user_id and job.status in JobStatus.OPEN_STATUSES and not is_filled:
                u_pin = dict(base_pin)
                app_item_status = worker_apps_map.get(job.id)
                if app_item_status:
                    u_pin["applied"] = True
                    if app_item_status in ('in_progress', 'completed', 'start_requested', 'hired'):
                        u_pin["status"] = app_item_status
                if job.id in bookmarked_ids:
                    u_pin["bookmarked"] = True
                u_pin["geo_verified"] = True
                u_pin["geo_sig"] = compute_pin_signature(u_pin)
                user_pins.append(u_pin)

        # Personal user pins: Load any shifts the user applied to that were not in base_pins (e.g. IN_PROGRESS/COMPLETED)
        if user_id:
            base_job_ids = {p["id"] for p in base_pins}
            missing_app_job_ids = [jid for jid in worker_apps_map if jid not in base_job_ids]
            if missing_app_job_ids:
                extra_query = active_db.query(
                    models.Job.id,
                    models.Job.title,
                    models.Job.company,
                    models.Job.salary,
                    models.Job.salaryCurrency,
                    models.Job.location,
                    models.Job.rawLocation,
                    models.Job.logoUrl,
                    models.Job.imageUrl,
                    models.Job.tags,
                    models.Job.category,
                    models.Job.workDate,
                    models.Job.workTime,
                    models.Job.neededWorkers,
                    models.Job.coordinateX,
                    models.Job.coordinateY,
                    models.Job.urgent,
                    models.Job.status,
                    models.Job.hiredWorkerId,
                    models.Job.createdAt,
                ).filter(
                    models.Job.id.in_(missing_app_job_ids),
                    models.Job.status.in_(JobStatus.OPEN_STATUSES + (JobStatus.IN_PROGRESS, JobStatus.COMPLETED)),
                    models.Job.coordinateX.isnot(None),
                    models.Job.coordinateY.isnot(None),
                    or_(models.Job.coordinateX != 0.0, models.Job.coordinateY != 0.0),
                )
                if search:
                    term = f"%{search.strip()}%"
                    extra_query = extra_query.filter(
                        or_(
                            models.Job.title.ilike(term),
                            models.Job.company.ilike(term),
                            models.Job.location.ilike(term),
                        )
                    )
                if location:
                    extra_query = extra_query.filter(models.Job.location.ilike(f"%{location.strip()}%"))
                if category:
                    extra_query = extra_query.filter(models.Job.category == category)
                if min_lat is not None and max_lat is not None:
                    extra_query = extra_query.filter(models.Job.coordinateX.between(min_lat, max_lat))
                if min_lng is not None and max_lng is not None:
                    extra_query = extra_query.filter(models.Job.coordinateY.between(min_lng, max_lng))

                extra_jobs = extra_query.all()
                for ej in extra_jobs:
                    try:
                        f_lat = float(ej.coordinateX)
                        f_lng = float(ej.coordinateY)
                        if not GeoSpatialService.is_inside_uzbekistan(f_lat, f_lng):
                            continue
                    except (ValueError, TypeError):
                        continue
                    app_st = worker_apps_map.get(ej.id)
                    ej_pin = {
                        "id": ej.id,
                        "title": ej.title,
                        "company": ej.company,
                        "salary": ej.salary,
                        "salaryCurrency": ej.salaryCurrency or "UZS",
                        "location": ej.location,
                        "rawLocation": ej.rawLocation,
                        "logoUrl": ej.logoUrl,
                        "imageUrl": ej.imageUrl,
                        "tags": ej.tags or [],
                        "category": ej.category,
                        "workDate": ej.workDate,
                        "workTime": ej.workTime,
                        "neededWorkers": ej.neededWorkers or "1",
                        "coordinateX": ej.coordinateX,
                        "coordinateY": ej.coordinateY,
                        "latitude": ej.coordinateX,
                        "longitude": ej.coordinateY,
                        "urgent": ej.urgent or False,
                        "status": app_st if app_st in ('in_progress', 'completed', 'start_requested', 'hired', 'applied') else ej.status,
                        "applied": True,
                        "bookmarked": ej.id in bookmarked_ids,
                        "hiredCount": 0,
                        "vacancies": 1,
                        "isCluster": False,
                        "count": 1,
                        "pinIds": [str(ej.id)],
                        "geo_verified": True,
                    }
                    ej_pin["geo_sig"] = compute_pin_signature(ej_pin)
                    user_pins.append(ej_pin)

        if clustered:
            base_pins = GeoSpatialService.cluster_pins(base_pins, grid_size=0.4)
            if user_id:
                user_pins = GeoSpatialService.cluster_pins(user_pins, grid_size=0.4)

        base_envelope = make_response_envelope(
            cache_key=base_cache_key,
            payload=base_pins,
            clustered=clustered,
            user_id=None,
        )
        try:
            redis_client.set(base_cache_key, json.dumps(base_envelope), ex=180)
            if user_id:
                user_envelope = make_response_envelope(
                    cache_key=effective_cache_key,
                    payload=user_pins,
                    clustered=clustered,
                    user_id=user_id,
                )
                redis_client.set(effective_cache_key, json.dumps(user_envelope), ex=120)
        except Exception as e:
            logger.warning("Redis store failed in get_map_jobs: %s", e)

        payload_pins = user_pins if user_id else base_pins
        payload_str = json.dumps(payload_pins)
    finally:
        if own_db and active_db:
            active_db.close()

    etag = f'"{hashlib.md5(payload_str.encode("utf-8")).hexdigest()}"'
    response.headers["Cache-Control"] = cache_control
    response.headers["ETag"] = etag
    if request.headers.get("if-none-match") == etag:
        return Response(
            status_code=304,
            headers={
                "ETag": etag,
                "Cache-Control": cache_control,
            },
        )

    return Response(
        content=payload_str,
        media_type="application/json",
        headers={
            "ETag": etag,
            "Cache-Control": cache_control,
        },
    )


def tile_to_bbox(z: int, x: int, y: int) -> tuple[float, float, float, float]:
    """Converts Web Mercator tile coordinates (z, x, y) to WGS84 bounding box (min_lat, max_lat, min_lng, max_lng)."""
    n = 2.0 ** z
    min_lng = x / n * 360.0 - 180.0
    max_lng = (x + 1) / n * 360.0 - 180.0
    max_lat_rad = math.atan(math.sinh(math.pi * (1.0 - 2.0 * y / n)))
    min_lat_rad = math.atan(math.sinh(math.pi * (1.0 - 2.0 * (y + 1) / n)))
    min_lat = math.degrees(min_lat_rad)
    max_lat = math.degrees(max_lat_rad)
    return min_lat, max_lat, min_lng, max_lng


@router.get("/map/geojson")
def get_map_geojson(
    response: Response,
    request: Request,
    db: Optional[Session] = Depends(deps.get_db_optional),
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
    """GeoJSON FeatureCollection projection for standard GIS map clients.
    Pre-formats coordinates as GeoJSON Point geometries for sub-millisecond layer ingestion.
    """
    version = get_map_cache_version()
    cache_key = build_map_geojson_cache_key(
        version=version,
        min_lat=min_lat,
        max_lat=max_lat,
        min_lng=min_lng,
        max_lng=max_lng,
        location=location,
        category=category,
        search=search,
        limit=limit,
    )

    cache_control = (
        "private, no-cache"
        if current_user
        else "public, max-age=15, stale-while-revalidate=30"
    )
    vary_header = "Cookie, Authorization, Accept-Encoding"

    if not current_user:
        try:
            cached = redis_client.get(cache_key)
            if cached:
                cached_str = cached.decode("utf-8") if isinstance(cached, bytes) else str(cached)
                etag = f'"{hashlib.md5(cached_str.encode("utf-8")).hexdigest()}"'
                response.headers["Cache-Control"] = cache_control
                response.headers["ETag"] = etag
                response.headers["Vary"] = vary_header
                if request.headers.get("if-none-match") == etag:
                    return Response(status_code=304, headers={"ETag": etag, "Cache-Control": cache_control, "Vary": vary_header})
                return Response(content=cached_str, media_type="application/geo+json", headers={"ETag": etag, "Cache-Control": cache_control, "Vary": vary_header})
        except Exception as e:
            logger.warning("Redis lookup failed in map geojson: %s", e)

    # Re-use get_map_jobs logic with isolated request/response to prevent internal 304 or header pollution
    internal_scope = dict(request.scope)
    if "headers" in internal_scope:
        internal_scope["headers"] = [
            (k, v) for k, v in internal_scope["headers"]
            if k.lower() not in (b"if-none-match", b"if-modified-since")
        ]
    internal_request = Request(internal_scope)
    internal_response = Response()

    raw_pins_res = get_map_jobs(
        response=internal_response,
        request=internal_request,
        db=db,
        current_user=current_user,
        min_lat=min_lat,
        max_lat=max_lat,
        min_lng=min_lng,
        max_lng=max_lng,
        location=location,
        category=category,
        search=search,
        limit=limit,
        clustered=False,
    )
    pins = []
    if isinstance(raw_pins_res, Response):
        if raw_pins_res.status_code != 200:
            logger.error(
                "Internal get_map_jobs failed with status %d in get_map_geojson",
                raw_pins_res.status_code,
            )
            return Response(
                content=raw_pins_res.body,
                status_code=raw_pins_res.status_code,
                media_type=raw_pins_res.media_type or "application/json",
            )
        try:
            pins = json.loads(raw_pins_res.body.decode("utf-8"))
            if not isinstance(pins, list):
                logger.error("Internal get_map_jobs response JSON is not a list in get_map_geojson")
                raise HTTPException(
                    status_code=502,
                    detail="Xarita ma'lumotlarini yuklashda xatolik yuz berdi",
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Failed to decode pins body in get_map_geojson: %s", e)
            raise HTTPException(
                status_code=502,
                detail="Xarita ma'lumotlarini yuklashda xatolik yuz berdi",
            ) from e
    elif isinstance(raw_pins_res, list):
        pins = raw_pins_res
    else:
        logger.error("Unexpected return type from get_map_jobs in get_map_geojson: %s", type(raw_pins_res))
        raise HTTPException(
            status_code=500,
            detail="Xarita ma'lumotlarini yuklashda kutilmagan xatolik yuz berdi",
        )

    features = []
    for pin in pins:
        lat = pin.get("coordinateX") or pin.get("latitude")
        lng = pin.get("coordinateY") or pin.get("longitude")
        if lat is not None and lng is not None:
            features.append({
                "type": "Feature",
                "id": pin.get("id"),
                "geometry": {
                    "type": "Point",
                    "coordinates": [lng, lat],
                },
                "properties": pin,
            })

    geojson_doc = {
        "type": "FeatureCollection",
        "features": features,
    }
    geojson_str = json.dumps(geojson_doc)

    if not current_user:
        try:
            redis_client.set(cache_key, geojson_str, ex=180)
        except Exception:
            pass

    etag = f'"{hashlib.md5(geojson_str.encode("utf-8")).hexdigest()}"'
    response.headers["Cache-Control"] = cache_control
    response.headers["ETag"] = etag
    response.headers["Vary"] = vary_header

    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers={"ETag": etag, "Cache-Control": cache_control, "Vary": vary_header})

    return Response(
        content=geojson_str,
        media_type="application/geo+json",
        headers={"ETag": etag, "Cache-Control": cache_control, "Vary": vary_header},
    )


@router.get("/map/tile/{z}/{x}/{y}")
def get_map_tile(
    z: int,
    x: int,
    y: int,
    response: Response,
    request: Request,
    db: Optional[Session] = Depends(deps.get_db_optional),
    category: Optional[str] = Query(None, max_length=100),
    limit: int = Query(200, ge=1, le=500),
) -> Any:
    """Standard Slippy Map (TMS/XYZ) tile endpoint for high-speed spatial vector partitioning.
    Converts (z, x, y) coordinates to spatial bounds and returns pre-partitioned pins with tile caching.
    """
    version = get_map_cache_version()
    cache_key = f"cache:jobs:tile:v{version}:{z}:{x}:{y}:{category or ''}:{limit}"

    try:
        cached = redis_client.get(cache_key)
        if cached:
            cached_str = cached.decode("utf-8") if isinstance(cached, bytes) else str(cached)
            etag = f'"{hashlib.md5(cached_str.encode("utf-8")).hexdigest()}"'
            response.headers["Cache-Control"] = "public, max-age=30, stale-while-revalidate=60"
            response.headers["ETag"] = etag
            if request.headers.get("if-none-match") == etag:
                return Response(status_code=304, headers={"ETag": etag, "Cache-Control": "public, max-age=30, stale-while-revalidate=60"})
            return Response(content=cached_str, media_type="application/json", headers={"ETag": etag, "Cache-Control": "public, max-age=30, stale-while-revalidate=60"})
    except Exception as e:
        logger.warning("Redis lookup failed in tile: %s", e)

    min_lat, max_lat, min_lng, max_lng = tile_to_bbox(z, x, y)

    internal_scope = dict(request.scope)
    if "headers" in internal_scope:
        internal_scope["headers"] = [
            (k, v) for k, v in internal_scope["headers"]
            if k.lower() not in (b"if-none-match", b"if-modified-since")
        ]
    internal_request = Request(internal_scope)
    internal_response = Response()

    res = get_map_jobs(
        response=internal_response,
        request=internal_request,
        db=db,
        current_user=None,
        min_lat=min_lat,
        max_lat=max_lat,
        min_lng=min_lng,
        max_lng=max_lng,
        location=None,
        category=category,
        search=None,
        limit=limit,
        clustered=False,
    )
    if isinstance(res, Response):
        if res.status_code == 200 and res.body:
            content_str = res.body.decode("utf-8")
            try:
                redis_client.set(cache_key, content_str, ex=300)
            except Exception:
                pass
        res.headers["Cache-Control"] = "public, max-age=30, stale-while-revalidate=60"
        return res

    return res


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






