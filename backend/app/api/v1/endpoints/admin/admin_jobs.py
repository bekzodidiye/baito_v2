from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models
from app.api import deps
from .admin_users import get_admin_user

router = APIRouter()

@router.get("/jobs")
def get_admin_jobs(
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
    skip: int = 0,
    limit: int = 200,
) -> Any:
    jobs = db.query(models.Job).offset(skip).limit(limit).all()
    result = []
    for j in jobs:
        employer = db.query(models.User).filter(models.User.id == j.employerId).first()
        result.append({
            "id": j.id,
            "title": j.title,
            "company": j.company,
            "employerId": j.employerId,
            "employerName": employer.name if employer else "",
            "salary": j.salary,
            "location": j.location,
            "description": j.description,
            "status": j.status,
            "durationLabel": j.durationLabel,
            "createdAt": str(j.createdAt) if j.createdAt else None,
        })
    return result


@router.patch("/jobs/{job_id}/status")
@router.post("/jobs/{job_id}/status")
def change_job_status(
    job_id: str,
    payload: dict,
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Ish topilmadi")
    job.status = payload.get("status", job.status)
    db.commit()
    return {"success": True, "status": job.status}


@router.delete("/jobs/{job_id}")
def delete_job(
    job_id: str,
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Ish topilmadi")
    db.delete(job)
    db.commit()
    return {"success": True}
