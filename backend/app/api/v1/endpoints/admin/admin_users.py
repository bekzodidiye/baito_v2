import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app import models
from app.api import deps
from app.models.audit_ledger import AuditLedger

from .audit import record_admin_action

router = APIRouter()

get_admin_user = deps.get_current_admin

ASSIGNABLE_ROLES = {"worker", "employer", "admin"}
MAX_MANUAL_BALANCE_ADJUSTMENT = 100_000_000


class BanPayload(BaseModel):
    isBanned: bool
    reason: Optional[str] = Field(default=None, max_length=500)


class RolePayload(BaseModel):
    role: Optional[str] = None
    isVerified: Optional[bool] = None
    clearDocs: Optional[bool] = False
    reason: Optional[str] = Field(default=None, max_length=500)


class BalancePayload(BaseModel):
    amount: int = Field(
        ge=-MAX_MANUAL_BALANCE_ADJUSTMENT, le=MAX_MANUAL_BALANCE_ADJUSTMENT
    )
    reason: str = Field(min_length=3, max_length=500)


class NotePayload(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


def _serialize_user(u: models.User) -> dict:
    return {
        "id": u.id,
        "uid": u.uid,
        "name": u.name,
        "phone": u.phone,
        "email": u.email,
        "role": u.role,
        "companyName": u.companyName,
        "avatarUrl": u.avatarUrl,
        "balance": u.balance,
        "isBanned": u.isBanned,
        "isVerified": u.isVerified,
        "createdAt": str(u.createdAt) if u.createdAt else None,
        "region": u.region,
        "category": u.category,
        "bio": u.bio,
        "skills": u.skills,
        "rating": u.rating,
        "completedJobsCount": u.completedJobsCount,
        "passportSeries": u.passportSeries,
        "passportJshshir": u.passportJshshir,
        "passportDocFront": u.passportDocFront,
        "passportDocBack": u.passportDocBack,
        "selfieWithDoc": u.selfieWithDoc,
        "bankCardMask": u.bankCardMask,
        "sourceApp": u.sourceApp,
    }


@router.get("/users")
def get_users(
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    search: Optional[str] = None,
    role: Optional[str] = None,
) -> Any:
    query = db.query(models.User)

    if role:
        query = query.filter(models.User.role == role)
    if search:
        like = f"%{search.strip()}%"
        query = query.filter(
            or_(
                models.User.name.ilike(like),
                models.User.phone.ilike(like),
                models.User.email.ilike(like),
                models.User.companyName.ilike(like),
            )
        )

    total = query.count()
    users = (
        query.order_by(models.User.createdAt.desc()).offset(skip).limit(limit).all()
    )
    return {"total": total, "items": [_serialize_user(u) for u in users]}


@router.patch("/users/{user_id}/ban")
def ban_user(
    user_id: str,
    payload: BanPayload,
    request: Request,
    db: Session = Depends(deps.get_db),
    admin: models.User = Depends(get_admin_user),
) -> Any:
    user = db.query(models.User).filter(or_(models.User.id == user_id, models.User.uid == user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    if user.id == admin.id or (user.uid and user.uid == getattr(admin, "uid", None)):
        raise HTTPException(status_code=400, detail="O'zingizni bloklay olmaysiz")

    user.isBanned = payload.isBanned

    # A ban has to actually evict the person: their JWT stays valid until it
    # expires otherwise.
    revoked = 0
    if payload.isBanned:
        sessions = (
            db.query(models.ActiveSession)
            .filter(
                models.ActiveSession.user_uid == user.uid,
                models.ActiveSession.is_active == True,  # noqa: E712
            )
            .all()
        )
        for s in sessions:
            s.is_active = False
        revoked = len(sessions)

    record_admin_action(
        db, admin, "user.ban" if payload.isBanned else "user.unban",
        target_type="user", target_id=user.id,
        details={"isBanned": payload.isBanned, "revokedSessions": revoked},
        request=request, note=payload.reason,
    )
    db.commit()
    return {"success": True, "isBanned": user.isBanned, "revoked_sessions": revoked}


@router.patch("/users/{user_id}/role")
def change_role(
    user_id: str,
    payload: RolePayload,
    request: Request,
    db: Session = Depends(deps.get_db),
    admin: models.User = Depends(get_admin_user),
) -> Any:
    user = db.query(models.User).filter(or_(models.User.id == user_id, models.User.uid == user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")

    changes: dict[str, Any] = {}

    if payload.role is not None:
        if payload.role not in ASSIGNABLE_ROLES:
            raise HTTPException(status_code=400, detail="Noma'lum rol")
        if user.id == admin.id and payload.role != "admin":
            raise HTTPException(
                status_code=400, detail="O'z admin huquqingizni olib tashlay olmaysiz"
            )
        if user.role == "admin" and payload.role != "admin":
            remaining = (
                db.query(models.User)
                .filter(models.User.role == "admin", models.User.id != user.id)
                .count()
            )
            if remaining == 0:
                raise HTTPException(
                    status_code=400, detail="Tizimda kamida bitta administrator qolishi kerak"
                )
        changes["role"] = {"from": user.role, "to": payload.role}
        user.role = payload.role

    if payload.isVerified is not None:
        changes["isVerified"] = {"from": user.isVerified, "to": payload.isVerified}
        user.isVerified = payload.isVerified
        # Wording the admin panel can edit. It used to be a literal here, so
        # the templates screen edited a React array that reached nothing.
        settings_row = (
            db.query(models.SystemSetting)
            .filter(models.SystemSetting.id == "singleton")
            .first()
        )
        default = (
            "Sizning shaxsingiz va hujjatlaringiz tasdiqlandi!"
            if user.isVerified
            else "Hujjatlaringiz rad etildi, iltimos qaytadan to'g'ri hujjatlarni yuklang."
        )
        template = (
            getattr(settings_row, "notifVerifiedTemplate", None)
            if user.isVerified
            else getattr(settings_row, "notifRejectedTemplate", None)
        ) if settings_row else None
        message = (template or default).replace("{user_name}", user.name or "")

        db.add(models.Notification(
            userId=user.id,
            title="Verifikatsiya holati",
            message=message,
            type="system",
        ))

    if payload.clearDocs:
        user.passportDocFront = None
        user.passportDocBack = None
        user.selfieWithDoc = None
        user.passportSeries = None
        user.passportJshshir = None
        changes["clearDocs"] = True

    if not changes:
        raise HTTPException(status_code=400, detail="O'zgartirish uchun maydon berilmadi")

    record_admin_action(
        db, admin, "user.update", target_type="user", target_id=user.id,
        details=changes, request=request, note=payload.reason,
    )
    db.commit()
    return {"success": True, "role": user.role, "isVerified": user.isVerified}


@router.post("/users/{user_id}/balance")
def add_balance(
    user_id: str,
    payload: BalancePayload,
    request: Request,
    db: Session = Depends(deps.get_db),
    admin: models.User = Depends(get_admin_user),
) -> Any:
    """Manually adjust a balance.

    This used to accept any amount with no bound, no reason and — on a money
    platform — no ledger entry at all, so an administrator could mint funds
    without leaving a trace.
    """
    if payload.amount == 0:
        raise HTTPException(status_code=400, detail="Summa noldan farqli bo'lishi kerak")

    user = (
        db.query(models.User)
        .filter(or_(models.User.id == user_id, models.User.uid == user_id))
        .populate_existing()
        .with_for_update()
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")

    new_balance = (user.balance or 0) + payload.amount
    if new_balance < 0:
        raise HTTPException(status_code=400, detail="Balans manfiy bo'lib qolmasligi kerak")

    user.balance = new_balance
    db.add(user)

    db.add(AuditLedger(
        userId=user.id,
        amountDelta=payload.amount,
        balanceAfter=new_balance,
        entryType="admin_adjustment",
        referenceType="admin",
        referenceId=admin.id,
        description=f"Administrator tuzatishi: {payload.reason}",
    ))

    record_admin_action(
        db, admin, "user.balance", target_type="user", target_id=user.id,
        details={"amount": payload.amount, "balanceAfter": new_balance},
        request=request, note=payload.reason,
    )
    db.commit()
    return {"success": True, "balance": user.balance}


@router.get("/users/{user_id}/detail")
def get_user_detail(
    user_id: str,
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    user = db.query(models.User).filter(or_(models.User.id == user_id, models.User.uid == user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")

    user_ids = [uid for uid in [user.id, getattr(user, 'uid', None)] if uid]

    sessions = (
        db.query(models.ActiveSession)
        .filter(models.ActiveSession.user_uid == user.uid)
        .all()
    )
    sessions_list = [
        {
            "ip": s.ip_address,
            "device": s.device_name,
            "location": s.location,
            "date": s.created_at.isoformat() if s.created_at else None,
            "active": s.is_active,
        }
        for s in sessions
    ]

    txs = (
        db.query(models.Transaction)
        .filter(
            or_(
                models.Transaction.employerId.in_(user_ids),
                models.Transaction.workerId.in_(user_ids),
            )
        )
        .order_by(models.Transaction.createdAt.desc())
        .limit(200)
        .all()
    )
    txs_list = [
        {
            "id": t.id,
            "amount": t.amount,
            "type": t.type,
            "status": t.status,
            "createdAt": t.createdAt.isoformat() if t.createdAt else None,
        }
        for t in txs
    ]

    orders_list = []
    reviews_list = []

    if user.role == 'worker':
        apps = (
            db.query(models.Application)
            .filter(models.Application.workerId.in_(user_ids))
            .limit(500)
            .all()
        )
        # One query for all jobs instead of one per application.
        job_map = {}
        if apps:
            job_ids = {a.jobId for a in apps}
            job_map = {
                j.id: j
                for j in db.query(models.Job).filter(models.Job.id.in_(job_ids)).all()
            }
            employer_ids = {j.employerId for j in job_map.values()}
            employer_map = {
                u.id: u
                for u in db.query(models.User).filter(models.User.id.in_(employer_ids)).all()
            }
        else:
            employer_map = {}

        for a in apps:
            job = job_map.get(a.jobId)
            if not job:
                continue
            employer = employer_map.get(job.employerId)
            author = job.company or (employer.name if employer else "Noma'lum")
            orders_list.append({
                "id": job.id,
                "title": job.title,
                "date": a.appliedDate.isoformat() if a.appliedDate else None,
                "amount": job.salary,
                "status": a.status,
                "employerName": author,
            })
            if a.rating and a.review:
                reviews_list.append({
                    "rating": a.rating,
                    "review": a.review,
                    "date": a.appliedDate.isoformat() if a.appliedDate else None,
                    "author": author,
                })
    else:
        jobs = (
            db.query(models.Job)
            .filter(models.Job.employerId.in_(user_ids))
            .limit(500)
            .all()
        )
        for j in jobs:
            orders_list.append({
                "id": j.id,
                "title": j.title,
                "date": j.createdAt.isoformat() if j.createdAt else None,
                "amount": j.salary,
                "status": j.status,
                "employerName": "Siz (Ish beruvchi)",
            })

    user_data = _serialize_user(user)
    user_data["createdAt"] = user.createdAt.isoformat() if user.createdAt else None
    user_data["adminNotes"] = user.adminNotes or []

    return {
        "user": user_data,
        "sessions": sessions_list,
        "transactions": txs_list,
        "orders": orders_list,
        "reviews": reviews_list,
    }


@router.post("/users/{user_id}/notes")
def add_user_note(
    user_id: str,
    payload: NotePayload,
    request: Request,
    db: Session = Depends(deps.get_db),
    admin: models.User = Depends(get_admin_user),
) -> Any:
    user = db.query(models.User).filter(or_(models.User.id == user_id, models.User.uid == user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")

    current_notes = user.adminNotes if isinstance(user.adminNotes, list) else []
    # Copy so SQLAlchemy sees the JSON column change.
    new_notes = list(current_notes)
    new_notes.append({
        "text": payload.text,
        "author": admin.name,
        "date": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    })
    user.adminNotes = new_notes

    record_admin_action(
        db, admin, "user.note", target_type="user", target_id=user.id, request=request
    )
    db.commit()
    return {"success": True, "notes": user.adminNotes}


@router.get("/audit-logs")
def get_audit_logs(
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    action: Optional[str] = None,
) -> Any:
    """Read the admin audit trail.

    The admin panel had a screen for this; nothing was writing or serving it.
    """
    query = db.query(models.AdminAuditLog)
    if action:
        query = query.filter(models.AdminAuditLog.action == action)

    total = query.count()
    rows = (
        query.order_by(models.AdminAuditLog.createdAt.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return {
        "total": total,
        "items": [
            {
                "id": r.id,
                "adminId": r.adminId,
                "adminName": r.adminName,
                "action": r.action,
                "targetType": r.targetType,
                "targetId": r.targetId,
                "details": r.details,
                "ipAddress": r.ipAddress,
                "note": r.note,
                "createdAt": r.createdAt.isoformat() if r.createdAt else None,
            }
            for r in rows
        ],
    }
