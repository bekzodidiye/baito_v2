"""The settlement loop, from the invoice to the money being confirmed.

The pieces are covered elsewhere - test_admin_payouts pays the worker,
test_invoice_payment_link exercises the tokenised link in the billing email.
What is here is the path an employer actually walks in the app: the invoice
appears on their job, they declare payment with a receipt, and an
administrator confirms it. Each of those is a different state, and the point of
the test is that they stay different - "we billed them", "they say they paid"
and "the money arrived" must not collapse into one another.
"""

import uuid
from datetime import datetime, timezone

from app.models.application import Application
from app.models.job import JobStatus
from app.models.job_payout import JobPayout, PayoutStatus
from app.models.notification import Notification
from app.models.user import User
from app.db.session import SessionLocal

from .conftest import login, make_job, make_user

RECEIPT = "/media/receipts/worker-paid.png"
COMPANY_RECEIPT = "/media/receipts/company-transfer.pdf"


def _invoiced_job():
    """A finished shift the company has been billed for."""
    employer = make_user(role="employer", phone=f"+9989{uuid.uuid4().int % 10**8:08d}",
                         email="buyer@korxona.uz", companyName="Korzinka MChJ")
    worker = make_user(phone=f"+9989{uuid.uuid4().int % 10**8:08d}")
    job = make_job(employer.id, status=JobStatus.COMPLETED, hiredWorkerId=worker.id)

    with SessionLocal() as db:
        db.add(Application(jobId=job.id, workerId=worker.id, status="completed"))
        db.add(JobPayout(
            jobId=job.id, workerId=worker.id, employerId=employer.id,
            amount=225_000, receiptUrl=RECEIPT, status=PayoutStatus.INVOICED,
            paidByAdminId=employer.id,
            invoiceNumber=f"INV-{uuid.uuid4().hex[:8].upper()}",
            invoiceAmount=250_000,
            invoiceSentTo="buyer@korxona.uz",
            invoiceSentAt=datetime.now(timezone.utc),
        ))
        db.commit()
    return employer, worker, job


def _admin(client):
    admin = make_user(role="admin", phone=f"+9989{uuid.uuid4().int % 10**8:08d}")
    login(client, admin)
    return admin


def _status(job_id):
    with SessionLocal() as db:
        p = db.query(JobPayout).filter(JobPayout.jobId == job_id).first()
        return p.status, p


# --- the whole loop -------------------------------------------------------

def test_an_invoice_becomes_confirmed_only_after_someone_checks_it(client):
    employer, _worker, job = _invoiced_job()

    # The employer sees the bill on their own job.
    login(client, employer)
    state = client.get(f"/api/v1/jobs/{job.id}/payout").json()
    assert state["payoutStatus"] == PayoutStatus.INVOICED
    assert state["invoiceAmount"] == 250_000

    # They pay it and attach the receipt.
    declared = client.post(
        f"/api/v1/jobs/{job.id}/payout/declare",
        json={"method": "bank_transfer", "reference": "PO-4471", "receiptUrl": COMPANY_RECEIPT},
    )
    assert declared.status_code == 200
    assert declared.json()["payoutStatus"] == PayoutStatus.DECLARED

    # Their word, not the money: still not confirmed.
    status, payout = _status(job.id)
    assert status == PayoutStatus.DECLARED
    assert payout.invoicePaidReceiptUrl == COMPANY_RECEIPT
    assert payout.invoicePaidReference == "PO-4471"
    assert payout.invoiceConfirmedAt is None

    # An administrator matches it against the bank statement.
    _admin(client)
    confirmed = client.post(f"/api/v1/admin/jobs/{job.id}/payout/confirm-payment")
    assert confirmed.status_code == 200

    status, payout = _status(job.id)
    assert status == PayoutStatus.CONFIRMED
    assert payout.invoiceConfirmedAt is not None
    assert payout.invoiceConfirmedByAdminId is not None


def test_the_employers_job_list_carries_the_invoice_state(client):
    employer, _worker, job = _invoiced_job()
    login(client, employer)

    rows = client.get("/api/v1/jobs/my").json()
    row = next(r for r in rows if r["id"] == job.id)
    assert row["payoutStatus"] == PayoutStatus.INVOICED
    assert row["invoiceAmount"] == 250_000
    assert row["invoiceNumber"]


def test_declaring_notifies_the_administrators_and_says_whether_a_receipt_came(client):
    employer, _worker, job = _invoiced_job()
    with SessionLocal() as db:
        admin = User(id=str(uuid.uuid4()), name="Admin", role="admin",
                     phone=f"+9989{uuid.uuid4().int % 10**8:08d}", hashed_password="x")
        db.add(admin)
        db.commit()
        admin_id = admin.id

    login(client, employer)
    client.post(
        f"/api/v1/jobs/{job.id}/payout/declare",
        json={"method": "bank_transfer", "receiptUrl": COMPANY_RECEIPT},
    )

    with SessionLocal() as db:
        note = (
            db.query(Notification)
            .filter(Notification.userId == admin_id, Notification.relatedJobId == job.id)
            .first()
        )
    assert note is not None
    assert "Chek ilova qilingan" in note.message


# --- the guards -----------------------------------------------------------

def test_confirming_is_refused_before_anybody_has_declared(client):
    _employer, _worker, job = _invoiced_job()
    _admin(client)

    resp = client.post(f"/api/v1/admin/jobs/{job.id}/payout/confirm-payment")
    assert resp.status_code == 409
    assert _status(job.id)[0] == PayoutStatus.INVOICED


def test_the_same_invoice_cannot_be_declared_twice(client):
    employer, _worker, job = _invoiced_job()
    login(client, employer)
    payload = {"method": "bank_transfer", "receiptUrl": COMPANY_RECEIPT}

    assert client.post(f"/api/v1/jobs/{job.id}/payout/declare", json=payload).status_code == 200
    second = client.post(f"/api/v1/jobs/{job.id}/payout/declare", json=payload)
    assert second.status_code == 409


def test_confirming_twice_is_refused(client):
    employer, _worker, job = _invoiced_job()
    login(client, employer)
    client.post(f"/api/v1/jobs/{job.id}/payout/declare",
                json={"method": "bank_transfer", "receiptUrl": COMPANY_RECEIPT})

    _admin(client)
    assert client.post(f"/api/v1/admin/jobs/{job.id}/payout/confirm-payment").status_code == 200
    assert client.post(f"/api/v1/admin/jobs/{job.id}/payout/confirm-payment").status_code == 409


def test_another_company_cannot_settle_somebody_elses_invoice(client):
    _employer, _worker, job = _invoiced_job()
    intruder = make_user(role="employer", phone=f"+9989{uuid.uuid4().int % 10**8:08d}")
    login(client, intruder)

    resp = client.post(f"/api/v1/jobs/{job.id}/payout/declare",
                       json={"method": "bank_transfer", "receiptUrl": COMPANY_RECEIPT})
    assert resp.status_code == 403
    assert _status(job.id)[0] == PayoutStatus.INVOICED


def test_a_job_with_no_invoice_has_nothing_to_settle(client):
    employer = make_user(role="employer", phone=f"+9989{uuid.uuid4().int % 10**8:08d}")
    worker = make_user(phone=f"+9989{uuid.uuid4().int % 10**8:08d}")
    job = make_job(employer.id, status=JobStatus.COMPLETED, hiredWorkerId=worker.id)
    login(client, employer)

    assert client.get(f"/api/v1/jobs/{job.id}/payout").json()["payoutStatus"] is None
    resp = client.post(f"/api/v1/jobs/{job.id}/payout/declare",
                       json={"method": "bank_transfer", "receiptUrl": COMPANY_RECEIPT})
    assert resp.status_code == 404
