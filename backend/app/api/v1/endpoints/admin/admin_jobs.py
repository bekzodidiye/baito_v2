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
        
        # Check applications for a hired/completed worker
        application = db.query(models.Application).filter(
            models.Application.jobId == j.id, 
            models.Application.status.in_(["hired", "completed"])
        ).first()
        
        worker = None
        if application:
            worker = db.query(models.User).filter(models.User.id == application.workerId).first()
        elif getattr(j, 'hiredWorkerId', None):
            worker = db.query(models.User).filter(models.User.id == j.hiredWorkerId).first()

        result.append({
            "id": j.id,
            "title": j.title,
            "company": j.company,
            "employerId": j.employerId,
            "employerName": employer.name if employer else "",
            "workerId": worker.id if worker else None,
            "workerName": worker.name if worker else "",
            "salary": j.salary,
            "location": j.location,
            "description": j.description,
            "status": j.status,
            "durationLabel": j.durationLabel,
            "createdAt": str(j.createdAt) if j.createdAt else None,
            "workDate": j.workDate,
            "workTime": j.workTime,
            "category": j.category,
            "tags": j.tags,
            "urgent": j.urgent,
            "logoUrl": j.logoUrl,
            "imageUrl": j.imageUrl,
            "salaryCurrency": j.salaryCurrency,
            "neededWorkers": j.neededWorkers,
            "hourlyRate": j.hourlyRate,
            "transportRate": j.transportRate,
            "responsibilities": j.responsibilities,
            "requirements": j.requirements,
            "importantNote": j.importantNote,
            "rawLocation": j.rawLocation,
            "views": j.views,
            "coordinateX": j.coordinateX,
            "coordinateY": j.coordinateY,
        })
    return result


@router.get("/jobs/{job_id}/detail")
def get_admin_job_detail(
    job_id: str,
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    """Full job detail with timeline, applications, transactions for admin panel"""
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Ish topilmadi")

    employer = db.query(models.User).filter(models.User.id == job.employerId).first()

    # All applications for this job
    applications = db.query(models.Application).filter(
        models.Application.jobId == job_id
    ).all()

    apps_data = []
    hired_app = None
    for app in applications:
        w = db.query(models.User).filter(models.User.id == app.workerId).first()
        app_item = {
            "id": app.id,
            "workerId": app.workerId,
            "workerName": w.name if w else "",
            "workerPhone": w.phone if w else "",
            "workerAvatar": getattr(w, 'avatarUrl', None) if w else None,
            "status": app.status,
            "appliedDate": app.appliedDate.isoformat() if app.appliedDate else None,
            "rating": app.rating,
            "review": app.review,
            "bonus": app.bonus,
        }
        apps_data.append(app_item)
        if app.status in ("hired", "completed"):
            hired_app = app_item

    # Transactions for this job
    transactions = db.query(models.Transaction).filter(
        models.Transaction.jobId == job_id
    ).all()

    txn_data = []
    for t in transactions:
        emp = db.query(models.User).filter(models.User.id == t.employerId).first()
        wrk = db.query(models.User).filter(models.User.id == t.workerId).first() if t.workerId else None
        txn_data.append({
            "id": t.id,
            "type": t.type,
            "status": t.status,
            "amount": t.amount,
            "platformFee": t.platformFee,
            "employerName": emp.name if emp else "",
            "workerName": wrk.name if wrk else "",
            "createdAt": t.createdAt.isoformat() if t.createdAt else None,
            "providerTransactionId": t.providerTransactionId,
            "performTime": t.performTime,
            "cancelTime": t.cancelTime,
        })

    # Build timeline events
    timeline = []
    if job.createdAt:
        timeline.append({"event": "created", "label": "E'lon yaratildi", "date": job.createdAt.isoformat(), "icon": "plus"})

    for app_d in sorted(apps_data, key=lambda x: x["appliedDate"] or ""):
        if app_d["appliedDate"]:
            timeline.append({
                "event": "applied",
                "label": f"{app_d['workerName']} ariza yubordi",
                "date": app_d["appliedDate"],
                "icon": "user",
            })
        if app_d["status"] in ("hired", "completed"):
            # Try to get the deposit transaction to use its date, otherwise just use appliedDate
            # Usually hired happens right before deposit
            timeline.append({
                "event": "hired",
                "label": f"{app_d['workerName']} tasdiqlandi",
                "date": app_d["appliedDate"], # we will sort this stably
                "icon": "check",
            })

    for tx in sorted(txn_data, key=lambda x: x["createdAt"] or ""):
        if tx["type"] == "deposit" and tx["status"] in ("paid", "pending"):
            timeline.append({
                "event": "deposit",
                "label": f"Depozit: {tx['amount']} so'm",
                "date": tx["createdAt"],
                "icon": "dollar",
            })
        if tx["type"] == "payment" and tx["status"] == "paid":
            timeline.append({
                "event": "payment",
                "label": f"To'lov: {tx['amount']} so'm",
                "date": tx["createdAt"],
                "icon": "credit-card",
            })

    # Sort timeline by date
    timeline.sort(key=lambda x: x.get("date") or "")

    return {
        "job": {
            "id": job.id,
            "title": job.title,
            "company": job.company,
            "employerId": job.employerId,
            "employerName": employer.name if employer else "",
            "employerPhone": employer.phone if employer else "",
            "salary": job.salary,
            "location": job.location,
            "rawLocation": job.rawLocation,
            "description": job.description,
            "status": job.status,
            "durationLabel": job.durationLabel,
            "createdAt": str(job.createdAt) if job.createdAt else None,
            "workDate": job.workDate,
            "workTime": job.workTime,
            "category": job.category,
            "tags": job.tags,
            "urgent": job.urgent,
            "logoUrl": job.logoUrl,
            "imageUrl": job.imageUrl,
            "salaryCurrency": job.salaryCurrency,
            "neededWorkers": job.neededWorkers,
            "hourlyRate": job.hourlyRate,
            "transportRate": job.transportRate,
            "responsibilities": job.responsibilities,
            "requirements": job.requirements,
            "importantNote": job.importantNote,
            "views": job.views,
            "coordinateX": job.coordinateX,
            "coordinateY": job.coordinateY,
        },
        "hiredWorker": hired_app,
        "applications": apps_data,
        "transactions": txn_data,
        "timeline": timeline,
    }


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


@router.patch("/jobs/{job_id}/worker")
@router.post("/jobs/{job_id}/worker")
def change_job_worker(
    job_id: str,
    payload: dict,
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Ish topilmadi")

    new_worker_id = payload.get("workerId")

    # Unassign current worker if any
    current_apps = db.query(models.Application).filter(
        models.Application.jobId == job_id,
        models.Application.status.in_(["hired", "completed"])
    ).all()
    
    for app in current_apps:
        app.status = "rejected"

    if new_worker_id:
        # Check if the new worker already has an application
        new_app = db.query(models.Application).filter(
            models.Application.jobId == job_id,
            models.Application.workerId == new_worker_id
        ).first()

        if new_app:
            new_app.status = "hired"
        else:
            new_app = models.Application(
                jobId=job_id,
                workerId=new_worker_id,
                status="hired"
            )
            db.add(new_app)
        
        # update job status to confirmed if it was open
        if job.status == "open":
            job.status = "confirmed"

    db.commit()
    return {"success": True}


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
