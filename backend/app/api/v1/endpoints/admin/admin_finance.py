"""Administrator controls for money that is already in flight.

One operational dead end lived here before:

* ``POST /payments/withdraw`` debited the worker's balance and created a
  ``pending`` transaction. Nothing in the codebase ever moved that row
  forward — no endpoint, no UI, no task. Every payout request was stuck
  permanently with the money already taken out of the balance.
"""

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app import models
from app.api import deps
from app.models.audit_ledger import AuditLedger
from app.models.transaction import Transaction
from app.models.user import User

from .admin_users import get_admin_user
from .audit import record_admin_action

router = APIRouter()

# The states a worker reaches by being hired. Same list as jobs.HIRED_STATUSES.
HIRED_STATUSES = ["hired", "confirmed", "completed", "in_progress", "start_requested"]


class WithdrawalDecision(BaseModel):
    action: str = Field(pattern="^(approve|reject)$")
    reason: str = Field(min_length=3, max_length=500)
    # Bank reference for an approved payout, so the ledger can be reconciled.
    reference: Optional[str] = Field(default=None, max_length=120)


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

    user_ids = {r.workerId or r.employerId for r in rows if (r.workerId or r.employerId)}
    user_objs = (
        db.query(User)
        .filter(or_(User.id.in_(user_ids), User.uid.in_(user_ids)))
        .all()
    ) if user_ids else []
    user_map = {}
    for u in user_objs:
        user_map[u.id] = u
        if u.uid:
            user_map[u.uid] = u

    return {
        "total": total,
        "items": [
            {
                "id": r.id,
                "userId": r.workerId or r.employerId,
                "userName": getattr(user_map.get(r.workerId or r.employerId), "name", ""),
                "userPhone": getattr(user_map.get(r.workerId or r.employerId), "phone", ""),
                "bankCardMask": getattr(user_map.get(r.workerId or r.employerId), "bankCardMask", None),
                "amountUzs": (r.amount or 0) // 100,
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

    target_user_id = tx.workerId or tx.employerId
    if not target_user_id:
        raise HTTPException(status_code=400, detail="Tranzaksiya egasi topilmadi")

    amount_uzs = (tx.amount or 0) // 100

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
            userId=target_user_id,
            title="Mablag' yechildi",
            message=f"{amount_uzs} so'm kartangizga o'tkazildi.",
            type="system",
        ))
    else:
        user = (
            db.query(User).filter(or_(User.id == target_user_id, User.uid == target_user_id)).populate_existing().with_for_update().first()
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
