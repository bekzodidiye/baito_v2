import logging
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.api import deps
from app.models.job import JobStatus
from app.services.geo_service import GeoSpatialService

logger = logging.getLogger(__name__)
router = APIRouter()

HIRED_STATUSES = ['hired', 'confirmed', 'completed', 'in_progress', 'start_requested']

# One counted view per viewer per job per hour.
VIEW_DEDUPE_TTL_SECONDS = 3600







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















