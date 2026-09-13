"""The button in the invoice email, and the page it opens.

The link is the only credential on that page — the accountant who pays a
company's bills usually has no account here — so most of what is worth pinning
down is about the token: that it opens exactly one invoice, that a forged or
edited one opens nothing, and that re-issuing an invoice retires the links
already sitting in inboxes.
"""

import time
import uuid
from datetime import datetime, timezone

from app.core import invoice_link
from app.models.job import JobStatus
from app.models.job_payout import JobPayout
from app.models.notification import Notification
from app.models.system_setting import SystemSetting
from app.models.user import User
from app.db.session import SessionLocal

from .conftest import make_job, make_user

RECEIPT = "/api/v1/media/receipt-abc123.pdf"


def _invoiced_payout(invoice_number="INV-20260907-ABCD1234", amount=250_000,
                     job_title="Omborxona yordamchisi"):
    """A payout that has been billed — the state the emailed link opens on."""
    employer = make_user(role="employer", phone=f"+9989{uuid.uuid4().int % 10**8:08d}",
                         email="buyer@korxona.uz", companyName="Korzinka MChJ")
    worker = make_user(phone=f"+9989{uuid.uuid4().int % 10**8:08d}")
    job = make_job(employer.id, status=JobStatus.COMPLETED, hiredWorkerId=worker.id,
                   title=job_title)

    with SessionLocal() as db:
        cfg = db.query(SystemSetting).first() or SystemSetting(id="singleton")
        cfg.payoutCompanyName = "Baito MChJ"
        cfg.payoutBankName = "Ipoteka Bank"
        cfg.payoutBankAccount = "20208000900000000001"
        cfg.payoutBankMfo = "00873"
        db.add(cfg)

        payout = JobPayout(
            jobId=job.id, workerId=worker.id, employerId=employer.id,
            amount=225_000, receiptUrl=RECEIPT, status="invoiced",
            paidByAdminId=employer.id,
            invoiceNumber=invoice_number, invoiceAmount=amount,
            invoiceSentTo="buyer@korxona.uz",
            invoiceSentAt=datetime.now(timezone.utc),
        )
        db.add(payout)
        db.commit()
        return payout.id, job, employer


# --- the token ------------------------------------------------------------

def test_a_token_names_the_invoice_it_was_issued_for():
    token = invoice_link.sign("payout-1", "INV-1")
    assert invoice_link.verify(token) == ("payout-1", "INV-1")


def test_an_edited_token_opens_nothing():
    token = invoice_link.sign("payout-1", "INV-1")
    payload, _, signature = token.rpartition(".")

    # The payload swapped for another invoice's, keeping a signature we issued.
    other = invoice_link.sign("payout-2", "INV-2").rpartition(".")[0]
    assert invoice_link.verify(f"{other}.{signature}") is None

    # And a signature invented from nothing.
    assert invoice_link.verify(f"{payload}.AAAA") is None
    assert invoice_link.verify("") is None
    assert invoice_link.verify("nonsense") is None


def test_a_token_stops_working_once_it_is_old_enough():
    expired = invoice_link.sign(
        "payout-1", "INV-1",
        issued_at=int(time.time()) - invoice_link.TOKEN_TTL_SECONDS - 60,
    )
    assert invoice_link.verify(expired) is None


# --- the page -------------------------------------------------------------

def test_the_page_arrives_prefilled(client):
    """Amount, requisites and the shift, all filled in — the whole point is
    that the payer types nothing."""
    payout_id, job, _ = _invoiced_payout(amount=310_000)
    token = invoice_link.sign(payout_id, "INV-20260907-ABCD1234")

    resp = client.get(f"/api/v1/invoices/{token}")
    assert resp.status_code == 200
    body = resp.json()

    assert body["invoiceNumber"] == "INV-20260907-ABCD1234"
    # The company's bill, not the worker's wage. They are recorded separately
    # and here they deliberately differ.
    assert body["amount"] == 310_000
    assert body["company"] == "Korzinka MChJ"
    assert body["jobTitle"] == job.title

    values = {r["label"]: r["value"] for r in body["requisites"]}
    assert values["Hisob raqami"] == "20208000900000000001"
    assert values["MFO"] == "00873"

    assert {m["id"] for m in body["methods"]} == {"bank_transfer"}
    assert body["status"] == "invoiced"
    assert body["declaredAt"] is None


def test_an_unknown_invoice_says_the_same_thing_as_a_forged_one(client):
    """Both answer 404 with one message. A different reply for "signed but
    deleted" would confirm which payout ids exist."""
    forged = client.get("/api/v1/invoices/not.a.token")
    missing = client.get(f"/api/v1/invoices/{invoice_link.sign('nope', 'INV-X')}")

    assert forged.status_code == missing.status_code == 404
    assert forged.json()["detail"] == missing.json()["detail"]


def test_reissuing_the_invoice_retires_the_link_already_sent(client):
    """The token is bound to the invoice number, so a corrected invoice does
    not leave the superseded one payable."""
    payout_id, _, _ = _invoiced_payout(invoice_number="INV-OLD")
    old_link = invoice_link.sign(payout_id, "INV-OLD")
    assert client.get(f"/api/v1/invoices/{old_link}").status_code == 200

    with SessionLocal() as db:
        payout = db.query(JobPayout).filter(JobPayout.id == payout_id).first()
        payout.invoiceNumber = "INV-NEW"
        db.commit()

    assert client.get(f"/api/v1/invoices/{old_link}").status_code == 404
    assert client.get(
        f"/api/v1/invoices/{invoice_link.sign(payout_id, 'INV-NEW')}"
    ).status_code == 200


# --- pressing the button --------------------------------------------------

def test_pressing_pay_records_the_declaration_and_tells_the_admins(client):
    admin = make_user(role="admin", phone=f"+9989{uuid.uuid4().int % 10**8:08d}")
    payout_id, job, _ = _invoiced_payout()
    token = invoice_link.sign(payout_id, "INV-20260907-ABCD1234")

    resp = client.post(f"/api/v1/invoices/{token}/pay",
                       json={"method": "bank_transfer", "reference": "PO-4471"})
    assert resp.status_code == 200
    body = resp.json()

    # Not "paid". This endpoint has the payer's word and nothing else, and the
    # status has to keep saying so until a bank statement is checked.
    assert body["status"] == "payment_declared"
    assert body["paidMethod"] == "bank_transfer"
    assert body["paidReference"] == "PO-4471"
    assert body["declaredAt"]

    with SessionLocal() as db:
        payout = db.query(JobPayout).filter(JobPayout.id == payout_id).first()
        assert payout.status == "payment_declared"
        assert payout.invoicePaidDeclaredAt is not None

        notes = db.query(Notification).filter(Notification.userId == admin.id).all()
        assert len(notes) == 1
        assert "INV-20260907-ABCD1234" in notes[0].message
        assert notes[0].relatedJobId == job.id


def test_a_method_the_deployment_does_not_offer_is_refused(client):
    """The card rail appears only when a provider is configured. Accepting it
    anyway would record a payment through a route that does not exist."""
    payout_id, _, _ = _invoiced_payout()
    token = invoice_link.sign(payout_id, "INV-20260907-ABCD1234")

    resp = client.post(f"/api/v1/invoices/{token}/pay", json={"method": "card"})
    assert resp.status_code == 400

    with SessionLocal() as db:
        assert db.query(JobPayout).filter(JobPayout.id == payout_id).first().status == "invoiced"


def test_the_same_invoice_cannot_be_declared_twice(client):
    """A double-tap on a phone, or the link opened again a week later."""
    payout_id, _, _ = _invoiced_payout()
    token = invoice_link.sign(payout_id, "INV-20260907-ABCD1234")

    assert client.post(f"/api/v1/invoices/{token}/pay",
                       json={"method": "bank_transfer"}).status_code == 200
    second = client.post(f"/api/v1/invoices/{token}/pay",
                         json={"method": "bank_transfer", "reference": "PO-9999"})
    assert second.status_code == 409

    with SessionLocal() as db:
        payout = db.query(JobPayout).filter(JobPayout.id == payout_id).first()
        # The first declaration stands; the second does not overwrite it.
        assert payout.invoicePaidReference is None


# --- the email itself -----------------------------------------------------

def test_the_email_carries_the_button_in_both_halves():
    """A client that refuses HTML still has to be able to pay, and a spam
    filter compares the two parts."""
    from app.api.v1.endpoints.admin.admin_payouts import _render_invoice

    payout_id, job, employer = _invoiced_payout()
    with SessionLocal() as db:
        payout = db.query(JobPayout).filter(JobPayout.id == payout_id).first()
        cfg = db.query(SystemSetting).first()
        emp = db.query(User).filter(User.id == employer.id).first()
        url = invoice_link.invoice_url(payout.id, payout.invoiceNumber)
        text, html = _render_invoice(payout=payout, job=job, employer=emp,
                                     cfg=cfg, note=None, pay_url=url)

    assert url in text
    assert url in html
    assert "To'lovni amalga oshirish" in html
    # bgcolor on a table cell, not a styled anchor: Outlook drops background
    # and border-radius on <a>.
    assert 'bgcolor="#010766"' in html
    assert url.startswith("https://")


def test_a_job_title_cannot_reformat_somebody_elses_invoice():
    """Job titles are typed by employers and land in an email we send."""
    from app.api.v1.endpoints.admin.admin_payouts import _render_invoice

    payout_id, job, employer = _invoiced_payout(
        job_title="<script>alert(1)</script>Ombor <b>ishi</b>")
    with SessionLocal() as db:
        payout = db.query(JobPayout).filter(JobPayout.id == payout_id).first()
        cfg = db.query(SystemSetting).first()
        emp = db.query(User).filter(User.id == employer.id).first()
        _, html = _render_invoice(payout=payout, job=job, employer=emp, cfg=cfg,
                                  note=None, pay_url="https://baito.uz/invoice/x")

    assert "<script>" not in html
    assert "&lt;script&gt;" in html
    assert "Ombor &lt;b&gt;ishi&lt;/b&gt;" in html
