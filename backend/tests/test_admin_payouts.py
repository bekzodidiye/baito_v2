"""Paying a worker by hand, and billing the company for it.

Completing a job credits the worker's in-app balance — a promise, not a
transfer. These cover the part where a person actually moves money, which is
irreversible and therefore worth pinning down: who can trigger it, on which
jobs, for how much, and what happens when it is attempted twice.
"""

import uuid

from app.models.application import Application
from app.models.job import JobStatus
from app.models.job_payout import JobPayout
from app.models.system_setting import SystemSetting
from app.models.user import User
from app.db.session import SessionLocal

from .conftest import login, make_job, make_user

RECEIPT = "/api/v1/media/receipt-abc123.pdf"


def _completed_job_with_paid_worker(balance=225_000):
    """A finished shift whose worker is owed `balance`, the state the payout
    screen actually opens on."""
    employer = make_user(role="employer", phone=f"+9989{uuid.uuid4().int % 10**8:08d}",
                         email="buyer@korxona.uz", companyName="Korzinka MChJ")
    worker = make_user(phone=f"+9989{uuid.uuid4().int % 10**8:08d}", balance=balance)
    job = make_job(employer.id, status=JobStatus.COMPLETED, hiredWorkerId=worker.id)
    with SessionLocal() as db:
        db.add(Application(jobId=job.id, workerId=worker.id, status="completed"))
        db.commit()
    return employer, worker, job


def _admin(client):
    admin = make_user(role="admin", phone=f"+9989{uuid.uuid4().int % 10**8:08d}")
    login(client, admin)
    return admin


def _set_bank_details(**over):
    with SessionLocal() as db:
        cfg = db.query(SystemSetting).first()
        if not cfg:
            cfg = SystemSetting(id="singleton")
            db.add(cfg)
        cfg.payoutCompanyName = over.get("name", "Baito MChJ")
        cfg.payoutBankName = over.get("bank", "Ipoteka Bank")
        cfg.payoutBankAccount = over.get("account", "20208000900000000001")
        cfg.payoutBankMfo = over.get("mfo", "00873")
        db.commit()


def test_payout_debits_the_worker_and_records_the_receipt(client):
    """The balance is what the platform owes. Once it is transferred the debt
    is settled, so the number has to come down — otherwise the next payout run
    shows the same worker owed the same money again."""
    employer, worker, job = _completed_job_with_paid_worker(balance=225_000)
    _admin(client)

    resp = client.post(f"/api/v1/admin/jobs/{job.id}/payout",
                       json={"amount": 225_000, "receiptUrl": RECEIPT, "note": "Naqd o'tkazildi"})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["amount"] == 225_000
    assert body["receiptUrl"] == RECEIPT
    assert body["status"] == "paid"

    with SessionLocal() as db:
        assert db.query(User).filter(User.id == worker.id).first().balance == 0
        payout = db.query(JobPayout).filter(JobPayout.jobId == job.id).first()
        assert payout is not None and payout.amount == 225_000


def test_the_payout_appears_in_the_worker_transactions(client):
    """The worker has to be able to see where the money went.

    JobPayout records the transfer and AuditLedger records the balance move,
    but the screens people look at — the worker's payments list and the admin
    transaction list — both read Transaction. Without a row there, a worker
    watched their balance drop with nothing to explain it."""
    from app.models.transaction import Transaction

    employer, worker, job = _completed_job_with_paid_worker(balance=225_000)
    _admin(client)

    resp = client.post(f"/api/v1/admin/jobs/{job.id}/payout",
                       json={"amount": 225_000, "receiptUrl": RECEIPT})
    assert resp.status_code == 200, resp.text

    with SessionLocal() as db:
        tx = (
            db.query(Transaction)
            .filter(Transaction.jobId == job.id, Transaction.type == "payout")
            .first()
        )
        assert tx is not None, "payout wrote no transaction"
        # Transaction.amount is in tiyin; JobPayout.amount is in so'm.
        assert tx.amount == 225_000 * 100
        assert tx.workerId == worker.id
        assert tx.employerId == employer.id
        assert tx.status == "paid"
        assert tx.platformFee == 0


def test_the_payout_transaction_reaches_the_worker_api(client):
    """And it has to survive the endpoint the screen actually calls, which
    converts tiyin back to so'm on the way out."""
    employer, worker, job = _completed_job_with_paid_worker(balance=225_000)
    _admin(client)
    client.post(f"/api/v1/admin/jobs/{job.id}/payout",
                json={"amount": 225_000, "receiptUrl": RECEIPT})

    login(client, worker)
    resp = client.get("/api/v1/payments/transactions")
    assert resp.status_code == 200, resp.text
    payouts = [t for t in resp.json() if t.get("type") == "payout"]
    assert len(payouts) == 1, resp.text
    assert payouts[0]["amount"] == 225_000


def test_the_same_shift_cannot_be_paid_twice(client):
    """A double submit, or two administrators working the same list, would
    otherwise debit the worker twice for one shift."""
    employer, worker, job = _completed_job_with_paid_worker(balance=300_000)
    _admin(client)
    payload = {"amount": 100_000, "receiptUrl": RECEIPT}

    assert client.post(f"/api/v1/admin/jobs/{job.id}/payout", json=payload).status_code == 200
    second = client.post(f"/api/v1/admin/jobs/{job.id}/payout", json=payload)
    assert second.status_code == 409

    with SessionLocal() as db:
        # Debited once, not twice.
        assert db.query(User).filter(User.id == worker.id).first().balance == 200_000
        assert db.query(JobPayout).filter(JobPayout.jobId == job.id).count() == 1


def test_payout_is_refused_on_a_job_that_is_not_finished(client):
    """The button is disabled in the UI for unfinished work; the server does
    not rely on that."""
    employer = make_user(role="employer", phone="+998900500001")
    worker = make_user(phone="+998900500002", balance=500_000)
    job = make_job(employer.id, status=JobStatus.IN_PROGRESS, hiredWorkerId=worker.id)
    _admin(client)

    resp = client.post(f"/api/v1/admin/jobs/{job.id}/payout",
                       json={"amount": 50_000, "receiptUrl": RECEIPT})
    assert resp.status_code == 400
    with SessionLocal() as db:
        assert db.query(User).filter(User.id == worker.id).first().balance == 500_000


def test_payout_cannot_exceed_the_balance(client):
    """Paying out more than is owed would invent money the platform never held."""
    employer, worker, job = _completed_job_with_paid_worker(balance=100_000)
    _admin(client)

    resp = client.post(f"/api/v1/admin/jobs/{job.id}/payout",
                       json={"amount": 100_001, "receiptUrl": RECEIPT})
    assert resp.status_code == 400
    with SessionLocal() as db:
        assert db.query(User).filter(User.id == worker.id).first().balance == 100_000
        assert db.query(JobPayout).filter(JobPayout.jobId == job.id).count() == 0


def test_a_receipt_is_required(client):
    """The point of recording the payment is being able to show it later."""
    employer, worker, job = _completed_job_with_paid_worker()
    _admin(client)

    assert client.post(f"/api/v1/admin/jobs/{job.id}/payout",
                       json={"amount": 1000}).status_code == 422
    assert client.post(f"/api/v1/admin/jobs/{job.id}/payout",
                       json={"amount": 1000, "receiptUrl": ""}).status_code == 422


def test_only_an_admin_can_pay_out(client):
    """It moves real money; an employer must not be able to trigger it."""
    employer, worker, job = _completed_job_with_paid_worker()
    login(client, employer)

    resp = client.post(f"/api/v1/admin/jobs/{job.id}/payout",
                       json={"amount": 1000, "receiptUrl": RECEIPT})
    assert resp.status_code in (401, 403)
    with SessionLocal() as db:
        assert db.query(JobPayout).filter(JobPayout.jobId == job.id).count() == 0


def test_invoice_needs_a_payout_first(client):
    """Billing a company for a shift nobody has been paid for would be a bill
    with nothing behind it."""
    employer, worker, job = _completed_job_with_paid_worker()
    _admin(client)
    _set_bank_details()

    resp = client.post(f"/api/v1/admin/jobs/{job.id}/payout/invoice", json={"amount": 250_000})
    assert resp.status_code == 404


def test_invoice_is_refused_without_bank_details(client):
    """An invoice with no account number on it cannot be paid, and would go
    out looking official."""
    employer, worker, job = _completed_job_with_paid_worker()
    _admin(client)
    with SessionLocal() as db:
        cfg = db.query(SystemSetting).first()
        if cfg:
            cfg.payoutBankAccount = None
            db.commit()

    assert client.post(f"/api/v1/admin/jobs/{job.id}/payout",
                       json={"amount": 1000, "receiptUrl": RECEIPT}).status_code == 200

    resp = client.post(f"/api/v1/admin/jobs/{job.id}/payout/invoice", json={"amount": 250_000})
    assert resp.status_code == 400
    assert "rekvizit" in resp.json()["detail"].lower()


def test_invoice_is_refused_when_mail_is_not_configured(client):
    """Marked-sent-but-never-delivered is the failure worth preventing: the
    company would never be billed and nobody would know."""
    employer, worker, job = _completed_job_with_paid_worker()
    _admin(client)
    _set_bank_details()

    assert client.post(f"/api/v1/admin/jobs/{job.id}/payout",
                       json={"amount": 1000, "receiptUrl": RECEIPT}).status_code == 200

    # The suite runs with no SMTP_HOST, which is exactly the unconfigured case.
    resp = client.post(f"/api/v1/admin/jobs/{job.id}/payout/invoice", json={"amount": 250_000})
    assert resp.status_code == 503

    with SessionLocal() as db:
        payout = db.query(JobPayout).filter(JobPayout.jobId == job.id).first()
        # Nothing recorded, so it can be retried once mail works.
        assert payout.invoiceSentAt is None
        assert payout.status == "paid"


def test_the_payout_screen_reports_what_it_needs(client):
    """The modal asks first so it can say "bank details are missing" before
    the administrator fills in an invoice, rather than after."""
    employer, worker, job = _completed_job_with_paid_worker(balance=180_000)
    _admin(client)

    resp = client.get(f"/api/v1/admin/jobs/{job.id}/payout")
    assert resp.status_code == 200
    body = resp.json()
    assert body["job"]["status"] == JobStatus.COMPLETED
    assert body["worker"]["id"] == worker.id
    assert body["worker"]["balance"] == 180_000
    assert body["employer"]["email"] == "buyer@korxona.uz"
    assert body["payout"] is None
    assert body["smtpConfigured"] is False


def test_payouts_are_listed_for_the_payments_screen(client):
    """Everything paid by hand has to show up somewhere afterwards."""
    employer, worker, job = _completed_job_with_paid_worker(balance=90_000)
    _admin(client)
    client.post(f"/api/v1/admin/jobs/{job.id}/payout",
                json={"amount": 90_000, "receiptUrl": RECEIPT})

    resp = client.get("/api/v1/admin/payouts")
    assert resp.status_code == 200
    rows = resp.json()
    mine = [r for r in rows if r["jobId"] == job.id]
    assert len(mine) == 1
    assert mine[0]["amount"] == 90_000
    assert mine[0]["workerName"] == worker.name


def test_the_invoice_bills_the_wage_plus_the_commission(client, monkeypatch):
    """The figure typed is what the work cost; the company owes that plus our cut.

    It used to be billed straight through, so the commission — which is the
    company's, charged on top of the wage — was never actually invoiced to
    anyone. An administrator would have had to add it by hand, on every
    invoice, without the form ever mentioning a rate.
    """
    from app.models.system_setting import SystemSetting
    from app.services import email_service

    employer, worker, job = _completed_job_with_paid_worker()
    _admin(client)
    _set_bank_details()
    with SessionLocal() as db:
        cfg = db.query(SystemSetting).first()
        cfg.platformFeePercent = 20
        db.commit()

    sent: dict = {}
    monkeypatch.setattr(email_service, "missing_config", lambda: None)
    monkeypatch.setattr(
        email_service, "send_email",
        lambda **kw: sent.update(kw),
    )

    assert client.post(f"/api/v1/admin/jobs/{job.id}/payout",
                       json={"amount": 1000, "receiptUrl": RECEIPT}).status_code == 200

    resp = client.post(f"/api/v1/admin/jobs/{job.id}/payout/invoice",
                       json={"amount": 250_000, "email": "buxgalteriya@korxona.uz"})

    assert resp.status_code == 200, resp.text
    assert resp.json()["invoiceAmount"] == 300_000  # 250 000 + 20%

    # And the company is told what the figure is made of, not just the total.
    body = sent["text_body"]
    assert "250 000" in body
    assert "Xizmat haqi (20%)" in body
    assert "50 000" in body
    assert "300 000" in body


def test_a_zero_rate_bills_the_wage_and_says_nothing_about_a_fee(client, monkeypatch):
    from app.models.system_setting import SystemSetting
    from app.services import email_service

    employer, worker, job = _completed_job_with_paid_worker()
    _admin(client)
    _set_bank_details()
    with SessionLocal() as db:
        cfg = db.query(SystemSetting).first()
        cfg.platformFeePercent = 0
        db.commit()

    sent: dict = {}
    monkeypatch.setattr(email_service, "missing_config", lambda: None)
    monkeypatch.setattr(email_service, "send_email", lambda **kw: sent.update(kw))

    assert client.post(f"/api/v1/admin/jobs/{job.id}/payout",
                       json={"amount": 1000, "receiptUrl": RECEIPT}).status_code == 200
    resp = client.post(f"/api/v1/admin/jobs/{job.id}/payout/invoice",
                       json={"amount": 250_000, "email": "buxgalteriya@korxona.uz"})

    assert resp.status_code == 200, resp.text
    assert resp.json()["invoiceAmount"] == 250_000
    # No commission line at all rather than a "0%" one nobody needs to read.
    assert "Xizmat haqi" not in sent["text_body"]
