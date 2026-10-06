"""Work that is finished cannot be un-finished.

`DELETE /jobs/{id}` refused a posting that had started and nothing else. A
completed one could be flipped to `cancelled` while its days stayed
`completed` and the worker kept the money credited for them — a record that
contradicts itself and says the work never happened.

Twenty-two postings in production were cancelled this way before the guard
existed; seven of them were finished work.
"""

import uuid

from app.db.session import SessionLocal
from app.models.application import Application
from app.models.job import Job, JobStatus
from app.models.job_day import JobDay, JobDayStatus
from app.models.user import User

from .conftest import login, make_job, make_user


def _phone():
    return f"+9989{uuid.uuid4().int % 10**8:08d}"


def _status(job_id):
    with SessionLocal() as db:
        return db.query(Job).filter(Job.id == job_id).first().status


def _finished_posting(client):
    """A posting worked to the end, with the worker credited for it."""
    employer = make_user(role="employer", phone=_phone(), balance=1_000_000)
    worker = make_user(phone=_phone(), balance=0)
    job = make_job(employer.id, salary="100000", workDate="2026-09-02")

    with SessionLocal() as db:
        db.add(Application(jobId=job.id, workerId=worker.id, status="applied"))
        db.commit()
        app_id = db.query(Application).filter(Application.jobId == job.id).first().id

    login(client, employer)
    assert client.post(f"/api/v1/applications/{app_id}/hire").status_code == 200
    client.post(f"/api/v1/jobs/{job.id}/start")
    assert client.post(
        f"/api/v1/jobs/{job.id}/complete",
        json={"rating": 5, "review": "yaxshi ishladi", "bonus": 0},
    ).status_code == 200
    assert _status(job.id) == JobStatus.COMPLETED
    return employer, worker, job


def test_a_finished_posting_cannot_be_cancelled(client):
    _employer, _worker, job = _finished_posting(client)

    resp = client.delete(f"/api/v1/jobs/{job.id}")

    assert resp.status_code == 400
    assert "Yakunlangan" in resp.json()["detail"]
    assert _status(job.id) == JobStatus.COMPLETED


def test_the_days_and_the_wage_stay_as_they_were(client):
    _employer, worker, job = _finished_posting(client)
    with SessionLocal() as db:
        paid = db.query(User).filter(User.id == worker.id).first().balance

    client.delete(f"/api/v1/jobs/{job.id}")

    with SessionLocal() as db:
        days = db.query(JobDay).filter(JobDay.jobId == job.id).all()
        assert all(d.status == JobDayStatus.COMPLETED for d in days)
        assert db.query(User).filter(User.id == worker.id).first().balance == paid


def test_an_administrator_cannot_either(client):
    """The override on the permission check is about whose posting it is."""
    _employer, _worker, job = _finished_posting(client)
    admin = make_user(role="admin", phone=_phone())
    login(client, admin)

    resp = client.delete(f"/api/v1/jobs/{job.id}")

    assert resp.status_code == 400
    assert _status(job.id) == JobStatus.COMPLETED


def test_a_started_posting_is_still_refused(client):
    """The guard that was already there."""
    employer = make_user(role="employer", phone=_phone(), balance=1_000_000)
    job = make_job(employer.id, salary="100000", status=JobStatus.IN_PROGRESS)
    login(client, employer)

    resp = client.delete(f"/api/v1/jobs/{job.id}")

    assert resp.status_code == 400
    assert "Boshlangan" in resp.json()["detail"]


def test_an_open_posting_still_cancels(client):
    """Nobody has worked it, so there is nothing to contradict."""
    employer = make_user(role="employer", phone=_phone(), balance=1_000_000)
    job = make_job(employer.id, salary="100000")
    login(client, employer)

    resp = client.delete(f"/api/v1/jobs/{job.id}")

    assert resp.status_code == 200
    assert _status(job.id) == JobStatus.CANCELLED


def test_a_confirmed_posting_still_cancels(client):
    """A worker is hired but has not started: calling it off is legitimate."""
    employer = make_user(role="employer", phone=_phone(), balance=1_000_000)
    worker = make_user(phone=_phone())
    job = make_job(employer.id, salary="100000",
                   status=JobStatus.CONFIRMED, hiredWorkerId=worker.id)
    login(client, employer)

    resp = client.delete(f"/api/v1/jobs/{job.id}")

    assert resp.status_code == 200
    assert _status(job.id) == JobStatus.CANCELLED
