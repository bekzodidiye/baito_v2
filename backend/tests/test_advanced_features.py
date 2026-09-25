"""Specialised services: matching, spam, geo, escrow, fiscal receipts, growth.

Originally one 98-line function running six unrelated services inside a
91-line try/finally, with prints in place of failure messages. Six services,
six tests: when one regresses, the name of the failing test says which.
"""
import uuid

import pytest

from app import models
from app.db.session import SessionLocal
from app.services.ai_matcher import AIMatchmaker
from app.services.escrow_service import EscrowService
from app.services.geo_service import GeoSpatialService
from app.services.growth_engine import GrowthEngine
from app.services.soliq_service import SoliqFiscalService
from app.services.spam_detector import SpamFraudDetector


def test_matchmaker_recommends_a_driver_for_a_driving_job():
    worker = models.User(
        id=str(uuid.uuid4()), name="Rustam Aliyev", category="Haydovchi",
        region="Toshkent", skills=["Haydovchilik", "B toifa", "Yandex pro"],
        rating=4.8, completedJobsCount=10,
    )
    job = models.Job(
        id=str(uuid.uuid4()), title="Kuryer va Haydovchi kerak",
        category="Haydovchi", location="Toshkent, Yunusobod",
        requirements="B toifa haydovchilik guvohnomasi",
    )
    result = AIMatchmaker.calculate_match_score(worker, job)
    assert result["score"] >= 70
    assert result["is_recommended"] is True


def test_spam_detector_flags_a_get_rich_quick_posting():
    result = SpamFraudDetector.analyze_job_posting(
        title="Onlayn oson daromad 1000$",
        description="Kripto va piramida orqali 1 soatda boyish. Tel: +998 90 123 45 67",
        salary="80000000",
    )
    assert result["is_spam"] is True
    assert result["risk_score"] >= 70


def test_geo_service_measures_a_known_tashkent_distance():
    # Amir Timur square -> Chilonzor, roughly 7 km.
    distance = GeoSpatialService.haversine_distance(
        41.311081, 69.240562, 41.282778, 69.204444
    )
    assert 4.0 <= distance <= 8.0
    assert "transit_time_min" in GeoSpatialService.estimate_commute_time(distance)


@pytest.fixture
def escrow_pair():
    """An employer holding 500,000, the worker they will pay, and a real job.

    The job matters: transactions.jobId is a foreign key. Passing a bare uuid
    is accepted by SQLite, which does not enforce foreign keys by default, and
    rejected by the Postgres CI runs with

        ForeignKeyViolation: Key (jobId)=(...) is not present in table "jobs"
    """
    with SessionLocal() as db:
        employer = models.User(
            id=str(uuid.uuid4()), uid=f"emp_esc_{uuid.uuid4().hex[:6]}",
            phone=f"+99890{uuid.uuid4().hex[:6]}", name="Escrow Employer",
            balance=500000,
        )
        worker = models.User(
            id=str(uuid.uuid4()), uid=f"wrk_esc_{uuid.uuid4().hex[:6]}",
            phone=f"+99890{uuid.uuid4().hex[:6]}", name="Escrow Worker",
            balance=0,
        )
        db.add(employer)
        db.add(worker)
        db.commit()
        db.refresh(employer)
        db.refresh(worker)

        job = models.Job(
            id=str(uuid.uuid4()), employerId=employer.id,
            title="Escrow test job", company="Baito Corp",
            description="Escrow lifecycle fixture", salary="200000",
            location="Toshkent",
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        yield db, employer, worker, job


def test_escrow_holds_the_wage_plus_the_employers_commission(escrow_pair):
    """The worker is paid the posted wage; the platform's cut is the employer's.

    Both halves are frozen together, so the employer cannot be billed the
    commission later for a shift whose money has already gone.
    """
    db, employer, worker, job = escrow_pair

    held = EscrowService.hold_funds(db, employer.id, job.id, 200000)
    assert held.status == "held"
    db.refresh(employer)
    assert employer.balance == 280000  # 500,000 less 200,000 wage and 20,000 fee

    released = EscrowService.release_funds(db, job.id, worker.id)
    assert released.status == "released"
    db.refresh(worker)
    assert worker.balance == 200000  # the posted wage, whole


def test_fiscal_receipt_is_confirmed_and_points_at_soliq():
    receipt = SoliqFiscalService.generate_fiscal_receipt(
        worker_pinfl="31205901234567",
        worker_name="Escrow Worker",
        amount_uzs=180000,
        job_title="Baito xizmatlari",
    )
    assert receipt["status"] == "FISCAL_CONFIRMED"
    assert "my.soliq.uz" in receipt["qr_url"]


def test_referral_bonus_credits_both_sides(escrow_pair):
    db, employer, worker, job = escrow_pair
    EscrowService.hold_funds(db, employer.id, job.id, 200000)
    EscrowService.release_funds(db, job.id, worker.id)

    GrowthEngine.apply_referral_bonus_on_first_job(db, worker, employer.id)
    db.refresh(employer)
    db.refresh(worker)
    assert employer.balance == 300000  # 280,000 + 20,000
    assert worker.balance == 220000    # 200,000 + 20,000
