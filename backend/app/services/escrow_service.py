from sqlalchemy.orm import Session
from fastapi import HTTPException
from app import models
from app.models.audit_ledger import AuditLedger
from app.models.transaction import Transaction
import uuid

PLATFORM_FEE_PERCENT = 10 # 10% platform fee

class EscrowService:
    """
    Bank-grade Escrow Vault for Baito Marketplace.
    Secures employer funds upon hiring and safely disburses upon job completion.
    """
    @staticmethod
    def hold_funds(db: Session, employer_id: str, job_id: str, amount_uzs: int) -> Transaction:
        employer = db.query(models.User).filter(models.User.id == employer_id).with_for_update().first()
        if not employer or (employer.balance or 0) < amount_uzs:
            raise HTTPException(status_code=400, detail="Ish beruvchi balansida yetarli mablag' mavjud emas (Escrow HOLD)")

        # Deduct and freeze
        employer.balance = (employer.balance or 0) - amount_uzs
        db.add(employer)

        tx = Transaction(
            id=str(uuid.uuid4()),
            jobId=job_id,
            employerId=employer.id,
            amount=amount_uzs * 100,
            type="escrow_hold",
            status="held"
        )
        db.add(tx)

        # Audit ledger record
        ledger = AuditLedger(
            userId=employer.id,
            amountDelta=-amount_uzs,
            balanceAfter=employer.balance,
            entryType="escrow_hold",
            referenceType="job",
            referenceId=job_id,
            description=f"Ish e'loni uchun mablag' muzlatildi ({amount_uzs} so'm)"
        )
        db.add(ledger)
        db.commit()
        db.refresh(tx)
        return tx

    @staticmethod
    def release_funds(db: Session, job_id: str, worker_id: str) -> Transaction:
        # Find active escrow hold
        tx = db.query(Transaction).filter(
            Transaction.jobId == job_id,
            Transaction.type == "escrow_hold",
            Transaction.status == "held"
        ).with_for_update().first()

        if not tx:
            raise HTTPException(status_code=404, detail="Ushbu ish uchun muzlatilgan mablag' topilmadi")

        total_amount = tx.amount // 100 # convert tiyin to UZS
        platform_fee = int(total_amount * (PLATFORM_FEE_PERCENT / 100.0))
        worker_payout = total_amount - platform_fee

        worker = db.query(models.User).filter(models.User.id == worker_id).with_for_update().first()
        if not worker:
            raise HTTPException(status_code=404, detail="Ishchi topilmadi")

        # Credit worker balance
        worker.balance = (worker.balance or 0) + worker_payout
        worker.completedJobsCount = (worker.completedJobsCount or 0) + 1
        db.add(worker)

        # Update escrow tx
        tx.status = "released"
        tx.workerId = worker.id
        tx.platformFee = platform_fee * 100
        db.add(tx)

        # Ledger for worker
        ledger_worker = AuditLedger(
            userId=worker.id,
            amountDelta=worker_payout,
            balanceAfter=worker.balance,
            entryType="escrow_release",
            referenceType="job",
            referenceId=job_id,
            description=f"Ish muvaffaqiyatli yakunlandi: to'lov o'tkazildi ({worker_payout} so'm)"
        )
        db.add(ledger_worker)
        db.commit()
        db.refresh(tx)
        return tx

    @staticmethod
    def refund_funds(db: Session, job_id: str) -> Transaction:
        tx = db.query(Transaction).filter(
            Transaction.jobId == job_id,
            Transaction.type == "escrow_hold",
            Transaction.status == "held"
        ).with_for_update().first()

        if not tx:
            raise HTTPException(status_code=404, detail="Muzlatilgan mablag' topilmadi")

        refund_amount = tx.amount // 100
        employer = db.query(models.User).filter(models.User.id == tx.employerId).with_for_update().first()
        if employer:
            employer.balance = (employer.balance or 0) + refund_amount
            db.add(employer)

        tx.status = "refunded"
        db.add(tx)

        ledger = AuditLedger(
            userId=tx.employerId,
            amountDelta=refund_amount,
            balanceAfter=employer.balance if employer else 0,
            entryType="refund",
            referenceType="job",
            referenceId=job_id,
            description=f"Bekor qilingan ish bo'yicha mablag' qaytarildi ({refund_amount} so'm)"
        )
        db.add(ledger)
        db.commit()
        db.refresh(tx)
        return tx
