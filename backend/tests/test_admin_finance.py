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


# ── Error reporting ────────────────────────────────────────────────────────

def test_health_reports_that_error_tracking_is_off(client):
    """The whole point is that silence must be visible."""
    body = client.get("/api/v1/health").json()
    assert body["error_reporting"] == "none"


def test_health_reports_telegram_when_configured(client, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "TELEGRAM_BOT_TOKEN", "test-token")
    monkeypatch.setattr(settings, "TELEGRAM_CHAT_ID", "123")
    assert client.get("/api/v1/health").json()["error_reporting"] == "telegram"


def test_identical_errors_are_reported_once_per_hour(monkeypatch):
    """A loop hitting one bug must not turn into hundreds of messages."""
    from app.core import error_reporter
    from app.core.config import settings

    monkeypatch.setattr(settings, "TELEGRAM_BOT_TOKEN", "test-token")
    monkeypatch.setattr(settings, "TELEGRAM_CHAT_ID", "123")

    sent = []
    monkeypatch.setattr(error_reporter._pool, "submit",
                        lambda fn, msg: sent.append(msg))

    def boom():
        raise ValueError("same failure every time")

    for _ in range(5):
        try:
            boom()
        except ValueError as e:
            error_reporter.report_exception(e, where="test")

    assert len(sent) == 1, f"expected one alert, got {len(sent)}"
    assert "ValueError" in sent[0]


def test_reporter_stays_silent_without_credentials(monkeypatch):
    from app.core import error_reporter
    from app.core.config import settings

    monkeypatch.setattr(settings, "TELEGRAM_BOT_TOKEN", "")
    monkeypatch.setattr(settings, "TELEGRAM_CHAT_ID", "")
    sent = []
    monkeypatch.setattr(error_reporter._pool, "submit", lambda fn, msg: sent.append(msg))

    try:
        raise RuntimeError("nowhere to send this")
    except RuntimeError as e:
        error_reporter.report_exception(e, where="test")

    assert sent == []


def test_reporter_never_raises(monkeypatch):
    """It runs on the error path; it must not become a second failure."""
    from app.core import error_reporter
    from app.core.config import settings

    monkeypatch.setattr(settings, "TELEGRAM_BOT_TOKEN", "test-token")
    monkeypatch.setattr(settings, "TELEGRAM_CHAT_ID", "123")

    def explode(*_a, **_k):
        raise OSError("pool is gone")

    monkeypatch.setattr(error_reporter._pool, "submit", explode)
    try:
        raise ValueError("original problem")
    except ValueError as e:
        error_reporter.report_exception(e, where="test")  # must not raise


def test_a_malformed_sentry_dsn_cannot_take_the_app_down():
    """A typo in a monitoring setting must never stop the API from serving.

    A bad DSN raised BadDsn during module import, so every uvicorn worker died
    on startup and the whole API went offline.
    """
    import importlib
    from app.core.config import settings

    original = settings.SENTRY_DSN
    settings.SENTRY_DSN = "not-a-valid-dsn"
    try:
        import app.main
        importlib.reload(app.main)          # must not raise
        assert app.main.app is not None
    finally:
        settings.SENTRY_DSN = original
        import app.main
        importlib.reload(app.main)


# ── Support, from the user's side ───────────────────────────────────────────

def test_opening_support_does_not_create_a_ticket(client):
    """The admin queue should not fill with empty tickets.

    Support is shown in the messages list for everyone, so this endpoint is
    hit on every visit to that screen.
    """
    user = make_user(role="worker", phone="+998955555001")
    login(client, user)

    body = client.get("/api/v1/support/conversation").json()
    assert body["ticketId"] is None
    assert body["messages"] == []

    admin = make_user(role="admin", phone="+998955555002")
    login(client, admin)
    tickets = client.get("/api/v1/admin/support-tickets").json()
    items = tickets if isinstance(tickets, list) else tickets.get("items", [])
    assert items == []


def test_the_first_message_opens_a_ticket_the_admin_can_answer(client):
    """The models and the admin screens existed; nothing could create a ticket."""
    user = make_user(role="worker", phone="+998955555003")
    login(client, user)

    body = client.post("/api/v1/support/messages", json={"text": "To'lov kelmadi"}).json()
    ticket_id = body["ticketId"]
    assert ticket_id
    assert [m["text"] for m in body["messages"]] == ["To'lov kelmadi"]
    assert body["messages"][0]["fromSupport"] is False

    admin = make_user(role="admin", phone="+998955555004")
    login(client, admin)
    resp = client.post(
        f"/api/v1/admin/support-tickets/{ticket_id}/messages",
        json={"text": "Tekshiryapmiz"},
    )
    assert resp.status_code == 200

    login(client, user)
    body = client.get("/api/v1/support/conversation").json()
    assert [(m["text"], m["fromSupport"]) for m in body["messages"]] == [
        ("To'lov kelmadi", False),
        ("Tekshiryapmiz", True),
    ]


def test_writing_again_continues_the_same_ticket(client):
    user = make_user(role="worker", phone="+998955555005")
    login(client, user)

    first = client.post("/api/v1/support/messages", json={"text": "Birinchi"}).json()
    second = client.post("/api/v1/support/messages", json={"text": "Ikkinchi"}).json()

    assert second["ticketId"] == first["ticketId"]
    assert len(second["messages"]) == 2


def test_support_requires_a_session(client):
    assert client.get("/api/v1/support/conversation").status_code == 401
    assert client.post("/api/v1/support/messages", json={"text": "x"}).status_code == 401


# ── Automation settings that used to be React state ────────────────────────

def _set_settings(client, admin, **values):
    login(client, admin)
    resp = client.put("/api/v1/admin/settings", json=values)
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_the_spam_word_list_is_stored_and_screens_new_postings(client):
    """The forbidden-words control edited a React array and nothing else.

    SpamFraudDetector held the list in its own source, so an administrator
    could add a word, watch it appear, and have postings containing it sail
    through — including after a reload, when the word was gone too.
    """
    admin = make_user(role="admin", phone="+998944444001")
    _set_settings(client, admin, spamKeywords="qorasuv-scheme\nboshqa-ibora")

    employer = make_user(role="employer", phone="+998944444002")
    login(client, employer)

    clean = client.post("/api/v1/jobs", json={
        "title": "Kuryer kerak", "company": "X", "salary": "300000",
        "location": "Toshkent", "description": "Oddiy ish tavsifi",
    })
    assert clean.status_code == 200, clean.text

    flagged = client.post("/api/v1/jobs", json={
        "title": "Qorasuv-scheme bo'yicha ish", "company": "X", "salary": "300000",
        "location": "Toshkent", "description": "Qorasuv-scheme orqali daromad",
    })
    assert flagged.status_code == 400
    assert "shubhali" in flagged.json()["detail"].lower()


def test_settings_survive_a_reload(client):
    """Every one of these had nowhere to be stored."""
    admin = make_user(role="admin", phone="+998944444003")
    _set_settings(
        client, admin,
        escrowAutoReleaseEnabled=True,
        escrowAutoReleaseHours=48,
        telegramDigestEnabled=True,
        telegramDigestChannel="@baito_stats",
        matchMinScore=65,
        spamAutoFineAmount=50000,
        spamAutoBanHours=24,
    )

    body = client.get("/api/v1/admin/settings").json()
    assert body["escrowAutoReleaseEnabled"] is True
    assert body["escrowAutoReleaseHours"] == 48
    assert body["telegramDigestEnabled"] is True
    assert body["telegramDigestChannel"] == "@baito_stats"
    assert body["matchMinScore"] == 65
    assert body["spamAutoFineAmount"] == 50000
    assert body["spamAutoBanHours"] == 24


def test_auto_release_does_nothing_while_it_is_switched_off(client):
    from app.tasks import auto_release_escrow

    admin = make_user(role="admin", phone="+998944444004")
    _set_settings(client, admin, escrowAutoReleaseEnabled=False)
    assert auto_release_escrow() == 0


def test_settings_are_validated(client):
    admin = make_user(role="admin", phone="+998944444005")
    login(client, admin)
    assert client.put("/api/v1/admin/settings", json={"matchMinScore": 500}).status_code == 422
    assert client.put("/api/v1/admin/settings", json={"escrowAutoReleaseHours": 0}).status_code == 422


def test_the_verification_message_uses_the_admin_s_wording(client):
    """The templates screen edited a React array; the wording was a literal."""
    admin = make_user(role="admin", phone="+998944444006")
    _set_settings(
        client, admin,
        notifVerifiedTemplate="Salom {user_name}, hujjatlaringiz tasdiqlandi.",
        notifRejectedTemplate="{user_name}, hujjatlar rad etildi.",
    )

    worker = make_user(role="worker", phone="+998944444007", name="Ali")
    login(client, admin)
    assert client.patch(
        f"/api/v1/admin/users/{worker.id}/role", json={"isVerified": True}
    ).status_code == 200

    login(client, worker)
    messages = [n["message"] for n in client.get("/api/v1/notifications").json()]
    assert "Salom Ali, hujjatlaringiz tasdiqlandi." in messages


def test_the_default_wording_is_used_when_no_template_is_set(client):
    admin = make_user(role="admin", phone="+998944444008")
    worker = make_user(role="worker", phone="+998944444009", name="Vali")
    login(client, admin)
    client.patch(f"/api/v1/admin/users/{worker.id}/role", json={"isVerified": False})

    login(client, worker)
    messages = [n["message"] for n in client.get("/api/v1/notifications").json()]
    assert any("rad etildi" in m for m in messages)
