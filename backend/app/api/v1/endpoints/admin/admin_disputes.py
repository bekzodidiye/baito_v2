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
    result = []
    for d in disputes:
        job = db.query(models.Job).filter(models.Job.id == d.jobId).first()
        employer = db.query(models.User).filter(models.User.id == d.employerId).first()
        worker = db.query(models.User).filter(models.User.id == d.workerId).first()
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
