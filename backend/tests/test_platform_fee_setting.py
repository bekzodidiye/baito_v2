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
from app.models.job import JobStatus
from app.models.system_setting import SystemSetting
from app.models.transaction import Transaction
from app.services.escrow_service import EscrowService, platform_fee_percent
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
    """An employer with a worker hired and wage + commission frozen in escrow."""
    employer = make_user(role="employer", phone=_phone(), balance=5_000_000)
    worker = make_user(phone=_phone(), balance=0)
    job = make_job(employer.id, status=JobStatus.CONFIRMED,
                   hiredWorkerId=worker.id, salary=str(wage))
    with SessionLocal() as db:
        db.add(Application(jobId=job.id, workerId=worker.id, status="hired"))
        db.commit()
        EscrowService.hold_funds(db, employer.id, job.id, wage)
        db.commit()
    return employer, worker, job


def _release(job_id: str, worker_id: str) -> None:
    with SessionLocal() as db:
        EscrowService.release_funds(db, job_id=job_id, worker_id=worker_id)
        db.commit()


def _balance(user_id: str) -> int:
    with SessionLocal() as db:
        from app.models.user import User
        return db.query(User).filter(User.id == user_id).first().balance or 0


# --- the rate an administrator sets is the rate that is taken ---------------

def test_the_configured_rate_is_what_the_employer_is_charged():
    _set_rate(20)
    employer, worker, job = _hire()

    # 20% of 300 000 on top of the wage, not the 10% that used to be compiled in.
    assert _balance(employer.id) == 5_000_000 - 360_000

    _release(job.id, worker.id)

    # And none of it comes out of the worker.
    assert _balance(worker.id) == WAGE


def test_a_zero_rate_costs_the_employer_nothing_extra():
    """0 is a rate, not a missing value.

    Worth its own case because zero is exactly what a `x or default` reads as
    absent — the settings form had that bug, and the fee maths must not.
    """
    _set_rate(0)
    employer, worker, job = _hire()

    assert _balance(employer.id) == 5_000_000 - WAGE

    _release(job.id, worker.id)

    assert _balance(worker.id) == WAGE


def test_with_no_settings_row_at_all_the_default_still_applies():
    """A database nobody has configured yet."""
    with SessionLocal() as db:
        db.query(SystemSetting).delete()
        db.commit()
        assert platform_fee_percent(db) == 10

    employer, worker, job = _hire()

    assert _balance(employer.id) == 5_000_000 - 330_000  # 300 000 + 10%


# --- and it holds to the rate the hire was made under -----------------------

def test_raising_the_rate_does_not_reach_back_into_frozen_money():
    """The employer was charged at hiring; a later rate has nothing to bill."""
    _set_rate(10)
    employer, worker, job = _hire()
    charged = 5_000_000 - _balance(employer.id)
    assert charged == 330_000  # 300 000 + 10%

    _set_rate(45)
    _release(job.id, worker.id)

    # Releasing the hold does not go back for the difference.
    assert 5_000_000 - _balance(employer.id) == charged
    assert _balance(worker.id) == WAGE


def test_the_new_rate_applies_to_the_next_hire():
    _set_rate(10)
    employer_a, worker_a, job_a = _hire()

    _set_rate(30)
    employer_b, worker_b, job_b = _hire()

    assert 5_000_000 - _balance(employer_a.id) == 330_000  # 300 000 + 10%
    assert 5_000_000 - _balance(employer_b.id) == 390_000  # 300 000 + 30%

    _release(job_a.id, worker_a.id)
    _release(job_b.id, worker_b.id)

    # Both workers are paid the posted wage whatever their employer was charged.
    assert _balance(worker_a.id) == WAGE
    assert _balance(worker_b.id) == WAGE


def test_a_hold_from_before_the_change_is_settled_on_its_old_terms():
    """Money frozen under the old arrangement funded the wage alone.

    Those holds took the fee out of the worker's pay, and the employer never
    deposited anything extra. Paying the wage whole out of one would hand over
    money nobody put in, so they are honoured as they were made.
    """
    _set_rate(10)
    _employer, worker, job = _hire()
    with SessionLocal() as db:
        hold = db.query(Transaction).filter(Transaction.jobId == job.id).first()
        hold.feePercent = None
        hold.platformFee = 0
        hold.amount = WAGE * 100
        db.commit()

    _set_rate(25)
    _release(job.id, worker.id)

    assert _balance(worker.id) == 225_000


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
    _release(job.id, worker.id)
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


def test_the_commission_is_still_charged_when_the_balance_cannot_cover_it(client):
    """Hiring on a balance that covers the wage but not the fee.

    This used to be a refusal, and was skipped rather than rewritten when the
    refusal went. What it was really guarding is still worth guarding: that the
    commission is charged on top of the wage and pinned onto the hold. Dropping
    the gate must not quietly drop the fee with it.
    """
    _set_rate(10)
    employer = make_user(role="employer", phone=_phone(), balance=WAGE)
    worker = make_user(phone=_phone())
    job = make_job(employer.id, salary=str(WAGE))

    login(client, worker)
    applied = client.post(f"/api/v1/jobs/{job.id}/apply")
    assert applied.status_code == 200, applied.text

    login(client, employer)
    resp = client.post(f"/api/v1/applications/{applied.json()['id']}/hire")

    assert resp.status_code == 200, resp.text
    # 300 000 wage + 30 000 commission, against a balance holding 300 000. The
    # shortfall is what the employer owes; the invoice collects it.
    assert _balance(employer.id) == -30_000
    with SessionLocal() as db:
        tx = db.query(Transaction).filter(Transaction.jobId == job.id).one()
        assert tx.amount == WAGE * 100
        assert tx.platformFee == 30_000 * 100
        assert tx.feePercent == 10
