"""The employer's commission is two halves: what the work is, and where it is.

A category carries a rate and a region carries a rate, and a job is charged
their sum. The cases here are mostly about the edges of that sentence — what
happens when one half is missing, when both are, and what the sum is pinned to
once money has been frozen against it.

The worker is not in any of this. They are paid the wage the posting
advertised; every rate below only ever moves what the employer pays.
"""

import uuid

from app.models.category import Category
from app.models.job import Job, JobStatus
from app.models.region import Region
from app.models.system_setting import SystemSetting
from app.models.transaction import Transaction
from app.models.user import User
from app.services.earnings_service import WorkerEarnings, job_fee_percent
from app.db.session import SessionLocal

from .conftest import make_job, make_user

WAGE = 200_000


def _phone():
    return f"+9989{uuid.uuid4().int % 10**8:08d}"


def _clean():
    with SessionLocal() as db:
        db.query(Category).delete()
        db.query(Region).delete()
        db.commit()


def _category(slug: str, percent: float, name: str = "Kategoriya"):
    with SessionLocal() as db:
        db.add(Category(id=str(uuid.uuid4()), slug=slug, name=name,
                        commissionPercent=percent))
        db.commit()


def _region(name: str, percent: float):
    with SessionLocal() as db:
        db.add(Region(id=str(uuid.uuid4()), name=name, type="city",
                      isActive=True, commissionPercent=percent))
        db.commit()


def _set_platform_rate(percent: int):
    with SessionLocal() as db:
        row = db.query(SystemSetting).first() or SystemSetting(id="singleton")
        row.platformFeePercent = percent
        db.add(row)
        db.commit()


def _rate_for(**job_kwargs) -> float:
    employer = make_user(role="employer", phone=_phone(), balance=5_000_000)
    job = make_job(employer.id, **job_kwargs)
    with SessionLocal() as db:
        fresh = db.query(type(job)).filter(type(job).id == job.id).first()
        return job_fee_percent(db, fresh)


def _balance(user_id: str) -> int:
    with SessionLocal() as db:
        return db.query(User).filter(User.id == user_id).first().balance or 0


# --- the two halves add up ---------------------------------------------------

def test_the_rate_is_the_category_plus_the_region(client):
    _clean()
    _category("logistics", 1)
    _region("Toshkent", 3)

    assert _rate_for(category="logistics", location="Toshkent, Chilonzor") == 4


def test_a_different_city_changes_the_rate_for_the_same_work(client):
    _clean()
    _category("logistics", 1)
    _region("Toshkent", 3)
    _region("Nukus", 1)

    assert _rate_for(category="logistics", location="Toshkent, Chilonzor") == 4
    assert _rate_for(category="logistics", location="Nukus, Xo'jayli") == 2


# --- and a missing half is not a blocked hire --------------------------------

def test_an_unknown_region_leaves_the_category_rate_standing(client):
    """A posting whose address was typed before the form asked for a city."""
    _clean()
    _category("logistics", 1)
    _region("Toshkent", 3)

    assert _rate_for(category="logistics", location="Chilonzor 12-uy") == 1


def test_a_deleted_category_leaves_the_region_rate_standing(client):
    _clean()
    _region("Toshkent", 3)

    assert _rate_for(category="logistics", location="Toshkent, Chilonzor") == 3


def test_with_neither_configured_the_platform_wide_rate_applies(client):
    """Every database before any of this was set up.

    Worth its own case: falling through to zero here would silently stop
    charging commission the day this shipped.
    """
    _clean()
    _set_platform_rate(10)

    assert _rate_for(category="logistics", location="Toshkent, Chilonzor") == 10


def test_a_zero_rate_on_both_halves_is_a_rate_not_a_missing_value(client):
    """0 + 0 must not read as "nothing configured" and fall back to 10."""
    _clean()
    _category("logistics", 0)
    _region("Toshkent", 0)
    _set_platform_rate(10)

    assert _rate_for(category="logistics", location="Toshkent, Chilonzor") == 0


# --- what it does to money ---------------------------------------------------

def test_a_day_worked_bills_the_wage_plus_the_summed_rate(client):
    _clean()
    _category("logistics", 1)
    _region("Toshkent", 3)

    employer = make_user(role="employer", phone=_phone(), balance=1_000_000)
    worker = make_user(phone=_phone(), balance=0)
    job = make_job(employer.id, category="logistics", location="Toshkent, Chilonzor",
                   status=JobStatus.CONFIRMED, hiredWorkerId=worker.id, salary=str(WAGE))

    with SessionLocal() as db:
        job_row = db.query(Job).filter(Job.id == job.id).first()
        tx = WorkerEarnings.credit_worker(
            db, job=job_row, worker_id=worker.id, amount_uzs=WAGE,
        )
        # 4% of 200 000, recorded beside the wage for the invoice to collect.
        assert tx.platformFee == 8_000 * 100
        db.commit()

    # Nothing leaves the employer; the worker is credited the posting's figure
    # whatever the two rates were.
    assert _balance(employer.id) == 1_000_000
    assert _balance(worker.id) == WAGE


def test_the_summed_rate_is_pinned_when_the_day_is_credited(client):
    """Editing either half afterwards must not restate work already done."""
    _clean()
    _category("logistics", 1)
    _region("Toshkent", 3)

    employer = make_user(role="employer", phone=_phone(), balance=1_000_000)
    worker = make_user(phone=_phone(), balance=0)
    job = make_job(employer.id, category="logistics", location="Toshkent, Chilonzor",
                   status=JobStatus.CONFIRMED, hiredWorkerId=worker.id, salary=str(WAGE))

    with SessionLocal() as db:
        job_row = db.query(Job).filter(Job.id == job.id).first()
        WorkerEarnings.credit_worker(
            db, job=job_row, worker_id=worker.id, amount_uzs=WAGE,
        )
        db.commit()

    # An administrator raises both halves after the work was done.
    with SessionLocal() as db:
        db.query(Category).filter(Category.slug == "logistics").first().commissionPercent = 20
        db.query(Region).filter(Region.name == "Toshkent").first().commissionPercent = 20
        db.commit()

    with SessionLocal() as db:
        row = db.query(Transaction).filter(Transaction.jobId == job.id).first()
        # Still the rate the day was worked under, not the new one.
        assert row.feePercent == 4
        assert row.platformFee == 8_000 * 100

    assert _balance(worker.id) == WAGE


def test_fractional_halves_survive_being_recorded(client):
    """Two whole numbers can still sum to one that is not.

    feePercent was an integer column; 1.5 + 1.2 would have been stored as 2 and
    quietly moved the difference into or out of somebody's money.
    """
    _clean()
    _category("logistics", 1.5)
    _region("Toshkent", 1.2)

    employer = make_user(role="employer", phone=_phone(), balance=1_000_000)
    worker = make_user(phone=_phone(), balance=0)
    job = make_job(employer.id, category="logistics", location="Toshkent, Chilonzor",
                   status=JobStatus.CONFIRMED, hiredWorkerId=worker.id, salary=str(WAGE))

    with SessionLocal() as db:
        job_row = db.query(Job).filter(Job.id == job.id).first()
        WorkerEarnings.credit_worker(
            db, job=job_row, worker_id=worker.id, amount_uzs=WAGE,
        )
        db.commit()
        row = db.query(Transaction).filter(Transaction.jobId == job.id).first()
        assert row.feePercent == 2.7
        # 2.7% of 200 000 = 5 400.
        assert row.platformFee == 5_400 * 100


# --- the lists the posting form reads ----------------------------------------

def test_the_category_list_is_readable_without_being_an_administrator(client):
    """An employer fills in the posting form and is not an admin."""
    _clean()
    _category("logistics", 1, name="Ombor va Kuryerlik")

    resp = client.get("/api/v1/categories")

    assert resp.status_code == 200
    assert [c["slug"] for c in resp.json()] == ["logistics"]
    assert resp.json()[0]["name"] == "Ombor va Kuryerlik"


def test_the_category_list_does_not_publish_commission_rates(client):
    _clean()
    _category("logistics", 1)

    body = client.get("/api/v1/categories").json()

    assert "commissionPercent" not in body[0]


def test_the_region_list_hides_the_ones_an_administrator_switched_off(client):
    _clean()
    _region("Toshkent", 3)
    with SessionLocal() as db:
        db.add(Region(id=str(uuid.uuid4()), name="Yopilgan", type="city",
                      isActive=False, commissionPercent=1))
        db.commit()

    names = [r["name"] for r in client.get("/api/v1/regions").json()]

    assert names == ["Toshkent"]


# --- what the landing page reads off the catalogue ---------------------------

def test_the_category_list_counts_the_work_actually_posted(client):
    """The landing block advertised "1,240+ e'lon" for categories that existed
    nowhere but in a constants file."""
    _clean()
    _category("logistics", 1, name="Ombor")
    _category("it", 3, name="IT")

    employer = make_user(role="employer", phone=_phone())
    make_job(employer.id, category="logistics", salary="200000", status=JobStatus.OPEN)
    make_job(employer.id, category="logistics", salary="350000", status=JobStatus.OPEN)
    # Finished work is not on offer and must not be counted.
    make_job(employer.id, category="logistics", salary="900000", status=JobStatus.COMPLETED)

    body = {c["slug"]: c for c in client.get("/api/v1/categories").json()}

    assert body["logistics"]["activeJobsCount"] == 2
    assert body["it"]["activeJobsCount"] == 0


def test_the_wage_range_spans_both_ends_of_what_is_posted(client):
    _clean()
    _category("logistics", 1)

    employer = make_user(role="employer", phone=_phone())
    make_job(employer.id, category="logistics", salary="200000", status=JobStatus.OPEN)
    make_job(employer.id, category="logistics", salary="350000", status=JobStatus.OPEN)

    row = next(c for c in client.get("/api/v1/categories").json() if c["slug"] == "logistics")

    assert row["salaryFrom"] == 200_000
    assert row["salaryTo"] == 350_000


def test_a_category_with_no_postings_reports_no_range_rather_than_zero(client):
    """Null, not 0 — the card has to tell "no work here" from "pays nothing"."""
    _clean()
    _category("logistics", 1)

    row = next(c for c in client.get("/api/v1/categories").json() if c["slug"] == "logistics")

    assert row["activeJobsCount"] == 0
    assert row["salaryFrom"] is None
    assert row["salaryTo"] is None
