import hashlib
import hmac
import logging
import re
import time
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.api import deps
from app.core.config import settings
from app.core.limiter import limiter
from app.models.audit_ledger import AuditLedger
from app.models.payment_card import PaymentCard
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.payment_card import PaymentCardCreate, PaymentCardOut, PaymentCardUpdate
from app.schemas.transaction import TransactionOut

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_CARDS_PER_USER = 5
MIN_WITHDRAWAL_UZS = 5_000
MAX_WITHDRAWAL_UZS = 50_000_000


class GeneratePaymentLinkRequest(BaseModel):
    amount: int = Field(ge=1000, le=100_000_000)


class GeneratePaymentLinkResponse(BaseModel):
    url: str
    transaction_id: str


@router.post("/generate-link", response_model=GeneratePaymentLinkResponse)
@limiter.limit("10/minute")
def generate_payment_link(
    request: Request,
    req: GeneratePaymentLinkRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Start a top-up with the payment provider.

    This used to fabricate a ``pay.uzum.uz`` URL from a random UUID and return
    it as if a payment had been initiated — the checkout page never existed, so
    every top-up silently went nowhere. With no provider credentials configured
    the endpoint now fails loudly instead.
    """
    if not settings.uzum_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="To'lov tizimi hozircha ulanmagan. Iltimos, keyinroq urinib ko'ring.",
        )

    tx = Transaction(
        employerId=current_user.id,
        amount=req.amount * 100,  # store in tiyin
        type="deposit",
        status="pending",
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)

    try:
        import httpx

        with httpx.Client(timeout=15.0) as client:
            provider_response = client.post(
                f"{settings.UZUM_API_URL.rstrip('/')}/create-payment",
                json={
                    "terminal_id": settings.UZUM_TERMINAL_ID,
                    "amount": tx.amount,
                    "order_id": tx.id,
                },
                headers={"Authorization": f"Bearer {settings.UZUM_SECRET_KEY}"},
            )
            provider_response.raise_for_status()
            payment_url = provider_response.json().get("payment_url")
    except Exception as e:
        logger.error("Uzum create-payment failed for tx %s: %s", tx.id, e)
        tx.status = "canceled"
        db.commit()
        raise HTTPException(status_code=502, detail="To'lov tizimiga ulanib bo'lmadi")

    if not payment_url:
        tx.status = "canceled"
        db.commit()
        raise HTTPException(status_code=502, detail="To'lov tizimi havola qaytarmadi")

    return GeneratePaymentLinkResponse(url=payment_url, transaction_id=tx.id)


class UzumWebhookPayload(BaseModel):
    order_id: str
    uzum_transaction_id: str
    amount: int
    status: str  # 'SUCCESS' | 'FAILED'
    sign: str


@router.post("/webhook/uzum")
def uzum_webhook(payload: UzumWebhookPayload, db: Session = Depends(deps.get_db)):
    """Uzum payment callback.

    Three things were wrong here: the signature check was skipped entirely when
    ``UZUM_SECRET_KEY`` was unset (and its default lived in the repo), an MD5
    "legacy" signature was accepted alongside the HMAC, and the reported amount
    was never compared against the order. All three let a caller credit any
    balance at will.
    """
    if not settings.UZUM_SECRET_KEY:
        logger.error("Uzum webhook received but UZUM_SECRET_KEY is not configured; rejecting.")
        raise HTTPException(status_code=503, detail="Payment provider not configured")

    data_string = f"{payload.order_id}{payload.amount}{payload.status}"
    expected_sign = hmac.new(
        settings.UZUM_SECRET_KEY.encode("utf-8"),
        data_string.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(payload.sign or "", expected_sign):
        logger.warning("Uzum webhook signature mismatch for order %s", payload.order_id)
        raise HTTPException(status_code=403, detail="Invalid signature")

    tx = (
        db.query(Transaction)
        .filter(Transaction.id == payload.order_id)
        .populate_existing()
        .with_for_update()
        .first()
    )
    if not tx:
        raise HTTPException(status_code=404, detail="Order not found")

    if tx.status == "paid":
        return {"status": "ok", "message": "Already paid"}

    # The provider must be talking about the amount we actually recorded.
    if payload.amount != tx.amount:
        logger.error(
            "Uzum webhook amount mismatch for %s: reported %s, expected %s",
            tx.id, payload.amount, tx.amount,
        )
        raise HTTPException(status_code=400, detail="Amount mismatch")

    if payload.status == "SUCCESS":
        tx.status = "paid"
        tx.providerTransactionId = payload.uzum_transaction_id
        tx.performTime = int(time.time() * 1000)

        user = db.query(User).filter(User.id == tx.employerId).populate_existing().with_for_update().first()
        if user:
            amount_uzs = tx.amount // 100
            user.balance = (user.balance or 0) + amount_uzs
            db.add(user)
            db.add(AuditLedger(
                userId=user.id,
                amountDelta=amount_uzs,
                balanceAfter=user.balance,
                entryType="deposit",
                referenceType="transaction",
                referenceId=tx.id,
                description=f"Uzum orqali hisob to'ldirildi ({amount_uzs} so'm)",
            ))

        db.commit()
        return {"status": "ok", "message": "Payment processed successfully"}

    if payload.status == "FAILED":
        tx.status = "canceled"
        tx.cancelTime = int(time.time() * 1000)
        db.commit()
        return {"status": "ok", "message": "Payment canceled"}

    raise HTTPException(status_code=400, detail="Unknown status")


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
    return (
        db.query(Transaction)
        .filter(
            (Transaction.employerId == current_user.id)
            | (Transaction.workerId == current_user.id)
        )
        .order_by(Transaction.createdAt.desc())
        .offset(max(0, skip))
        .limit(min(max(1, limit), 200))
        .all()
    )


class WithdrawRequest(BaseModel):
    amount: int = Field(ge=MIN_WITHDRAWAL_UZS, le=MAX_WITHDRAWAL_UZS)


@router.post("/withdraw")
@limiter.limit("5/hour")
def request_withdrawal(
    request: Request,
    req: WithdrawRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
):
    """Request a payout.

    A retried request (flaky network, double tap) used to deduct the balance
    twice; ``Idempotency-Key`` now makes the operation replay-safe.
    """
    from app.models.idempotency import IdempotencyKey

    if idempotency_key:
        prior = (
            db.query(IdempotencyKey)
            .filter(IdempotencyKey.id == idempotency_key)
            .first()
        )
        if prior:
            if prior.userId != current_user.id:
                raise HTTPException(status_code=409, detail="Idempotency key already used")
            import json
            return json.loads(prior.responseBody)

    if current_user.isBanned:
        raise HTTPException(
            status_code=403, detail="Hisobingiz cheklangan, mablag' yechish mumkin emas"
        )

    user = (db.query(User).filter(User.id == current_user.id)
            .populate_existing()
            .with_for_update().first())
    if not user or (user.balance or 0) < req.amount:
        raise HTTPException(status_code=400, detail="Balansda yetarli mablag' mavjud emas")

    try:
        tx = Transaction(
            employerId=user.id,
            amount=req.amount * 100,  # UZS -> tiyin
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

        if idempotency_key:
            import json
            db.add(IdempotencyKey(
                id=idempotency_key,
                userId=user.id,
                requestPath="/payments/withdraw",
                responseCode=200,
                responseBody=json.dumps(result),
            ))

        db.commit()
        return result
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error("Withdrawal failed for user %s: %s", current_user.id, e)
        raise HTTPException(status_code=500, detail="Tranzaksiyani amalga oshirishda xatolik")
