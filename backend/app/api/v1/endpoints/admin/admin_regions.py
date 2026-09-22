from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from app import models
from app.models.job import JobStatus
from app.api import deps
from .admin_users import get_admin_user

router = APIRouter()

@router.get("/regions")
def get_regions(
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    regions = db.query(models.Region).all()
    if not regions:
        return []

    # Worker and job counts are counts of other tables, so they are derived here
    # rather than stored — a saved copy is wrong the moment anybody posts a job.
    # Two grouped queries for the whole list, not two per region.
    worker_counts = dict(
        db.query(models.User.region, func.count(models.User.id))
        .filter(models.User.role == "worker", models.User.region.isnot(None))
        .group_by(models.User.region)
        .all()
    )

    # A job's region is the first part of its address — the posting form writes
    # "<city>, <address>" — so the city cannot be matched with a plain equality.
    open_jobs = (
        db.query(models.Job.location)
        .filter(models.Job.status.in_(JobStatus.OPEN_STATUSES + (JobStatus.IN_PROGRESS,)))
        .all()
    )
    job_counts: dict[str, int] = {}
    for (location,) in open_jobs:
        city = (location or "").split(",")[0].strip()
        if city:
            job_counts[city] = job_counts.get(city, 0) + 1

    result = []
    for r in regions:
        result.append({
            "id": r.id,
            "name": r.name,
            "type": r.type,
            "parentId": r.parentId,
            "isActive": r.isActive,
            "commissionPercent": r.commissionPercent,
            "minSalary": r.minSalary,
            "districtsCount": r.districtsCount,
            "activeWorkersCount": worker_counts.get(r.name, 0),
            "activeJobsCount": job_counts.get(r.name, 0),
        })
    return result

@router.post("/regions")
def create_region(
    payload: dict,
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    reg = models.Region(
        name=payload.get("name"),
        type=payload.get("type", "region"),
        parentId=payload.get("parentId"),
        isActive=payload.get("isActive", True),
        # The region half of the employer's commission; the category carries the
        # other half and a job is charged their sum.
        commissionPercent=payload.get("commissionPercent", 0) or 0,
        minSalary=payload.get("minSalary"),
        districtsCount=payload.get("districtsCount"),
    )
    db.add(reg)
    db.commit()
    db.refresh(reg)
    return {
        "id": reg.id,
        "name": reg.name,
        "type": reg.type,
        "parentId": reg.parentId,
        "isActive": reg.isActive,
        "commissionPercent": reg.commissionPercent,
        "minSalary": reg.minSalary,
        "districtsCount": reg.districtsCount,
        "activeWorkersCount": 0,
        "activeJobsCount": 0,
    }

@router.delete("/regions/{region_id}")
def delete_region(
    region_id: str,
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    reg = db.query(models.Region).filter(models.Region.id == region_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Hudud topilmadi")
    db.delete(reg)
    db.commit()
    return {"success": True}

@router.patch("/regions/{region_id}")
def update_region(
    region_id: str,
    payload: dict,
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    reg = db.query(models.Region).filter(models.Region.id == region_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Hudud topilmadi")
        
    if "isActive" in payload:
        reg.isActive = payload["isActive"]
    if "commissionPercent" in payload:
        # Bounded the same way the platform-wide rate is: a value typed by hand
        # must not be able to pay a worker a negative wage.
        try:
            reg.commissionPercent = max(0.0, min(100.0, float(payload["commissionPercent"])))
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Komissiya foizi noto'g'ri")
    db.commit()
    db.refresh(reg)
    return {"success": True}
