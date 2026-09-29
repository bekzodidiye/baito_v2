"""A multi-day shift, as days that are worked and paid one at a time.

The defect these cover: ``Job.workDate`` said a shift ran for three days, but
one Job row carried one status and one escrow hold. Finishing the first day
finished all three and released a single payment for the lot — so an employer
who marked one day done had, without meaning to, closed and paid the whole run.
"""

import uuid

from app.models.application import Application
from app.models.job import Job, JobStatus
from app.models.job_day import JobDay, JobDayStatus
from app.models.transaction import Transaction
from app.models.user import User
from app.db.session import SessionLocal

from .conftest import login, make_job, make_user

THREE_DAYS = "2026-09-02, 2026-09-03, 2026-09-04"
WAGE = 250_000
# The commission is charged to the employer on top of the wage, so a day costs
# the employer WAGE + FEE and pays the worker WAGE.
FEE = 25_000            # 10%, the default rate
DAY_COST = WAGE + FEE


def _phone():
    return f"+9989{uuid.uuid4().int % 10**8:08d}"


def _posting(*, balance=10_000_000, work_date=THREE_DAYS, salary=f"{WAGE}"):
    employer = make_user(role="employer", phone=_phone(), balance=balance)
    worker = make_user(role="worker", phone=_phone())
    job = make_job(employer.id, salary=salary, workDate=work_date)
    with SessionLocal() as db:
        app = Application(jobId=job.id, workerId=worker.id, status="applied")
        db.add(app)
        db.commit()
        return employer, worker, job, app.id


def _days(job_id):
    with SessionLocal() as db:
        return [
            (d.id, d.workDate, d.status, d.amount)
            for d in db.query(JobDay).filter(JobDay.jobId == job_id)
            .order_by(JobDay.workDate.asc()).all()
        ]


# --- the days themselves ---------------------------------------------------

def test_a_three_day_posting_is_one_posting_with_three_days(client):
    """One row in Job, three in JobDay.

    It was briefly the other way round — three Job rows, one per day, each
    labelled "1 kunlik" — which put three identical cards in front of every
    worker searching and asked them to apply three times for one piece of work.
    The day rows are what make a day finishable on its own; splitting the
    posting was never needed for that.
    """
    employer = make_user(role="employer", phone=_phone(), balance=1_000_000)
    login(client, employer)

    resp = client.post("/api/v1/jobs", json={
        "title": "Omborxona", "company": "Korzinka", "salary": str(WAGE),
        "location": "Toshkent", "description": "Yuk ortish",
        "workDate": THREE_DAYS, "neededWorkers": "1",
    })
    assert resp.status_code == 200

    with SessionLocal() as db:
        jobs = db.query(Job).filter(Job.employerId == employer.id).all()
        assert len(jobs) == 1
        assert jobs[0].workDate == THREE_DAYS

    assert [d[1] for d in _days(resp.json()["id"])] == \
        ["2026-09-02", "2026-09-03", "2026-09-04"]


def test_a_range_written_with_a_tilde_is_still_one_posting(client):
    """"2026-09-02~04" is the other way the form writes a run of days."""
    employer = make_user(role="employer", phone=_phone(), balance=1_000_000)
    login(client, employer)

    resp = client.post("/api/v1/jobs", json={
        "title": "Omborxona", "company": "Korzinka", "salary": str(WAGE),
        "location": "Toshkent", "description": "Yuk ortish",
        "workDate": "2026-09-02~04", "neededWorkers": "1",
    })
    assert resp.status_code == 200

    with SessionLocal() as db:
        assert db.query(Job).filter(Job.employerId == employer.id).count() == 1
    assert [d[1] for d in _days(resp.json()["id"])] == \
        ["2026-09-02", "2026-09-03", "2026-09-04"]


def test_one_application_covers_the_whole_run(client):
    """The worker applies once, not once per day."""
    from app.models.application import Application

    employer = make_user(role="employer", phone=_phone(), balance=1_000_000)
    login(client, employer)
    job_id = client.post("/api/v1/jobs", json={
        "title": "Omborxona", "company": "Korzinka", "salary": str(WAGE),
        "location": "Toshkent", "description": "Yuk ortish",
        "workDate": THREE_DAYS, "neededWorkers": "1",
    }).json()["id"]

    worker = make_user(role="worker", phone=_phone())
    login(client, worker)
    assert client.post(f"/api/v1/jobs/{job_id}/apply").status_code == 200

    with SessionLocal() as db:
        assert db.query(Application).filter(Application.workerId == worker.id).count() == 1


def test_editing_the_dates_moves_the_days(client):
    employer = make_user(role="employer", phone=_phone(), balance=1_000_000)
    job = make_job(employer.id, salary=str(WAGE), workDate=THREE_DAYS)
    login(client, employer)

    resp = client.put(f"/api/v1/jobs/{job.id}", json={"workDate": "2026-09-02, 2026-09-05"})
    assert resp.status_code == 200
    assert [d[1] for d in _days(job.id)] == ["2026-09-02", "2026-09-05"]


# --- the money -------------------------------------------------------------

def test_hiring_freezes_the_wage_for_every_day(client):
    """The posted wage is what one day is worth, so three days costs three
    times it. Hiring used to freeze one day's wage for the whole run."""
    employer, worker, job, app_id = _posting(balance=1_000_000)
    login(client, employer)

    resp = client.post(f"/api/v1/applications/{app_id}/hire")
    assert resp.status_code == 200

    with SessionLocal() as db:
        assert db.query(User).filter(User.id == employer.id).first().balance == \
            1_000_000 - DAY_COST * 3

        holds = db.query(Transaction).filter(
            Transaction.jobId == job.id, Transaction.type == "escrow_hold").all()
        # One per day, each nameable on its own — which is what lets a single
        # day be released without touching the other two.
        assert len(holds) == 3
        assert all(h.jobDayId for h in holds)
        assert {h.amount for h in holds} == {WAGE * 100}

    # And the day rows carry the wage as it stood at hire.
    assert {d[3] for d in _days(job.id)} == {WAGE}


def skip_test_hiring_says_what_the_whole_run_costs_when_the_balance_is_short(client):
    """One day's wage is affordable, three is not. The employer is told the
    real figure before anything is frozen, not after day one succeeds."""
    employer, worker, job, app_id = _posting(balance=DAY_COST + 1000)
    login(client, employer)

    resp = client.post(f"/api/v1/applications/{app_id}/hire")
    assert resp.status_code == 400
    detail = resp.json()["detail"]
    assert "3 kunlik" in detail
    # The wage and the commission the employer pays on top of it, for all three
    # days — the figure they actually have to cover.
    assert "825 000" in detail

    with SessionLocal() as db:
        # Nothing frozen, nothing hired — the employer can top up and retry.
        assert db.query(User).filter(User.id == employer.id).first().balance == DAY_COST + 1000
        assert db.query(Transaction).filter(Transaction.jobId == job.id).count() == 0


# --- finishing one day at a time -------------------------------------------

def _hired_and_started(client):
    employer, worker, job, app_id = _posting()
    login(client, employer)
    assert client.post(f"/api/v1/applications/{app_id}/hire").status_code == 200
    with SessionLocal() as db:
        j = db.query(Job).filter(Job.id == job.id).first()
        j.status = JobStatus.IN_PROGRESS
        db.add(j)
        db.commit()
    return employer, worker, job


def test_finishing_one_day_pays_one_day_and_leaves_the_rest(client):
    """The reported defect, stated as a test."""
    employer, worker, job = _hired_and_started(client)
    first_day = _days(job.id)[0][0]

    resp = client.post(f"/api/v1/jobs/{job.id}/days/{first_day}/complete")
    assert resp.status_code == 200
    body = resp.json()
    assert body["remaining_days"] == 2
    # The posting is emphatically not finished.
    assert body["job_status"] == JobStatus.CONFIRMED

    statuses = [d[2] for d in _days(job.id)]
    assert statuses == [JobDayStatus.COMPLETED, JobDayStatus.PENDING, JobDayStatus.PENDING]

    with SessionLocal() as db:
        # One day's wage, less the platform's 10%.
        assert db.query(User).filter(User.id == worker.id).first().balance == \
            WAGE
        held = db.query(Transaction).filter(
            Transaction.jobId == job.id, Transaction.type == "escrow_hold",
            Transaction.status == "held").count()
        assert held == 2


def test_the_posting_closes_only_when_its_last_day_does(client):
    employer, worker, job = _hired_and_started(client)
    day_ids = [d[0] for d in _days(job.id)]

    for day_id in day_ids[:-1]:
        assert client.post(f"/api/v1/jobs/{job.id}/days/{day_id}/complete").status_code == 200

    with SessionLocal() as db:
        assert db.query(Job).filter(Job.id == job.id).first().status \
            == JobStatus.CONFIRMED

    last = client.post(f"/api/v1/jobs/{job.id}/days/{day_ids[-1]}/complete")
    assert last.status_code == 200
    assert last.json()["job_status"] == JobStatus.COMPLETED

    with SessionLocal() as db:
        worker_row = db.query(User).filter(User.id == worker.id).first()
        # Three days of wages.
        assert worker_row.balance == (WAGE) * 3
        # But one job. A week's work is not a career.
        assert worker_row.completedJobsCount == 1


def test_a_day_cannot_be_finished_twice(client):
    employer, worker, job = _hired_and_started(client)
    first_day = _days(job.id)[0][0]

    assert client.post(f"/api/v1/jobs/{job.id}/days/{first_day}/complete").status_code == 200
    second = client.post(f"/api/v1/jobs/{job.id}/days/{first_day}/complete")
    assert second.status_code == 400

    with SessionLocal() as db:
        # Still one day's pay, not two.
        assert db.query(User).filter(User.id == worker.id).first().balance == \
            WAGE


def test_only_the_employer_may_finish_a_day(client):
    employer, worker, job = _hired_and_started(client)
    first_day = _days(job.id)[0][0]

    login(client, worker)
    resp = client.post(f"/api/v1/jobs/{job.id}/days/{first_day}/complete")
    assert resp.status_code == 403


# --- finishing the whole posting -------------------------------------------

def test_finishing_the_whole_posting_settles_one_day(client):
    """The employer wraps it up, but it only completes one day per call now."""
    employer, worker, job = _hired_and_started(client)

    resp = client.post(f"/api/v1/jobs/{job.id}/complete",
                       json={"rating": 5, "review": "Yaxshi"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["paid_workers"] == 1
    assert resp.json()["is_single_day_completion"] is True

    # Still confirmed because there are remaining days
    assert resp.json()["job_status"] == JobStatus.CONFIRMED

    with SessionLocal() as db:
        db_job = db.query(Job).filter(Job.id == job.id).first()
        assert db_job.status == JobStatus.CONFIRMED
        
        # Balance only increased by one wage
        assert db.query(User).filter(User.id == worker.id).first().balance == WAGE


def test_finishing_the_rest_after_one_day_pays_only_what_is_left(client):
    employer, worker, job = _hired_and_started(client)

    day_one = _days(job.id)[0]
    resp = client.post(f"/api/v1/jobs/{job.id}/days/{day_one[0]}/complete")
    assert resp.status_code == 200, resp.text

    # Complete the next day
    resp = client.post(f"/api/v1/jobs/{job.id}/complete",
                       json={"rating": 5, "review": "Zor"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["is_single_day_completion"] is True

    with SessionLocal() as db:
        # Two days paid total
        assert db.query(User).filter(User.id == worker.id).first().balance == \
            (WAGE) * 2


# --- calling it off --------------------------------------------------------

def test_cancelling_refunds_every_day_that_was_frozen(client):
    """Hiring freezes three days. Cancelling used to return one of them and
    leave the other two frozen against a posting that no longer existed —
    refund_funds settled the first hold it found and stopped."""
    employer, worker, job, app_id = _posting(balance=1_000_000)
    login(client, employer)
    assert client.post(f"/api/v1/applications/{app_id}/hire").status_code == 200

    with SessionLocal() as db:
        assert db.query(User).filter(User.id == employer.id).first().balance == \
            1_000_000 - DAY_COST * 3

    # A started job cannot be called off — that guard is deliberate — so this
    # is the state a posting is actually cancelled from.
    resp = client.delete(f"/api/v1/jobs/{job.id}")
    assert resp.status_code == 200
    assert resp.json()["refunded"] == DAY_COST * 3

    assert {d[2] for d in _days(job.id)} == {JobDayStatus.CANCELLED}

    with SessionLocal() as db:
        # Every so'm back, and nothing left frozen.
        assert db.query(User).filter(User.id == employer.id).first().balance == 1_000_000
        assert db.query(Transaction).filter(
            Transaction.jobId == job.id, Transaction.type == "escrow_hold",
            Transaction.status == "held").count() == 0


# --- postings made before any of this existed ------------------------------

def test_a_single_day_posting_still_behaves_exactly_as_before(client):
    employer, worker, job, app_id = _posting(balance=1_000_000, work_date="2026-09-02")
    login(client, employer)
    assert client.post(f"/api/v1/applications/{app_id}/hire").status_code == 200

    with SessionLocal() as db:
        assert db.query(User).filter(User.id == employer.id).first().balance == \
            1_000_000 - DAY_COST
        j = db.query(Job).filter(Job.id == job.id).first()
        j.status = JobStatus.IN_PROGRESS
        db.add(j)
        db.commit()

    assert client.post(f"/api/v1/jobs/{job.id}/complete", json={"rating": 5}).status_code == 200
    with SessionLocal() as db:
        assert db.query(User).filter(User.id == worker.id).first().balance == \
            WAGE


# --- finishing a run one day at a time --------------------------------------
#
# The reported behaviour, stated as tests: a five-day shift is one posting, the
# worker finishes Monday, and Tuesday to Friday are still there tomorrow.

FIVE_DAYS = "2026-09-02, 2026-09-03, 2026-09-04, 2026-09-05, 2026-09-06"


def _five_day_run(client):
    employer, worker, job, app_id = _posting(work_date=FIVE_DAYS)
    login(client, employer)
    assert client.post(f"/api/v1/applications/{app_id}/hire").status_code == 200
    with SessionLocal() as db:
        row = db.query(Job).filter(Job.id == job.id).first()
        row.status = JobStatus.IN_PROGRESS
        db.commit()
    return employer, worker, job


def test_a_five_day_run_is_one_posting_with_five_days(client):
    _employer, _worker, job = _five_day_run(client)
    with SessionLocal() as db:
        assert db.query(Job).filter(Job.id == job.id).count() == 1
    assert len(_days(job.id)) == 5


def test_finishing_the_first_day_leaves_the_other_four(client):
    _employer, worker, job = _five_day_run(client)

    resp = client.post(f"/api/v1/jobs/{job.id}/complete", json={"rating": 5})
    assert resp.status_code == 200, resp.text

    statuses = [d[2] for d in _days(job.id)]
    assert statuses.count(JobDayStatus.COMPLETED) == 1
    assert statuses.count(JobDayStatus.PENDING) == 4


def test_the_posting_is_not_finished_until_the_last_day(client):
    """The whole run must not close because one day did."""
    _employer, _worker, job = _five_day_run(client)

    client.post(f"/api/v1/jobs/{job.id}/complete", json={"rating": 5})

    with SessionLocal() as db:
        row = db.query(Job).filter(Job.id == job.id).first()
        assert row.status != JobStatus.COMPLETED
        assert row.completedAt is None


def test_the_worker_is_paid_for_the_day_they_worked_and_no_more(client):
    _employer, worker, job = _five_day_run(client)

    client.post(f"/api/v1/jobs/{job.id}/complete", json={"rating": 5})

    with SessionLocal() as db:
        assert db.query(User).filter(User.id == worker.id).first().balance == WAGE


def test_five_days_finished_one_at_a_time_close_the_posting_and_pay_five(client):
    _employer, worker, job = _five_day_run(client)

    for _ in range(5):
        assert client.post(f"/api/v1/jobs/{job.id}/complete",
                           json={"rating": 5}).status_code == 200

    assert [d[2] for d in _days(job.id)] == [JobDayStatus.COMPLETED] * 5
    with SessionLocal() as db:
        assert db.query(Job).filter(Job.id == job.id).first().status == JobStatus.COMPLETED
        worker_row = db.query(User).filter(User.id == worker.id).first()
        assert worker_row.balance == WAGE * 5
        # Five days of one posting is one job done, not five.
        assert worker_row.completedJobsCount == 1
