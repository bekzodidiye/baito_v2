"""Changing a posting's status from the admin panel has to settle the money.

Found in production. ``PATCH /admin/jobs/{id}/status`` set ``job.status`` and
did nothing else, so:

* marking a posting **completed** left its day rows pending, its escrow frozen
  and the worker unpaid — the posting read as finished while the money sat
  still. One posting is in exactly that state: status ``completed``, all four
  days ``pending``, ``completedAt`` null.
* **cancelling** rejected the applications but never refunded, so the
  employer's money stayed frozen against a posting nobody would ever work.

The employer's own cancel already refunds and closes the days. This makes the
admin path mean the same thing, and refuses to call a posting finished while
its days are unfinished rather than paying somebody from a dropdown.
"""

import uuid

from app.models.application import Application
from app.models.job import Job, JobStatus
from app.models.job_day import JobDay, JobDayStatus
from app.models.transaction import Transaction
from app.models.user import User
from app.db.session import SessionLocal

from .conftest import login, make_job, make_user

WAGE = 200_000
THREE_DAYS = "2026-09-02, 2026-09-03, 2026-09-04"


def _phone():
    return f"+9989{uuid.uuid4().int % 10**8:08d}"


def _hired_three_day_job(client):
    """A three-day posting with a worker hired and three days of escrow held."""
    employer = make_user(role="employer", phone=_phone(), balance=5_000_000)
    worker = make_user(phone=_phone())
    job = make_job(employer.id, salary=str(WAGE), workDate=THREE_DAYS)
    with SessionLocal() as db:
        db.add(Application(jobId=job.id, workerId=worker.id, status="applied"))
        db.commit()
        app_id = db.query(Application).filter(Application.jobId == job.id).first().id

    login(client, employer)
    assert client.post(f"/api/v1/applications/{app_id}/hire").status_code == 200
    return employer, worker, job


def _days(job_id):
    with SessionLocal() as db:
        return [(d.workDate, d.status) for d in
                db.query(JobDay).filter(JobDay.jobId == job_id)
                .order_by(JobDay.workDate.asc()).all()]


def _held(job_id):
    with SessionLocal() as db:
        return (
            db.query(Transaction)
            .filter(Transaction.jobId == job_id,
                    Transaction.type == "escrow_hold",
                    Transaction.status == "held")
            .count()
        )


def _balance(user_id):
    with SessionLocal() as db:
        return db.query(User).filter(User.id == user_id).first().balance or 0


def _status(job_id):
    with SessionLocal() as db:
        return db.query(Job).filter(Job.id == job_id).first().status


# --- completing ---------------------------------------------------------------

def test_a_posting_with_unfinished_days_cannot_be_called_finished(client):
    _employer, _worker, job = _hired_three_day_job(client)
    admin = make_user(role="admin", phone=_phone())
    login(client, admin)

    resp = client.patch(f"/api/v1/admin/jobs/{job.id}/status",
                        json={"status": JobStatus.COMPLETED})

    assert resp.status_code == 400
    assert "escrow" in resp.json()["detail"].lower()


def test_the_refusal_leaves_everything_exactly_as_it_was(client):
    """A refusal that half-applied would be worse than the bug."""
    _employer, _worker, job = _hired_three_day_job(client)
    admin = make_user(role="admin", phone=_phone())
    login(client, admin)

    client.patch(f"/api/v1/admin/jobs/{job.id}/status",
                 json={"status": JobStatus.COMPLETED})

    assert _status(job.id) != JobStatus.COMPLETED
    assert _held(job.id) == 3
    assert [s for _, s in _days(job.id)] == [JobDayStatus.PENDING] * 3


def test_the_refusal_says_what_to_do_instead(client):
    _employer, _worker, job = _hired_three_day_job(client)
    admin = make_user(role="admin", phone=_phone())
    login(client, admin)

    detail = client.patch(f"/api/v1/admin/jobs/{job.id}/status",
                          json={"status": JobStatus.COMPLETED}).json()["detail"]

    assert "3 kuni" in detail
    assert "yakunlang" in detail


def test_a_posting_with_no_money_frozen_can_still_be_closed(client):
    """The guard is about stranded money, not about admins."""
    employer = make_user(role="employer", phone=_phone(), balance=1_000_000)
    job = make_job(employer.id, salary=str(WAGE), workDate=THREE_DAYS)
    admin = make_user(role="admin", phone=_phone())
    login(client, admin)

    resp = client.patch(f"/api/v1/admin/jobs/{job.id}/status",
                        json={"status": JobStatus.COMPLETED})

    assert resp.status_code == 200
    assert _status(job.id) == JobStatus.COMPLETED


def test_a_posting_already_finished_is_not_refused_again(client):
    """Re-sending the status it already has must not start failing."""
    employer = make_user(role="employer", phone=_phone(), balance=1_000_000)
    job = make_job(employer.id, salary=str(WAGE), workDate=THREE_DAYS,
                   status=JobStatus.COMPLETED)
    admin = make_user(role="admin", phone=_phone())
    login(client, admin)

    resp = client.patch(f"/api/v1/admin/jobs/{job.id}/status",
                        json={"status": JobStatus.COMPLETED})

    assert resp.status_code == 200


# --- cancelling ---------------------------------------------------------------

def test_cancelling_gives_the_employer_their_money_back(client):
    employer, _worker, job = _hired_three_day_job(client)
    after_hire = _balance(employer.id)
    admin = make_user(role="admin", phone=_phone())
    login(client, admin)

    resp = client.patch(f"/api/v1/admin/jobs/{job.id}/status",
                        json={"status": JobStatus.CANCELLED})

    assert resp.status_code == 200
    # Three days of wage and commission, all of it back.
    assert _balance(employer.id) > after_hire
    assert _held(job.id) == 0


def test_cancelling_closes_the_days_so_nobody_is_offered_the_work(client):
    _employer, _worker, job = _hired_three_day_job(client)
    admin = make_user(role="admin", phone=_phone())
    login(client, admin)

    client.patch(f"/api/v1/admin/jobs/{job.id}/status",
                 json={"status": JobStatus.CANCELLED})

    assert [s for _, s in _days(job.id)] == [JobDayStatus.CANCELLED] * 3


def test_cancelling_a_posting_that_never_held_money_still_works(client):
    employer = make_user(role="employer", phone=_phone(), balance=1_000_000)
    job = make_job(employer.id, salary=str(WAGE), workDate=THREE_DAYS)
    admin = make_user(role="admin", phone=_phone())
    login(client, admin)

    resp = client.patch(f"/api/v1/admin/jobs/{job.id}/status",
                        json={"status": JobStatus.CANCELLED})

    assert resp.status_code == 200
    assert _status(job.id) == JobStatus.CANCELLED


def test_money_frozen_against_a_posting_with_no_day_rows_still_refuses(client):
    """The case that stranded 200 000 UZS in production.

    ``ish`` (ccf3d143) predates JobDay and has no day rows at all. The guard
    asked for unfinished days *and* frozen money, so a posting like it went
    straight through: marked completed, the hold never released, the worker
    never paid and the employer never refunded.
    """
    employer, _worker, job = _hired_three_day_job(client)

    # Strip the day rows, leaving the holds — the shape the old record has.
    with SessionLocal() as db:
        db.query(JobDay).filter(JobDay.jobId == job.id).delete()
        db.commit()
    assert _days(job.id) == []
    assert _held(job.id) > 0

    admin = make_user(role="admin", phone=_phone())
    login(client, admin)
    resp = client.patch(f"/api/v1/admin/jobs/{job.id}/status",
                        json={"status": JobStatus.COMPLETED})

    assert resp.status_code == 400
    assert _status(job.id) != JobStatus.COMPLETED
    assert _held(job.id) > 0


def test_that_refusal_does_not_mention_days_it_cannot_count(client):
    _employer, _worker, job = _hired_three_day_job(client)
    with SessionLocal() as db:
        db.query(JobDay).filter(JobDay.jobId == job.id).delete()
        db.commit()

    admin = make_user(role="admin", phone=_phone())
    login(client, admin)
    detail = client.patch(f"/api/v1/admin/jobs/{job.id}/status",
                          json={"status": JobStatus.COMPLETED}).json()["detail"]

    assert "0 kuni" not in detail
    assert "muzlatilgan" in detail
    assert "bekor qiling" in detail
