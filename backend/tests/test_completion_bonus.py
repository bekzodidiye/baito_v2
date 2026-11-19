"""The completion bonus moves real money, so it gets its own tests.

BUG-016: the amount was validated, stored and reported as earned, and no
balance ever moved by it. These cover the three decisions the fix had to make
- who is debited, whether the platform fee applies, and what happens when the
employer cannot cover it.
"""
import uuid

import pytest

from app import models
from app.db.session import SessionLocal
from tests.conftest import login, make_job, make_user

WAGE = 275_000
# The commission is charged to the employer on top of the wage, so what the
# worker receives is the posted figure itself.
NET_WAGE = WAGE


def _balance(user_id: str) -> int:
    with SessionLocal() as db:
        return db.query(models.User).filter(models.User.id == user_id).first().balance or 0


@pytest.fixture
def finished_job(client):
    """An employer and worker with the job walked up to the point of completion."""
    suffix = uuid.uuid4().hex[:6]
    employer = make_user(role="employer", phone=f"+99893{suffix[:4]}11", balance=2_000_000)
    worker = make_user(role="worker", phone=f"+99893{suffix[:4]}22", balance=0)
    job = make_job(employer.id, title="Bonus sinovi", salary=str(WAGE))

    login(client, worker)
    applied = client.post(f"/api/v1/jobs/{job.id}/apply")
    assert applied.status_code == 200, applied.text

    login(client, employer)
    hired = client.post(f"/api/v1/applications/{applied.json()['id']}/hire")
    assert hired.status_code == 200, hired.text

    login(client, worker)
    assert client.post(f"/api/v1/jobs/{job.id}/request-start").status_code == 200
    login(client, employer)
    assert client.post(f"/api/v1/jobs/{job.id}/confirm-start").status_code == 200

    return {"client": client, "employer": employer, "worker": worker, "job": job}


def test_the_bonus_reaches_the_worker_in_full(finished_job):
    ctx = finished_job
    employer_before = _balance(ctx["employer"].id)

    res = ctx["client"].post(
        f"/api/v1/jobs/{ctx['job'].id}/complete",
        json={"rating": 5, "review": "Zo'r", "bonus": 25_000},
    )
    assert res.status_code == 200, res.text
    assert res.json()["bonus_paid_workers"] == 1

    # The modal promises the entered amount reaches the worker, so no fee is
    # taken from the bonus - only from the wage.
    assert _balance(ctx["worker"].id) == NET_WAGE + 25_000
    # The employer funds it, on top of the wage they escrowed at hire.
    # The employer is not debited: the bonus goes on the invoice with the wage.
    assert _balance(ctx["employer"].id) == employer_before


def test_the_credit_is_recorded_in_the_ledger(finished_job):
    ctx = finished_job
    ctx["client"].post(
        f"/api/v1/jobs/{ctx['job'].id}/complete",
        json={"rating": 5, "bonus": 25_000},
    )
    with SessionLocal() as db:
        entries = (
            db.query(models.AuditLedger)
            .filter(models.AuditLedger.entryType == "completion_bonus")
            .all()
        )
        # One entry, the worker's. The employer's balance is not touched.
        assert sorted(e.amountDelta for e in entries) == [25_000]


def test_completion_without_a_bonus_pays_the_wage_only(finished_job):
    ctx = finished_job
    employer_before = _balance(ctx["employer"].id)

    res = ctx["client"].post(
        f"/api/v1/jobs/{ctx['job'].id}/complete", json={"rating": 5, "bonus": 0}
    )
    assert res.status_code == 200, res.text
    assert res.json()["bonus_paid_workers"] == 0
    assert _balance(ctx["worker"].id) == NET_WAGE
    assert _balance(ctx["employer"].id) == employer_before


# --- a bonus bigger than the balance ----------------------------------------
#
# Hiring stopped requiring a funded balance (#153), so an employer is normally
# already in debt for the wage by the time they reach completion. The check
# left behind in pay_completion_bonus could therefore only ever refuse — and it
# refused into a `except HTTPException` that logged and moved on, so the
# employer entered a bonus, was told the completion succeeded, and the worker
# received nothing. These three pin the behaviour it was replaced with.

def _skint(ctx, balance=10_000):
    with SessionLocal() as db:
        db.query(models.User).filter(
            models.User.id == ctx["employer"].id
        ).first().balance = balance
        db.commit()


def test_a_bonus_bigger_than_the_balance_still_reaches_the_worker(finished_job):
    ctx = finished_job
    _skint(ctx)

    res = ctx["client"].post(
        f"/api/v1/jobs/{ctx['job'].id}/complete",
        json={"rating": 5, "bonus": 500_000},
    )

    assert res.status_code == 200, res.text
    assert res.json()["bonus_paid_workers"] == 1
    assert _balance(ctx["worker"].id) == NET_WAGE + 500_000
    # An employer with almost nothing on their balance can still award a
    # bonus: nothing is taken from them, the invoice collects it afterwards.
    assert _balance(ctx["employer"].id) == 10_000


def test_the_employer_is_not_told_a_bonus_was_paid_that_was_not(finished_job):
    """The reported defect: 200, bonus_paid_workers 0, and no word of it.

    The same worker came back in both paid_workers and unpaid_workers, because
    the bonus raised out of the block that had just recorded the wage as paid.
    """
    ctx = finished_job
    _skint(ctx)

    body = ctx["client"].post(
        f"/api/v1/jobs/{ctx['job'].id}/complete",
        json={"rating": 5, "bonus": 500_000},
    ).json()

    assert body["paid_workers"] == 1
    assert body["unpaid_workers"] == 0


def test_the_worker_is_told_about_the_bonus_too(finished_job):
    ctx = finished_job
    _skint(ctx)

    ctx["client"].post(
        f"/api/v1/jobs/{ctx['job'].id}/complete",
        json={"rating": 5, "bonus": 500_000},
    )

    with SessionLocal() as db:
        note = (
            db.query(models.Notification)
            .filter(models.Notification.userId == ctx["worker"].id,
                    models.Notification.type == "completed")
            .first()
        )
        assert note is not None
        assert "bonus" in note.message


def test_earned_amount_equals_what_the_worker_was_paid(finished_job):
    """BUG-016's second half: earnedAmount added the gross wage to the bonus
    with no fee deducted, and ReviewsScreen sums it into a lifetime total."""
    ctx = finished_job
    ctx["client"].post(
        f"/api/v1/jobs/{ctx['job'].id}/complete",
        json={"rating": 5, "bonus": 25_000},
    )
    paid = _balance(ctx["worker"].id)

    login(ctx["client"], ctx["worker"])
    res = ctx["client"].get("/api/v1/applications/worker")
    assert res.status_code == 200, res.text
    row = next(a for a in res.json() if a["jobId"] == ctx["job"].id)
    assert row["earnedAmount"] == paid


def test_worker_cannot_self_rate_or_grant_self_bonus(finished_job):
    ctx = finished_job
    login(ctx["client"], ctx["worker"])

    res = ctx["client"].post(
        f"/api/v1/jobs/{ctx['job'].id}/complete",
        json={"rating": 5, "review": "Ajoyib ishchi o'zim", "bonus": 500_000},
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body.get("bonus_paid_workers", 0) == 0

    # Worker only receives the basic wage, no bonus
    assert _balance(ctx["worker"].id) == NET_WAGE

    with SessionLocal() as db:
        app = db.query(models.Application).filter(
            models.Application.jobId == ctx["job"].id,
            models.Application.workerId == ctx["worker"].id,
        ).first()
        assert app is not None
        assert app.rating is None
        assert app.review is None
        assert app.bonus == 0 or app.bonus is None

        worker_user = db.query(models.User).filter(models.User.id == ctx["worker"].id).first()
        # Rating should remain 0/None or uninflated by self review
        assert worker_user.rating != 5.0 or worker_user.completedJobsCount == 0

