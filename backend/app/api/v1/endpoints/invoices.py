"""The page an invoice email's button opens.

Public on purpose. The person who pays a company's bills is rarely the person
who posted the shift, and often has no account here at all — putting a login in
front of "pay this invoice" is how an invoice goes unpaid. The unguessable
token in the URL is the credential, and it is worth exactly one invoice.

Nothing here moves money. Uzbek corporate invoices are settled by bank
transfer, so what this records is the company's own statement that it has paid
— which is why the status it sets is called ``payment_declared`` and not
``paid``. Whoever reconciles the bank statement remains the one who decides the
money arrived.
"""

from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app import models
from app.api import deps
from app.core import invoice_link
from app.core.limiter import limiter
from app.models.job_payout import JobPayout, PayoutStatus
from app.models.user import User

router = APIRouter()


# Deliberately identical for a bad signature, an expired token, a deleted
# payout and an invoice that was re-issued. Telling an anonymous caller which
# of those it hit turns the endpoint into an oracle for probing invoice ids.
_GONE = "Havola yaroqsiz yoki muddati tugagan. Yangi hisob-faktura so'rang."


def _load(token: str, db: Session) -> JobPayout:
    claim = invoice_link.verify(token)
    if not claim:
        raise HTTPException(status_code=404, detail=_GONE)

    payout_id, invoice_number = claim
    payout = db.query(JobPayout).filter(JobPayout.id == payout_id).first()
    # The number is checked against the row, not just against the signature:
    # re-issuing an invoice changes it, and that is what retires the links
    # already sitting in inboxes.
    if not payout or payout.invoiceNumber != invoice_number or not payout.invoiceSentAt:
        raise HTTPException(status_code=404, detail=_GONE)
    return payout


def _methods() -> list[dict]:
    """How the company may pay, as the deployment actually stands.

    Bank transfer is always here because the requisites on the invoice are a
    corporate account and a transfer to it needs nothing from us. The card rail
    appears only once a provider is genuinely configured — an option that looks
    live and then fails is worse than one that was never offered.
    """
    methods = [
        {
            "id": "bank_transfer",
            "label": "Bank o'tkazmasi",
            "hint": "Rekvizitlar tayyor — bank ilovangizga nusxalang",
        }
    ]
    return methods


def _state(payout: JobPayout, job: models.Job | None, employer: User | None,
           cfg: models.SystemSetting | None) -> dict:
    company = (employer.companyName if employer and employer.companyName else None) \
        or (job.company if job else None) or "—"

    requisites = [
        ("Qabul qiluvchi", cfg.payoutCompanyName if cfg else None),
        ("Bank", cfg.payoutBankName if cfg else None),
        ("Hisob raqami", cfg.payoutBankAccount if cfg else None),
        ("MFO", cfg.payoutBankMfo if cfg else None),
        ("INN / STIR", cfg.payoutCompanyInn if cfg else None),
        ("Manzil", cfg.payoutCompanyAddress if cfg else None),
    ]

    return {
        "invoiceNumber": payout.invoiceNumber,
        # The amount the company owes, not the amount the worker was paid.
        # They are recorded independently and are not always equal.
        "amount": payout.invoiceAmount or payout.amount,
        "issuedAt": payout.invoiceSentAt.isoformat() if payout.invoiceSentAt else None,
        "company": company,
        "jobTitle": job.title if job else None,
        "workDate": job.workDate if job else None,
        "workTime": job.workTime if job else None,
        "location": job.location if job else None,
        "requisites": [{"label": k, "value": v} for k, v in requisites if v],
        "methods": _methods(),
        "status": payout.status,
        "paidMethod": payout.invoicePaidMethod,
        "paidReference": payout.invoicePaidReference,
        "declaredAt": (
            payout.invoicePaidDeclaredAt.isoformat()
            if payout.invoicePaidDeclaredAt else None
        ),
    }


@router.get("/{token}")
# An unguessable token is only unguessable while guessing is slow.
@limiter.limit("30/minute")
def get_invoice(
    token: str,
    request: Request,
    db: Session = Depends(deps.get_db),
) -> Any:
    """Everything the pay-this-invoice page shows, prefilled."""
    payout = _load(token, db)
    job = db.query(models.Job).filter(models.Job.id == payout.jobId).first()
    employer = db.query(User).filter(User.id == payout.employerId).first()
    cfg = db.query(models.SystemSetting).first()
    return _state(payout, job, employer, cfg)


class PaymentDeclaration(BaseModel):
    method: str = Field(min_length=1, max_length=40)
    # Their payment order number, if they have one to hand. Optional because
    # requiring it would stop somebody who has genuinely paid from saying so.
    reference: Optional[str] = Field(default=None, max_length=120)
    # Their receipt for the transfer. Optional for the same reason reference is:
    # a company that has genuinely paid should not be blocked from saying so
    # because the bank app has not emailed the PDF yet. An administrator can
    # ask for it before confirming.
    receiptUrl: Optional[str] = Field(default=None, max_length=500)


@router.post("/{token}/pay")
@limiter.limit("10/minute")
def declare_payment(
    token: str,
    payload: PaymentDeclaration,
    request: Request,
    db: Session = Depends(deps.get_db),
) -> Any:
    """Record that the company says it has paid, and tell the administrators.

    Sets ``payment_declared`` rather than anything resembling ``paid``: this
    endpoint has the payer's word and nothing else.
    """
    payout = _load(token, db)

    if payout.invoicePaidDeclaredAt:
        raise HTTPException(
            status_code=409,
            detail="Bu hisob-faktura bo'yicha to'lov allaqachon qayd etilgan",
        )

    if payload.method not in {m["id"] for m in _methods()}:
        raise HTTPException(status_code=400, detail="To'lov usuli mavjud emas")

    payout.invoicePaidMethod = payload.method
    payout.invoicePaidReference = (payload.reference or "").strip() or None
    payout.invoicePaidReceiptUrl = (payload.receiptUrl or "").strip() or None
    payout.invoicePaidDeclaredAt = datetime.now(timezone.utc)
    payout.status = PayoutStatus.DECLARED
    db.add(payout)

    job = db.query(models.Job).filter(models.Job.id == payout.jobId).first()
    employer = db.query(User).filter(User.id == payout.employerId).first()
    cfg = db.query(models.SystemSetting).first()

    # Money that has supposedly arrived is worth nobody noticing only if
    # somebody is told. Every administrator gets the notification, because
    # which of them reconciles the bank statement is not something this
    # endpoint can know.
    company = (employer.companyName if employer and employer.companyName else None) \
        or (job.company if job else None) or "Korxona"
    amount = f"{payout.invoiceAmount or payout.amount:,}".replace(",", " ")
    for admin in db.query(User).filter(User.role == "admin").all():
        db.add(models.Notification(
            userId=admin.id,
            title="Hisob-faktura to'landi deb belgilandi",
            message=f"{company} — {payout.invoiceNumber} · {amount} so'm. "
                    + ("Chek ilova qilingan. " if payout.invoicePaidReceiptUrl else "Chek ilova qilinmagan. ")
                    + "Bank ko'chirmasi bilan solishtiring.",
            type="payout",
            relatedJobId=payout.jobId,
        ))

    db.commit()
    db.refresh(payout)
    return _state(payout, job, employer, cfg)
