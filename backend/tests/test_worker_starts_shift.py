"""The worker starts their own shift; nobody confirms it afterwards.

Pressing start used to only raise a hand — the application went to
``start_requested`` and waited for the employer. The wait moved no money: the
wage is frozen at hiring and released at completion, so the employer's press
could neither pay nor withhold anything. It could only leave a worker standing
on site unable to show they had started.
"""

import uuid

from app.models.application import Application
from app.models.job import Job, JobStatus
from app.models.job_day import JobDay, JobDayStatus
from app.db.session import SessionLocal

from .conftest import login, make_job, make_user


def _phone():
    return f"+9989{uuid.uuid4().int % 10**8:08d}"


def _hired(status: str = "hired", **job_kwargs):
    employer = make_user(role="employer", phone=_phone(), balance=5_000_000)
    worker = make_user(phone=_phone())
    job = make_job(employer.id, status=JobStatus.CONFIRMED, hiredWorkerId=worker.id,
                   **job_kwargs)
    with SessionLocal() as db:
        db.add(Application(jobId=job.id, workerId=worker.id, status=status))
        db.commit()
    return employer, worker, job


def _job(job_id):
    with SessionLocal() as db:
        return db.query(Job).filter(Job.id == job_id).first()


def _app_status(job_id, worker_id):
    with SessionLocal() as db:
        row = (
            db.query(Application)
            .filter(Application.jobId == job_id, Application.workerId == worker_id)
            .first()
        )
        return row.status if row else None


def test_pressing_start_starts_the_shift(client):
    employer, worker, job = _hired()
    login(client, worker)

    resp = client.post(f"/api/v1/jobs/{job.id}/request-start")

    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == JobStatus.IN_PROGRESS
    assert _job(job.id).status == JobStatus.IN_PROGRESS
    assert _app_status(job.id, worker.id) == "in_progress"


def test_no_second_press_from_anybody_is_needed(client):
    """The employer is told, not asked."""
    from app.models.notification import Notification

    employer, worker, job = _hired()
    login(client, worker)
    client.post(f"/api/v1/jobs/{job.id}/request-start")

    with SessionLocal() as db:
        notes = (
            db.query(Notification)
            .filter(Notification.userId == employer.id, Notification.relatedJobId == job.id)
            .all()
        )

    assert any(n.type == "start_confirmed" for n in notes)
    assert not any(n.type == "start_requested" for n in notes)


def test_the_start_time_is_recorded(client):
    employer, worker, job = _hired()
    login(client, worker)

    client.post(f"/api/v1/jobs/{job.id}/request-start")

    assert _job(job.id).startedAt is not None


def test_an_application_stranded_by_the_old_flow_is_moved_on(client):
    """Rows the two-step flow left at start_requested and nobody confirmed.

    Production has these. Without this they would sit there for good, which is
    half the reason the step is going.
    """
    employer, worker, job = _hired(status="start_requested")
    login(client, worker)

    resp = client.post(f"/api/v1/jobs/{job.id}/request-start")

    assert resp.status_code == 200
    assert _app_status(job.id, worker.id) == "in_progress"


def test_pressing_twice_changes_nothing(client):
    employer, worker, job = _hired()
    login(client, worker)

    client.post(f"/api/v1/jobs/{job.id}/request-start")
    first = _job(job.id).startedAt
    second = client.post(f"/api/v1/jobs/{job.id}/request-start")

    assert second.status_code == 200
    assert second.json()["status"] == "in_progress"
    assert _job(job.id).startedAt == first


def test_a_finished_shift_cannot_be_started(client):
    """The refusal the console was full of, now reachable from this route too."""
    employer, worker, job = _hired()
    with SessionLocal() as db:
        row = db.query(Job).filter(Job.id == job.id).first()
        row.status = JobStatus.COMPLETED
        db.commit()

    login(client, worker)
    resp = client.post(f"/api/v1/jobs/{job.id}/request-start")

    assert resp.status_code == 400
    assert "yakunlangan" in resp.json()["detail"]


def test_one_worker_arriving_does_not_start_the_others(client):
    """A multi-vacancy shift.

    confirm-start advances everyone at once, which is right for an employer
    saying "we have begun" and wrong for one person walking in — it would put a
    start time against people who are not there.
    """
    employer = make_user(role="employer", phone=_phone(), balance=5_000_000)
    early = make_user(phone=_phone())
    late = make_user(phone=_phone())
    job = make_job(employer.id, status=JobStatus.CONFIRMED, neededWorkers="2",
                   hiredWorkerId=early.id)
    with SessionLocal() as db:
        db.add(Application(jobId=job.id, workerId=early.id, status="hired"))
        db.add(Application(jobId=job.id, workerId=late.id, status="hired"))
        db.commit()

    login(client, early)
    client.post(f"/api/v1/jobs/{job.id}/request-start")

    assert _app_status(job.id, early.id) == "in_progress"
    assert _app_status(job.id, late.id) == "hired"


def test_the_day_being_worked_is_stamped(client):
    from datetime import datetime, timezone

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    employer, worker, job = _hired(workDate=today)
    with SessionLocal() as db:
        db.add(JobDay(jobId=job.id, workDate=today, status=JobDayStatus.PENDING,
                      amount=250_000))
        db.commit()

    login(client, worker)
    client.post(f"/api/v1/jobs/{job.id}/request-start")

    with SessionLocal() as db:
        day = db.query(JobDay).filter(JobDay.jobId == job.id).first()
        assert day.startedAt is not None


def test_somebody_who_was_never_hired_cannot_start_it(client):
    employer, _worker, job = _hired()
    stranger = make_user(phone=_phone())
    login(client, stranger)

    resp = client.post(f"/api/v1/jobs/{job.id}/request-start")

    assert resp.status_code == 403
    assert _job(job.id).status == JobStatus.CONFIRMED
