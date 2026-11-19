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
from app.models import ActiveSession, Application, JobPayout, Transaction, User
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


def test_worker_detail_never_has_invoices_and_orders_reflect_completion(client):
    admin = make_user(role="admin", phone=_phone())
    employer = make_user(role="employer", phone=_phone())
    worker = make_user(role="worker", phone=_phone(), balance=0)

    job = make_job(employer.id, status=JobStatus.COMPLETED, salary=220_000)

    with SessionLocal() as db:
        # Worker applied, job completed
        app = Application(jobId=job.id, workerId=worker.id, status="hired")
        db.add(app)

        # Invoice sent to employer for this job
        payout = JobPayout(
            jobId=job.id,
            workerId=worker.id,
            employerId=employer.id,
            amount=150_000,
            status="payment_declared",
            invoiceNumber="INV-2026-TEST",
            invoiceAmount=310_000,
            receiptUrl=RECEIPT,
            paidByAdminId=admin.id,
        )
        db.add(payout)

        # Payout transaction made to worker
        tx = Transaction(
            jobId=job.id,
            employerId=employer.id,
            workerId=worker.id,
            amount=150_000 * 100,
            type="payout",
            status="paid",
        )
        db.add(tx)
        db.commit()

    login(client, admin)

    # 1. Worker detail
    res_worker = client.get(f"/api/v1/admin/users/{worker.id}/detail")
    assert res_worker.status_code == 200
    worker_data = res_worker.json()

    # Invoices must NEVER be returned for workers
    assert worker_data["invoices"] == []

    # Completed job must be reflected as completed order
    assert len(worker_data["orders"]) == 1
    assert worker_data["orders"][0]["status"] == "completed"
    assert worker_data["orders"][0]["amount"] == 220_000

    # Worker transaction must only have the payout
    assert len(worker_data["transactions"]) == 1
    assert worker_data["transactions"][0]["type"] == "payout"
    assert worker_data["transactions"][0]["amount"] == 150_000

    # 2. Employer detail
    res_employer = client.get(f"/api/v1/admin/users/{employer.id}/detail")
    assert res_employer.status_code == 200
    employer_data = res_employer.json()

    # Employer gets the invoice
    assert len(employer_data["invoices"]) == 1
    assert employer_data["invoices"][0]["invoiceNumber"] == "INV-2026-TEST"
    assert employer_data["invoices"][0]["amount"] == 310_000


def test_admin_users_list_pii_excluded_and_detail_included(client):
    admin = make_user(role="admin", phone=_phone())
    worker = make_user(role="worker", phone=_phone())
    with SessionLocal() as db:
        w = db.query(User).filter(User.id == worker.id).first()
        w.passportSeries = "AA 1234567"
        w.passportJshshir = "12345678901234"
        w.passportDocFront = "https://example.com/front.jpg"
        w.passportDocBack = "https://example.com/back.jpg"
        w.selfieWithDoc = "https://example.com/selfie.jpg"
        db.commit()

    login(client, admin)

    # 1. Bulk list must NOT contain sensitive PII
    res_list = client.get("/api/v1/admin/users")
    assert res_list.status_code == 200
    items = res_list.json()["items"]
    worker_item = next(u for u in items if u["id"] == worker.id)
    assert "passportSeries" not in worker_item
    assert "passportJshshir" not in worker_item
    assert "passportDocFront" not in worker_item
    assert "passportDocBack" not in worker_item
    assert "selfieWithDoc" not in worker_item
    assert worker_item["hasVerificationDocs"] is True

    # 2. Detail view MUST contain PII for verification
    res_detail = client.get(f"/api/v1/admin/users/{worker.id}/detail")
    assert res_detail.status_code == 200
    u_detail = res_detail.json()["user"]
    assert u_detail["passportSeries"] == "AA 1234567"
    assert u_detail["passportJshshir"] == "12345678901234"
    assert u_detail["passportDocFront"] == "https://example.com/front.jpg"

    # 3. Dedicated verification endpoint MUST contain PII
    res_verif = client.get(f"/api/v1/admin/users/{worker.id}/verification")
    assert res_verif.status_code == 200
    v_data = res_verif.json()
    assert v_data["passportSeries"] == "AA 1234567"
    assert v_data["passportJshshir"] == "12345678901234"
    assert v_data["passportDocFront"] == "https://example.com/front.jpg"
    assert v_data["hasVerificationDocs"] is True


def test_transaction_amount_bigint_no_overflow(client):
    from app.models.transaction import Transaction
    from app.services.earnings_service import WorkerEarnings

    worker = make_user(role="worker", phone=_phone())
    employer = make_user(role="employer", phone=_phone())

    job = make_job(
        employer.id,
        title="Katta loyiha",
        salary="50000000",
        location="Toshkent",
        status="in_progress",
    )

    with SessionLocal() as db:

        # 50,000,000 UZS = 5,000,000,000 tiyin (> 2^31 - 1 = 2,147,483,647)
        large_amount_uzs = 50_000_000
        tx = WorkerEarnings.credit_worker(
            db,
            job=job,
            worker_id=worker.id,
            amount_uzs=large_amount_uzs,
        )
        db.commit()

        stored_tx = db.query(Transaction).filter(Transaction.id == tx.id).first()
        assert stored_tx.amount == 5_000_000_000
        assert stored_tx.amount > 2_147_483_647


def test_admin_stats_aggregated_queries(client):
    admin = make_user(role="admin", phone=_phone())
    employer = make_user(role="employer", phone=_phone())
    worker = make_user(role="worker", phone=_phone(), balance=250_000)

    job1 = make_job(employer.id, status=JobStatus.OPEN)
    make_job(employer.id, status=JobStatus.IN_PROGRESS)
    job3 = make_job(employer.id, status=JobStatus.COMPLETED)

    with SessionLocal() as db:
        db.add(Application(jobId=job1.id, workerId=worker.id, status="pending"))
        db.add(
            Transaction(
                jobId=job3.id,
                employerId=employer.id,
                workerId=worker.id,
                amount=100_000 * 100,
                platformFee=15_000 * 100,
                type="payout",
                status="paid",
            )
        )
        db.commit()

    login(client, admin)
    res = client.get("/api/v1/admin/stats")
    assert res.status_code == 200
    data = res.json()

    assert data["totalUsers"] >= 3
    assert data["workersCount"] >= 1
    assert data["employersCount"] >= 1
    assert data["totalJobs"] >= 3
    assert data["openJobsCount"] >= 1
    assert data["activeJobsCount"] >= 1
    assert data["completedJobsCount"] >= 1
    assert data["totalApplications"] >= 1
    assert data["totalTransactions"] >= 1
    assert data["totalRevenue"] >= 15_000
    assert data["totalOwedToWorkers"] >= 250_000

