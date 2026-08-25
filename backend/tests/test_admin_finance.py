"""Tests for the administrator money controls and transaction atomicity."""

import pytest

from app.db.session import SessionLocal
from app.models import Application, Transaction, User
from app.services.escrow_service import EscrowService

from .conftest import login, make_job, make_user


# ── Withdrawal workflow ────────────────────────────────────────────────────

def _request_withdrawal(client, worker, amount=50_000):
    login(client, worker)
    resp = client.post("/api/v1/payments/withdraw", json={"amount": amount})
    assert resp.status_code == 200, resp.text
    return resp.json()["transaction_id"]


def test_pending_withdrawal_is_visible_to_admin(client):
    """Payout requests used to have no admin surface at all."""
    worker = make_user(phone="+998921111101", balance=100_000)
    tx_id = _request_withdrawal(client, worker)

    admin = make_user(role="admin", phone="+998921111102")
    login(client, admin)

    body = client.get("/api/v1/admin/withdrawals").json()
    assert body["total"] == 1
    assert body["items"][0]["id"] == tx_id
    assert body["items"][0]["amountUzs"] == 50_000


def test_rejecting_a_withdrawal_returns_the_money(client):
    """The debit happened at request time; rejecting has to give it back."""
    worker = make_user(phone="+998921111103", balance=100_000)
    tx_id = _request_withdrawal(client, worker)

    with SessionLocal() as db:
        assert db.query(User).filter(User.id == worker.id).first().balance == 50_000

    admin = make_user(role="admin", phone="+998921111104")
    login(client, admin)
    resp = client.patch(f"/api/v1/admin/withdrawals/{tx_id}",
                        json={"action": "reject", "reason": "Karta raqami xato"})
    assert resp.status_code == 200

    with SessionLocal() as db:
        assert db.query(User).filter(User.id == worker.id).first().balance == 100_000
        assert db.query(Transaction).filter(Transaction.id == tx_id).first().status == "canceled"
        from app.models import AuditLedger
        assert db.query(AuditLedger).filter(
            AuditLedger.referenceId == tx_id, AuditLedger.entryType == "refund"
        ).count() == 1


def test_approving_a_withdrawal_keeps_the_debit(client):
    worker = make_user(phone="+998921111105", balance=100_000)
    tx_id = _request_withdrawal(client, worker)

    admin = make_user(role="admin", phone="+998921111106")
    login(client, admin)
    resp = client.patch(f"/api/v1/admin/withdrawals/{tx_id}",
                        json={"action": "approve", "reason": "To'landi", "reference": "REF-1"})
    assert resp.status_code == 200

    with SessionLocal() as db:
        assert db.query(User).filter(User.id == worker.id).first().balance == 50_000
        tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
        assert tx.status == "paid" and tx.providerTransactionId == "REF-1"


def test_a_withdrawal_cannot_be_decided_twice(client):
    worker = make_user(phone="+998921111107", balance=100_000)
    tx_id = _request_withdrawal(client, worker)

    admin = make_user(role="admin", phone="+998921111108")
    login(client, admin)
    first = client.patch(f"/api/v1/admin/withdrawals/{tx_id}",
                         json={"action": "reject", "reason": "Xato"})
    second = client.patch(f"/api/v1/admin/withdrawals/{tx_id}",
                          json={"action": "reject", "reason": "Yana"})
    assert first.status_code == 200
    assert second.status_code == 400

    with SessionLocal() as db:
        # The refund must not be applied twice.
        assert db.query(User).filter(User.id == worker.id).first().balance == 100_000


def test_withdrawal_decision_requires_admin(client):
    worker = make_user(phone="+998921111109", balance=100_000)
    tx_id = _request_withdrawal(client, worker)

    assert client.patch(f"/api/v1/admin/withdrawals/{tx_id}",
                        json={"action": "approve", "reason": "o'zimga"}).status_code == 403


# ── Escrow controls ────────────────────────────────────────────────────────

def _hire_with_escrow(client, employer, worker, job):
    with SessionLocal() as db:
        app = Application(jobId=job.id, workerId=worker.id, status="applied")
        db.add(app)
        db.commit()
        app_id = app.id
    login(client, employer)
    assert client.post(f"/api/v1/applications/{app_id}/hire").status_code == 200
    return app_id


def test_admin_can_refund_a_frozen_wage(client):
    """Disputes could change a job's status but never move the money."""
    employer = make_user(role="employer", phone="+998921111110", balance=1_000_000)
    worker = make_user(phone="+998921111111")
    job = make_job(employer.id, salary="250000")
    _hire_with_escrow(client, employer, worker, job)

    with SessionLocal() as db:
        assert db.query(User).filter(User.id == employer.id).first().balance == 750_000

    admin = make_user(role="admin", phone="+998921111112")
    login(client, admin)
    resp = client.post(f"/api/v1/admin/jobs/{job.id}/escrow",
                       json={"action": "refund", "reason": "Nizo ish beruvchi foydasiga"})
    assert resp.status_code == 200
    assert resp.json()["amountUzs"] == 250_000

    with SessionLocal() as db:
        assert db.query(User).filter(User.id == employer.id).first().balance == 1_000_000


def test_admin_can_release_a_frozen_wage_to_the_worker(client):
    employer = make_user(role="employer", phone="+998921111113", balance=1_000_000)
    worker = make_user(phone="+998921111114", balance=0)
    job = make_job(employer.id, salary="250000")
    _hire_with_escrow(client, employer, worker, job)

    admin = make_user(role="admin", phone="+998921111115")
    login(client, admin)
    resp = client.post(f"/api/v1/admin/jobs/{job.id}/escrow",
                       json={"action": "release", "reason": "Nizo ishchi foydasiga",
                             "workerId": worker.id})
    assert resp.status_code == 200

    with SessionLocal() as db:
        # 250 000 minus the 10% platform fee.
        assert db.query(User).filter(User.id == worker.id).first().balance == 225_000


def test_escrow_holds_are_listed_for_admin(client):
    employer = make_user(role="employer", phone="+998921111116", balance=1_000_000)
    worker = make_user(phone="+998921111117")
    job = make_job(employer.id, salary="250000")
    _hire_with_escrow(client, employer, worker, job)

    admin = make_user(role="admin", phone="+998921111118")
    login(client, admin)
    body = client.get("/api/v1/admin/escrow").json()
    assert body["total"] == 1
    assert body["items"][0]["jobId"] == job.id
    assert body["items"][0]["amountUzs"] == 250_000


# ── Transaction atomicity (TX-01) ──────────────────────────────────────────

def test_escrow_service_does_not_commit_on_its_own(client):
    """The service used to commit internally while callers committed again.

    A failure between the two left the employer's money frozen against a job
    nobody was hired for. Rolling back must now undo the hold completely.
    """
    employer = make_user(role="employer", phone="+998921111119", balance=1_000_000)
    job = make_job(employer.id, salary="250000")

    with SessionLocal() as db:
        EscrowService.hold_funds(db, employer_id=employer.id, job_id=job.id, amount_uzs=250_000)
        # Nothing has been committed yet, so abandoning the session must leave
        # no trace of the hold.
        db.rollback()

    with SessionLocal() as db:
        assert db.query(User).filter(User.id == employer.id).first().balance == 1_000_000
        assert db.query(Transaction).filter(Transaction.jobId == job.id).count() == 0


def test_failed_hire_does_not_leave_money_frozen(client):
    """A hire that raises after the hold must not keep the wage frozen."""
    employer = make_user(role="employer", phone="+998921111120", balance=1_000_000)
    worker = make_user(phone="+998921111121")
    job = make_job(employer.id, salary="250000")

    with SessionLocal() as db:
        app = Application(jobId=job.id, workerId=worker.id, status="applied")
        db.add(app)
        db.commit()
        app_id = app.id

    login(client, employer)

    # Force a failure after the escrow hold but before the handler commits.
    import app.api.v1.endpoints.applications as applications_module
    original = applications_module.get_job_dates_set if hasattr(
        applications_module, "get_job_dates_set") else None

    from app.api.v1.endpoints import job_actions

    def boom(_job):
        raise RuntimeError("injected failure after escrow hold")

    monkey = job_actions.get_job_dates_set
    job_actions.get_job_dates_set = boom
    try:
        with pytest.raises(Exception):
            client.post(f"/api/v1/applications/{app_id}/hire")
    finally:
        job_actions.get_job_dates_set = monkey
        if original is not None:
            applications_module.get_job_dates_set = original

    with SessionLocal() as db:
        # Balance untouched and no orphaned hold left behind.
        assert db.query(User).filter(User.id == employer.id).first().balance == 1_000_000
        assert db.query(Transaction).filter(
            Transaction.jobId == job.id, Transaction.status == "held"
        ).count() == 0


# ── Support tickets ────────────────────────────────────────────────────────

def _open_ticket(user_id: str) -> str:
    from app.models import SupportTicket
    with SessionLocal() as db:
        t = SupportTicket(userId=user_id, subject="Pul kelmadi", category="payment")
        db.add(t)
        db.commit()
        return t.id


def test_admin_can_reply_to_a_ticket(client):
    """The models and the chat UI existed; no endpoint connected them."""
    from app.models import Notification, TicketMessage

    user = make_user(phone="+998921111130")
    ticket_id = _open_ticket(user.id)

    admin = make_user(role="admin", phone="+998921111131")
    login(client, admin)

    resp = client.post(f"/api/v1/admin/support-tickets/{ticket_id}/messages",
                       json={"text": "Tekshirdik, to'lov yo'lda."})
    assert resp.status_code == 200
    assert resp.json()["message"]["isAdmin"] is True
    # A "new" ticket becomes "open" once someone answers it.
    assert resp.json()["status"] == "open"

    with SessionLocal() as db:
        assert db.query(TicketMessage).filter(TicketMessage.ticketId == ticket_id).count() == 1
        assert db.query(Notification).filter(Notification.userId == user.id).count() == 1

    body = client.get(f"/api/v1/admin/support-tickets/{ticket_id}").json()
    assert len(body["messages"]) == 1
    assert body["messages"][0]["text"] == "Tekshirdik, to'lov yo'lda."


def test_ticket_status_is_validated(client):
    user = make_user(phone="+998921111132")
    ticket_id = _open_ticket(user.id)
    admin = make_user(role="admin", phone="+998921111133")
    login(client, admin)

    assert client.patch(f"/api/v1/admin/support-tickets/{ticket_id}",
                        json={"status": "nonsense"}).status_code == 400
    assert client.patch(f"/api/v1/admin/support-tickets/{ticket_id}",
                        json={"status": "resolved"}).status_code == 200


def test_replying_requires_admin(client):
    user = make_user(phone="+998921111134")
    ticket_id = _open_ticket(user.id)
    login(client, user)
    assert client.post(f"/api/v1/admin/support-tickets/{ticket_id}/messages",
                       json={"text": "men admin emasman"}).status_code == 403
