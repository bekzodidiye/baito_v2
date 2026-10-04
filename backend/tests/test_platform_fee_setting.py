"""The commission: whose it is, where the rate comes from, and when it is fixed.

Three things are under test here.

It is the employer's. A worker is paid the wage the posting advertised, in
full; the platform's cut is charged to the employer on top of it. Hiring
therefore freezes wage + fee, and a payout moves the whole wage.

The rate is the one in "Platforma Komissiyasi (%)". That field has been on the
settings screen all along - it saved, it reloaded, and nothing read it, because
the rate lived in ``escrow_service`` as the literal 10.

And it is fixed at hiring. The rate can change between a worker being hired and
the shift being paid out; the employer has already been charged by then, so the
rate is pinned onto the escrow hold rather than read again at payout.
"""

import uuid

from app.models.application import Application
from app.models.job import Job, JobStatus
from app.models.system_setting import SystemSetting
from app.models.transaction import Transaction
from app.services.earnings_service import WorkerEarnings, platform_fee_percent
from app.db.session import SessionLocal

from .conftest import login, make_job, make_user

WAGE = 300_000


def _phone():
    return f"+9989{uuid.uuid4().int % 10**8:08d}"


def _set_rate(percent: int) -> None:
    with SessionLocal() as db:
        row = db.query(SystemSetting).first()
        if not row:
            row = SystemSetting(id="singleton")
            db.add(row)
        row.platformFeePercent = percent
        db.commit()


def _hire(wage: int = WAGE):
    """An employer with a worker hired. Nothing leaves the employer."""
    employer = make_user(role="employer", phone=_phone(), balance=5_000_000)
    worker = make_user(phone=_phone(), balance=0)
    job = make_job(employer.id, status=JobStatus.CONFIRMED,
                   hiredWorkerId=worker.id, salary=str(wage))
    with SessionLocal() as db:
        db.add(Application(jobId=job.id, workerId=worker.id, status="hired"))
        db.commit()
    return employer, worker, job


def _credit(job_id: str, worker_id: str, wage: int = WAGE) -> None:
    """A day worked: the worker is credited, the commission recorded beside it."""
    with SessionLocal() as db:
        job = db.query(Job).filter(Job.id == job_id).first()
        WorkerEarnings.credit_worker(db, job=job, worker_id=worker_id, amount_uzs=wage)
        db.commit()


def _billed(job_id: str) -> int:
    """Wage plus commission — what the invoice will ask the company for."""
    with SessionLocal() as db:
        rows = (db.query(Transaction)
                .filter(Transaction.jobId == job_id,
                        Transaction.type == "worker_earning").all())
        return sum((r.amount + (r.platformFee or 0)) // 100 for r in rows)


def _balance(user_id: str) -> int:
    with SessionLocal() as db:
        from app.models.user import User
        return db.query(User).filter(User.id == user_id).first().balance or 0


# --- the rate an administrator sets is the rate that is taken ---------------

def test_the_configured_rate_is_what_the_company_is_billed():
    _set_rate(20)
    employer, worker, job = _hire()

    _credit(job.id, worker.id)

    # 20% of 300 000 on top of the wage, not the 10% that used to be compiled
    # in. Nothing leaves the employer's balance — this is the invoice figure.
    assert _balance(employer.id) == 5_000_000
    assert _billed(job.id) == 360_000
    # And none of it comes out of the worker.
    assert _balance(worker.id) == WAGE


def test_a_zero_rate_costs_the_employer_nothing_extra():
    """0 is a rate, not a missing value.

    Worth its own case because zero is exactly what a `x or default` reads as
    absent — the settings form had that bug, and the fee maths must not.
    """
    _set_rate(0)
    employer, worker, job = _hire()

    _credit(job.id, worker.id)

    assert _billed(job.id) == WAGE
    assert _balance(worker.id) == WAGE


def test_with_no_settings_row_at_all_the_default_still_applies():
    """A database nobody has configured yet."""
    with SessionLocal() as db:
        db.query(SystemSetting).delete()
        db.commit()
        assert platform_fee_percent(db) == 10

    employer, worker, job = _hire()
    _credit(job.id, worker.id)

    assert _billed(job.id) == 330_000  # 300 000 + 10%


# --- and it holds to the rate the work was done under -----------------------

def test_raising_the_rate_does_not_reach_back_into_work_already_done():
    """The rate is pinned when a day is credited, not read again at invoice time.

    Under escrow it was pinned when the money was frozen, which was hiring.
    Nothing is frozen now, so the moment that matters is the work being done —
    and a rate raised afterwards must not restate it.
    """
    _set_rate(10)
    employer, worker, job = _hire()
    _credit(job.id, worker.id)
    assert _billed(job.id) == 330_000  # 300 000 + 10%

    _set_rate(45)

    assert _billed(job.id) == 330_000
    assert _balance(worker.id) == WAGE


def test_the_new_rate_applies_to_the_next_day_worked():
    _set_rate(10)
    employer_a, worker_a, job_a = _hire()
    _credit(job_a.id, worker_a.id)

    _set_rate(30)
    employer_b, worker_b, job_b = _hire()
    _credit(job_b.id, worker_b.id)

    assert _billed(job_a.id) == 330_000  # 300 000 + 10%
    assert _billed(job_b.id) == 390_000  # 300 000 + 30%

    # Both workers are paid the posted wage whatever their employer was charged.
    assert _balance(worker_a.id) == WAGE
    assert _balance(worker_b.id) == WAGE


# --- what the worker is told matches what they are paid ---------------------

def test_the_worker_is_quoted_the_whole_wage(client):
    _set_rate(10)
    _employer, worker, job = _hire()

    _set_rate(50)
    login(client, worker)
    app_row = client.get("/api/v1/applications/worker").json()[0]

    # Nothing is deducted from the worker at any rate.
    assert app_row["expectedAmount"] == WAGE


def test_a_finished_job_reports_what_reached_the_balance(client):
    _set_rate(15)
    _employer, worker, job = _hire()
    _credit(job.id, worker.id)
    with SessionLocal() as db:
        row = db.query(Application).filter(Application.jobId == job.id).first()
        row.status = "completed"
        db.commit()

    login(client, worker)
    app_row = client.get("/api/v1/applications/worker").json()[0]

    assert app_row["earnedAmount"] == _balance(worker.id) == WAGE


def test_an_unhired_application_is_quoted_the_posted_wage(client):
    """Nothing is frozen yet, and the rate would not change this anyway."""
    _set_rate(40)
    employer = make_user(role="employer", phone=_phone(), balance=5_000_000)
    worker = make_user(phone=_phone())
    job = make_job(employer.id, salary=str(WAGE))
    with SessionLocal() as db:
        db.add(Application(jobId=job.id, workerId=worker.id, status="applied"))
        db.commit()

    login(client, worker)
    app_row = client.get("/api/v1/applications/worker").json()[0]

    assert app_row["expectedAmount"] == WAGE


# --- the setting is reachable from the admin panel --------------------------

def test_saving_zero_percent_through_the_api_sticks(client):
    admin = make_user(role="admin", phone=_phone())
    login(client, admin)

    resp = client.put("/api/v1/admin/settings", json={"platformFeePercent": 0})

    assert resp.status_code == 200, resp.text
    with SessionLocal() as db:
        assert platform_fee_percent(db) == 0


