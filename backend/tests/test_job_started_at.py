"""When the work actually started.

``workTime`` is the shift a posting advertised — "09:00 - 18:00" — and nothing
recorded whether anybody turned up at nine. ``completedAt`` was already stored;
its opposite number was not, so a finished job could not be told apart from one
that started two hours late and ran over.
"""

import uuid
from datetime import datetime, timedelta, timezone

from app.models.application import Application
from app.models.job import JobStatus
from app.models.job_day import JobDay, JobDayStatus
from app.db.session import SessionLocal

from .conftest import login, make_job, make_user


def _phone():
    return f"+9989{uuid.uuid4().int % 10**8:08d}"


def _hired_job(client, **job_kwargs):
    employer = make_user(role="employer", phone=_phone(), balance=5_000_000)
    worker = make_user(phone=_phone())
    job = make_job(employer.id, status=JobStatus.CONFIRMED, hiredWorkerId=worker.id,
                   **job_kwargs)
    with SessionLocal() as db:
        db.add(Application(jobId=job.id, workerId=worker.id, status="hired"))
        db.commit()
    return employer, worker, job


def _job_row(job_id):
    with SessionLocal() as db:
        from app.models.job import Job
        return db.query(Job).filter(Job.id == job_id).first()


def test_confirming_the_start_records_when_it_happened(client):
    employer, _worker, job = _hired_job(client)
    login(client, employer)

    before = datetime.now(timezone.utc)
    resp = client.post(f"/api/v1/jobs/{job.id}/confirm-start")
    assert resp.status_code == 200, resp.text

    row = _job_row(job.id)
    assert row.status == JobStatus.IN_PROGRESS
    assert row.startedAt is not None
    # Within a sensible window of the request, not some default.
    assert row.startedAt.replace(tzinfo=timezone.utc) >= before - timedelta(seconds=5)


def test_confirming_twice_keeps_the_first_time(client):
    """The endpoint is reachable while the job is already in progress.

    Restamping would move a shift's start to whenever somebody last pressed the
    button, which is exactly the number this exists to be able to trust.
    """
    employer, _worker, job = _hired_job(client)
    login(client, employer)

    client.post(f"/api/v1/jobs/{job.id}/confirm-start")
    first = _job_row(job.id).startedAt

    client.post(f"/api/v1/jobs/{job.id}/confirm-start")

    assert _job_row(job.id).startedAt == first


def test_a_job_nobody_started_has_no_start_time(client):
    """Not a gap in the record — it simply has not happened."""
    _employer, _worker, job = _hired_job(client)

    assert _job_row(job.id).startedAt is None


def test_the_day_being_worked_is_stamped_too(client):
    """On a multi-day posting the job-level stamp only describes the first day."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    employer, worker, job = _hired_job(client, workDate=today)
    with SessionLocal() as db:
        db.add(JobDay(jobId=job.id, workDate=today, status=JobDayStatus.PENDING,
                      amount=250_000))
        db.commit()

    login(client, employer)
    client.post(f"/api/v1/jobs/{job.id}/confirm-start")

    with SessionLocal() as db:
        day = db.query(JobDay).filter(JobDay.jobId == job.id).first()
        assert day.startedAt is not None


def test_a_future_day_is_not_stamped_as_started(client):
    """Confirming the start of a run does not mean tomorrow has begun."""
    tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
    employer, worker, job = _hired_job(client, workDate=tomorrow)
    with SessionLocal() as db:
        db.add(JobDay(jobId=job.id, workDate=tomorrow, status=JobDayStatus.PENDING,
                      amount=250_000))
        db.commit()

    login(client, employer)
    client.post(f"/api/v1/jobs/{job.id}/confirm-start")

    with SessionLocal() as db:
        day = db.query(JobDay).filter(JobDay.jobId == job.id).first()
        assert day.startedAt is None


def test_the_admin_list_carries_both_ends(client):
    """The screen needs the advertised shift and what happened, together."""
    employer, _worker, job = _hired_job(client, workTime="09:00 - 18:00")
    login(client, employer)
    client.post(f"/api/v1/jobs/{job.id}/confirm-start")

    admin = make_user(role="admin", phone=_phone())
    login(client, admin)
    row = next(
        j for j in client.get("/api/v1/admin/jobs").json()["items"] if j["id"] == job.id
    )

    assert row["workTime"] == "09:00 - 18:00"
    assert row["startedAt"] is not None
    assert row["completedAt"] is None


def test_the_lifecycle_step_for_starting_now_carries_its_date(client):
    """It was the one stage with no timestamp to show."""
    employer, _worker, job = _hired_job(client)
    login(client, employer)
    client.post(f"/api/v1/jobs/{job.id}/confirm-start")

    admin = make_user(role="admin", phone=_phone())
    login(client, admin)
    detail = client.get(f"/api/v1/admin/jobs/{job.id}/detail").json()

    step = next(s for s in detail["steps"] if s["key"] == "started")
    assert step["state"] == "done"
    assert step["date"] is not None

    assert any(e["event"] == "started" for e in detail["timeline"])
