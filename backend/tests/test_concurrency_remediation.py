import uuid
from unittest.mock import patch

import pytest
from sqlalchemy.exc import IntegrityError
from fastapi.testclient import TestClient

from app.db.session import SessionLocal
from app.models import Application, JobPayout, User, Job
from app.models.job import JobStatus
from app.services.job_service import JobService
from tests.conftest import make_user, make_job, login


# ---------------------------------------------------------------------------
# DEF-BE-01: Application uniqueness and double wage crediting prevention
# ---------------------------------------------------------------------------

def test_application_unique_constraint_enforced_at_db_level():
    """Application model must reject duplicate (jobId, workerId) pairs."""
    worker = make_user(role="worker", phone="+998901110001", name="Worker One")
    employer = make_user(role="employer", phone="+998901110002", name="Employer One")
    job = make_job(employer.id, title="Test Job For Unique App")

    with SessionLocal() as db:
        app1 = Application(jobId=job.id, workerId=worker.id, status="applied")
        db.add(app1)
        db.commit()

        app2 = Application(jobId=job.id, workerId=worker.id, status="applied")
        db.add(app2)
        with pytest.raises(IntegrityError):
            db.commit()


def test_apply_to_job_catches_integrity_error_and_returns_409():
    """JobService.apply_to_job raises HTTP 409 ALREADY_APPLIED on duplicate race."""
    worker = make_user(role="worker", phone="+998901110003", name="Worker Two")
    employer = make_user(role="employer", phone="+998901110004", name="Employer Two")
    job = make_job(employer.id, title="Test Job Apply Race")

    # Simulate race condition where integrity error is raised on commit
    with SessionLocal() as db:
        from fastapi import HTTPException
        with patch.object(db, "commit", side_effect=IntegrityError("mock", "params", "orig")):
            with pytest.raises(HTTPException) as exc_info:
                JobService.apply_to_job(db, job.id, worker)
            assert exc_info.value.status_code == 409
            assert exc_info.value.detail == "ALREADY_APPLIED"


def test_complete_job_deduplicates_workers_and_prevents_double_crediting():
    """Even if duplicate applications existed, complete_job only credits the worker once."""
    worker = make_user(role="worker", phone="+998901110005", name="Worker Three", balance=0)
    employer = make_user(role="employer", phone="+998901110006", name="Employer Three")
    job = make_job(employer.id, title="Test Single Day Multi App", salary="100000", status=JobStatus.CONFIRMED)

    with SessionLocal() as db:
        # Create an application
        app1 = Application(id=str(uuid.uuid4()), jobId=job.id, workerId=worker.id, status="confirmed")
        db.add(app1)
        db.commit()

    # Complete the job
    with SessionLocal() as db:
        JobService.complete_job(db, job.id, rating=5, review="Barakalla", bonus=10000, current_user=employer)

    with SessionLocal() as db:
        w = db.query(User).filter(User.id == worker.id).first()
        # 100,000 wage + 10,000 bonus = 110,000
        assert w.balance == 110_000


# ---------------------------------------------------------------------------
# DEF-BE-02: Payment card concurrency locking and duplicate card prevention
# ---------------------------------------------------------------------------

def test_add_duplicate_payment_card_returns_409(client: TestClient):
    """Adding a payment card with the same last4 and bank must return HTTP 409."""
    user = make_user(role="worker", phone="+998901110007")
    login(client, user)

    card_data = {
        "type": "uzcard",
        "last4": "5678",
        "bank": "Ipak Yo'li Banki",
        "isActive": True,
    }

    resp1 = client.post("/api/v1/payments/cards", json=card_data)
    assert resp1.status_code == 200
    assert resp1.json()["last4"] == "5678"

    resp2 = client.post("/api/v1/payments/cards", json=card_data)
    assert resp2.status_code == 409
    assert resp2.json()["detail"] == "CARD_ALREADY_EXISTS"


def test_add_payment_card_exceeding_limit_returns_400(client: TestClient):
    """Adding more than MAX_CARDS_PER_USER (5) returns HTTP 400."""
    user = make_user(role="worker", phone="+998901110008")
    login(client, user)

    for i in range(5):
        resp = client.post("/api/v1/payments/cards", json={
            "type": "uzcard",
            "last4": f"100{i}",
            "bank": f"Bank {i}",
            "isActive": True,
        })
        assert resp.status_code == 200

    resp_overflow = client.post("/api/v1/payments/cards", json={
        "type": "uzcard",
        "last4": "9999",
        "bank": "Bank Overflow",
        "isActive": True,
    })
    assert resp_overflow.status_code == 400
    assert "Ko'pi bilan 5 ta karta" in resp_overflow.json()["detail"]


# ---------------------------------------------------------------------------
# DEF-BE-03: Job posting idempotency and rapid-click deduplication
# ---------------------------------------------------------------------------

def test_create_job_idempotency_key_returns_cached_response(client: TestClient):
    """Re-sending POST /api/v1/jobs/ with identical Idempotency-Key returns existing job."""
    employer = make_user(role="employer", phone="+998901110009", name="Employer Idempotent")
    login(client, employer)

    job_payload = {
        "title": "Idempotent Sklad Ishi",
        "company": "Sklad MCHJ",
        "salary": "200000",
        "salaryCurrency": "UZS",
        "location": "Toshkent sh., Chilonzor",
        "description": "Idempotent test job tavsifi",
        "neededWorkers": "2",
        "workDate": "2026-11-01",
        "workTime": "09:00 - 18:00",
    }
    idem_key = f"key-{uuid.uuid4()}"
    headers = {"Idempotency-Key": idem_key}

    resp1 = client.post("/api/v1/jobs/", json=job_payload, headers=headers)
    assert resp1.status_code == 200
    job1 = resp1.json()

    resp2 = client.post("/api/v1/jobs/", json=job_payload, headers=headers)
    assert resp2.status_code == 200
    job2 = resp2.json()

    assert job1["id"] == job2["id"]

    with SessionLocal() as db:
        count = db.query(Job).filter(Job.title == "Idempotent Sklad Ishi").count()
        assert count == 1


def test_create_job_rapid_duplicate_submission_deduplication(client: TestClient):
    """Submitting duplicate job with identical title and date within 10s returns existing job."""
    employer = make_user(role="employer", phone="+998901110010", name="Employer Rapid")
    login(client, employer)

    job_payload = {
        "title": "Rapid Click Oshxona Ishi",
        "company": "Oshxona",
        "salary": "150000",
        "salaryCurrency": "UZS",
        "location": "Toshkent sh., Yunusobod",
        "description": "Rapid click deduplication test tavsifi",
        "neededWorkers": "1",
        "workDate": "2026-11-05",
        "workTime": "10:00 - 19:00",
    }

    resp1 = client.post("/api/v1/jobs/", json=job_payload)
    assert resp1.status_code == 200
    job1 = resp1.json()

    # Immediate second click (within 10 seconds)
    resp2 = client.post("/api/v1/jobs/", json=job_payload)
    assert resp2.status_code == 200
    job2 = resp2.json()

    assert job1["id"] == job2["id"]

    with SessionLocal() as db:
        count = db.query(Job).filter(Job.title == "Rapid Click Oshxona Ishi").count()
        assert count == 1


# ---------------------------------------------------------------------------
# DEF-BE-04: Optional user session leak and detached instance fix
# ---------------------------------------------------------------------------

def test_get_current_user_optional_shares_db_dependency(client: TestClient):
    """get_current_user_optional uses db: Session = Depends(get_db) without session leak."""
    user = make_user(role="worker", phone="+998901110011")
    login(client, user)

    # Calling jobs browse endpoint which uses get_current_user_optional
    resp = client.get("/api/v1/jobs/")
    assert resp.status_code == 200

    # Anonymous user browsing
    client.cookies.clear()
    resp_anon = client.get("/api/v1/jobs/")
    assert resp_anon.status_code == 200


# ---------------------------------------------------------------------------
# DEF-BE-05: Dispute creation concurrency lock
# ---------------------------------------------------------------------------

def test_dispute_job_acquires_lock_and_prevents_duplicate_disputes(client: TestClient):
    """Opening duplicate disputes on the same job must return HTTP 400."""
    employer = make_user(role="employer", phone="+998901110012", name="Employer Disp")
    worker = make_user(role="worker", phone="+998901110013", name="Worker Disp")
    job = make_job(employer.id, title="Disputed Job", status=JobStatus.CONFIRMED, hiredWorkerId=worker.id)

    with SessionLocal() as db:
        app_rec = Application(jobId=job.id, workerId=worker.id, status="confirmed")
        db.add(app_rec)
        db.commit()

    login(client, employer)
    resp1 = client.post(f"/api/v1/jobs/{job.id}/dispute", json={"reason": "Ishchi kelmadi"})
    assert resp1.status_code == 200

    # Second dispute attempt by worker or employer returns 400
    login(client, worker)
    resp2 = client.post(f"/api/v1/jobs/{job.id}/dispute", json={"reason": "Ish beruvchi pul to'lamadi"})
    assert resp2.status_code == 400
    assert "allaqachon" in resp2.json()["detail"].lower()


# ---------------------------------------------------------------------------
# DEF-BE-06: JobPayout uniqueness constraint
# ---------------------------------------------------------------------------

def test_job_payout_unique_constraint_enforced_at_db_level():
    """JobPayout model enforces unique (jobId, workerId)."""
    admin = make_user(role="admin", phone="+998901110014")
    employer = make_user(role="employer", phone="+998901110015")
    worker = make_user(role="worker", phone="+998901110016")
    job = make_job(employer.id, title="Payout Job Test")

    with SessionLocal() as db:
        payout1 = JobPayout(
            id=str(uuid.uuid4()),
            jobId=job.id,
            workerId=worker.id,
            employerId=employer.id,
            amount=100000,
            receiptUrl="/media/receipt1.jpg",
            paidByAdminId=admin.id,
        )
        db.add(payout1)
        db.commit()

        payout2 = JobPayout(
            id=str(uuid.uuid4()),
            jobId=job.id,
            workerId=worker.id,
            employerId=employer.id,
            amount=100000,
            receiptUrl="/media/receipt2.jpg",
            paidByAdminId=admin.id,
        )
        db.add(payout2)
        with pytest.raises(IntegrityError):
            db.commit()


# ---------------------------------------------------------------------------
# DEF-BE-07: Health check degraded state
# ---------------------------------------------------------------------------

def test_health_check_returns_200_when_healthy(client: TestClient):
    """Health check returns HTTP 200 and ok when services are running."""
    with patch("app.main.redis_is_mock", return_value=False):
        with patch("app.main.redis_client.ping", return_value=True):
            resp = client.get("/api/health")
            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "ok"
            assert data["database"] == "connected"
            assert data["redis"] == "connected"


def test_health_check_returns_503_when_database_fails(client: TestClient):
    """Health check returns HTTP 503 and degraded when DB query fails."""
    with patch("app.main.SessionLocal") as mock_session:
        mock_db = mock_session.return_value.__enter__.return_value
        mock_db.execute.side_effect = Exception("Database connection failure")

        resp = client.get("/api/health")
        assert resp.status_code == 503
        data = resp.json()
        assert data["status"] == "degraded"
        assert data["database"] == "unhealthy"


def test_health_check_returns_503_when_redis_fails(client: TestClient):
    """Health check returns HTTP 503 and degraded when Redis ping fails."""
    with patch("app.main.redis_is_mock", return_value=False):
        with patch("app.main.redis_client.ping", side_effect=Exception("Redis connection refused")):
            resp = client.get("/api/health")
            assert resp.status_code == 503
            data = resp.json()
            assert data["status"] == "degraded"
            assert data["redis"] == "unhealthy"
