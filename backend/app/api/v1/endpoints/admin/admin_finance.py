"""Administrator controls for money that is already in flight.

Two operational dead ends lived here before:

* ``POST /payments/withdraw`` debited the worker's balance and created a
  ``pending`` transaction. Nothing in the codebase ever moved that row
  forward — no endpoint, no UI, no task. Every payout request was stuck
  permanently with the money already taken out of the balance.
* ``EscrowService.refund_funds`` existed but had no caller, so when a dispute
  was opened an administrator could change the job's status and nothing else.
  The employer's frozen wage stayed frozen with no way to release or return it.
"""

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app import models
from app.api import deps
from app.models.audit_ledger import AuditLedger
from app.models.transaction import Transaction
from app.models.user import User
from app.services.escrow_service import EscrowService

from .admin_users import get_admin_user
from .audit import record_admin_action

router = APIRouter()


class WithdrawalDecision(BaseModel):
    action: str = Field(pattern="^(approve|reject)$")
    reason: str = Field(min_length=3, max_length=500)
    # Bank reference for an approved payout, so the ledger can be reconciled.
    reference: Optional[str] = Field(default=None, max_length=120)


class EscrowDecision(BaseModel):
    action: str = Field(pattern="^(release|refund)$")
    reason: str = Field(min_length=3, max_length=500)
    # Required for "release": which worker gets paid.
    workerId: Optional[str] = None


@router.get("/withdrawals")
def list_withdrawals(
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
    status: Optional[str] = Query(default="pending"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
) -> Any:
    """Payout requests awaiting a decision."""
    query = db.query(Transaction).filter(Transaction.type == "withdraw")
    if status:
        query = query.filter(Transaction.status == status)

    total = query.count()
    rows = (
        query.order_by(Transaction.createdAt.desc()).offset(skip).limit(limit).all()
    )
    if not rows:
        return {"total": total, "items": []}

    user_map = {
        u.id: u
        for u in db.query(User).filter(User.id.in_({r.employerId for r in rows})).all()
    }

    return {
        "total": total,
        "items": [
            {
                "id": r.id,
                "userId": r.employerId,
                "userName": getattr(user_map.get(r.employerId), "name", ""),
                "userPhone": getattr(user_map.get(r.employerId), "phone", ""),
                "bankCardMask": getattr(user_map.get(r.employerId), "bankCardMask", None),
                "amountUzs": r.amount // 100,
                "status": r.status,
                "reference": r.providerTransactionId,
                "createdAt": r.createdAt.isoformat() if r.createdAt else None,
            }
            for r in rows
        ],
    }


@router.patch("/withdrawals/{tx_id}")
def decide_withdrawal(
    tx_id: str,
    payload: WithdrawalDecision,
    request: Request,
    db: Session = Depends(deps.get_db),
    admin: models.User = Depends(get_admin_user),
) -> Any:
    """Approve or reject a payout request.

    Rejecting returns the money to the worker's balance — without this the
    debit taken at request time was simply lost.
    """
    tx = (
        db.query(Transaction)
        .filter(Transaction.id == tx_id, Transaction.type == "withdraw")
        .populate_existing()
        .with_for_update()
        .first()
    )
    if not tx:
        raise HTTPException(status_code=404, detail="Yechish so'rovi topilmadi")
    if tx.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Bu so'rov allaqachon ko'rib chiqilgan (holat: {tx.status})",
        )

    amount_uzs = tx.amount // 100

    if payload.action == "approve":
        tx.status = "paid"
        tx.providerTransactionId = payload.reference
        # The balance was already debited when the request was made, so
        # approving only records that the transfer happened.
        record_admin_action(
            db, admin, "withdrawal.approve", target_type="transaction", target_id=tx.id,
            details={"amountUzs": amount_uzs, "reference": payload.reference},
            request=request, note=payload.reason,
        )
        db.add(models.Notification(
            userId=tx.employerId,
            title="Mablag' yechildi",
            message=f"{amount_uzs} so'm kartangizga o'tkazildi.",
            type="system",
        ))
    else:
        user = (
            db.query(User).filter(User.id == tx.employerId).populate_existing().with_for_update().first()
        )
        if not user:
            raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")

        user.balance = (user.balance or 0) + amount_uzs
        tx.status = "canceled"

        db.add(AuditLedger(
            userId=user.id,
            amountDelta=amount_uzs,
            balanceAfter=user.balance,
            entryType="refund",
            referenceType="transaction",
            referenceId=tx.id,
            description=f"Yechish so'rovi rad etildi: {payload.reason}",
        ))
        record_admin_action(
            db, admin, "withdrawal.reject", target_type="transaction", target_id=tx.id,
            details={"amountUzs": amount_uzs, "balanceAfter": user.balance},
            request=request, note=payload.reason,
        )
        db.add(models.Notification(
            userId=user.id,
            title="Yechish so'rovi rad etildi",
            message=f"{amount_uzs} so'm balansingizga qaytarildi. Sabab: {payload.reason}",
            type="system",
        ))

    db.commit()
    return {"success": True, "status": tx.status, "amountUzs": amount_uzs}


@router.get("/escrow")
def list_escrow_holds(
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
) -> Any:
    """Wages currently frozen against a job."""
    query = (
        db.query(Transaction)
        .filter(Transaction.type == "escrow_hold", Transaction.status == "held")
    )
    total = query.count()
    rows = (
        query.order_by(Transaction.createdAt.desc()).offset(skip).limit(limit).all()
    )
    if not rows:
        return {"total": total, "items": []}

    job_map = {
        j.id: j
        for j in db.query(models.Job).filter(models.Job.id.in_({r.jobId for r in rows})).all()
    }
    user_map = {
        u.id: u
        for u in db.query(User).filter(User.id.in_({r.employerId for r in rows})).all()
    }

    return {
        "total": total,
        "items": [
            {
                "id": r.id,
                "jobId": r.jobId,
                "jobTitle": getattr(job_map.get(r.jobId), "title", ""),
                "jobStatus": getattr(job_map.get(r.jobId), "status", ""),
                "employerId": r.employerId,
                "employerName": getattr(user_map.get(r.employerId), "name", ""),
                "amountUzs": r.amount // 100,
                "createdAt": r.createdAt.isoformat() if r.createdAt else None,
            }
            for r in rows
        ],
    }


@router.post("/jobs/{job_id}/escrow")
def decide_escrow(
    job_id: str,
    payload: EscrowDecision,
    request: Request,
    db: Session = Depends(deps.get_db),
    admin: models.User = Depends(get_admin_user),
) -> Any:
    """Settle a frozen wage — pay it out, or return it to the employer.

    This is what makes dispute resolution actually resolve anything.
    """
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Ish e'loni topilmadi")

    if payload.action == "release":
        if not payload.workerId:
            raise HTTPException(status_code=400, detail="Ishchi ko'rsatilmagan")
        worker = db.query(User).filter(User.id == payload.workerId).first()
        if not worker:
            raise HTTPException(status_code=404, detail="Ishchi topilmadi")

        # The admin types this ID by hand (see AdminPayouts.tsx). Nothing here
        # checked it was the worker this job's escrow was ever held for —
        # `release_funds` looks the hold up by job_id alone and pays out to
        # whatever id it is given. A typo, a stale id copied from another tab,
        # or a compromised admin session could move real money to an unrelated
        # account, and the API would report success either way.
        was_hired = (
            db.query(models.Application)
            .filter(
                models.Application.jobId == job.id,
                models.Application.workerId == payload.workerId,
                models.Application.status == "hired",
            )
            .first()
        )
        if not was_hired:
            raise HTTPException(
                status_code=400,
                detail="Bu ishchi ushbu ish uchun yollanmagan — to'lov chiqarib bo'lmaydi",
            )

        tx = EscrowService.release_funds(db, job_id=job.id, worker_id=payload.workerId)
        refund_total = 0
        db.add(models.Notification(
            userId=payload.workerId,
            title="To'lov chiqarildi",
            message=f"'{job.title}' ishi bo'yicha to'lov administrator tomonidan chiqarildi.",
            type="system", relatedJobId=job.id,
        ))
    else:
        refunded = EscrowService.refund_funds(db, job_id=job.id)
        # Every outstanding day, not just one of them.
        tx = refunded[-1]
        refund_total = sum(t.amount // 100 for t in refunded)
        db.add(models.Notification(
            userId=job.employerId,
            title="Mablag' qaytarildi",
            message=f"'{job.title}' ishi bo'yicha muzlatilgan mablag' hisobingizga qaytarildi.",
            type="system", relatedJobId=job.id,
        ))

    amount_uzs = refund_total if payload.action != "release" else tx.amount // 100
    record_admin_action(
        db, admin, f"escrow.{payload.action}", target_type="job", target_id=job.id,
        details={"transactionId": tx.id, "amountUzs": amount_uzs,
                 "workerId": payload.workerId},
        request=request, note=payload.reason,
    )
    db.commit()
    return {"success": True, "action": payload.action, "amountUzs": amount_uzs}
