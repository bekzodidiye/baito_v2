"""A workday closes on the day it happens, not before.
Nothing stopped an employer closing every day of a five-day posting on the
first morning. Each close releases that day's escrow, so the worker was paid
in full for four shifts nobody had worked yet — and a completed day cannot be
reopened, so the money does not come back.
Production reached this state: the three-day test posting had 2026-09-21
closed and paid on 2026-09-20.
"""
import uuid
from datetime import datetime, timedelta, timezone
from app.models.application import Application
from app.models.job_day import JobDay, JobDayStatus
from app.models.transaction import Transaction
from app.models.user import User
from app.db.session import SessionLocal
from .conftest import login, make_job, make_user
WAGE = 100_000
TASHKENT = timezone(timedelta(hours=5))
def _phone():
    return f"+9989{uuid.uuid4().int % 10**8:08d}"
def _day(offset: int) -> str:
    return (datetime.now(TASHKENT) + timedelta(days=offset)).strftime("%Y-%m-%d")
def _held(job_id):
    with SessionLocal() as db:
        return (db.query(Transaction)
                .filter(Transaction.jobId == job_id,
                        Transaction.type == "escrow_hold",
                        Transaction.status == "held").count())
def _days(job_id):
    with SessionLocal() as db:
        return {str(d.workDate): d.status for d in
                db.query(JobDay).filter(JobDay.jobId == job_id).all()}
def _running_three_day_job(client):
    """Yesterday, today and tomorrow, with a worker hired and the job started."""
    employer = make_user(role="employer", phone=_phone(), balance=5_000_000)
    worker = make_user(phone=_phone(), balance=0)
    dates = f"{_day(-1)}, {_day(0)}, {_day(1)}"
    job = make_job(employer.id, salary=str(WAGE), workDate=dates)
    with SessionLocal() as db:
        db.add(Application(jobId=job.id, workerId=worker.id, status="applied"))
        db.commit()
        app_id = db.query(Application).filter(Application.jobId == job.id).first().id
    login(client, employer)
    assert client.post(f"/api/v1/applications/{app_id}/hire").status_code == 200
    client.post(f"/api/v1/jobs/{job.id}/start")
    return employer, worker, job
def _day_id(job_id, date):
    with SessionLocal() as db:
        return db.query(JobDay).filter(
            JobDay.jobId == job_id, JobDay.workDate == date).first().id
def test_tomorrow_cannot_be_closed_today(client):
    _employer, _worker, job = _running_three_day_job(client)
    before = _held(job.id)
    resp = client.post(
        f"/api/v1/jobs/{job.id}/days/{_day_id(job.id, _day(1))}/complete")
    assert resp.status_code == 400
    assert _day(1) in resp.json()["detail"]
    assert _held(job.id) == before
    assert _days(job.id)[_day(1)] == JobDayStatus.PENDING
def test_the_worker_is_not_paid_for_a_day_they_have_not_worked(client):
    _employer, worker, job = _running_three_day_job(client)
    client.post(f"/api/v1/jobs/{job.id}/days/{_day_id(job.id, _day(1))}/complete")
    with SessionLocal() as db:
        assert db.query(User).filter(User.id == worker.id).first().balance == 0
def test_today_closes(client):
    _employer, worker, job = _running_three_day_job(client)
    resp = client.post(
        f"/api/v1/jobs/{job.id}/days/{_day_id(job.id, _day(0))}/complete")
    assert resp.status_code == 200, resp.text
    assert _days(job.id)[_day(0)] == JobDayStatus.COMPLETED
    with SessionLocal() as db:
        assert db.query(User).filter(User.id == worker.id).first().balance == WAGE
def test_a_day_already_gone_by_still_closes(client):
    """A shift worked on Friday is often settled on Monday."""
    _employer, _worker, job = _running_three_day_job(client)
    resp = client.post(
        f"/api/v1/jobs/{job.id}/days/{_day_id(job.id, _day(-1))}/complete")
    assert resp.status_code == 200, resp.text
    assert _days(job.id)[_day(-1)] == JobDayStatus.COMPLETED
def test_closing_today_leaves_tomorrow_alone(client):
    """The whole point of days: one closes, the rest stay open and funded."""
    _employer, _worker, job = _running_three_day_job(client)
    client.post(f"/api/v1/jobs/{job.id}/days/{_day_id(job.id, _day(0))}/complete")
    days = _days(job.id)
    assert days[_day(0)] == JobDayStatus.COMPLETED
    assert days[_day(1)] == JobDayStatus.PENDING
    assert days[_day(-1)] == JobDayStatus.PENDING
    assert _held(job.id) == 2
def test_an_administrator_can_still_close_a_day_early(client):
    """The override exists for support cases; the refusal is not a lock."""
    _employer, _worker, job = _running_three_day_job(client)
    admin = make_user(role="admin", phone=_phone())
    login(client, admin)
    resp = client.post(
        f"/api/v1/jobs/{job.id}/days/{_day_id(job.id, _day(1))}/complete")
    assert resp.status_code == 200, resp.text
    assert _days(job.id)[_day(1)] == JobDayStatus.COMPLETED
def test_the_refusal_names_the_day(client):
    _employer, _worker, job = _running_three_day_job(client)
    detail = client.post(
        f"/api/v1/jobs/{job.id}/days/{_day_id(job.id, _day(1))}/complete"
    ).json()["detail"]
    assert _day(1) in detail
    assert "yakunlang" in detail


def test_finishing_the_whole_posting_will_not_reach_a_future_day(client):
    """The other button settles a day too, and used to take whichever was first.

    With today's and yesterday's already closed, the only day left is
    tomorrow's — and `/complete` picked `remaining[0]` whatever its date, so
    the refusal on the per-day endpoint was reachable around.
    """
    _employer, worker, job = _running_three_day_job(client)
    for offset in (-1, 0):
        assert client.post(
            f"/api/v1/jobs/{job.id}/days/{_day_id(job.id, _day(offset))}/complete"
        ).status_code == 200
    with SessionLocal() as db:
        paid_so_far = db.query(User).filter(User.id == worker.id).first().balance

    resp = client.post(f"/api/v1/jobs/{job.id}/complete", json={"rating": 5, "review": "yaxshi ishladi", "bonus": 0})

    assert resp.status_code == 400
    assert _day(1) in resp.json()["detail"]
    assert _days(job.id)[_day(1)] == JobDayStatus.PENDING
    with SessionLocal() as db:
        assert db.query(User).filter(User.id == worker.id).first().balance == paid_so_far


def test_finishing_the_whole_posting_still_settles_a_day_that_has_arrived(client):
    _employer, worker, job = _running_three_day_job(client)

    resp = client.post(f"/api/v1/jobs/{job.id}/complete", json={"rating": 5, "review": "yaxshi ishladi", "bonus": 0})

    assert resp.status_code == 200, resp.text
    with SessionLocal() as db:
        assert db.query(User).filter(User.id == worker.id).first().balance == WAGE


def test_an_administrator_can_finish_a_posting_whose_days_are_all_ahead(client):
    _employer, _worker, job = _running_three_day_job(client)
    for offset in (-1, 0):
        client.post(f"/api/v1/jobs/{job.id}/days/{_day_id(job.id, _day(offset))}/complete")
    admin = make_user(role="admin", phone=_phone())
    login(client, admin)

    resp = client.post(f"/api/v1/jobs/{job.id}/complete", json={"rating": 5, "review": "yaxshi ishladi", "bonus": 0})

    assert resp.status_code == 200, resp.text
    assert _days(job.id)[_day(1)] == JobDayStatus.COMPLETED
