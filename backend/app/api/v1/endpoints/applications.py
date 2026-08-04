from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, models, schemas
from app.api import deps

router = APIRouter()

@router.get("/employer")
def get_employer_applications(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get all applications for jobs posted by current employer.
    Returns enriched data with worker name/phone and job title.
    """
    jobs = db.query(models.Job).all()
    employer_jobs = [
        j for j in jobs 
        if j.employerId == current_user.id or j.employerId == current_user.uid or (current_user.companyName and j.company == current_user.companyName)
    ]
    
    # Fallback to all jobs if no specific match
    if not employer_jobs:
        employer_jobs = jobs
        
    job_map = {j.id: j for j in employer_jobs}
    employer_job_ids = list(job_map.keys())
    
    apps = db.query(models.Application).all()
    if employer_job_ids:
        apps = [a for a in apps if a.jobId in employer_job_ids]
    
    result = []
    for app in apps:
        worker = crud.user.get(db=db, id=app.workerId)
        if not worker:
            worker = db.query(models.User).filter(models.User.uid == app.workerId).first()
            
        job = job_map.get(app.jobId) or crud.job.get(db=db, id=app.jobId)
        result.append({
            "id": app.id,
            "jobId": app.jobId,
            "jobTitle": job.title if job else "Ish e'loni",
            "workerId": app.workerId,
            "workerName": worker.name if worker else "Ishchi",
            "workerPhone": worker.phone if worker else "+998 90 *** ** **",
            "status": app.status,
            "appliedDate": str(app.appliedDate) if app.appliedDate else None
        })
    return result

@router.post("/{id}/hire")
def hire_applicant(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Hire an applicant.
    """
    app = db.query(models.Application).filter(models.Application.id == id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    job = crud.job.get(db=db, id=app.jobId)
    app.status = "hired"
    if job:
        job.status = "confirmed"
        db.add(job)
    db.add(app)

    # Auto-delete other applications for the same date when hired
    if job:
        job_date = getattr(job, 'workDate', None) or getattr(job, 'periodText', None)
        if job_date:
            clean_date = str(job_date).split(" ")[0].split("~")[0].strip()
            other_apps = db.query(models.Application).filter(
                models.Application.workerId == app.workerId,
                models.Application.id != app.id,
                models.Application.status == "applied"
            ).all()
            for other_app in other_apps:
                other_j = crud.job.get(db=db, id=other_app.jobId)
                if other_j:
                    other_date_val = getattr(other_j, 'workDate', None) or getattr(other_j, 'periodText', None)
                    if other_date_val and str(other_date_val).split(" ")[0].split("~")[0].strip() == clean_date:
                        db.delete(other_app)

    db.commit()
    db.refresh(app)
    
    return {"success": True, "application_status": "hired"}

@router.post("/{id}/reject")
def reject_applicant(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Reject an applicant.
    """
    app = db.query(models.Application).filter(models.Application.id == id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    app.status = "rejected"
    db.add(app)
    db.commit()
    db.refresh(app)
    
    return {"success": True, "application_status": "rejected"}
