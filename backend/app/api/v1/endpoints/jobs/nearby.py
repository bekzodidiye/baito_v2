import json
import logging
import math
from typing import Any

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app import models, schemas
from app.api import deps
from app.core.map_cache import get_map_cache_version, build_nearby_cache_key
from app.models.job import JobStatus
from app.redis_client import redis_client
from app.services.geo_service import GeoSpatialService

logger = logging.getLogger(__name__)
router = APIRouter()

HIRED_STATUSES = ['hired', 'confirmed', 'completed', 'in_progress', 'start_requested']


@router.get("/nearby")
def get_nearby_jobs(
    lat: float = Query(..., ge=-90.0, le=90.0),
    lng: float = Query(..., ge=-180.0, le=180.0),
    radius_km: float = Query(10.0, ge=0.5, le=100.0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(deps.get_db),
) -> Any:
    """Jobs within a radius, with commute estimates.
    Uses PostgreSQL partial spatial index and Redis coordinate quantization caching.
    """
    version = get_map_cache_version()
    cache_key = build_nearby_cache_key(version, lat, lng, radius_km, limit)

    try:
        cached = redis_client.get(cache_key)
        if cached:
            raw_text = cached.decode("utf-8") if isinstance(cached, bytes) else str(cached)
            return Response(content=raw_text, media_type="application/json")
    except Exception as e:
        logger.warning("Redis lookup failed in nearby: %s", e)

    lat_delta = radius_km / 111.0
    cos_lat = max(0.2, math.cos(math.radians(lat)))
    lng_delta = radius_km / (111.0 * cos_lat)

    jobs = (
        db.query(models.Job)
        .filter(
            models.Job.status.in_(JobStatus.OPEN_STATUSES),
            models.Job.coordinateX.isnot(None),
            models.Job.coordinateY.isnot(None),
            models.Job.coordinateX.between(lat - lat_delta, lat + lat_delta),
            models.Job.coordinateY.between(lng - lng_delta, lng + lng_delta),
        )
        .limit(500)
        .all()
    )

    matches = GeoSpatialService.filter_jobs_by_radius(lat, lng, jobs, radius_km)[:limit]
    result = [
        {**m, "job": schemas.Job.model_validate(m["job"]).model_dump(mode="json")}
        for m in matches
    ]

    payload_str = json.dumps(result)
    try:
        redis_client.set(cache_key, payload_str, ex=60)
    except Exception as e:
        logger.warning("Redis store failed in nearby: %s", e)

    return Response(content=payload_str, media_type="application/json")















