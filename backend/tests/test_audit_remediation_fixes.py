"""Tests for Senior Fullstack audit remediations:
1. Phone update requires SMS verification grant.
2. Multi-vacancy jobs allow distinct payouts per hired worker.
3. WebSocket chat rejects idle/expired sessions.
4. Worker withdrawals do not leak into employer transaction ledger.
"""

from datetime import datetime, timedelta, timezone
import uuid

from app.core import security
from app.core.phone import issue_verification_grant
from app.db.session import SessionLocal
from app.models import ActiveSession, Application, Job, JobPayout, Transaction, User
from app.models.job import JobStatus
from app.api.v1.endpoints.chats.websocket import _authenticate_socket
from .conftest import login, make_job, make_user

RECEIPT = "/api/v1/media/receipt-test.pdf"


def _phone():
    return f"+9989{uuid.uuid4().int % 10**8:08d}"


def test_phone_update_requires_sms_verification(client):
    user = make_user(role="worker", phone=_phone())
    login(client, user)

    # 1. Updating name without changing phone succeeds
    res = client.put("/api/v1/users/me", json={"name": "Yangi Ism"})
    assert res.status_code == 200
    assert res.json()["name"] == "Yangi Ism"

    # 2. Updating phone without verification token fails
    new_phone = _phone()
    res = client.put("/api/v1/users/me", json={"phone": new_phone})
    assert res.status_code == 400
    assert "Telefon raqam tasdiqlanmagan" in res.json()["detail"]

    # 3. Updating phone with invalid verification token fails
    res = client.put(
        "/api/v1/users/me",
        json={"phone": new_phone, "verification_token": "invalid_fake_token"},
    )
    assert res.status_code == 400
    assert "Telefon raqam tasdiqlanmagan" in res.json()["detail"]

    # 4. Updating phone with valid verification token succeeds
    valid_token = issue_verification_grant(new_phone)
    res = client.put(
        "/api/v1/users/me",
        json={"phone": new_phone, "verification_token": valid_token},
    )
    assert res.status_code == 200
    assert res.json()["phone"] == new_phone

    with SessionLocal() as db:
        db_user = db.query(User).filter(User.id == user.id).first()
        assert db_user.phone == new_phone


def test_multi_vacancy_payouts_for_multiple_workers(client):
    admin = make_user(role="admin", phone=_phone())
    employer = make_user(role="employer", phone=_phone())
    worker_a = make_user(role="worker", phone=_phone(), balance=300_000)
    worker_b = make_user(role="worker", phone=_phone(), balance=400_000)

    job = make_job(
        employer.id,
        status=JobStatus.COMPLETED,
        hiredWorkerId=worker_a.id,
        neededWorkers="2",
    )

    with SessionLocal() as db:
        db.add(Application(jobId=job.id, workerId=worker_a.id, status="completed"))
        db.add(Application(jobId=job.id, workerId=worker_b.id, status="completed"))
        db.commit()

    login(client, admin)

    # 1. Query payout info for job
    res_info = client.get(f"/api/v1/admin/jobs/{job.id}/payout")
    assert res_info.status_code == 200
    info_json = res_info.json()
    assert "workers" in info_json
    assert len(info_json["workers"]) == 2

    # 2. Pay out Worker A
    res_payout_a = client.post(
        f"/api/v1/admin/jobs/{job.id}/payout",
        json={"amount": 300_000, "receiptUrl": RECEIPT, "workerId": worker_a.id},
    )
    assert res_payout_a.status_code == 200
    assert res_payout_a.json()["workerId"] == worker_a.id

    # 3. Paying Worker A again fails with 409
    res_dup_a = client.post(
        f"/api/v1/admin/jobs/{job.id}/payout",
        json={"amount": 300_000, "receiptUrl": RECEIPT, "workerId": worker_a.id},
    )
    assert res_dup_a.status_code == 409

    # 4. Pay out Worker B for the SAME job succeeds
    res_payout_b = client.post(
        f"/api/v1/admin/jobs/{job.id}/payout",
        json={"amount": 400_000, "receiptUrl": RECEIPT, "workerId": worker_b.id},
    )
    assert res_payout_b.status_code == 200
    assert res_payout_b.json()["workerId"] == worker_b.id

    # 5. Paying Worker B again fails with 409
    res_dup_b = client.post(
        f"/api/v1/admin/jobs/{job.id}/payout",
        json={"amount": 400_000, "receiptUrl": RECEIPT, "workerId": worker_b.id},
    )
    assert res_dup_b.status_code == 409

    with SessionLocal() as db:
        # Both workers debited
        assert db.query(User).filter(User.id == worker_a.id).first().balance == 0
        assert db.query(User).filter(User.id == worker_b.id).first().balance == 0
        # Both JobPayouts exist
        payouts = db.query(JobPayout).filter(JobPayout.jobId == job.id).all()
        assert len(payouts) == 2


def test_websocket_rejects_expired_idle_session(client):
    user = make_user(role="worker", phone=_phone())

    # Create active session
    with SessionLocal() as db:
        active_sess = ActiveSession(
            user_uid=user.uid,
            device_name="Browser",
            is_active=True,
            last_active_at=datetime.now(timezone.utc),
        )
        db.add(active_sess)
        db.commit()
        db.refresh(active_sess)
        active_sid = active_sess.id

    valid_token = security.create_access_token(user.uid, sid=active_sid)
    user_info = _authenticate_socket(valid_token)
    assert user_info is not None
    assert user_info["id"] == user.id

    # Now simulate an idle session older than 7 days
    with SessionLocal() as db:
        idle_sess = ActiveSession(
            user_uid=user.uid,
            device_name="Old Phone",
            is_active=True,
            last_active_at=datetime.now(timezone.utc) - timedelta(days=8),
        )
        db.add(idle_sess)
        db.commit()
        db.refresh(idle_sess)
        idle_sid = idle_sess.id

    idle_token = security.create_access_token(user.uid, sid=idle_sid)
    expired_info = _authenticate_socket(idle_token)
    assert expired_info is None


def test_worker_withdrawal_isolated_from_employer_transactions(client):
    user = make_user(role="employer", phone=_phone(), balance=500_000)

    with SessionLocal() as db:
        # Create a withdrawal transaction where workerId is set (made by worker)
        tx = Transaction(
            employerId=user.id,
            workerId=user.id,
            amount=100_000 * 100,
            type="withdraw",
            status="pending",
        )
        db.add(tx)
        db.commit()

    login(client, user)
    res = client.get("/api/v1/payments/transactions")
    assert res.status_code == 200
    transactions = res.json()
    # The transaction should NOT appear in employer view because workerId is not None
    assert len(transactions) == 0
