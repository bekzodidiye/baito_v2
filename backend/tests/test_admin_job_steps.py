"""The lifecycle checklist an administrator sees when they open a job.

``timeline`` on the same response answers "what happened and when", and only
carries entries that have a timestamp. That leaves the stages nobody recorded a
time for invisible, so a job parked at "hired, not started" reads the same as
one that never got a worker. ``steps`` answers the other question - where is
this job in its life - by listing every stage, reached or not.

The cases below are about that distinction: a stage is done because of the
state it left behind, never because it happens to carry a date.
"""

import uuid
from datetime import datetime, timedelta, timezone

from app.models.application import Application
from app.models.job import JobStatus
from app.models.job_payout import JobPayout, PayoutStatus
from app.db.session import SessionLocal

from .conftest import login, make_job, make_user

STEP_ORDER = [
    "created", "applied", "hired", "started", "completed",
    "worker_paid", "invoiced", "payment_declared", "payment_confirmed",
]


def _phone():
    return f"+9989{uuid.uuid4().int % 10**8:08d}"


def _admin(client):
    admin = make_user(role="admin", phone=_phone())
    login(client, admin)
    return admin


def _steps(client, job_id):
    resp = client.get(f"/api/v1/admin/jobs/{job_id}/detail")
    assert resp.status_code == 200, resp.text
    return {s["key"]: s for s in resp.json()["steps"]}


def _state(client, job_id):
    return {k: v["state"] for k, v in _steps(client, job_id).items()}


def test_every_stage_is_listed_even_before_it_is_reached(client):
    """A brand new posting still shows the nine stages ahead of it."""
    _admin(client)
    employer = make_user(role="employer", phone=_phone())
    job = make_job(employer.id)

    steps = client.get(f"/api/v1/admin/jobs/{job.id}/detail").json()["steps"]

    assert [s["key"] for s in steps] == STEP_ORDER


def test_an_open_posting_waits_on_applications(client):
    _admin(client)
    employer = make_user(role="employer", phone=_phone())
    job = make_job(employer.id)

    state = _state(client, job.id)

    assert state["created"] == "done"
    # Exactly one stage is "current" - the next thing anyone is waiting for.
    assert state["applied"] == "current"
    assert [k for k, v in state.items() if v == "current"] == ["applied"]
    assert all(state[k] == "pending" for k in STEP_ORDER[2:])


def test_a_hired_worker_who_has_not_started_still_reads_as_hired(client):
    """The stage nobody timestamps.

    Nothing records the moment a job starts, so this stage can only be decided
    from the job's status. Deciding it from a date would leave it pending on a
    job that plainly began.
    """
    _admin(client)
    employer = make_user(role="employer", phone=_phone())
    worker = make_user(phone=_phone())
    job = make_job(employer.id, status=JobStatus.CONFIRMED, hiredWorkerId=worker.id)
    with SessionLocal() as db:
        db.add(Application(jobId=job.id, workerId=worker.id, status="hired"))
        db.commit()

    state = _state(client, job.id)

    assert state["hired"] == "done"
    assert state["started"] == "current"
    assert state["completed"] == "pending"


def test_a_started_job_marks_the_stage_that_carries_no_date(client):
    _admin(client)
    employer = make_user(role="employer", phone=_phone())
    worker = make_user(phone=_phone())
    job = make_job(employer.id, status=JobStatus.IN_PROGRESS, hiredWorkerId=worker.id)
    with SessionLocal() as db:
        db.add(Application(jobId=job.id, workerId=worker.id, status="hired"))
        db.commit()

    steps = _steps(client, job.id)

    assert steps["started"]["state"] == "done"
    assert steps["started"]["date"] is None
    assert steps["completed"]["state"] == "current"


def test_the_settlement_stages_come_from_the_payout(client):
    """Billing, their word, and the money arriving stay three separate stages."""
    _admin(client)
    employer = make_user(role="employer", phone=_phone(), email="buyer@korxona.uz")
    worker = make_user(phone=_phone())
    job = make_job(employer.id, status=JobStatus.COMPLETED, hiredWorkerId=worker.id,
                   completedAt=datetime.now(timezone.utc))
    with SessionLocal() as db:
        db.add(Application(jobId=job.id, workerId=worker.id, status="completed"))
        db.add(JobPayout(
            jobId=job.id, workerId=worker.id, employerId=employer.id,
            amount=225_000, receiptUrl="/media/receipts/paid.png",
            status=PayoutStatus.INVOICED, paidByAdminId=employer.id,
            invoiceNumber="INV-20260913-ABCDEF01", invoiceAmount=250_000,
            invoiceSentTo="buyer@korxona.uz",
            invoiceSentAt=datetime.now(timezone.utc),
        ))
        db.commit()

    steps = _steps(client, job.id)

    assert steps["worker_paid"]["state"] == "done"
    assert steps["invoiced"]["state"] == "done"
    assert steps["invoiced"]["detail"] == "INV-20260913-ABCDEF01"
    # Billed is not paid, and paid is not confirmed.
    assert steps["payment_declared"]["state"] == "current"
    assert steps["payment_confirmed"]["state"] == "pending"


def test_a_confirmed_payment_finishes_the_checklist(client):
    _admin(client)
    employer = make_user(role="employer", phone=_phone())
    worker = make_user(phone=_phone())
    job = make_job(employer.id, status=JobStatus.COMPLETED, hiredWorkerId=worker.id,
                   completedAt=datetime.now(timezone.utc))
    now = datetime.now(timezone.utc)
    with SessionLocal() as db:
        db.add(Application(jobId=job.id, workerId=worker.id, status="completed"))
        db.add(JobPayout(
            jobId=job.id, workerId=worker.id, employerId=employer.id,
            amount=225_000, receiptUrl="/media/receipts/paid.png",
            status=PayoutStatus.CONFIRMED, paidByAdminId=employer.id,
            invoiceNumber="INV-20260913-ABCDEF02", invoiceAmount=250_000,
            invoiceSentTo="buyer@korxona.uz", invoiceSentAt=now,
            invoicePaidDeclaredAt=now, invoicePaidReference="TP-001",
            invoicePaidReceiptUrl="/media/receipts/company.pdf",
            invoiceConfirmedAt=now,
        ))
        db.commit()

    state = _state(client, job.id)

    assert all(v == "done" for v in state.values()), state
    assert "current" not in state.values()


def test_a_cancelled_job_does_not_claim_to_be_waiting_for_anything(client):
    """Nothing ahead of a cancelled job is coming, so nothing is "current"."""
    _admin(client)
    employer = make_user(role="employer", phone=_phone())
    job = make_job(employer.id, status=JobStatus.CANCELLED)

    steps = client.get(f"/api/v1/admin/jobs/{job.id}/detail").json()["steps"]
    state = {s["key"]: s["state"] for s in steps}

    assert state["created"] == "done"
    assert "current" not in state.values()
    assert all(state[k] == "skipped" for k in STEP_ORDER[1:])
    assert steps[-1]["key"] == "cancelled"


def test_hiring_is_dated_from_the_escrow_hold_not_the_application(client):
    """The application row only knows when the worker applied.

    That date used to be reported as the hiring date too, which put the two
    events at the same moment on a job where hiring happened days later.
    """
    _admin(client)
    employer = make_user(role="employer", phone=_phone(), balance=1_000_000)
    worker = make_user(phone=_phone())
    job = make_job(employer.id, status=JobStatus.CONFIRMED, hiredWorkerId=worker.id)

    from app.services.escrow_service import EscrowService
    # Applied two days before being hired. Without the gap both rows land in
    # the same second here and the bug this covers would pass unnoticed.
    with SessionLocal() as db:
        db.add(Application(
            jobId=job.id, workerId=worker.id, status="hired",
            appliedDate=datetime.now(timezone.utc) - timedelta(days=2),
        ))
        db.commit()
        EscrowService.hold_funds(db, employer.id, job.id, 250_000)
        db.commit()

    detail = client.get(f"/api/v1/admin/jobs/{job.id}/detail").json()
    hired_event = next(e for e in detail["timeline"] if e["event"] == "hired")
    applied_event = next(e for e in detail["timeline"] if e["event"] == "applied")
    hold = next(t for t in detail["transactions"] if t["type"] == "escrow_hold")

    assert hired_event["date"] == hold["createdAt"]
    assert hired_event["date"] != applied_event["date"]
