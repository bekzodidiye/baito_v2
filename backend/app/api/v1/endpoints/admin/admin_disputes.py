from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models
from app.api import deps
from .admin_users import get_admin_user

router = APIRouter()

@router.get("/disputes")
def get_disputes(
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    disputes = db.query(models.Dispute).all()
    
    job_ids = {d.jobId for d in disputes if d.jobId}
    employer_ids = {d.employerId for d in disputes if d.employerId}
    worker_ids = {d.workerId for d in disputes if d.workerId}
    
    jobs = {j.id: j for j in db.query(models.Job).filter(models.Job.id.in_(job_ids)).all()} if job_ids else {}
    users = {u.id: u for u in db.query(models.User).filter(models.User.id.in_(employer_ids | worker_ids)).all()} if employer_ids or worker_ids else {}
    
    result = []
    for d in disputes:
        job = jobs.get(d.jobId)
        employer = users.get(d.employerId)
        worker = users.get(d.workerId)
        result.append({
            "id": d.id,
            "jobId": d.jobId,
            "jobTitle": job.title if job else "",
            "employerId": d.employerId,
            "employerName": employer.name if employer else "",
            "workerId": d.workerId,
            "workerName": worker.name if worker else "",
            "reason": d.reason,
            "status": d.status,
            "adminNotes": d.adminNotes,
        })
    return result

@router.patch("/disputes/{dispute_id}")
def update_dispute(
    dispute_id: str,
    payload: dict,
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    dispute = db.query(models.Dispute).filter(models.Dispute.id == dispute_id).first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Nizo topilmadi")
        
    if "status" in payload:
        dispute.status = payload["status"]
    if "adminNotes" in payload:
        dispute.adminNotes = payload["adminNotes"]
        
    db.commit()
    return {"success": True}
