from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models
from app.api import deps
import datetime
router = APIRouter()

get_admin_user = deps.get_current_admin


@router.get("/users")
def get_users(
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
    skip: int = 0,
    limit: int = 200,
) -> Any:
    users = db.query(models.User).offset(skip).limit(limit).all()
    result = []
    for u in users:
        result.append({
            "id": u.id,
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
        })
    return result


@router.patch("/users/{user_id}/ban")
def ban_user(
    user_id: str,
    payload: dict,
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    user.isBanned = payload.get("isBanned", False)
    db.commit()
    return {"success": True, "isBanned": user.isBanned}


@router.patch("/users/{user_id}/role")
@router.post("/users/{user_id}/role")
def change_role(
    user_id: str,
    payload: dict,
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    if "role" in payload:
        user.role = payload["role"]
    if "isVerified" in payload:
        user.isVerified = payload["isVerified"]
        
        # Create notification
        notif = models.Notification(
            userId=user.id,
            title="Verifikatsiya holati",
            message="Sizning shaxsingiz va hujjatlaringiz tasdiqlandi!" if user.isVerified else "Hujjatlaringiz rad etildi, iltimos qaytadan to'g'ri hujjatlarni yuklang.",
            type="system"
        )
        db.add(notif)
        
    if payload.get("clearDocs"):
        user.passportDocFront = None
        user.passportDocBack = None
        user.selfieWithDoc = None
        user.passportSeries = None
        user.passportJshshir = None
    db.commit()
    return {"success": True, "role": user.role, "isVerified": user.isVerified}


@router.post("/users/{user_id}/balance")
def add_balance(
    user_id: str,
    payload: dict,
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    amount = payload.get("amount", 0)
    current = user.balance or 0
    user.balance = current + amount
    db.commit()
    return {"success": True, "balance": user.balance}


@router.get("/users/{user_id}/detail")
def get_user_detail(
    user_id: str,
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")

    # Get sessions
    sessions = db.query(models.session.ActiveSession).filter(models.session.ActiveSession.user_uid == user.uid).all()
    sessions_list = []
    for s in sessions:
        sessions_list.append({
            "ip": s.ip_address,
            "device": s.device_name,
            "location": s.location,
            "date": s.created_at.isoformat() if s.created_at else None
        })

    # Get transactions
    from sqlalchemy import or_
    txs = db.query(models.Transaction).filter(
        or_(models.Transaction.employerId == user.id, models.Transaction.workerId == user.id)
    ).all()
    txs_list = []
    for t in txs:
        txs_list.append({
            "id": t.id,
            "amount": t.amount,
            "type": t.type,
            "status": t.status,
            "createdAt": t.createdAt.isoformat() if t.createdAt else None
        })

    # Get orders and reviews
    orders_list = []
    reviews_list = []

    if user.role == 'worker':
        apps = db.query(models.Application).filter(models.Application.workerId == user.id).all()
        for a in apps:
            job = db.query(models.Job).filter(models.Job.id == a.jobId).first()
            if job:
                orders_list.append({
                    "id": job.id,
                    "title": job.title,
                    "date": a.appliedDate.isoformat() if a.appliedDate else None,
                    "amount": job.salary,
                    "status": a.status,
                    "employerName": job.company or (job.employer.name if job.employer else "Noma'lum")
                })
            if a.rating and a.review:
                reviews_list.append({
                    "rating": a.rating,
                    "review": a.review,
                    "date": a.appliedDate.isoformat() if a.appliedDate else None,
                    "author": (job.company or (job.employer.name if job.employer else "Noma'lum")) if job else "Noma'lum"
                })
    else:
        jobs = db.query(models.Job).filter(models.Job.employerId == user.id).all()
        for j in jobs:
            orders_list.append({
                "id": j.id,
                "title": j.title,
                "date": j.createdAt.isoformat() if j.createdAt else None,
                "amount": j.salary,
                "status": j.status,
                "employerName": "Siz (Ish beruvchi)"
            })
            
            # Reviews given to employer? Usually we don't have this, but if there's any, add here.

    user_data = {
        "id": user.id,
        "name": user.name,
        "phone": user.phone,
        "email": user.email,
        "role": user.role,
        "companyName": user.companyName,
        "avatarUrl": user.avatarUrl,
        "balance": user.balance,
        "isBanned": user.isBanned,
        "isVerified": user.isVerified,
        "createdAt": user.createdAt.isoformat() if user.createdAt else None,
        "region": user.region,
        "category": user.category,
        "bio": user.bio,
        "skills": user.skills,
        "rating": user.rating,
        "completedJobsCount": user.completedJobsCount,
        "passportSeries": user.passportSeries,
        "passportJshshir": user.passportJshshir,
        "passportDocFront": user.passportDocFront,
        "passportDocBack": user.passportDocBack,
        "selfieWithDoc": user.selfieWithDoc,
        "bankCardMask": user.bankCardMask,
        "sourceApp": user.sourceApp,
        "adminNotes": user.adminNotes if hasattr(user, 'adminNotes') and user.adminNotes else [],
    }

    return {
        "user": user_data,
        "sessions": sessions_list,
        "transactions": txs_list,
        "orders": orders_list,
        "reviews": reviews_list
    }


@router.post("/users/{user_id}/notes")
def add_user_note(
    user_id: str,
    payload: dict,
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    
    text = payload.get("text")
    if not text:
        raise HTTPException(status_code=400, detail="Matn kiritilmadi")

    # adminNotes is a JSON column
    current_notes = user.adminNotes if hasattr(user, 'adminNotes') and user.adminNotes else []
    if isinstance(current_notes, list):
        # We need to copy the list to ensure SQLAlchemy detects the change
        new_notes = current_notes.copy()
    else:
        new_notes = []

    new_notes.append({
        "text": text,
        "date": datetime.datetime.now(datetime.timezone.utc).isoformat()
    })

    user.adminNotes = new_notes
    db.commit()
    return {"success": True, "notes": user.adminNotes}
