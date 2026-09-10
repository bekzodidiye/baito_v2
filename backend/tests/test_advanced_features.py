import pytest
from app.db.session import SessionLocal
from app import models
from app.services.ai_matcher import AIMatchmaker
from app.services.spam_detector import SpamFraudDetector
from app.services.geo_service import GeoSpatialService
from app.services.escrow_service import EscrowService
from app.services.soliq_service import SoliqFiscalService
from app.services.growth_engine import GrowthEngine
import uuid

def test_all_specialized_enterprise_services():
    print("\n🚀 Running Specialized Developer Test Suite (AI, GIS, FinTech, Growth)...")
    db = SessionLocal()
    try:
        # 1. Test AI Matchmaker
        worker = models.User(
            id=str(uuid.uuid4()),
            name="Rustam Aliyev",
            category="Haydovchi",
            region="Toshkent",
            skills=["Haydovchilik", "B toifa", "Yandex pro"],
            rating=4.8,
            completedJobsCount=10
        )
        job_matching = models.Job(
            id=str(uuid.uuid4()),
            title="Kuryer va Haydovchi kerak",
            category="Haydovchi",
            location="Toshkent, Yunusobod",
            requirements="B toifa haydovchilik guvohnomasi"
        )
        match_result = AIMatchmaker.calculate_match_score(worker, job_matching)
        assert match_result["score"] >= 70
        assert match_result["is_recommended"] is True
        print(f"  ✅ 1. AI Matchmaking Engine: Score {match_result['score']}% (Reasons: {len(match_result['match_reasons'])})")

        # 2. Test Spam & Fraud Detector
        spam_job = SpamFraudDetector.analyze_job_posting(
            title="Onlayn oson daromad 1000$",
            description="Kripto va piramida orqali 1 soatda boyish. Tel: +998 90 123 45 67",
            salary="80000000"
        )
        assert spam_job["is_spam"] is True
        assert spam_job["risk_score"] >= 70
        print(f"  ✅ 2. AI Anti-Fraud / Spam Detector: Flagged accurately (Risk: {spam_job['risk_score']}%)")

        # 3. Test GeoSpatial GIS Service (Tashkent Amir Timur Sq -> Chilonzor ~7km)
        dist = GeoSpatialService.haversine_distance(41.311081, 69.240562, 41.282778, 69.204444)
        assert 4.0 <= dist <= 8.0
        commute = GeoSpatialService.estimate_commute_time(dist)
        assert "transit_time_min" in commute
        print(f"  ✅ 3. Geo-Spatial GIS Engine: Distance: {dist} km, Driving: {commute['driving_time_min']} min")

        # 4. Test FinTech Escrow Lifecycle & Audit Ledger
        employer = models.User(
            id=str(uuid.uuid4()),
            uid=f"emp_esc_{uuid.uuid4().hex[:6]}",
            phone=f"+99890{uuid.uuid4().hex[:6]}",
            name="Escrow Employer",
            balance=500000
        )
        worker_esc = models.User(
            id=str(uuid.uuid4()),
            uid=f"wrk_esc_{uuid.uuid4().hex[:6]}",
            phone=f"+99890{uuid.uuid4().hex[:6]}",
            name="Escrow Worker",
            balance=0
        )
        db.add(employer)
        db.add(worker_esc)
        db.commit()

        job_esc_id = str(uuid.uuid4())
        # A. Hold 200,000 UZS in Escrow
        tx_hold = EscrowService.hold_funds(db, employer.id, job_esc_id, 200000)
        assert tx_hold.status == "held"
        db.refresh(employer)
        assert employer.balance == 300000

        # B. Release funds to Worker (200k minus 10% fee = 180k)
        tx_release = EscrowService.release_funds(db, job_esc_id, worker_esc.id)
        assert tx_release.status == "released"
        db.refresh(worker_esc)
        assert worker_esc.balance == 180000
        print("  ✅ 4. Bank-Grade Escrow & Audit Ledger: Held 200k -> Disbursed 180k (+10% Platform fee)")

        # 5. Test Soliq.uz Fiscalization Receipt
        receipt = SoliqFiscalService.generate_fiscal_receipt(
            worker_pinfl="31205901234567",
            worker_name=worker_esc.name,
            amount_uzs=180000,
            job_title="Baito xizmatlari"
        )
        assert receipt["status"] == "FISCAL_CONFIRMED"
        assert "my.soliq.uz" in receipt["qr_url"]
        print(f"  ✅ 5. Soliq.uz Fiscal Receipt Generator: {receipt['receipt_id']} (QR Verified)")

        # 6. Test Growth Engine Referral Bonus
        GrowthEngine.apply_referral_bonus_on_first_job(db, worker_esc, employer.id)
        db.refresh(employer)
        db.refresh(worker_esc)
        assert employer.balance == 320000 # 300k + 20k bonus
        assert worker_esc.balance == 200000 # 180k + 20k bonus
        print("  ✅ 6. Growth Referral Engine: +20,000 UZS Bonus credited to both Referrer and Worker")

        print("🌟 All 6 Advanced Enterprise Specialized Developer Tests: 100% PASSED!\n")
    finally:
        db.close()

if __name__ == "__main__":
    test_all_specialized_enterprise_services()
