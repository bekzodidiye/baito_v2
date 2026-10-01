"""Assigning a worker from the admin panel has to freeze the wage.

``PATCH /admin/jobs/{id}/worker`` marked the worker hired and moved the posting
to CONFIRMED, and froze nothing. The worker would then turn up and work against
no money at all: at completion ``release_funds`` finds no hold, logs "escrow
release skipped" and reports them unpaid.

Hiring through ``/applications/{id}/hire`` has always frozen the wage, one hold
per day. Assigning from the admin panel is the same act, so it now means the
same thing — and taking the worker off gives the money back, the way cancelling
does.
"""

import uuid

from app.models.application import Application
from app.models.job import Job, JobStatus
from app.models.transaction import Transaction
from app.models.user import User
from app.db.session import SessionLocal

from .conftest import login, make_job, make_user

WAGE = 200_000
THREE_DAYS = "2026-09-02, 2026-09-03, 2026-09-04"


def _phone():
    return f"+9989{uuid.uuid4().int % 10**8:08d}"


def _held(job_id):
    with SessionLocal() as db:
        return (
            db.query(Transaction)
            .filter(Transaction.jobId == job_id,
                    Transaction.type == "escrow_hold",
                    Transaction.status == "held")
            .all()
        )


def _balance(user_id):
    with SessionLocal() as db:
        return db.query(User).filter(User.id == user_id).first().balance or 0


def _setup(client, work_date=THREE_DAYS):
    employer = make_user(role="employer", phone=_phone(), balance=5_000_000)
    worker = make_user(phone=_phone())
    job = make_job(employer.id, salary=str(WAGE), workDate=work_date)
    admin = make_user(role="admin", phone=_phone())
    login(client, admin)
    return employer, worker, job


def test_assigning_a_worker_freezes_a_day_at_a_time(client):
    employer, worker, job = _setup(client)

    resp = client.patch(f"/api/v1/admin/jobs/{job.id}/worker",
                        json={"workerId": worker.id})

    assert resp.status_code == 200, resp.text
    holds = _held(job.id)
    assert len(holds) == 3
    assert {h.amount for h in holds} == {WAGE * 100}
    assert all(h.jobDayId for h in holds)


def test_the_worker_is_hired_and_the_posting_confirmed(client):
    _employer, worker, job = _setup(client)

    client.patch(f"/api/v1/admin/jobs/{job.id}/worker", json={"workerId": worker.id})

    with SessionLocal() as db:
        row = db.query(Job).filter(Job.id == job.id).first()
        assert row.status == JobStatus.CONFIRMED
        assert row.hiredWorkerId == worker.id
        app = (db.query(Application)
               .filter(Application.jobId == job.id,
                       Application.workerId == worker.id).first())
        assert app.status == "hired"


def test_the_employer_is_charged_for_the_whole_run(client):
    employer, worker, job = _setup(client)
    before = _balance(employer.id)

    client.patch(f"/api/v1/admin/jobs/{job.id}/worker", json={"workerId": worker.id})

    # Three days of wage, plus whatever commission the rate works out to.
    assert _balance(employer.id) <= before - WAGE * 3


def test_reassigning_the_same_worker_does_not_charge_twice(client):
    employer, worker, job = _setup(client)
    client.patch(f"/api/v1/admin/jobs/{job.id}/worker", json={"workerId": worker.id})
    after_first = _balance(employer.id)

    client.patch(f"/api/v1/admin/jobs/{job.id}/worker", json={"workerId": worker.id})

    assert len(_held(job.id)) == 3
    assert _balance(employer.id) == after_first


def test_taking_the_worker_off_gives_the_money_back(client):
    employer, worker, job = _setup(client)
    client.patch(f"/api/v1/admin/jobs/{job.id}/worker", json={"workerId": worker.id})

    resp = client.patch(f"/api/v1/admin/jobs/{job.id}/worker", json={"workerId": None})

    assert resp.status_code == 200
    assert _held(job.id) == []
    with SessionLocal() as db:
        assert db.query(Job).filter(Job.id == job.id).first().hiredWorkerId is None


def test_a_posting_with_no_figure_on_it_is_assigned_without_a_hold(client):
    """"Kelishilgan holda" — a wage nobody can read is not a wage to freeze."""
    _employer, worker, job = _setup(client)
    with SessionLocal() as db:
        db.query(Job).filter(Job.id == job.id).first().salary = "kelishilgan holda"
        db.commit()

    resp = client.patch(f"/api/v1/admin/jobs/{job.id}/worker",
                        json={"workerId": worker.id})

    assert resp.status_code == 200
    assert _held(job.id) == []


def test_a_single_day_posting_freezes_once(client):
    _employer, worker, job = _setup(client, work_date="2026-09-02")

    client.patch(f"/api/v1/admin/jobs/{job.id}/worker", json={"workerId": worker.id})

    assert len(_held(job.id)) == 1


def test_only_a_worker_can_be_assigned(client):
    """The guard that was already there still holds."""
    _employer, _worker, job = _setup(client)
    not_a_worker = make_user(role="employer", phone=_phone())

    resp = client.patch(f"/api/v1/admin/jobs/{job.id}/worker",
                        json={"workerId": not_a_worker.id})

    assert resp.status_code == 400
    assert _held(job.id) == []
