from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from app import crud, models, schemas
from app.api import deps

router = APIRouter()

from app.services.ai_matcher import AIMatchmaker
from app.services.geo_service import GeoSpatialService
from app.services.spam_detector import SpamFraudDetector

HIRED_STATUSES = ['hired', 'confirmed', 'completed', 'in_progress', 'start_requested']

@router.get("/recommended")
def get_recommended_jobs(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
    limit: int = Query(20, ge=1, le=50)
) -> Any:
    """
    AI-powered Smart Matchmaking Job Recommendations for the logged-in worker.
    """
    active_jobs = db.query(models.Job).filter(models.Job.status == "active").order_by(models.Job.createdAt.desc()).limit(100).all()
    if not active_jobs:
        return []
    
    ranked = AIMatchmaker.rank_jobs_for_worker(current_user, active_jobs)
    return ranked[:limit]

@router.get("/nearby")
def get_nearby_jobs(
    lat: float = Query(..., ge=-90.0, le=90.0),
    lng: float = Query(..., ge=-180.0, le=180.0),
    radius_km: float = Query(10.0, ge=0.5, le=100.0),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    Geo-Spatial Nearby Jobs within a specified radius (km) with commute estimates.
    """
    jobs = db.query(models.Job).filter(models.Job.status == "active").all()
    return GeoSpatialService.filter_jobs_by_radius(lat, lng, jobs, radius_km)

@router.get("", response_model=List[schemas.JobWithApplicationStatus])
def read_jobs(
    db: Session = Depends(deps.get_db),
    current_user: Optional[models.User] = Depends(deps.get_current_user_optional),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    employer_id: Optional[str] = None,
) -> Any:
    """
    Retrieve jobs. If user is logged in, attach their application status.
    """
    query = db.query(models.Job)
    
    if employer_id:
        query = query.filter(models.Job.employerId == employer_id)
    elif current_user and current_user.role == 'employer':
        query = query.filter(models.Job.employerId == current_user.id)
        
    jobs = query.order_by(models.Job.createdAt.desc()).offset(skip).limit(limit).all()
    if not jobs:
        return []

    job_ids = [j.id for j in jobs]

    worker_apps = []
    if current_user:
        worker_apps = db.query(models.Application).filter(
            models.Application.workerId == current_user.id,
            models.Application.jobId.in_(job_ids),
        ).all()

    # Fetch all hired applications for the retrieved jobs to get worker details
    hired_apps = db.query(models.Application).filter(
        models.Application.jobId.in_(job_ids),
        models.Application.status.in_(HIRED_STATUSES),
    ).all()

    # One grouped count instead of a COUNT query per job.
    hired_counts = {}
    job_hired_workers = {}
    if hired_apps:
        # Group counts
        for app in hired_apps:
            hired_counts[app.jobId] = hired_counts.get(app.jobId, 0) + 1
        
        # Fetch worker info
        hired_worker_ids = list(set([app.workerId for app in hired_apps]))
        hired_users = db.query(models.User).filter(models.User.id.in_(hired_worker_ids)).all()
        user_map = {user.id: user for user in hired_users}

        for app in hired_apps:
            user = user_map.get(app.workerId)
            if user:
                if app.jobId not in job_hired_workers:
                    job_hired_workers[app.jobId] = []
                    
                from app.schemas.job import HiredWorkerInfo
                job_hired_workers[app.jobId].append(HiredWorkerInfo(
                    id=user.id,
                    name=user.name or "Foydalanuvchi",
                    phone=user.phone,
                    avatarUrl=user.avatarUrl
                ))

    result = []
    for job in jobs:
        app_item = next((a for a in worker_apps if a.jobId == job.id), None)
        job_status = job.status
        if app_item:
            if app_item.status == 'in_progress' or job.status == 'in_progress':
                job_status = 'in_progress'
            elif app_item.status == 'completed' or job.status == 'completed':
                job_status = 'completed'
            elif app_item.status == 'start_requested' or job.status == 'start_requested':
                job_status = 'start_requested'
            elif app_item.status == 'hired':
                job_status = 'hired'
            elif app_item.status == 'applied':
                job_status = 'applied'
                
        job_dict = schemas.JobWithApplicationStatus.model_validate(job)
        job_dict.status = job_status
        job_dict.applied = bool(app_item)
        if app_item:
            job_dict.appliedDate = app_item.appliedDate
        
        # Calculate hired count and vacancies
        vacancies_num = int(job.neededWorkers) if job.neededWorkers and job.neededWorkers.isdigit() else 1
        hired_cnt = hired_counts.get(job.id, 0)

        job_dict.hiredCount = hired_cnt
        job_dict.vacancies = vacancies_num
        job_dict.hiredWorkers = job_hired_workers.get(job.id, [])

        # Check if job is filled or completed
        is_filled = (hired_cnt >= vacancies_num) or (job.status in ['completed', 'in_progress'])
        
        # Hide filled jobs from workers who haven't applied
        if not (current_user and current_user.role in ['employer', 'admin']):
            if is_filled and not app_item:
                continue

        result.append(job_dict)
        
    return result

@router.post("", response_model=schemas.Job)
def create_job(
    *,
    db: Session = Depends(deps.get_db),
    job_in: schemas.JobCreate,
    current_user: models.User = Depends(deps.get_current_employer),
) -> Any:
    """
    Create new job.
    """
    job_in_dict = job_in.model_dump()
    job_in_dict["employerId"] = current_user.id
    
    db_job = models.Job(**job_in_dict)
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job

@router.post("/{job_id}/view")
def view_job(
    job_id: str,
    db: Session = Depends(deps.get_db)
):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Increment view count
    job.views = (job.views or 0) + 1
    db.add(job)
    db.commit()
    
    return {"status": "ok", "views": job.views}

@router.delete("/{id}")
def delete_job(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete a job.
    """
    job = crud.job.get(db=db, id=id)
    if not job:
        raise HTTPException(status_code=404, detail="Ish e'loni topilmadi")
    if job.employerId not in (current_user.id, current_user.uid) and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Bu e'lonni o'chirish huquqingiz yo'q")

    db.query(models.Application).filter(models.Application.jobId == id).delete()
    crud.job.remove(db=db, id=id)
    return {"success": True}
