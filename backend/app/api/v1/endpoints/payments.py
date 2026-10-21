import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api import deps
from app.core.limiter import limiter
from app.core.money import Money
from app.models.audit_ledger import AuditLedger
from app.models.payment_card import PaymentCard
from app.models.transaction import Transaction
from app.models.job import Job
from app.models.user import User
from app.schemas.payment_card import PaymentCardCreate, PaymentCardOut, PaymentCardUpdate
from app.schemas.transaction import TransactionOut

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_CARDS_PER_USER = 5
MIN_WITHDRAWAL_UZS = 5_000
MAX_WITHDRAWAL_UZS = 50_000_000




@router.get("/cards", response_model=List[PaymentCardOut])
def get_payment_cards(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    return db.query(PaymentCard).filter(PaymentCard.userId == current_user.id).all()


@router.post("/cards", response_model=PaymentCardOut)
def add_payment_card(
    card_in: PaymentCardCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    existing = db.query(PaymentCard).filter(PaymentCard.userId == current_user.id).count()
    if existing >= MAX_CARDS_PER_USER:
        raise HTTPException(
            status_code=400,
            detail=f"Ko'pi bilan {MAX_CARDS_PER_USER} ta karta qo'shish mumkin",
        )

    card = PaymentCard(
        userId=current_user.id,
        type=card_in.type,
        last4=card_in.last4,
        bank=card_in.bank,
        # The provider token is never accepted from the browser; it is only
        # ever written by a server-side card-binding callback.
        token=None,
        isActive=card_in.isActive,
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


@router.delete("/cards/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payment_card(
    card_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    card = (
        db.query(PaymentCard)
        .filter(PaymentCard.id == card_id, PaymentCard.userId == current_user.id)
        .first()
    )
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    db.delete(card)
    db.commit()
    return None


@router.put("/cards/{card_id}", response_model=PaymentCardOut)
def update_payment_card(
    card_id: str,
    card_in: PaymentCardUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    card = (
        db.query(PaymentCard)
        .filter(PaymentCard.id == card_id, PaymentCard.userId == current_user.id)
        .first()
    )
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    if card_in.isActive is not None:
        card.isActive = card_in.isActive

    db.commit()
    db.refresh(card)
    return card


@router.get("/transactions", response_model=List[TransactionOut])
def get_transactions(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    skip: int = 0,
    limit: int = 100,
):
    q = db.query(Transaction)

    # Employers should only see admin-confirmed payouts, not every
    # pending or cancelled transaction.  Workers see everything.
    if current_user.role == 'employer':
        q = q.filter(
            Transaction.employerId == current_user.id,
            Transaction.type == 'payout',
            Transaction.status == 'paid',
        )
    elif current_user.role == 'worker':
        q = q.filter(
            Transaction.workerId == current_user.id,
            Transaction.type.in_(['payout', 'withdraw'])
        )

    rows = (
        q.order_by(Transaction.createdAt.desc())
        .offset(max(0, skip))
        .limit(min(max(1, limit), 200))
        .all()
    )

    # amount and platformFee are stored in tiyin (UZS * 100). Returning the ORM
    # rows straight through handed the raw tiyin to the payments screen, which
    # showed a 275,000 so'm payout as "27 500 000".
    job_ids = list({r.jobId for r in rows if r.jobId})
    jobs = {j.id: j.title for j in db.query(Job.id, Job.title).filter(Job.id.in_(job_ids)).all()} if job_ids else {}

    return [
        TransactionOut.model_validate(r).model_copy(
            update={
                "amount": Money.to_uzs(r.amount), 
                "platformFee": Money.to_uzs(r.platformFee or 0),
                "jobTitle": jobs.get(r.jobId) if r.jobId else None
            }
        )
        for r in rows
    ]


class WithdrawRequest(BaseModel):
    amount: int = Field(ge=MIN_WITHDRAWAL_UZS, le=MAX_WITHDRAWAL_UZS)


@router.post("/withdraw")
@limiter.limit("5/hour")
def request_withdrawal(
    request: Request,
    req: WithdrawRequest,
    db: Session = Depends(deps.get_tx_db),
    current_user: User = Depends(deps.get_current_user),
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
):
    """Request a payout.

    A retried request (flaky network, double tap) used to deduct the balance
    twice; ``Idempotency-Key`` now makes the operation replay-safe.
    """
    cached_response = deps.get_idempotent_response(db, idempotency_key, current_user.id)
    if cached_response:
        return cached_response

    if current_user.isBanned:
        raise HTTPException(
            status_code=403, detail="Hisobingiz cheklangan, mablag' yechish mumkin emas"
        )

    user = (db.query(User).filter(User.id == current_user.id)
            .populate_existing()
            .with_for_update().first())
    if not user or (user.balance or 0) < req.amount:
        raise HTTPException(status_code=400, detail="Balansda yetarli mablag' mavjud emas")

    tx = Transaction(
        employerId=user.id,
        amount=Money.to_tiyin(req.amount),
        type="withdraw",
        status="pending",
    )
    db.add(tx)
    db.flush()

    user.balance = (user.balance or 0) - req.amount
    db.add(user)

    db.add(AuditLedger(
        userId=user.id,
        amountDelta=-req.amount,
        balanceAfter=user.balance,
        entryType="payout",
        referenceType="transaction",
        referenceId=tx.id,
        description=f"Kartaga mablag' yechish so'rovi ({req.amount} so'm)",
    ))

    result = {
        "status": "ok",
        "message": "Mablag' yechish so'rovi yuborildi",
        "transaction_id": tx.id,
    }

    deps.save_idempotent_response(db, idempotency_key, user.id, "/payments/withdraw", result)

    return result
