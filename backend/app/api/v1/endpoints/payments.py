import time
import uuid
import hmac
import hashlib
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.api import deps
from app.core.config import settings
from app.models.transaction import Transaction
from app.models.user import User
from pydantic import BaseModel

router = APIRouter()

class GeneratePaymentLinkRequest(BaseModel):
    amount: int # Amount in UZS

class GeneratePaymentLinkResponse(BaseModel):
    url: str
    transaction_id: str

@router.post("/generate-link", response_model=GeneratePaymentLinkResponse)
def generate_payment_link(
    req: GeneratePaymentLinkRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    if req.amount < 1000:
        raise HTTPException(status_code=400, detail="Minimum amount is 1000 UZS")

    # Create pending transaction for deposit
    tx = Transaction(
        employerId=current_user.id,
        amount=req.amount * 100, # Assuming bank also works in tiyin, change to req.amount if UZS
        type="deposit",
        status="pending"
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)

    # --- Uzum E-Commerce Integration Logic ---
    # In a real integration, you would make a Server-to-Server API call to Uzum here:
    # response = requests.post(settings.UZUM_API_URL + "/create-payment", json={
    #     "terminal_id": settings.UZUM_TERMINAL_ID,
    #     "amount": req.amount * 100,
    #     "order_id": tx.id,
    #     "return_url": "https://baito.uz/payments/success"
    # }, headers={"Authorization": "Bearer " + settings.UZUM_SECRET_KEY})
    # uzum_url = response.json().get("payment_url")
    
    # DUMMY UZUM URL FOR NOW
    token = str(uuid.uuid4())
    bank_url = f"https://pay.uzum.uz/checkout?token={token}&order_id={tx.id}&amount={req.amount}"
    
    return GeneratePaymentLinkResponse(url=bank_url, transaction_id=tx.id)


class UzumWebhookPayload(BaseModel):
    order_id: str
    uzum_transaction_id: str
    amount: int
    status: str # e.g., 'SUCCESS', 'FAILED'
    sign: str # HMAC signature for security

@router.post("/webhook/uzum")
def uzum_webhook(payload: UzumWebhookPayload, db: Session = Depends(deps.get_db)):
    """
    Uzum Callback Webhook.
    Uzum calls this URL when the user successfully pays on their checkout page.
    """
    
    # 1. Verify signature (Security Check)
    # This prevents malicious users from calling this endpoint manually.
    if settings.UZUM_SECRET_KEY:
        data_string = f"{payload.order_id}{payload.amount}{payload.status}{settings.UZUM_SECRET_KEY}"
        expected_sign = hmac.new(
            settings.UZUM_SECRET_KEY.encode('utf-8'),
            data_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        # Fallback to md5 comparison if legacy signature matches, but enforce hmac compare
        legacy_sign = hashlib.md5(data_string.encode('utf-8')).hexdigest()
        if not (hmac.compare_digest(payload.sign or "", expected_sign) or hmac.compare_digest(payload.sign or "", legacy_sign)):
            raise HTTPException(status_code=403, detail="Invalid signature")

    # 2. Find transaction with lock
    tx = db.query(Transaction).filter(Transaction.id == payload.order_id).with_for_update().first()
    if not tx:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if tx.status == "paid":
        return {"status": "ok", "message": "Already paid"}
        
    if payload.status == "SUCCESS":
        # 3. Mark as paid
        tx.status = "paid"
        tx.providerTransactionId = payload.uzum_transaction_id
        tx.performTime = int(time.time() * 1000)
        
        # 4. Increase user balance atomically with lock and record ledger entry
        user = db.query(User).filter(User.id == tx.employerId).with_for_update().first()
        if user:
            amount_uzs = tx.amount // 100
            user.balance = (user.balance or 0) + amount_uzs
            db.add(user)
            
            # Record audit ledger entry
            from app.models.audit_ledger import AuditLedger
            ledger = AuditLedger(
                userId=user.id,
                amountDelta=amount_uzs,
                balanceAfter=user.balance,
                entryType="deposit",
                referenceType="transaction",
                referenceId=tx.id,
                description=f"Uzum orqali hisob to'ldirildi ({amount_uzs} so'm)"
            )
            db.add(ledger)
            
        db.commit()
        return {"status": "ok", "message": "Payment processed successfully"}
        
    elif payload.status == "FAILED":
        tx.status = "canceled"
        tx.cancelTime = int(time.time() * 1000)
        db.commit()
        return {"status": "ok", "message": "Payment canceled"}
        
    raise HTTPException(status_code=400, detail="Unknown status")

from typing import List
from app.models.payment_card import PaymentCard
from app.schemas.payment_card import PaymentCardCreate, PaymentCardInDB
from app.schemas.transaction import TransactionOut

@router.get("/cards", response_model=List[PaymentCardInDB])
def get_payment_cards(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    cards = db.query(PaymentCard).filter(PaymentCard.userId == current_user.id).all()
    return cards

@router.post("/cards", response_model=PaymentCardInDB)
def add_payment_card(
    card_in: PaymentCardCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    card = PaymentCard(
        userId=current_user.id,
        type=card_in.type,
        last4=card_in.last4,
        bank=card_in.bank,
        token=card_in.token,
        isActive=card_in.isActive
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return card

@router.delete("/cards/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payment_card(
    card_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    card = db.query(PaymentCard).filter(PaymentCard.id == card_id, PaymentCard.userId == current_user.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    db.delete(card)
    db.commit()
    return None

@router.put("/cards/{card_id}", response_model=PaymentCardInDB)
def update_payment_card(
    card_id: str,
    card_in: dict,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    card = db.query(PaymentCard).filter(PaymentCard.id == card_id, PaymentCard.userId == current_user.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    if "isActive" in card_in:
        card.isActive = card_in["isActive"]
    
    db.commit()
    db.refresh(card)
    return card

@router.get("/transactions", response_model=List[TransactionOut])
def get_transactions(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    transactions = db.query(Transaction).filter(
        (Transaction.employerId == current_user.id) | (Transaction.workerId == current_user.id)
    ).order_by(Transaction.createdAt.desc()).all()
    return transactions

class WithdrawRequest(BaseModel):
    amount: int

@router.post("/withdraw")
def request_withdrawal(
    req: WithdrawRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    if req.amount < 5000:
        raise HTTPException(status_code=400, detail="Eng kam yechib olish miqdori 5000 so'm")
    if req.amount > 50_000_000:
        raise HTTPException(status_code=400, detail="Bir martalik yechib olish cheklovi 50,000,000 so'm")
    
    # Lock the user row to prevent race conditions / double spending
    user = db.query(User).filter(User.id == current_user.id).with_for_update().first()
    if not user or (user.balance or 0) < req.amount:
        raise HTTPException(status_code=400, detail="Balansda yetarli mablag' mavjud emas")
    if user.isBanned:
        raise HTTPException(status_code=403, detail="Hisobingiz cheklangan, mablag' yechish mumkin emas")
    
    try:
        # Create transaction
        tx = Transaction(
            employerId=user.id,
            amount=req.amount * 100, # converting UZS to tiyin
            type="withdraw",
            status="pending"
        )
        db.add(tx)
        
        # Deduct balance atomically
        user.balance = (user.balance or 0) - req.amount
        db.add(user)
        
        # Log to AuditLedger
        from app.models.audit_ledger import AuditLedger
        ledger = AuditLedger(
            userId=user.id,
            amountDelta=-req.amount,
            balanceAfter=user.balance,
            entryType="payout",
            referenceType="transaction",
            referenceId=tx.id,
            description=f"Kartaga mablag' yechish so'rovi ({req.amount} so'm)"
        )
        db.add(ledger)
        
        db.commit()
        db.refresh(tx)
        return {"status": "ok", "message": "Mablag' yechish so'rovi yuborildi", "transaction_id": tx.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Tranzaksiyani amalga oshirishda xatolik: {str(e)}")
