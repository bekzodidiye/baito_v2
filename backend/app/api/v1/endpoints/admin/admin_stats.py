from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app import models
from app.api import deps
from .admin_users import get_admin_user

router = APIRouter()

@router.get("/stats")
def get_stats(
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    total_users = db.query(func.count(models.User.id)).scalar() or 0
    workers = db.query(func.count(models.User.id)).filter(models.User.role == 'worker').scalar() or 0
    employers = db.query(func.count(models.User.id)).filter(models.User.role == 'employer').scalar() or 0
    total_jobs = db.query(func.count(models.Job.id)).scalar() or 0
    open_jobs = db.query(func.count(models.Job.id)).filter(models.Job.status == 'open').scalar() or 0
    active_jobs = db.query(func.count(models.Job.id)).filter(models.Job.status == 'in_progress').scalar() or 0
    completed_jobs = db.query(func.count(models.Job.id)).filter(models.Job.status == 'completed').scalar() or 0
    total_apps = db.query(func.count(models.Application.id)).scalar() or 0
    total_tx = db.query(func.count(models.Transaction.id)).scalar() or 0

    return {
        "totalUsers": total_users,
        "workersCount": workers,
        "employersCount": employers,
        "totalJobs": total_jobs,
        "openJobsCount": open_jobs,
        "activeJobsCount": active_jobs,
        "completedJobsCount": completed_jobs,
        "totalApplications": total_apps,
        "totalTransactions": total_tx,
        "totalRevenue": 0,
        "totalEscrowHeld": 0,
    }


@router.get("/transactions")
def get_transactions(
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
    skip: int = 0,
    limit: int = 200,
) -> Any:
    txs = db.query(models.Transaction).offset(skip).limit(limit).all()
    result = []
    for t in txs:
        employer = db.query(models.User).filter(models.User.id == t.employerId).first()
        worker = db.query(models.User).filter(models.User.id == t.workerId).first() if t.workerId else None
        result.append({
            "id": t.id,
            "jobId": t.jobId,
            "employerId": t.employerId,
            "employerName": employer.name if employer else "",
            "workerId": t.workerId,
            "workerName": worker.name if worker else "",
            "amount": t.amount,
            "platformFee": t.platformFee,
            "type": t.type,
            "status": t.status,
            "createdAt": str(t.createdAt) if t.createdAt else None,
        })
    return result


@router.get("/support-tickets")
def get_support_tickets(
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
    skip: int = 0,
    limit: int = 200,
) -> Any:
    tickets = db.query(models.SupportTicket).offset(skip).limit(limit).all()
    result = []
    for t in tickets:
        user = db.query(models.User).filter(models.User.id == t.userId).first()
        result.append({
            "id": t.id,
            "userId": t.userId,
            "userName": user.name if user else "",
            "subject": t.subject,
            "category": t.category,
            "status": t.status,
            "priority": t.priority,
            "createdAt": str(t.createdAt) if t.createdAt else None,
        })
    return result


@router.get("/settings")
def get_settings(
    _: models.User = Depends(get_admin_user),
) -> Any:
    return {
        "platformFeePercent": 10,
        "minHourlyRate": 15000,
        "maintenanceMode": False,
        "autoApproveJobs": True,
        "autoExpireJobs": True,
        "autoExpireDays": 14,
        "autoDeleteSpamJobs": True,
    }


@router.post("/settings")
@router.put("/settings")
def update_settings(
    payload: dict,
    _: models.User = Depends(get_admin_user),
) -> Any:
    return {"success": True, "settings": payload}


@router.post("/broadcast")
def send_broadcast(
    payload: dict,
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    title = payload.get("title", "")
    message = payload.get("message", "")
    target_role = payload.get("targetRole", "all")
    print(f"[BROADCAST] To: {target_role} | Title: {title} | Msg: {message}")
    return {"success": True, "sentTo": target_role}
