"""Adversarial concurrency challenge test suite for Milestone 1.

Empirically simulates high-concurrency races using multi-threading and thread barriers:
1. Simultaneous worker applications to the same job (single worker).
2. Simultaneous duplicate payment card additions (same card details).
3. Simultaneous different payment card additions when user has 4/5 cards (limit breach attempt).
4. Simultaneous dispute submissions from employer and worker on the same job.
5. Sequential duplicate application behavior inspection against interface contracts.
"""

import random
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List

from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError

from app.db.session import SessionLocal
from app.models import Application, Dispute, Job, JobPayout, PaymentCard, User
from app.models.job import JobStatus
from tests.conftest import login, make_job, make_user


def _phone() -> str:
    return f"+99890{random.randint(1000000, 9999999)}"



def _make_client_for_user(user: User) -> TestClient:
    """Create an isolated TestClient authenticated as ``user`` via cookie."""
    from app.main import app
    client = TestClient(app)
    login(client, user)
    return client


# ---------------------------------------------------------------------------
# Challenge 1: Simultaneous Worker Applications to the Same Job
# ---------------------------------------------------------------------------

def test_concurrent_simultaneous_applications_same_worker(client: TestClient):
    """Stress test: 10 concurrent threads simultaneously applying to the same job.

    Oracles:
    - applications table MUST contain exactly 1 record for (jobId, workerId).
    - No 500 Internal Server Errors.
    - All concurrent duplicates must be rejected or handled without DB corruption.
    """
    employer = make_user(role="employer", phone=_phone(), name="Employer AppConc")
    worker = make_user(role="worker", phone=_phone(), name="Worker AppConc")
    job = make_job(employer.id, title="Concurrent Apply Test Job", status=JobStatus.OPEN, neededWorkers="2")

    num_threads = 10
    barrier = threading.Barrier(num_threads)
    results: List[Dict[str, Any]] = []

    def _worker_apply():
        # Each thread uses an isolated TestClient instance to avoid httpx state race
        c = _make_client_for_user(worker)
        barrier.wait()  # Align all threads to the exact microsecond
        resp = c.post(f"/api/v1/jobs/{job.id}/apply")
        return {"status_code": resp.status_code, "body": resp.text}

    with ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = [executor.submit(_worker_apply) for _ in range(num_threads)]
        results = [f.result() for f in futures]

    status_codes = [r["status_code"] for r in results]

    # Database Verification Oracle: Exactly 1 application row must exist
    with SessionLocal() as db:
        apps = (
            db.query(Application)
            .filter(Application.jobId == job.id, Application.workerId == worker.id)
            .all()
        )
        assert len(apps) == 1, f"DB CORRUPTION: Expected exactly 1 application, found {len(apps)}: {[a.id for a in apps]}"
        assert apps[0].status == "applied"

    # Status Code Analysis Oracle: No 500s or unexpected errors
    assert all(code in (200, 409) for code in status_codes), (
        f"Unexpected HTTP status codes under concurrency: {status_codes}"
    )


# ---------------------------------------------------------------------------
# Challenge 2: Simultaneous Payment Card Additions (Duplicate Card)
# ---------------------------------------------------------------------------

def test_concurrent_simultaneous_duplicate_cards(client: TestClient):
    """Stress test: 10 concurrent threads simultaneously adding the EXACT same card.

    Oracles:
    - payment_cards table MUST contain exactly 1 card for (userId, last4, bank).
    - Exactly 1 thread succeeds with HTTP 200.
    - Exactly 9 concurrent duplicate threads receive HTTP 409 CARD_ALREADY_EXISTS.
    - 0 instances of HTTP 500 or DB corruption.
    """
    worker = make_user(role="worker", phone=_phone())

    num_threads = 10
    barrier = threading.Barrier(num_threads)
    card_data = {
        "type": "uzcard",
        "last4": "7788",
        "bank": "Concurrent Test Bank",
        "isActive": True,
    }

    def _add_card():
        c = _make_client_for_user(worker)
        barrier.wait()
        resp = c.post("/api/v1/payments/cards", json=card_data)
        return {"status_code": resp.status_code, "json": resp.json() if resp.status_code != 500 else {}}

    with ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = [executor.submit(_add_card) for _ in range(num_threads)]
        results = [f.result() for f in futures]

    status_codes = [r["status_code"] for r in results]
    success_count = status_codes.count(200)
    conflict_count = status_codes.count(409)

    # Database Verification: Exactly 1 card inserted
    with SessionLocal() as db:
        cards = (
            db.query(PaymentCard)
            .filter(PaymentCard.userId == worker.id, PaymentCard.last4 == "7788")
            .all()
        )
        assert len(cards) == 1, f"DB CORRUPTION: Expected exactly 1 card, found {len(cards)}"

    # Status Code Verification: Exactly 1 success (200) and 9 conflicts (409)
    assert success_count == 1, f"Expected exactly 1 HTTP 200, got {success_count}. Statuses: {status_codes}"
    assert conflict_count == 9, f"Expected 9 HTTP 409, got {conflict_count}. Statuses: {status_codes}"
    for r in results:
        if r["status_code"] == 409:
            assert r["json"].get("detail") == "CARD_ALREADY_EXISTS"


# ---------------------------------------------------------------------------
# Challenge 3: Simultaneous Payment Card Additions (Breaching MAX_CARDS_PER_USER)
# ---------------------------------------------------------------------------

def test_concurrent_simultaneous_cards_breaching_max_limit(client: TestClient):
    """Stress test: User already has 4 cards (MAX_CARDS_PER_USER = 5).
    10 concurrent threads simultaneously try to add 10 DIFFERENT cards.

    Oracles:
    - User's active card count MUST NEVER exceed MAX_CARDS_PER_USER (5).
    - Exactly 1 thread succeeds with HTTP 200 (filling the 5th slot).
    - Remaining 9 threads receive HTTP 400 (MAX_CARDS_EXCEEDED).
    - 0 instances of HTTP 500.
    """
    worker = make_user(role="worker", phone=_phone())
    c_init = _make_client_for_user(worker)

    # Seed 4 cards (limit is 5)
    for i in range(4):
        resp = c_init.post("/api/v1/payments/cards", json={
            "type": "uzcard",
            "last4": f"000{i}",
            "bank": f"Initial Bank {i}",
            "isActive": True,
        })
        assert resp.status_code == 200, f"Failed seeding card {i}: {resp.text}"

    num_threads = 10
    barrier = threading.Barrier(num_threads)

    def _add_distinct_card(idx: int):
        c = _make_client_for_user(worker)
        card_payload = {
            "type": "uzcard",
            "last4": f"90{idx:02d}",
            "bank": f"Burst Bank {idx}",
            "isActive": True,
        }
        barrier.wait()
        resp = c.post("/api/v1/payments/cards", json=card_payload)
        return {"idx": idx, "status_code": resp.status_code, "json": resp.json() if resp.status_code != 500 else {}}

    with ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = [executor.submit(_add_distinct_card, i) for i in range(num_threads)]
        results = [f.result() for f in futures]

    status_codes = [r["status_code"] for r in results]
    success_count = status_codes.count(200)

    # Database Verification Oracle: Active cards MUST NOT exceed 5
    with SessionLocal() as db:
        active_cards = (
            db.query(PaymentCard)
            .filter(PaymentCard.userId == worker.id, PaymentCard.isActive.is_(True))
            .all()
        )
        assert len(active_cards) <= 5, (
            f"VULNERABILITY DETECTED: MAX_CARDS_PER_USER breached! "
            f"Found {len(active_cards)} cards in DB: {[c.last4 for c in active_cards]}"
        )
        assert len(active_cards) == 5, f"Expected exactly 5 active cards, found {len(active_cards)}"

    # Status Code Verification: Exactly 1 thread got 200, rest got 400
    assert success_count == 1, (
        f"Expected exactly 1 HTTP 200, got {success_count}. Status codes: {status_codes}"
    )
    for r in results:
        if r["status_code"] != 200:
            assert r["status_code"] == 400
            assert "5 ta karta" in r["json"].get("detail", "")


# ---------------------------------------------------------------------------
# Challenge 4: Simultaneous Dispute Submissions (Employer & Worker)
# ---------------------------------------------------------------------------

def test_concurrent_simultaneous_dispute_submissions(client: TestClient):
    """Stress test: 10 concurrent threads (5 from employer, 5 from worker) disputing the same job.

    Oracles:
    - disputes table MUST contain exactly 1 dispute record for the job.
    - Exactly 1 thread succeeds with HTTP 200.
    - Remaining 9 threads receive HTTP 400 (active dispute already in progress).
    - 0 instances of HTTP 500 or duplicate dispute records.
    """
    employer = make_user(role="employer", phone=_phone(), name="Employer DispConc")
    worker = make_user(role="worker", phone=_phone(), name="Worker DispConc")
    job = make_job(
        employer.id,
        title="Concurrent Dispute Job",
        status=JobStatus.CONFIRMED,
        hiredWorkerId=worker.id,
    )

    with SessionLocal() as db:
        app_rec = Application(jobId=job.id, workerId=worker.id, status="confirmed")
        db.add(app_rec)
        db.commit()

    num_threads = 10
    barrier = threading.Barrier(num_threads)

    def _submit_dispute(caller: User, reason: str):
        c = _make_client_for_user(caller)
        barrier.wait()
        resp = c.post(f"/api/v1/jobs/{job.id}/dispute", json={"reason": reason})
        return {"caller": caller.role, "status_code": resp.status_code, "json": resp.json() if resp.status_code != 500 else {}}

    with ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = []
        for i in range(num_threads):
            caller = employer if i % 2 == 0 else worker
            reason = f"Dispute reason from {caller.role} #{i}"
            futures.append(executor.submit(_submit_dispute, caller, reason))
        results = [f.result() for f in futures]

    status_codes = [r["status_code"] for r in results]
    success_count = status_codes.count(200)

    # Database Verification: Exactly 1 dispute record
    with SessionLocal() as db:
        disputes = db.query(Dispute).filter(Dispute.jobId == job.id).all()
        assert len(disputes) == 1, (
            f"DB CORRUPTION: Expected exactly 1 dispute, found {len(disputes)}"
        )
        assert disputes[0].status == "open"

    # Status Code Verification: Exactly 1 success, rest rejected
    assert success_count == 1, (
        f"Expected exactly 1 HTTP 200 for dispute, got {success_count}. Status codes: {status_codes}"
    )
    for r in results:
        if r["status_code"] != 200:
            assert r["status_code"] == 400
            assert "allaqachon" in r["json"].get("detail", "").lower()


# ---------------------------------------------------------------------------
# Challenge 5: Interface Contract - Duplicate Application Status Code
# ---------------------------------------------------------------------------

def test_sequential_duplicate_application_status_code(client: TestClient):
    """PROJECT.md line 63-65 interface contract check:
    'POST /api/v1/applications/{job_id}/apply: Returns HTTP 409 Conflict with
    detail code \"ALREADY_APPLIED\" if worker has already applied to this job.'
    """
    employer = make_user(role="employer", phone=_phone())
    worker = make_user(role="worker", phone=_phone())
    job = make_job(employer.id, title="Sequential Apply Interface Contract", neededWorkers="1")

    c = _make_client_for_user(worker)
    resp1 = c.post(f"/api/v1/jobs/{job.id}/apply")
    assert resp1.status_code == 200, f"Initial apply failed: {resp1.text}"

    # Sequential duplicate apply: Worker already applied
    resp2 = c.post(f"/api/v1/jobs/{job.id}/apply")
    assert resp2.status_code == 409, (
        f"INTERFACE CONTRACT VIOLATION: Expected HTTP 409 ALREADY_APPLIED on re-applying to active job, "
        f"got HTTP {resp2.status_code}: {resp2.text}"
    )
    assert resp2.json().get("detail") == "ALREADY_APPLIED"


# ---------------------------------------------------------------------------
# Challenge 6: Concurrent Rapid Job Posting Deduplication
# ---------------------------------------------------------------------------

def test_concurrent_rapid_job_posting_deduplication(client: TestClient):
    """Stress test: 10 concurrent threads submitting identical job posting.

    Oracles:
    - Exactly 1 job record created in the database.
    - All 10 requests return status 200 with the SAME job ID (idempotent / deduplicated).
    - No duplicate shift days or duplicate job entries.
    """
    employer = make_user(role="employer", phone=_phone())

    job_payload = {
        "title": "Adversarial Rapid Job",
        "company": "Rapid MCHJ",
        "salary": "250000",
        "salaryCurrency": "UZS",
        "location": "Toshkent sh.",
        "description": "Adversarial rapid click job description",
        "neededWorkers": "2",
        "workDate": "2026-12-01",
        "workTime": "08:00 - 17:00",
    }

    num_threads = 10
    barrier = threading.Barrier(num_threads)

    def _post_job():
        c = _make_client_for_user(employer)
        barrier.wait()
        resp = c.post("/api/v1/jobs/", json=job_payload)
        return {"status_code": resp.status_code, "json": resp.json() if resp.status_code == 200 else {}}

    with ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = [executor.submit(_post_job) for _ in range(num_threads)]
        results = [f.result() for f in futures]

    status_codes = [r["status_code"] for r in results]
    assert all(code == 200 for code in status_codes), f"Unexpected status codes: {status_codes}"

    with SessionLocal() as db:
        jobs = db.query(Job).filter(Job.employerId == employer.id, Job.title == "Adversarial Rapid Job").all()
        assert len(jobs) == 1, f"DB CORRUPTION: Expected 1 job, found {len(jobs)}: {[j.id for j in jobs]}"


# ---------------------------------------------------------------------------
# Challenge 7: Concurrent JobPayout Creation (DEF-BE-06)
# ---------------------------------------------------------------------------

def test_concurrent_job_payout_unique_constraint():
    """Stress test: 10 concurrent threads inserting JobPayout for the same (jobId, workerId).

    Oracles:
    - job_payouts table MUST contain exactly 1 payout record.
    - Exactly 1 thread commits successfully; 9 threads fail with IntegrityError.
    """
    admin = make_user(role="admin", phone=_phone())
    employer = make_user(role="employer", phone=_phone())
    worker = make_user(role="worker", phone=_phone())
    job = make_job(employer.id, title="Concurrent Payout Job")

    num_threads = 10
    barrier = threading.Barrier(num_threads)

    def _insert_payout():
        barrier.wait()
        with SessionLocal() as db:
            payout = JobPayout(
                id=str(uuid.uuid4()),
                jobId=job.id,
                workerId=worker.id,
                employerId=employer.id,
                amount=200000,
                receiptUrl=f"/media/{uuid.uuid4()}.jpg",
                paidByAdminId=admin.id,
            )
            try:
                db.add(payout)
                db.commit()
                return "committed"
            except IntegrityError:
                db.rollback()
                return "integrity_error"

    with ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = [executor.submit(_insert_payout) for _ in range(num_threads)]
        results = [f.result() for f in futures]

    committed_count = results.count("committed")
    error_count = results.count("integrity_error")

    with SessionLocal() as db:
        payouts = db.query(JobPayout).filter(JobPayout.jobId == job.id, JobPayout.workerId == worker.id).all()
        assert len(payouts) == 1, f"Expected 1 payout, found {len(payouts)}"

    assert committed_count == 1, f"Expected exactly 1 commit, got {committed_count}"
    assert error_count == 9, f"Expected 9 IntegrityErrors, got {error_count}"
