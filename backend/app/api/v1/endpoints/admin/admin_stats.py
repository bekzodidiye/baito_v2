from typing import Any

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models
from app.api import deps
from app.models.job import JobStatus

from .admin_users import get_admin_user
from .audit import record_admin_action

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

    # 'open' is the column default; the previous code also counted a status
    # named 'active' that nothing ever wrote, so this was always zero.
    open_jobs = (
        db.query(func.count(models.Job.id))
        .filter(models.Job.status.in_(JobStatus.OPEN_STATUSES))
        .scalar() or 0
    )
    active_jobs = (
        db.query(func.count(models.Job.id))
        .filter(models.Job.status == JobStatus.IN_PROGRESS)
        .scalar() or 0
    )
    completed_jobs = (
        db.query(func.count(models.Job.id))
        .filter(models.Job.status == JobStatus.COMPLETED)
        .scalar() or 0
    )
    total_apps = db.query(func.count(models.Application.id)).scalar() or 0
    total_tx = db.query(func.count(models.Transaction.id)).scalar() or 0

    # These two were hardcoded to 0.
    total_revenue = (
        db.query(func.coalesce(func.sum(models.Transaction.platformFee), 0))
        .filter(models.Transaction.status.in_(["paid", "released"]))
        .scalar() or 0
    )
    escrow_held = (
        db.query(func.coalesce(func.sum(models.Transaction.amount), 0))
        .filter(
            models.Transaction.type == "escrow_hold",
            models.Transaction.status == "held",
        )
        .scalar() or 0
    )

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
        "totalRevenue": total_revenue // 100,   # tiyin -> UZS
        "totalEscrowHeld": escrow_held // 100,
    }


@router.get("/transactions")
def get_transactions(
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
) -> Any:
    txs = (
        db.query(models.Transaction)
        .order_by(models.Transaction.createdAt.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    if not txs:
        return {"total": 0, "items": []}

    # One lookup for every participant instead of two queries per row.
    user_ids = {t.employerId for t in txs} | {t.workerId for t in txs if t.workerId}
    user_map = {
        u.id: u for u in db.query(models.User).filter(models.User.id.in_(user_ids)).all()
    }

    total = db.query(func.count(models.Transaction.id)).scalar() or 0
    return {
        "total": total,
        "items": [
            {
                "id": t.id,
                "jobId": t.jobId,
                "employerId": t.employerId,
                "employerName": getattr(user_map.get(t.employerId), "name", ""),
                "workerId": t.workerId,
                "workerName": getattr(user_map.get(t.workerId), "name", "") if t.workerId else "",
                "amount": t.amount // 100,  # tiyin -> UZS
                "platformFee": t.platformFee // 100,  # tiyin -> UZS
                "type": t.type,
                "status": t.status,
                "createdAt": str(t.createdAt) if t.createdAt else None,
            }
            for t in txs
        ],
    }


@router.get("/support-tickets")
def get_support_tickets(
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
) -> Any:
    tickets = (
        db.query(models.SupportTicket)
        .order_by(models.SupportTicket.createdAt.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    if not tickets:
        return {"total": 0, "items": []}

    user_ids = {t.userId for t in tickets}
    user_map = {
        u.id: u for u in db.query(models.User).filter(models.User.id.in_(user_ids)).all()
    }

    total = db.query(func.count(models.SupportTicket.id)).scalar() or 0
    return {
        "total": total,
        "items": [
            {
                "id": t.id,
                "userId": t.userId,
                "userName": getattr(user_map.get(t.userId), "name", ""),
                "subject": t.subject,
                "category": t.category,
                "status": t.status,
                "priority": t.priority,
                "createdAt": str(t.createdAt) if t.createdAt else None,
            }
            for t in tickets
        ],
    }


class BroadcastPayload(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1, max_length=2000)
    targetRole: str = Field(default="all")


@router.post("/broadcast")
def send_broadcast(
    payload: BroadcastPayload,
    request: Request,
    db: Session = Depends(deps.get_db),
    admin: models.User = Depends(get_admin_user),
) -> Any:
    """Send an announcement to every matching user.

    The previous implementation was a single ``print()`` — the admin panel
    reported success while nobody received anything.
    """
    query = db.query(models.User.id).filter(models.User.isBanned == False)  # noqa: E712
    if payload.targetRole in ("worker", "employer", "admin"):
        query = query.filter(models.User.role == payload.targetRole)

    user_ids = [row[0] for row in query.all()]
    for uid in user_ids:
        db.add(models.Notification(
            userId=uid,
            title=payload.title,
            message=payload.message,
            type="system",
        ))

    record_admin_action(
        db, admin, "broadcast", target_type="users",
        details={"targetRole": payload.targetRole, "recipients": len(user_ids)},
        request=request, note=payload.title,
    )
    db.commit()
    return {"success": True, "sentTo": payload.targetRole, "recipients": len(user_ids)}
