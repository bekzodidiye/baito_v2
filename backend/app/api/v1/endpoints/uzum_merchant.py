"""Uzum Bank Merchant API — the webhooks Uzum calls on us.

This is not the integration in ``payments.py``. There, we send a customer to
Uzum's checkout page and Uzum calls back once. Here the direction is reversed:
the customer opens the Uzum app, types an order number, and the bank drives a
two-phase payment against this service — /check, then /create, then /confirm,
with /reverse and /status as the ways out when something goes wrong.

Written against https://developer.uzumbank.uz/merchant. Two things from that
spec shape everything below:

* **Amounts are in tiyin.** So are ours, so the comparison in /create is a
  plain equality and needs no conversion.
* **Errors are HTTP 400 with a string ``errorCode``**, not a 4xx family. A 403
  or a 404 is, to Uzum, a failed webhook rather than a business answer.
"""

import logging
import secrets
import time
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app import models
from app.api import deps
from app.core.config import settings
from app.core.limiter import limiter
from app.models.audit_ledger import AuditLedger
from app.models.transaction import Transaction
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()
basic = HTTPBasic(auto_error=False)

# The webhooks authenticate with a 192-bit random password, so brute-force is
# already infeasible — these limits are a flood stop, not the primary control.
# They are set well above any realistic Uzum volume (a payment is at most a
# handful of calls) precisely because the caller is a single party sharing one
# IP bucket: throttling real Uzum traffic would be a worse failure than the
# thing being guarded against. The stronger control is an nginx IP allowlist of
# Uzum's ranges, which needs those ranges from onboarding. /orders is different
# — it is called by our own authenticated employers, so it gets a tight limit.
WEBHOOK_RATE = "300/minute"
ORDER_RATE = "10/minute"
ORDER_RATE_HOURLY = "60/hour"

# Uzum's codes. Named so the call sites read as the spec does.
ERR_UNAUTHORIZED = "10001"
ERR_MISSING_PARAMS = "10005"
ERR_BAD_SERVICE_ID = "10006"
ERR_ORDER_NOT_FOUND = "10007"
ERR_ALREADY_PAID = "10008"
ERR_ORDER_CANCELLED = "10009"
ERR_TRANS_EXISTS = "10010"
ERR_BAD_AMOUNT = "10011"
ERR_TRANS_NOT_FOUND = "10014"
ERR_TRANS_REVERSED = "10015"
ERR_TRANS_CONFIRMED = "10016"
ERR_CANNOT_REVERSE = "10017"
ERR_ALREADY_REVERSED = "10018"

_MESSAGES = {
    ERR_UNAUTHORIZED: "Access denied",
    ERR_MISSING_PARAMS: "Required parameters are missing",
    ERR_BAD_SERVICE_ID: "Unknown serviceId",
    ERR_ORDER_NOT_FOUND: "Order not found",
    ERR_ALREADY_PAID: "Order is already paid",
    ERR_ORDER_CANCELLED: "Order is cancelled",
    ERR_TRANS_EXISTS: "Transaction already created",
    ERR_BAD_AMOUNT: "Incorrect amount",
    ERR_TRANS_NOT_FOUND: "Transaction not found",
    ERR_TRANS_REVERSED: "Transaction is reversed",
    ERR_TRANS_CONFIRMED: "Transaction is already confirmed",
    ERR_CANNOT_REVERSE: "Transaction cannot be reversed",
    ERR_ALREADY_REVERSED: "Transaction is already reversed",
}


def _now_ms() -> int:
    return int(time.time() * 1000)


def _error(code: str) -> JSONResponse:
    """The spec's error shape: HTTP 400, and errorCode as a string.

    Deliberately not an HTTPException — a 401 or 404 would be read by Uzum as
    the webhook itself failing, and it would retry rather than tell the
    customer why the payment cannot go through.
    """
    return JSONResponse(
        status_code=400,
        content={"errorCode": code, "errorMessage": _MESSAGES.get(code, "Error")},
    )


def require_uzum(credentials: Optional[HTTPBasicCredentials] = Depends(basic)) -> bool:
    """Basic auth, compared in constant time.

    Returns a bool rather than raising, because the failure has to be rendered
    as 10001 in the body and FastAPI's own 401 would not carry that.
    """
    if not settings.uzum_merchant_configured or credentials is None:
        return False
    user_ok = secrets.compare_digest(credentials.username, settings.UZUM_MERCHANT_USERNAME)
    pass_ok = secrets.compare_digest(credentials.password, settings.UZUM_MERCHANT_PASSWORD)
    return user_ok and pass_ok


class CheckRequest(BaseModel):
    serviceId: int
    timestamp: int
    params: Dict[str, Any] = Field(default_factory=dict)


class CreateRequest(CheckRequest):
    transId: str
    amount: int


class TransRequest(BaseModel):
    serviceId: int
    timestamp: int
    transId: str


class ConfirmRequest(TransRequest):
    paymentSource: Optional[str] = None
    tariff: Optional[str] = None
    processingReferenceNumber: Optional[str] = None
    phone: Optional[str] = None
    cardType: Optional[int] = None


def _find_order(db: Session, params: Dict[str, Any]) -> Optional[models.PaymentOrder]:
    """Locate the order from whatever key the app collected.

    ``order_id`` is what our service is registered with, but the spec calls
    this bag "additional attributes" and lists account and phone alongside it,
    so accept the obvious aliases rather than 10007-ing a payment over the name
    of a field.
    """
    number = None
    for key in ("order_id", "orderId", "account", "order"):
        value = params.get(key)
        if value not in (None, ""):
            number = str(value).strip()
            break
    if not number:
        return None
    return (
        db.query(models.PaymentOrder)
        .filter(models.PaymentOrder.orderNumber == number)
        .first()
    )


def _order_data(order: models.PaymentOrder, db: Session) -> Dict[str, Any]:
    """What the Uzum app shows the customer before they pay.

    Kept to what a person needs to recognise the payment as theirs. No phone
    number, no name: this is rendered in a third party's app and the customer
    already knows who they are.
    """
    data: Dict[str, Any] = {
        "order_id": order.orderNumber,
        "amount": order.amount,
    }
    if order.purpose == "job" and order.jobId:
        job = db.query(models.Job).filter(models.Job.id == order.jobId).first()
        if job:
            data["title"] = job.title
    else:
        data["title"] = "Baito hisobini to'ldirish"
    return data


@router.post("/check")
@limiter.limit(WEBHOOK_RATE)
def check(
    request: Request,
    payload: CheckRequest,
    db: Session = Depends(deps.get_db),
    authorized: bool = Depends(require_uzum),
):
    """Can this order be paid?"""
    if not authorized:
        return _error(ERR_UNAUTHORIZED)
    if payload.serviceId != settings.UZUM_MERCHANT_SERVICE_ID:
        return _error(ERR_BAD_SERVICE_ID)

    order = _find_order(db, payload.params)
    if order is None:
        return _error(ERR_ORDER_NOT_FOUND)
    if order.status == "paid":
        return _error(ERR_ALREADY_PAID)
    if order.status == "cancelled":
        return _error(ERR_ORDER_CANCELLED)

    return {
        "serviceId": payload.serviceId,
        "timestamp": _now_ms(),
        "status": "OK",
        "data": _order_data(order, db),
    }


@router.post("/create")
@limiter.limit(WEBHOOK_RATE)
def create(
    request: Request,
    payload: CreateRequest,
    db: Session = Depends(deps.get_db),
    authorized: bool = Depends(require_uzum),
):
    """Hold the payment. No money moves here — that is /confirm."""
    if not authorized:
        return _error(ERR_UNAUTHORIZED)
    if payload.serviceId != settings.UZUM_MERCHANT_SERVICE_ID:
        return _error(ERR_BAD_SERVICE_ID)
    if not payload.transId:
        return _error(ERR_MISSING_PARAMS)

    # transId is the primary key, so this is also the race guard: a second
    # /create with the same id cannot get past the lookup.
    existing = (
        db.query(models.UzumTransaction)
        .filter(models.UzumTransaction.transId == payload.transId)
        .first()
    )
    if existing is not None:
        return _error(ERR_TRANS_EXISTS)

    order = _find_order(db, payload.params)
    if order is None:
        return _error(ERR_ORDER_NOT_FOUND)
    if order.status == "paid":
        return _error(ERR_ALREADY_PAID)
    if order.status == "cancelled":
        return _error(ERR_ORDER_CANCELLED)

    # Both sides are tiyin, so this is the whole of the amount check. It is
    # also the one that stops a payment for the wrong sum being accepted, which
    # is the failure this project has already had once in another form.
    if payload.amount != order.amount:
        logger.warning(
            "Uzum /create amount mismatch on order %s: sent %s, expected %s",
            order.orderNumber, payload.amount, order.amount,
        )
        return _error(ERR_BAD_AMOUNT)

    trans = models.UzumTransaction(
        transId=payload.transId,
        orderId=order.id,
        amount=payload.amount,
        status="CREATED",
        transTime=_now_ms(),
    )
    db.add(trans)
    db.commit()
    db.refresh(trans)

    return {
        "serviceId": payload.serviceId,
        "transId": trans.transId,
        "status": "CREATED",
        "transTime": trans.transTime,
        "data": _order_data(order, db),
        "amount": trans.amount,
    }


def _locked_transaction(db: Session, trans_id: str) -> Optional[models.UzumTransaction]:
    """Take the row lock before deciding anything about money.

    Uzum retries /confirm up to ten times when it does not hear back. Without
    the lock, two of those arriving together would each read CREATED and each
    credit the balance.
    """
    return (
        db.query(models.UzumTransaction)
        .filter(models.UzumTransaction.transId == trans_id)
        .populate_existing()
        .with_for_update()
        .first()
    )


def _credit(db: Session, order: models.PaymentOrder, trans: models.UzumTransaction) -> None:
    """Put the money on the payer's balance, and leave a trail for both sides."""
    user = (
        db.query(User)
        .filter(User.id == order.userId)
        .populate_existing()
        .with_for_update()
        .first()
    )
    if user is None:
        # The order cannot exist without its user, so this is corruption rather
        # than a case. Say so loudly instead of silently skipping the credit.
        logger.error("Uzum /confirm: order %s has no user %s", order.orderNumber, order.userId)
        return

    amount_uzs = trans.amount // 100

    tx = Transaction(
        employerId=user.id,
        jobId=order.jobId,
        amount=trans.amount,
        type="deposit",
        status="paid",
        providerTransactionId=trans.transId,
        performTime=trans.confirmTime,
    )
    db.add(tx)
    db.flush()

    user.balance = (user.balance or 0) + amount_uzs
    db.add(user)
    db.add(AuditLedger(
        userId=user.id,
        amountDelta=amount_uzs,
        balanceAfter=user.balance,
        entryType="deposit",
        referenceType="transaction",
        referenceId=tx.id,
        description=f"Uzum ilovasi orqali to'ldirildi ({amount_uzs} so'm, buyurtma {order.orderNumber})",
    ))


@router.post("/confirm")
@limiter.limit(WEBHOOK_RATE)
def confirm(
    request: Request,
    payload: ConfirmRequest,
    db: Session = Depends(deps.get_db),
    authorized: bool = Depends(require_uzum),
):
    """The money has left the customer. Deliver the service."""
    if not authorized:
        return _error(ERR_UNAUTHORIZED)

    trans = _locked_transaction(db, payload.transId)
    if trans is None:
        return _error(ERR_TRANS_NOT_FOUND)
    if trans.status == "CONFIRMED":
        return _error(ERR_TRANS_CONFIRMED)
    if trans.status in ("REVERSED", "FAILED"):
        # FAILED is the 30-minute expiry. To Uzum it is the same answer: this
        # transaction is no longer one that can be confirmed.
        return _error(ERR_TRANS_REVERSED)

    order = db.query(models.PaymentOrder).filter(models.PaymentOrder.id == trans.orderId).first()
    if order is None:
        logger.error("Uzum /confirm: transaction %s points at a missing order", trans.transId)
        return _error(ERR_TRANS_NOT_FOUND)

    trans.status = "CONFIRMED"
    trans.confirmTime = _now_ms()
    trans.paymentSource = payload.paymentSource
    trans.processingReferenceNumber = payload.processingReferenceNumber
    trans.phone = payload.phone
    trans.cardType = payload.cardType

    order.status = "paid"
    _credit(db, order, trans)
    db.commit()

    return {
        "serviceId": payload.serviceId,
        "transId": trans.transId,
        "status": "CONFIRMED",
        "confirmTime": trans.confirmTime,
        "data": _order_data(order, db),
        "amount": trans.amount,
    }


@router.post("/reverse")
@limiter.limit(WEBHOOK_RATE)
def reverse(
    request: Request,
    payload: TransRequest,
    db: Session = Depends(deps.get_db),
    authorized: bool = Depends(require_uzum),
):
    """Undo the payment.

    Two different situations wear the same name. Before /confirm nothing has
    moved, so this only closes the transaction. After /confirm the bank has
    already returned the money to the customer, so we have to take it back off
    the balance — and that is the case worth being careful about.
    """
    if not authorized:
        return _error(ERR_UNAUTHORIZED)

    trans = _locked_transaction(db, payload.transId)
    if trans is None:
        return _error(ERR_TRANS_NOT_FOUND)
    if trans.status == "REVERSED":
        return _error(ERR_ALREADY_REVERSED)

    order = db.query(models.PaymentOrder).filter(models.PaymentOrder.id == trans.orderId).first()
    if order is None:
        logger.error("Uzum /reverse: transaction %s points at a missing order", trans.transId)
        return _error(ERR_CANNOT_REVERSE)

    if trans.status == "CONFIRMED":
        user = (
            db.query(User)
            .filter(User.id == order.userId)
            .populate_existing()
            .with_for_update()
            .first()
        )
        if user is not None:
            amount_uzs = trans.amount // 100
            # The bank has already refunded the customer. Refusing here would
            # leave our books and theirs disagreeing, so the debit goes through
            # even when the balance has since been spent — and a negative
            # balance is recorded rather than hidden, because somebody has to
            # decide what to do about it.
            user.balance = (user.balance or 0) - amount_uzs
            db.add(user)
            db.add(AuditLedger(
                userId=user.id,
                amountDelta=-amount_uzs,
                balanceAfter=user.balance,
                entryType="refund",
                referenceType="uzum_transaction",
                referenceId=trans.transId,
                description=f"Uzum to'lovi qaytarildi ({amount_uzs} so'm, buyurtma {order.orderNumber})",
            ))
            if user.balance < 0:
                logger.error(
                    "Uzum /reverse left user %s at %s so'm — the money was already spent",
                    user.id, user.balance,
                )

        # The order becomes payable again, which is what the customer would
        # expect if they reversed by mistake.
        order.status = "new"

    elif trans.status == "CREATED":
        order.status = "new"

    trans.status = "REVERSED"
    trans.reverseTime = _now_ms()
    db.commit()

    return {
        "serviceId": payload.serviceId,
        "transId": trans.transId,
        "status": "REVERSED",
        "reverseTime": trans.reverseTime,
        "data": _order_data(order, db),
        "amount": trans.amount,
    }


@router.post("/status")
@limiter.limit(WEBHOOK_RATE)
def status_(
    request: Request,
    payload: TransRequest,
    db: Session = Depends(deps.get_db),
    authorized: bool = Depends(require_uzum),
):
    """What happened to this transaction?

    Called when /confirm timed out or errored, up to ten times, until we answer
    CONFIRMED or FAILED. So this must report what is true rather than retrying
    anything itself.
    """
    if not authorized:
        return _error(ERR_UNAUTHORIZED)

    trans = (
        db.query(models.UzumTransaction)
        .filter(models.UzumTransaction.transId == payload.transId)
        .first()
    )
    if trans is None:
        return _error(ERR_TRANS_NOT_FOUND)

    order = db.query(models.PaymentOrder).filter(models.PaymentOrder.id == trans.orderId).first()

    return {
        "serviceId": payload.serviceId,
        "transId": trans.transId,
        "status": trans.status,
        "transTime": trans.transTime,
        "confirmTime": trans.confirmTime,
        "reverseTime": trans.reverseTime,
        "data": _order_data(order, db) if order else {},
        "amount": trans.amount,
    }


# ---------------------------------------------------------------------------
# Our own side: how a person gets a number to type into the Uzum app.
# ---------------------------------------------------------------------------


class CreateOrderRequest(BaseModel):
    # UZS, because this is our own API and every other amount a client sends us
    # is in so'm. It is converted to tiyin once, here, so that the only place
    # the two units meet is this line.
    amount: int = Field(ge=1000, le=100_000_000)
    jobId: Optional[str] = None


class CreateOrderResponse(BaseModel):
    orderNumber: str
    amount: int
    purpose: str


def _new_order_number(db: Session) -> str:
    """Sixteen digits, random, and checked for collision.

    Random rather than sequential because the number is typed into a public app
    and /check answers questions about it: a sequence would let anyone walk
    other people's orders. Sixteen digits matches the length Uzum's own
    examples use, which is what their input field is sized for.
    """
    for _ in range(10):
        number = "".join(str(secrets.randbelow(10)) for _ in range(16))
        taken = (
            db.query(models.PaymentOrder.id)
            .filter(models.PaymentOrder.orderNumber == number)
            .first()
        )
        if taken is None:
            return number
    # Ten collisions on a 10^16 space is not luck; something is wrong.
    raise RuntimeError("Could not allocate an order number")


@router.post("/orders", response_model=CreateOrderResponse)
@limiter.limit(ORDER_RATE)
@limiter.limit(ORDER_RATE_HOURLY)
def create_order(
    request: Request,
    req: CreateOrderRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Open an order the caller can then pay from the Uzum app."""
    if not settings.uzum_merchant_configured:
        return JSONResponse(
            status_code=503,
            content={"detail": "Uzum orqali to'lov hozircha ulanmagan."},
        )

    purpose = "deposit"
    job_id = None
    if req.jobId:
        job = (
            db.query(models.Job)
            .filter(models.Job.id == req.jobId, models.Job.employerId == current_user.id)
            .first()
        )
        if job is None:
            # Only your own posting, or the order becomes a way to read whether
            # somebody else's job exists.
            return JSONResponse(status_code=404, content={"detail": "E'lon topilmadi"})
        purpose = "job"
        job_id = job.id

    order = models.PaymentOrder(
        orderNumber=_new_order_number(db),
        userId=current_user.id,
        purpose=purpose,
        jobId=job_id,
        amount=req.amount * 100,
        status="new",
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    return CreateOrderResponse(
        orderNumber=order.orderNumber,
        amount=req.amount,
        purpose=order.purpose,
    )
