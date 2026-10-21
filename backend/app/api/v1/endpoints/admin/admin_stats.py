from typing import Any

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import case, func, or_
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
    total_users, workers, employers, owed_to_workers = db.query(
        func.count(models.User.id),
        func.coalesce(func.sum(case((models.User.role == "worker", 1), else_=0)), 0),
        func.coalesce(func.sum(case((models.User.role == "employer", 1), else_=0)), 0),
        func.coalesce(func.sum(case((models.User.role == "worker", models.User.balance), else_=0)), 0),
    ).one()

    total_jobs, open_jobs, active_jobs, completed_jobs = db.query(
        func.count(models.Job.id),
        func.coalesce(func.sum(case((models.Job.status.in_(JobStatus.OPEN_STATUSES), 1), else_=0)), 0),
        func.coalesce(func.sum(case((models.Job.status == JobStatus.IN_PROGRESS, 1), else_=0)), 0),
        func.coalesce(func.sum(case((models.Job.status == JobStatus.COMPLETED, 1), else_=0)), 0),
    ).one()

    total_apps = db.query(func.count(models.Application.id)).scalar() or 0

    total_tx, total_revenue = db.query(
        func.count(models.Transaction.id),
        func.coalesce(
            func.sum(
                case(
                    (models.Transaction.status.in_(["paid", "released"]), models.Transaction.platformFee),
                    else_=0,
                )
            ),
            0,
        ),
    ).one()

    return {
        "totalUsers": int(total_users or 0),
        "workersCount": int(workers or 0),
        "employersCount": int(employers or 0),
        "totalJobs": int(total_jobs or 0),
        "openJobsCount": int(open_jobs or 0),
        "activeJobsCount": int(active_jobs or 0),
        "completedJobsCount": int(completed_jobs or 0),
        "totalApplications": int(total_apps or 0),
        "totalTransactions": int(total_tx or 0),
        "totalRevenue": int((total_revenue or 0) // 100),   # tiyin -> UZS
        "totalOwedToWorkers": int(owed_to_workers or 0),
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
    user_objs = (
        db.query(models.User)
        .filter(or_(models.User.id.in_(user_ids), models.User.uid.in_(user_ids)))
        .all()
    ) if user_ids else []
    user_map = {}
    for u in user_objs:
        user_map[u.id] = u
        if u.uid:
            user_map[u.uid] = u

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
                "amount": (t.amount or 0) // 100,  # tiyin -> UZS
                "platformFee": (t.platformFee or 0) // 100,  # tiyin -> UZS
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
    user_objs = (
        db.query(models.User)
        .filter(or_(models.User.id.in_(user_ids), models.User.uid.in_(user_ids)))
        .all()
    ) if user_ids else []
    user_map = {}
    for u in user_objs:
        user_map[u.id] = u
        if u.uid:
            user_map[u.uid] = u

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
