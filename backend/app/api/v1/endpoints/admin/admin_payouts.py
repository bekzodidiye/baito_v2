"""Settling a finished shift by hand.

Completing a job credits the worker's in-app balance. That is a promise the
platform has made, not money that has moved. Someone then makes a real bank
transfer, and separately bills the company for the shift.

Neither half was recorded anywhere. This is both halves:

* ``POST /admin/jobs/{id}/payout`` — the transfer happened. Debit the balance
  by the amount that was actually sent, against a receipt.
* ``POST /admin/jobs/{id}/payout/invoice`` — bill the company for it.

The two are separate calls on purpose. The transfer is the irreversible part;
if the invoice email fails, nothing about the payment should unwind.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from html import escape
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app import models
from app.api import deps
from app.core import invoice_link
from app.models.audit_ledger import AuditLedger
from app.models.job import JobStatus
from app.models.job_payout import JobPayout, PayoutStatus
from app.models.user import User
from app.services import email_service

from .admin_users import get_admin_user
from .audit import record_admin_action

router = APIRouter()

# An administrator types this. A slip of a zero on a wage is a plausible
# mistake, so it is bounded rather than trusted.
MAX_PAYOUT_UZS = 100_000_000


class PayoutCreate(BaseModel):
    amount: int = Field(gt=0, le=MAX_PAYOUT_UZS)
    # Proof of the transfer: an upload URL from POST /upload. Required — the
    # whole point of recording the payment is being able to show it later.
    receiptUrl: str = Field(min_length=1, max_length=500)
    note: Optional[str] = Field(default=None, max_length=500)


class InvoiceSend(BaseModel):
    amount: int = Field(gt=0, le=MAX_PAYOUT_UZS)
    # Defaults to the employer's own address; overridable because the person
    # who pays invoices is often not the person who posted the shift.
    email: Optional[str] = Field(default=None, max_length=254)
    note: Optional[str] = Field(default=None, max_length=1000)


def _serialise(p: JobPayout, job: models.Job | None = None, worker: User | None = None) -> dict:
    return {
        "id": p.id,
        "jobId": p.jobId,
        "jobTitle": job.title if job else None,
        "company": job.company if job else None,
        "workerId": p.workerId,
        "workerName": worker.name if worker else None,
        "employerId": p.employerId,
        "amount": p.amount,
        "receiptUrl": p.receiptUrl,
        "status": p.status,
        "note": p.note,
        "paidAt": p.paidAt.isoformat() if p.paidAt else None,
        "invoiceNumber": p.invoiceNumber,
        "invoiceAmount": p.invoiceAmount,
        "invoiceSentTo": p.invoiceSentTo,
        "invoiceSentAt": p.invoiceSentAt.isoformat() if p.invoiceSentAt else None,
        # What the company said back, from the link in the invoice email. Not
        # a bank statement — the admin list labels it as their word.
        "invoicePaidMethod": p.invoicePaidMethod,
        "invoicePaidReference": p.invoicePaidReference,
        "invoicePaidDeclaredAt": (
            p.invoicePaidDeclaredAt.isoformat() if p.invoicePaidDeclaredAt else None
        ),
        # Their receipt for the transfer, and - separately - whether anyone has
        # matched it against the bank statement yet. The list needs both: the
        # first is what to look at, the second is whether it has been looked at.
        "invoicePaidReceiptUrl": p.invoicePaidReceiptUrl,
        "invoiceConfirmedAt": (
            p.invoiceConfirmedAt.isoformat() if p.invoiceConfirmedAt else None
        ),
    }


@router.get("/payouts")
def list_payouts(
    db: Session = Depends(deps.get_db),
    admin: models.User = Depends(get_admin_user),
    limit: int = Query(default=100, ge=1, le=500),
) -> Any:
    """Everything that has been paid out by hand, newest first."""
    rows = (
        db.query(JobPayout, models.Job, User)
        .outerjoin(models.Job, models.Job.id == JobPayout.jobId)
        .outerjoin(User, User.id == JobPayout.workerId)
        .order_by(JobPayout.paidAt.desc())
        .limit(limit)
        .all()
    )
    return [_serialise(p, job, worker) for p, job, worker in rows]


@router.get("/jobs/{job_id}/payout")
def get_job_payout(
    job_id: str,
    db: Session = Depends(deps.get_db),
    admin: models.User = Depends(get_admin_user),
) -> Any:
    """What the payout modal needs to open: the job, who to pay, and whether
    it has been paid already."""
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Ish topilmadi")

    existing = db.query(JobPayout).filter(JobPayout.jobId == job_id).first()
    worker = None
    worker_id = job.hiredWorkerId
    if not worker_id:
        # hiredWorkerId only ever holds the first hire on a multi-vacancy job,
        # so the application table is the honest source for "who worked this".
        app = (
            db.query(models.Application)
            .filter(
                models.Application.jobId == job_id,
                models.Application.status.in_(("hired", "completed")),
            )
            .first()
        )
        worker_id = app.workerId if app else None
    if worker_id:
        worker = db.query(User).filter(User.id == worker_id).first()

    employer = db.query(User).filter(User.id == job.employerId).first()
    settings_row = db.query(models.SystemSetting).first()

    return {
        "job": {
            "id": job.id,
            "title": job.title,
            "company": job.company,
            "status": job.status,
            "salary": job.salary,
            "workDate": job.workDate,
            "workTime": job.workTime,
            "hourlyRate": job.hourlyRate,
            "location": job.location,
        },
        "worker": (
            {"id": worker.id, "name": worker.name, "phone": worker.phone, "balance": worker.balance or 0}
            if worker else None
        ),
        "employer": (
            {"id": employer.id, "name": employer.name, "email": employer.email,
             "companyName": employer.companyName}
            if employer else None
        ),
        "payout": _serialise(existing, job, worker) if existing else None,
        # Surfaced so the modal can say "bank details are missing" before the
        # admin fills in an invoice, rather than after.
        "bankDetailsSet": bool(settings_row and settings_row.payoutBankAccount),
        "smtpConfigured": email_service.is_configured(),
    }


@router.post("/jobs/{job_id}/payout")
def confirm_payout(
    job_id: str,
    payload: PayoutCreate,
    request: Request,
    db: Session = Depends(deps.get_db),
    admin: models.User = Depends(get_admin_user),
) -> Any:
    """Record that the worker has been paid, and take it off their balance.

    The balance is what the platform owes. Once the transfer is made the debt
    is settled, so the number has to come down — otherwise the next payout run
    would show the same worker owed the same money again.
    """
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Ish topilmadi")

    if job.status != JobStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail="To'lovni faqat yakunlangan ish uchun tasdiqlash mumkin",
        )

    # One payout per job. Without this, a double-submit — or two administrators
    # working the same list — debits the worker twice for one shift.
    if db.query(JobPayout).filter(JobPayout.jobId == job_id).first():
        raise HTTPException(status_code=409, detail="Bu ish uchun to'lov allaqachon tasdiqlangan")

    worker_id = job.hiredWorkerId
    if not worker_id:
        app = (
            db.query(models.Application)
            .filter(
                models.Application.jobId == job_id,
                models.Application.status.in_(("hired", "completed")),
            )
            .first()
        )
        worker_id = app.workerId if app else None
    if not worker_id:
        raise HTTPException(status_code=400, detail="Bu ishga ishchi yollanmagan")

    # Locked for the same reason release_funds locks: two concurrent writes to
    # a balance otherwise lose one of them.
    worker = (
        db.query(User).filter(User.id == worker_id).populate_existing().with_for_update().first()
    )
    if not worker:
        raise HTTPException(status_code=404, detail="Ishchi topilmadi")

    balance = worker.balance or 0
    if payload.amount > balance:
        raise HTTPException(
            status_code=400,
            detail=f"Summa ishchi balansidan katta (balans: {balance:,} so'm)".replace(",", " "),
        )

    worker.balance = balance - payload.amount
    db.add(worker)

    payout = JobPayout(
        jobId=job.id,
        workerId=worker.id,
        employerId=job.employerId,
        amount=payload.amount,
        receiptUrl=payload.receiptUrl,
        note=payload.note,
        status=PayoutStatus.PAID,
        paidByAdminId=admin.id,
    )
    db.add(payout)

    db.add(AuditLedger(
        userId=worker.id,
        amountDelta=-payload.amount,
        balanceAfter=worker.balance,
        entryType="payout",
        referenceType="job",
        referenceId=job.id,
        description=f"Qo'lda to'lov: {payload.amount} so'm ({job.title})",
    ))

    # The payout is also a transaction, and has to be written as one.
    #
    # JobPayout records the bank transfer and the invoice; AuditLedger records
    # the balance movement for audit. Neither is read by the screens people
    # actually look at: the worker's payments list and the admin transaction
    # list both read Transaction. So a worker whose balance had just been paid
    # out saw the money leave and nothing explaining where it went.
    #
    # amount is stored in tiyin here, unlike JobPayout, which is in so'm.
    db.add(models.Transaction(
        id=str(uuid.uuid4()),
        jobId=job.id,
        employerId=job.employerId,
        workerId=worker.id,
        amount=payload.amount * 100,
        platformFee=0,
        type="payout",
        status="paid",
    ))

    record_admin_action(
        db, admin, "payout.confirm",
        target_type="job", target_id=job.id,
        details={"workerId": worker.id, "amount": payload.amount, "receiptUrl": payload.receiptUrl},
        request=request, note=payload.note,
    )

    db.commit()
    db.refresh(payout)
    return _serialise(payout, job, worker)


def _render_invoice(*, payout: JobPayout, job: models.Job, employer: User | None,
                    cfg: models.SystemSetting | None, note: str | None,
                    pay_url: str) -> tuple[str, str]:
    """The invoice, as text and as HTML. Same content both ways."""
    company = (employer.companyName if employer and employer.companyName else job.company) or "—"
    amount = f"{payout.invoiceAmount:,}".replace(",", " ")

    rows = [
        ("Hisob-faktura raqami", payout.invoiceNumber),
        ("Sana", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
        ("Korxona", company),
        ("Ish nomi", job.title),
        ("Ish sanasi", job.workDate or "—"),
        ("Ish vaqti", job.workTime or "—"),
        ("Manzil", job.location or "—"),
        ("To'lov summasi", f"{amount} so'm"),
    ]
    bank = [
        ("Qabul qiluvchi", cfg.payoutCompanyName if cfg else None),
        ("Bank", cfg.payoutBankName if cfg else None),
        ("Hisob raqami", cfg.payoutBankAccount if cfg else None),
        ("MFO", cfg.payoutBankMfo if cfg else None),
        ("INN / STIR", cfg.payoutCompanyInn if cfg else None),
        ("Manzil", cfg.payoutCompanyAddress if cfg else None),
    ]
    bank = [(k, v) for k, v in bank if v]

    lines = [f"HISOB-FAKTURA — {payout.invoiceNumber}", ""]
    lines += [f"{k}: {v}" for k, v in rows]
    if bank:
        lines += ["", "TO'LOV REKVIZITLARI", ""]
        lines += [f"{k}: {v}" for k, v in bank]
    if note:
        lines += ["", "IZOH", note]
    # The plain-text part is what a client that refuses HTML shows, and what a
    # spam filter reads when it wants to know whether the two halves agree. The
    # link has to be in both.
    lines += ["", "TO'LOVNI AMALGA OSHIRISH", pay_url]
    text = "\n".join(lines)

    # Email HTML is not web HTML: flexbox and grid do not survive Outlook or
    # the Gmail app, so the layout is tables with inline styles. Kept to one
    # 600px column, which is what every client renders without horizontal
    # scrolling on a phone.
    def rows_html(pairs, muted="#6b7280", strong="#111827"):
        # escape(), because a job title and a company name are typed by an
        # employer. Unescaped, "<b>" in a job title reformats somebody else's
        # invoice and an "<a>" in it points wherever the author liked.
        return "".join(
            '<tr>'
            f'<td style="padding:9px 16px 9px 0;color:{muted};font-size:13px;'
            'vertical-align:top;white-space:nowrap">' + escape(str(k)) + '</td>'
            f'<td style="padding:9px 0;color:{strong};font-size:13px;'
            'font-weight:600;vertical-align:top">' + escape(str(v)) + '</td>'
            '</tr>'
            for k, v in pairs
        )

    def section(title, pairs):
        if not pairs:
            return ""
        return (
            '<tr><td style="padding:24px 28px 0">'
            '<div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;'
            'color:#9ca3af;font-weight:700;padding-bottom:6px;'
            'border-bottom:1px solid #e5e7eb">' + title + '</div>'
            '<table role="presentation" cellpadding="0" cellspacing="0" border="0" '
            'style="width:100%;border-collapse:collapse;margin-top:8px">'
            + rows_html(pairs) +
            '</table></td></tr>'
        )

    issuer = (cfg.payoutCompanyName if cfg and cfg.payoutCompanyName else "Baito")

    html = (
        '<!DOCTYPE html><html lang="uz"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        '<title>Hisob-faktura ' + str(payout.invoiceNumber) + '</title></head>'
        '<body style="margin:0;padding:24px 12px;background:#f3f4f6;'
        'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Arial,sans-serif">'

        # A one-line summary for the inbox preview, hidden in the body itself.
        '<div style="display:none;max-height:0;overflow:hidden;opacity:0">'
        + amount + ' so\'m — ' + escape(str(job.title)) + '</div>'

        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" '
        'style="width:100%;max-width:600px;margin:0 auto;background:#ffffff;'
        'border:1px solid #e5e7eb;border-radius:12px;border-collapse:separate">'

        # Header
        '<tr><td style="padding:28px 28px 0">'
        '<table role="presentation" width="100%"><tr>'
        '<td style="font-size:18px;font-weight:800;color:#111827">' + escape(issuer) + '</td>'
        '<td align="right" style="font-size:11px;letter-spacing:.08em;'
        'text-transform:uppercase;color:#9ca3af;font-weight:700">Hisob-faktura</td>'
        '</tr></table>'
        '<div style="margin-top:2px;font-size:13px;color:#6b7280">'
        '&#8470; ' + str(payout.invoiceNumber) + ' &middot; '
        + datetime.now(timezone.utc).strftime("%Y-%m-%d") + '</div>'
        '</td></tr>'

        # The number the reader is looking for, given its own block.
        '<tr><td style="padding:20px 28px 0">'
        '<table role="presentation" width="100%" style="background:#f9fafb;'
        'border:1px solid #e5e7eb;border-radius:10px"><tr>'
        '<td style="padding:16px 18px">'
        '<div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;'
        'color:#9ca3af;font-weight:700">To\'lov summasi</div>'
        '<div style="font-size:26px;font-weight:800;color:#111827;padding-top:2px">'
        + amount + ' <span style="font-size:15px;font-weight:600;color:#6b7280">so\'m</span></div>'
        '</td></tr></table></td></tr>'

        # The one thing the reader is meant to do, directly under the one
        # number they came for. Built as a table with bgcolor rather than a
        # styled <a>: Outlook drops border-radius and background on anchors,
        # and a CTA that renders as bare blue underlined text is a CTA nobody
        # presses.
        '<tr><td align="center" style="padding:22px 28px 0">'
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0">'
        '<tr><td align="center" bgcolor="#010766" style="border-radius:10px">'
        '<a href="' + escape(pay_url, quote=True) + '" target="_blank" '
        'style="display:inline-block;padding:15px 34px;font-size:15px;'
        'font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;'
        'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Arial,'
        'sans-serif">To\'lovni amalga oshirish</a>'
        '</td></tr></table>'
        '<div style="padding-top:8px;font-size:12px;color:#9ca3af">'
        'Rekvizitlar va summa oldindan to\'ldirilgan &middot; havola 60 kun amal qiladi'
        '</div></td></tr>'

        + section("Ish ma\'lumotlari", [
            ("Korxona", company),
            ("Ish nomi", job.title),
            ("Ish sanasi", job.workDate or "—"),
            ("Ish vaqti", job.workTime or "—"),
            ("Manzil", job.location or "—"),
        ])
        + section("To\'lov rekvizitlari", bank)
    )

    if note:
        html += (
            '<tr><td style="padding:20px 28px 0">'
            '<div style="padding:12px 14px;background:#f9fafb;border-radius:8px;'
            'font-size:13px;color:#374151;line-height:1.5">' + escape(note) + '</div>'
            '</td></tr>'
        )

    html += (
        '<tr><td style="padding:24px 28px 26px">'
        '<div style="border-top:1px solid #e5e7eb;padding-top:14px;'
        'font-size:12px;color:#9ca3af;line-height:1.6">'
        'Ushbu hisob-faktura Baito tizimi tomonidan avtomatik shakllantirildi. '
        'Savollar bo\'lsa, shu xatga javob yozing.'
        '</div></td></tr>'
        '</table></body></html>'
    )
    return text, html


@router.post("/jobs/{job_id}/payout/invoice")
def send_payout_invoice(
    job_id: str,
    payload: InvoiceSend,
    request: Request,
    db: Session = Depends(deps.get_db),
    admin: models.User = Depends(get_admin_user),
) -> Any:
    """Bill the company for a shift that has already been paid out.

    Refuses before doing anything if mail is not configured: a half-recorded
    invoice — marked sent, never delivered — is the failure worth preventing.
    """
    payout = db.query(JobPayout).filter(JobPayout.jobId == job_id).first()
    if not payout:
        raise HTTPException(status_code=404, detail="Avval to'lovni tasdiqlang")
    if payout.invoiceSentAt:
        raise HTTPException(status_code=409, detail="Hisob-faktura allaqachon yuborilgan")

    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    employer = db.query(User).filter(User.id == payout.employerId).first()

    recipient = (payload.email or (employer.email if employer else "") or "").strip()
    if not recipient:
        raise HTTPException(
            status_code=400,
            detail="Korxona pochtasi yo'q. Elektron pochtani qo'lda kiriting.",
        )

    cfg = db.query(models.SystemSetting).first()
    if not (cfg and cfg.payoutBankAccount):
        raise HTTPException(
            status_code=400,
            detail="Bank rekvizitlari kiritilmagan. To'lovlar bo'limidan kiriting.",
        )

    # One source for the reason, so the endpoint and the sender cannot drift
    # into telling an operator two different stories.
    smtp_problem = email_service.missing_config()
    if smtp_problem:
        raise HTTPException(status_code=503, detail=smtp_problem)

    payout.invoiceAmount = payload.amount
    payout.invoiceNumber = f"INV-{datetime.now(timezone.utc):%Y%m%d}-{payout.id[:8].upper()}"

    # Built after invoiceNumber is set: the token is bound to it, so a
    # re-issued invoice retires the link that went out with the old one.
    pay_url = invoice_link.invoice_url(payout.id, payout.invoiceNumber)

    text_body, html_body = _render_invoice(
        payout=payout, job=job, employer=employer, cfg=cfg, note=payload.note,
        pay_url=pay_url,
    )

    # Sent before the row is marked sent. If this raises, nothing is recorded
    # and the administrator can try again — the opposite order would leave an
    # invoice marked delivered that nobody received.
    email_service.send_email(
        to=recipient,
        subject=f"Hisob-faktura {payout.invoiceNumber} — {job.title if job else 'Baito'}",
        text_body=text_body,
        html_body=html_body,
    )

    payout.invoiceSentTo = recipient
    payout.invoiceSentAt = datetime.now(timezone.utc)
    payout.invoiceSentByAdminId = admin.id
    payout.status = PayoutStatus.INVOICED
    db.add(payout)

    record_admin_action(
        db, admin, "payout.invoice",
        target_type="job", target_id=job_id,
        details={"invoiceNumber": payout.invoiceNumber, "amount": payload.amount, "to": recipient},
        request=request,
    )

    db.commit()
    db.refresh(payout)
    return _serialise(payout, job, None)


@router.post("/jobs/{job_id}/payout/confirm-payment")
def confirm_invoice_payment(
    job_id: str,
    db: Session = Depends(deps.get_db),
    admin: models.User = Depends(get_admin_user),
) -> Any:
    """Say that the company's declared payment has actually arrived.

    This is the step the declaration deliberately does not do for itself.
    ``payment_declared`` is the payer's word plus, usually, a receipt image;
    this is a person having matched it against the bank statement. Only after
    it is the job settled on both sides.

    Refuses if nothing has been declared yet, rather than letting an
    administrator confirm a payment nobody has claimed to have made.
    """
    payout = (
        db.query(JobPayout)
        .filter(JobPayout.jobId == job_id)
        .order_by(JobPayout.paidAt.desc())
        .first()
    )
    if not payout:
        raise HTTPException(status_code=404, detail="Bu ish uchun to'lov topilmadi")
    if not payout.invoicePaidDeclaredAt:
        raise HTTPException(
            status_code=409,
            detail="Korxona hali to'lovni qayd etmagan",
        )
    if payout.invoiceConfirmedAt:
        raise HTTPException(status_code=409, detail="To'lov allaqachon tasdiqlangan")

    payout.invoiceConfirmedAt = datetime.now(timezone.utc)
    payout.invoiceConfirmedByAdminId = admin.id
    payout.status = PayoutStatus.CONFIRMED
    db.add(payout)

    # The employer has been waiting on this since they pressed pay; saying so
    # is the whole point of the state existing.
    amount = f"{payout.invoiceAmount or payout.amount:,}".replace(",", " ")
    db.add(models.Notification(
        userId=payout.employerId,
        title="To'lov tasdiqlandi",
        message=f"{payout.invoiceNumber} · {amount} so'm. Ish yakunlandi.",
        type="payout",
        relatedJobId=payout.jobId,
    ))

    db.commit()
    db.refresh(payout)
    return _serialise(payout)
