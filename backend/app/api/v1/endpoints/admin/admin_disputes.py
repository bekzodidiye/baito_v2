from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app import models
from app.api import deps
from .admin_users import get_admin_user
from .admin_audit import record_admin_action

router = APIRouter()


class DisputeUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern="^(pending|resolved|rejected|closed)$")
    adminNotes: Optional[str] = Field(None, max_length=2000)


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
    payload: DisputeUpdate,
    request: Request,
    db: Session = Depends(deps.get_db),
    admin: models.User = Depends(get_admin_user),
) -> Any:
    dispute = db.query(models.Dispute).filter(models.Dispute.id == dispute_id).first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Nizo topilmadi")
        
    old_status = dispute.status
    if payload.status is not None:
        dispute.status = payload.status
    if payload.adminNotes is not None:
        dispute.adminNotes = payload.adminNotes

    # If the dispute was resolved or rejected, notify both worker and employer
    if payload.status and payload.status != old_status:
        notice_users = [uid for uid in (dispute.workerId, dispute.employerId) if uid]
        status_text = "hal qilindi" if payload.status == "resolved" else "rad etildi" if payload.status == "rejected" else payload.status
        for uid in notice_users:
            db.add(models.Notification(
                userId=uid,
                title="Nizo holati o'zgardi",
                message=f"Siz ishtirok etgan nizo bo'yicha qaror qabul qilindi: {status_text}.",
                type="system",
            ))

    record_admin_action(
        db, admin, "dispute.update", target_type="dispute", target_id=dispute.id,
        details={"oldStatus": old_status, "newStatus": dispute.status, "notes": dispute.adminNotes},
        request=request,
    )
        
    db.commit()
    return {"success": True}

