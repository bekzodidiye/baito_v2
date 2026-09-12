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
from app.services.escrow_service import PLATFORM_FEE_PERCENT
from tests.conftest import login, make_job, make_user

WAGE = 275_000
FEE = int(WAGE * (PLATFORM_FEE_PERCENT / 100.0))
NET_WAGE = WAGE - FEE


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
    assert _balance(ctx["employer"].id) == employer_before - 25_000


def test_both_sides_are_recorded_in_the_ledger(finished_job):
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
        deltas = sorted(e.amountDelta for e in entries)
        assert deltas == [-25_000, 25_000]


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


def test_a_bonus_the_employer_cannot_cover_changes_nothing(finished_job):
    """The check runs before any row changes, so a refusal is a clean no-op:
    the job is still completable, and nobody has been paid."""
    ctx = finished_job
    with SessionLocal() as db:
        employer = db.query(models.User).filter(
            models.User.id == ctx["employer"].id
        ).first()
        employer.balance = 10_000
        db.commit()

    res = ctx["client"].post(
        f"/api/v1/jobs/{ctx['job'].id}/complete",
        json={"rating": 5, "bonus": 500_000},
    )
    assert res.status_code == 400
    assert "bonus" in res.json()["detail"].lower()

    assert _balance(ctx["employer"].id) == 10_000
    assert _balance(ctx["worker"].id) == 0

    with SessionLocal() as db:
        job = db.query(models.Job).filter(models.Job.id == ctx["job"].id).first()
        assert job.status != "completed"

    # And the same job still completes once the bonus is affordable.
    retry = ctx["client"].post(
        f"/api/v1/jobs/{ctx['job'].id}/complete", json={"rating": 5, "bonus": 0}
    )
    assert retry.status_code == 200, retry.text
    assert _balance(ctx["worker"].id) == NET_WAGE


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
