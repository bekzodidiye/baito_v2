"""Adversarial stress-testing suite for Challenger M1-2:
1. Financial Settlement & Wage Crediting Idempotency:
   - Zero duplicate wage crediting across duplicate applications in complete_job_day.
   - Zero duplicate wage and bonus crediting across duplicate applications in complete_job.
   - Zero duplicate transactions and zero duplicate audit ledger entries.
   - Replay protection on complete_job_day and complete_job.
   - Admin JobPayout duplicate prevention (HTTP 409 and DB UniqueConstraint).
2. Rapid Job Submission & Idempotency:
   - Rapid double-click within 10s deduplication returning existing job with zero duplicate JobDays.
   - Multi-burst submission (5 rapid submissions) with 0 duplicate jobs and 0 duplicate shift days.
   - Idempotency-Key header caching and replay returning exact job without duplicate days.
   - Multi-day 5-day shift rapid deduplication.
   - Concurrent job submissions stress-test via ThreadPoolExecutor.
3. Health Check Degradation:
   - Graceful HTTP 503 and degraded status on Database exception/disconnect.
   - Graceful HTTP 503 and degraded status on Redis ping failure/exception.
   - Graceful HTTP 503 when both Database and Redis fail simultaneously.
   - Graceful HTTP 503 when Redis fallback is in-memory mock.
   - Verification of both /api/health and /api/v1/health routes.
"""

import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone, timedelta
from unittest.mock import patch

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError, OperationalError
import sqlalchemy.orm

from app.core.exceptions import InvalidJobStateError
from app.db.session import SessionLocal
from app.models import (
    Application,
    AuditLedger,
    Job,
    JobDay,
    JobPayout,
    Transaction,
    User,
)
from app.models.job import JobStatus
from app.models.job_payout import PayoutStatus
from app.services.job_service import JobService
from app.services import job_days
from tests.conftest import make_user, make_job, login


# ==============================================================================
# CHALLENGE SUITE 1: Financial Settlement, Duplicate Applications & Wage Crediting
# ==============================================================================

def test_complete_job_day_duplicate_applications_zero_duplicate_crediting():
    """Stress test complete_job_day against duplicate applications.

    Confirms:
    - Zero duplicate wage crediting on worker balance.
    - Zero duplicate Transaction rows created.
    - Zero duplicate AuditLedger entries created.
    - Replay protection prevents double completion.
    """
    employer = make_user(role="employer", phone="+998902000001", name="Emp Fin 1")
    worker1 = make_user(role="worker", phone="+998902000002", name="Worker Fin 1", balance=50_000)
    worker2 = make_user(role="worker", phone="+998902000003", name="Worker Fin 2", balance=20_000)

    # Multi-day job: 2 days at 100,000 UZS/day
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    tomorrow_str = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
    work_dates_str = f"{today_str}, {tomorrow_str}"

    job = make_job(
        employer.id,
        title="Multi-Day Shift Crediting Test",
        salary="100000",
        workDate=work_dates_str,
        status=JobStatus.CONFIRMED,
        hiredWorkerId=worker1.id,
    )

    with SessionLocal() as db:
        # Create day records and commit
        job_db = db.query(Job).filter(Job.id == job.id).first()
        days = job_days.sync_days(db, job_db)
        db.commit()
        assert len(days) == 2
        day1_id = days[0].id

        # Insert legitimate applications for both workers
        app1 = Application(id=str(uuid.uuid4()), jobId=job.id, workerId=worker1.id, status="confirmed")
        app2 = Application(id=str(uuid.uuid4()), jobId=job.id, workerId=worker2.id, status="confirmed")
        db.add_all([app1, app2])
        db.commit()

    # Intercept Query.all to simulate duplicate application records being returned
    # Worker 1 appears 3 times, Worker 2 appears 2 times
    original_all = sqlalchemy.orm.Query.all

    def duplicate_apps_query_all(self):
        result = original_all(self)
        if result and isinstance(result[0], Application):
            w1_apps = [a for a in result if a.workerId == worker1.id]
            w2_apps = [a for a in result if a.workerId == worker2.id]
            if w1_apps and w2_apps:
                # 3 copies of worker 1, 2 copies of worker 2
                return [w1_apps[0], w1_apps[0], w1_apps[0], w2_apps[0], w2_apps[0]]
        return result

    with SessionLocal() as db:
        with pytest.MonkeyPatch.context() as mp:
            mp.setattr(sqlalchemy.orm.Query, "all", duplicate_apps_query_all)
            result = JobService.complete_job_day(
                db=db,
                job_id=job.id,
                day_id=day1_id,
                current_user=employer,
            )

            assert result["success"] is True
            assert result["paid_workers"] == 2  # exactly 2 distinct workers paid, NOT 5!
            assert result["unpaid_workers"] == 0

    # Verify balances, transactions, and ledgers in clean DB session
    with SessionLocal() as db:
        w1 = db.query(User).filter(User.id == worker1.id).first()
        w2 = db.query(User).filter(User.id == worker2.id).first()

        # Each worker must receive exactly 100,000 UZS (1 day's wage)
        assert w1.balance == 50_000 + 100_000  # 150,000, NOT 350,000
        assert w2.balance == 20_000 + 100_000  # 120,000, NOT 220,000

        # Check Transactions: exactly 2 rows for day1 (1 per worker)
        txs = db.query(Transaction).filter(
            Transaction.jobId == job.id,
            Transaction.jobDayId == day1_id,
            Transaction.type == "worker_earning",
        ).all()
        assert len(txs) == 2
        worker_ids_in_tx = {t.workerId for t in txs}
        assert worker_ids_in_tx == {worker1.id, worker2.id}

        # Check AuditLedger entries: exactly 2 entries (1 per worker)
        ledgers = db.query(AuditLedger).filter(
            AuditLedger.referenceId == job.id,
            AuditLedger.entryType == "worker_earning",
        ).all()
        assert len(ledgers) == 2
        ledger_user_ids = {ledger.userId for ledger in ledgers}
        assert ledger_user_ids == {worker1.id, worker2.id}

    # REPLAY ATTACK: Attempting to complete the same day again must fail
    with SessionLocal() as db:
        with pytest.raises(InvalidJobStateError) as exc_info:
            JobService.complete_job_day(
                db=db,
                job_id=job.id,
                day_id=day1_id,
                current_user=employer,
            )
        assert "allaqachon yakunlangan" in str(exc_info.value).lower()

    # Verify zero balance or transaction inflation occurred after replay attack
    with SessionLocal() as db:
        w1_after = db.query(User).filter(User.id == worker1.id).first()
        assert w1_after.balance == 150_000
        tx_count_after = db.query(Transaction).filter(Transaction.jobId == job.id).count()
        assert tx_count_after == 2


def test_complete_job_duplicate_applications_and_bonus_zero_duplicate_crediting():
    """Stress test complete_job against duplicate applications with a bonus.

    Confirms:
    - Zero duplicate wage crediting.
    - Zero duplicate bonus crediting.
    - Exactly 1 wage transaction and 1 bonus transaction per distinct worker.
    - Exactly 1 wage ledger and 1 bonus ledger per distinct worker.
    - Replay protection on complete_job.
    """
    employer = make_user(role="employer", phone="+998902000004", name="Emp Fin 2")
    worker = make_user(role="worker", phone="+998902000005", name="Worker Fin Single", balance=0)

    job = make_job(
        employer.id,
        title="Single Day Bonus Stress Test",
        salary="120000",
        status=JobStatus.CONFIRMED,
        hiredWorkerId=worker.id,
    )

    with SessionLocal() as db:
        job_db = db.query(Job).filter(Job.id == job.id).first()
        job_days.sync_days(db, job_db)
        # Create real application
        app = Application(id=str(uuid.uuid4()), jobId=job.id, workerId=worker.id, status="confirmed", bonus=0)
        db.add(app)
        db.commit()

    # Intercept Query.all to simulate 4 duplicate applications for the worker
    original_all = sqlalchemy.orm.Query.all

    def duplicate_apps_query_all(self):
        result = original_all(self)
        if result and isinstance(result[0], Application):
            # Duplicate the application 4 times
            return [result[0], result[0], result[0], result[0]]
        return result

    with SessionLocal() as db:
        with pytest.MonkeyPatch.context() as mp:
            mp.setattr(sqlalchemy.orm.Query, "all", duplicate_apps_query_all)
            result = JobService.complete_job(
                db=db,
                job_id=job.id,
                rating=5,
                review="A'lo ish!",
                bonus=30_000,
                current_user=employer,
            )
            assert result["success"] is True

    # Check worker balance, transactions, and ledgers
    with SessionLocal() as db:
        w = db.query(User).filter(User.id == worker.id).first()
        # Expected: 120,000 wage + 30,000 bonus = 150,000 UZS.
        # If not deduplicated: 4 * 120k + 4 * 30k = 600,000 UZS!
        assert w.balance == 150_000

        # Wage transactions: exactly 1
        wage_txs = db.query(Transaction).filter(
            Transaction.jobId == job.id,
            Transaction.type == "worker_earning",
        ).all()
        assert len(wage_txs) == 1
        assert wage_txs[0].amount == 120_000 * 100

        # Bonus transactions: exactly 1
        bonus_txs = db.query(Transaction).filter(
            Transaction.jobId == job.id,
            Transaction.type == "completion_bonus",
        ).all()
        assert len(bonus_txs) == 1
        assert bonus_txs[0].amount == 30_000 * 100

        # Total ledgers: exactly 2 (1 wage, 1 bonus)
        ledgers = db.query(AuditLedger).filter(AuditLedger.referenceId == job.id).all()
        assert len(ledgers) == 2
        entry_types = {ledger.entryType for ledger in ledgers}
        assert entry_types == {"worker_earning", "completion_bonus"}

    # REPLAY ATTACK: Re-completing an already completed job must raise InvalidJobStateError
    with SessionLocal() as db:
        with pytest.raises(InvalidJobStateError) as exc_info:
            JobService.complete_job(
                db=db,
                job_id=job.id,
                rating=5,
                review="Takroriy",
                bonus=30_000,
                current_user=employer,
            )
        assert "allaqachon yakunlangan" in str(exc_info.value).lower()


def test_adversarial_payout_creation_double_spend_prevention(client: TestClient):
    """Stress test admin payout creation against double payouts and race conditions.

    Confirms:
    - First payout succeeds and debits worker balance.
    - Duplicate payout attempt via API returns HTTP 409 Conflict.
    - Direct duplicate insertion at DB layer violates uq_job_payout_job_worker UniqueConstraint.
    - Zero double payout debiting of worker balance.
    - Zero duplicate AuditLedger payout entries.
    """
    admin = make_user(role="admin", phone="+998902000006")
    employer = make_user(role="employer", phone="+998902000007")
    worker = make_user(role="worker", phone="+998902000008", balance=250_000)

    job = make_job(
        employer.id,
        title="Admin Payout Stress Job",
        salary="250000",
        status=JobStatus.COMPLETED,
        hiredWorkerId=worker.id,
    )

    with SessionLocal() as db:
        app = Application(
            id=str(uuid.uuid4()),
            jobId=job.id,
            workerId=worker.id,
            status="completed",
        )
        db.add(app)
        db.commit()

    login(client, admin)

    payout_payload = {
        "amount": 250_000,
        "workerId": worker.id,
        "receiptUrl": "https://storage.baito.uz/receipts/test_rec_01.jpg",
        "note": "Bank transfer confirmed",
    }

    # 1. First payout creation
    resp1 = client.post(f"/api/v1/admin/jobs/{job.id}/payout", json=payout_payload)
    assert resp1.status_code == 200, resp1.text

    # 2. Duplicate payout attempt on same job & worker via API
    resp2 = client.post(f"/api/v1/admin/jobs/{job.id}/payout", json=payout_payload)
    assert resp2.status_code == 409
    assert "allaqachon tasdiqlangan" in resp2.json()["detail"].lower()

    # 3. Verify worker balance was debited exactly once
    with SessionLocal() as db:
        w = db.query(User).filter(User.id == worker.id).first()
        assert w.balance == 0  # 250,000 - 250,000 = 0 (NOT negative -250,000!)

        # Exactly 1 JobPayout record in DB
        payouts = db.query(JobPayout).filter(JobPayout.jobId == job.id).all()
        assert len(payouts) == 1
        assert payouts[0].amount == 250_000

        # Exactly 1 AuditLedger payout entry
        ledgers = db.query(AuditLedger).filter(
            AuditLedger.referenceId == job.id,
            AuditLedger.entryType == "payout",
        ).all()
        assert len(ledgers) == 1
        assert ledgers[0].amountDelta == -250_000

    # 4. Stress test DB level UniqueConstraint (DEF-BE-06): uq_job_payout_job_worker
    with SessionLocal() as db:
        duplicate_payout = JobPayout(
            id=str(uuid.uuid4()),
            jobId=job.id,
            workerId=worker.id,
            employerId=employer.id,
            amount=250_000,
            receiptUrl="https://storage.baito.uz/receipts/duplicate.jpg",
            paidByAdminId=admin.id,
            status=PayoutStatus.PAID,
        )
        db.add(duplicate_payout)
        with pytest.raises(IntegrityError):
            db.commit()


# ==============================================================================
# CHALLENGE SUITE 2: Rapid Job Submission, Deduplication & Shift Days Integrity
# ==============================================================================

def test_rapid_job_submission_double_click_returns_existing_with_zero_duplicate_days(client: TestClient):
    """Stress test rapid job submission (double click within 10s).

    Confirms:
    - Rapid second click within 10s returns the exact existing Job.
    - Zero duplicate Job rows created.
    - Zero duplicate JobDay rows created (e.g. 3-day shift has strictly 3 days, not 6).
    """
    employer = make_user(role="employer", phone="+998902000009", name="Emp Rapid Clicker")
    login(client, employer)

    job_payload = {
        "title": "Adversarial 3-Day Sklad Shift",
        "company": "FastLogistics LLC",
        "salary": "300000",
        "salaryCurrency": "UZS",
        "location": "Toshkent sh., Sergeli",
        "description": "Og'ir yuklarni joylashtirish",
        "neededWorkers": "2",
        "workDate": "2026-11-20, 2026-11-21, 2026-11-22",
        "workTime": "08:00 - 17:00",
    }

    # First click
    resp1 = client.post("/api/v1/jobs/", json=job_payload)
    assert resp1.status_code == 200, resp1.text
    job1_data = resp1.json()
    job1_id = job1_data["id"]

    # Second click immediately (double-click simulation)
    resp2 = client.post("/api/v1/jobs/", json=job_payload)
    assert resp2.status_code == 200, resp2.text
    job2_data = resp2.json()
    job2_id = job2_data["id"]

    # Must cleanly return the identical existing job
    assert job1_id == job2_id

    with SessionLocal() as db:
        # Strictly 1 Job row
        jobs_count = db.query(Job).filter(Job.id == job1_id).count()
        assert jobs_count == 1

        # Strictly 3 JobDay rows for this job (Zero duplicate shift days!)
        day_rows = db.query(JobDay).filter(JobDay.jobId == job1_id).order_by(JobDay.workDate.asc()).all()
        assert len(day_rows) == 3
        dates = [d.workDate for d in day_rows]
        assert dates == ["2026-11-20", "2026-11-21", "2026-11-22"]


def test_rapid_job_submission_burst_5_clicks_zero_duplicate_jobs_or_days(client: TestClient):
    """Stress test a burst of 5 rapid submissions within 10s.

    Confirms:
    - All 5 responses return the identical job ID.
    - Exactly 1 Job row in DB.
    - Exactly the declared number of JobDay rows in DB.
    """
    employer = make_user(role="employer", phone="+998902000010", name="Emp Burst Clicker")
    login(client, employer)

    job_payload = {
        "title": "Burst Click Cafe Shift",
        "company": "Kofe va Choy",
        "salary": "180000",
        "salaryCurrency": "UZS",
        "location": "Toshkent sh., Mirzo Ulug'bek",
        "description": "Barista yordamchisi",
        "neededWorkers": "1",
        "workDate": "2026-11-25, 2026-11-26",
        "workTime": "09:00 - 18:00",
    }

    job_ids = []
    for _ in range(5):
        resp = client.post("/api/v1/jobs/", json=job_payload)
        assert resp.status_code == 200
        job_ids.append(resp.json()["id"])

    # All 5 return the same job ID
    assert len(set(job_ids)) == 1
    master_job_id = job_ids[0]

    with SessionLocal() as db:
        # Strictly 1 Job
        assert db.query(Job).filter(Job.id == master_job_id).count() == 1
        # Strictly 2 JobDays
        days = db.query(JobDay).filter(JobDay.jobId == master_job_id).all()
        assert len(days) == 2


def test_rapid_job_submission_5_day_shift_deduplication(client: TestClient):
    """Stress test rapid submission on a 5-day posting.

    Confirms:
    - Exactly 5 JobDays created, never 10.
    """
    employer = make_user(role="employer", phone="+998902000012", name="Emp 5-Day Shift")
    login(client, employer)

    job_payload = {
        "title": "Construction 5-Day Shift",
        "company": "BuildMaster LLC",
        "salary": "220000",
        "salaryCurrency": "UZS",
        "location": "Toshkent sh., Olmazor",
        "description": "G'isht terish yordamchisi",
        "neededWorkers": "3",
        "workDate": "2026-12-01, 2026-12-02, 2026-12-03, 2026-12-04, 2026-12-05",
        "workTime": "08:00 - 17:00",
    }

    # Double click
    r1 = client.post("/api/v1/jobs/", json=job_payload)
    r2 = client.post("/api/v1/jobs/", json=job_payload)
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r1.json()["id"] == r2.json()["id"]

    with SessionLocal() as db:
        days = db.query(JobDay).filter(JobDay.jobId == r1.json()["id"]).all()
        assert len(days) == 5


def test_job_submission_idempotency_key_replay_and_zero_duplicate_days(client: TestClient):
    """Stress test job submission with Idempotency-Key header.

    Confirms:
    - Request replay with same Idempotency-Key returns cached response.
    - Zero duplicate Job or JobDay rows created.
    """
    employer = make_user(role="employer", phone="+998902000011", name="Emp Idem Key")
    login(client, employer)

    job_payload = {
        "title": "Idempotent Driver Job",
        "company": "Express Delivery",
        "salary": "250000",
        "salaryCurrency": "UZS",
        "location": "Toshkent sh., Yakkasaroy",
        "description": "Kuryerlik xizmati",
        "neededWorkers": "1",
        "workDate": "2026-11-28",
        "workTime": "10:00 - 19:00",
    }

    idem_key = f"adversarial-key-{uuid.uuid4()}"
    headers = {"Idempotency-Key": idem_key}

    # Initial submission
    resp1 = client.post("/api/v1/jobs/", json=job_payload, headers=headers)
    assert resp1.status_code == 200, resp1.text
    j1 = resp1.json()

    # Replay with same Idempotency-Key
    resp2 = client.post("/api/v1/jobs/", json=job_payload, headers=headers)
    assert resp2.status_code == 200, resp2.text
    j2 = resp2.json()

    assert j1["id"] == j2["id"]

    with SessionLocal() as db:
        assert db.query(Job).filter(Job.id == j1["id"]).count() == 1
        assert db.query(JobDay).filter(JobDay.jobId == j1["id"]).count() == 1


# ==============================================================================
# CHALLENGE SUITE 3: Health Check Degradation (/api/health and /api/v1/health)
# ==============================================================================

def test_health_check_healthy_baseline_returns_200(client: TestClient):
    """Health check returns HTTP 200 when DB and Redis are connected."""
    with patch("app.main.redis_is_mock", return_value=False):
        with patch("app.main.redis_client.ping", return_value=True):
            for path in ("/api/health", "/api/v1/health"):
                resp = client.get(path)
                assert resp.status_code == 200
                data = resp.json()
                assert data["status"] == "ok"
                assert data["database"] == "connected"
                assert data["redis"] == "connected"


def test_health_check_database_operational_error_returns_503_degraded(client: TestClient):
    """Health check returns HTTP 503 and degraded when DB throws OperationalError."""
    with patch("app.main.redis_is_mock", return_value=False):
        with patch("app.main.redis_client.ping", return_value=True):
            with patch("app.main.SessionLocal") as mock_session:
                mock_db = mock_session.return_value.__enter__.return_value
                mock_db.execute.side_effect = OperationalError("connection closed", "params", "orig")

                for path in ("/api/health", "/api/v1/health"):
                    resp = client.get(path)
                    assert resp.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
                    data = resp.json()
                    assert data["status"] == "degraded"
                    assert data["database"] == "unhealthy"
                    assert data["redis"] == "connected"


def test_health_check_redis_connection_error_returns_503_degraded(client: TestClient):
    """Health check returns HTTP 503 and degraded when Redis ping raises ConnectionError."""
    with patch("app.main.redis_is_mock", return_value=False):
        with patch("app.main.redis_client.ping", side_effect=ConnectionError("Redis connection refused")):
            for path in ("/api/health", "/api/v1/health"):
                resp = client.get(path)
                assert resp.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
                data = resp.json()
                assert data["status"] == "degraded"
                assert data["database"] == "connected"
                assert data["redis"] == "unhealthy"


def test_health_check_both_db_and_redis_down_returns_503_degraded(client: TestClient):
    """Health check returns HTTP 503 and degraded when both DB and Redis fail."""
    with patch("app.main.redis_is_mock", return_value=False):
        with patch("app.main.redis_client.ping", side_effect=ConnectionError("Redis down")):
            with patch("app.main.SessionLocal") as mock_session:
                mock_db = mock_session.return_value.__enter__.return_value
                mock_db.execute.side_effect = Exception("DB pool exhausted")

                for path in ("/api/health", "/api/v1/health"):
                    resp = client.get(path)
                    assert resp.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
                    data = resp.json()
                    assert data["status"] == "degraded"
                    assert data["database"] == "unhealthy"
                    assert data["redis"] == "unhealthy"


def test_health_check_in_memory_redis_fallback_returns_503_degraded(client: TestClient):
    """Health check returns HTTP 503 and degraded when Redis is unavailable (mock fallback)."""
    with patch("app.main.redis_is_mock", return_value=True):
        for path in ("/api/health", "/api/v1/health"):
            resp = client.get(path)
            assert resp.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
            data = resp.json()
            assert data["status"] == "degraded"
            assert "unavailable (in-memory fallback)" in data["redis"]


def test_rapid_job_submission_formatted_salary_deduplication(client: TestClient):
    """Stress test rapid submission with formatted salary strings ('250 000 so'm').

    Confirms:
    - regex extraction of salary digits matches formatted string with numeric value.
    - Zero duplicate Job rows and zero duplicate JobDays created.
    """
    employer = make_user(role="employer", phone="+998902000013", name="Emp Formatted Salary")
    login(client, employer)

    job_payload_1 = {
        "title": "Formatted Salary Worker",
        "company": "Kompaniya",
        "salary": "250 000 so'm",
        "salaryCurrency": "UZS",
        "location": "Toshkent sh., Chilonzor",
        "description": "Formatlangan oylik tavsifi",
        "neededWorkers": "1",
        "workDate": "2026-11-29",
        "workTime": "09:00 - 18:00",
    }
    job_payload_2 = dict(job_payload_1)
    job_payload_2["salary"] = "250000"

    resp1 = client.post("/api/v1/jobs/", json=job_payload_1)
    assert resp1.status_code == 200, resp1.text
    j1 = resp1.json()

    resp2 = client.post("/api/v1/jobs/", json=job_payload_2)
    assert resp2.status_code == 200, resp2.text
    j2 = resp2.json()

    assert j1["id"] == j2["id"]

    with SessionLocal() as db:
        assert db.query(Job).filter(Job.id == j1["id"]).count() == 1
        assert db.query(JobDay).filter(JobDay.jobId == j1["id"]).count() == 1


def test_concurrent_application_submission_threadpool_enforces_single_winner():
    """Stress test concurrent application commits via ThreadPoolExecutor.

    Confirms:
    - Exactly 1 thread succeeds in committing Application(jobId, workerId).
    - All other concurrent threads are rejected by IntegrityError (uq_application_job_worker).
    - Database contains strictly 1 application row.
    """
    employer = make_user(role="employer", phone="+998902000014")
    worker = make_user(role="worker", phone="+998902000015")
    job = make_job(employer.id, title="Concurrent Apply Race Job")

    successes = 0
    failures = 0

    def try_apply():
        nonlocal successes, failures
        with SessionLocal() as db:
            try:
                app = Application(
                    id=str(uuid.uuid4()),
                    jobId=job.id,
                    workerId=worker.id,
                    status="applied",
                )
                db.add(app)
                db.commit()
                successes += 1
            except IntegrityError:
                db.rollback()
                failures += 1

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(try_apply) for _ in range(5)]
        for f in futures:
            f.result()

    assert successes == 1
    assert failures == 4

    with SessionLocal() as db:
        count = db.query(Application).filter(
            Application.jobId == job.id,
            Application.workerId == worker.id,
        ).count()
        assert count == 1


def test_admin_payout_insufficient_balance_rejected(client: TestClient):
    """Stress test admin payout when worker balance is insufficient.

    Confirms:
    - Attempting to pay out more than worker balance returns HTTP 400.
    - Zero JobPayout created.
    - Worker balance remains intact.
    """
    admin = make_user(role="admin", phone="+998902000016")
    employer = make_user(role="employer", phone="+998902000017")
    worker = make_user(role="worker", phone="+998902000018", balance=50_000)

    job = make_job(
        employer.id,
        title="Insufficient Balance Payout Job",
        salary="250000",
        status=JobStatus.COMPLETED,
        hiredWorkerId=worker.id,
    )

    with SessionLocal() as db:
        app = Application(
            id=str(uuid.uuid4()),
            jobId=job.id,
            workerId=worker.id,
            status="completed",
        )
        db.add(app)
        db.commit()

    login(client, admin)

    # Worker balance is only 50,000 UZS; admin requests 100,000 UZS
    resp = client.post(
        f"/api/v1/admin/jobs/{job.id}/payout",
        json={
            "amount": 100_000,
            "workerId": worker.id,
            "receiptUrl": "https://storage.baito.uz/receipts/test_insufficient.jpg",
        },
    )
    assert resp.status_code == 400
    assert "Summa ishchi balansidan katta" in resp.json()["detail"]

    with SessionLocal() as db:
        w = db.query(User).filter(User.id == worker.id).first()
        assert w.balance == 50_000
        assert db.query(JobPayout).filter(JobPayout.jobId == job.id).count() == 0
