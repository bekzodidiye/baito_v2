from sqlalchemy.orm import Session
from fastapi import HTTPException
from app import models
from app.models.audit_ledger import AuditLedger
from app.models.transaction import Transaction
import uuid

PLATFORM_FEE_PERCENT = 10 # 10% platform fee

class EscrowService:
    """Escrow vault for the marketplace.

    TRANSACTIONS: these methods never commit. They ``flush()`` so the caller can
    read back generated ids, and leave the commit to the request handler.

    They used to commit internally while their callers committed again, which
    meant a failure between the two left money frozen against a job nobody was
    hired for — and, when completing a multi-worker job, paid some workers and
    not others while the job was already marked complete. Holding one
    transaction per request makes each of those operations all-or-nothing.
    """
    @staticmethod
    def hold_funds(db: Session, employer_id: str, job_id: str, amount_uzs: int) -> Transaction:
        employer = (db.query(models.User).filter(models.User.id == employer_id)
                    .populate_existing()
                    .with_for_update().first())
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
        db.flush()
        return tx

    @staticmethod
    def release_funds(db: Session, job_id: str, worker_id: str) -> Transaction:
        # Flush before taking any lock below. populate_existing() overwrites
        # what is in the session with the row as the database has it, which is
        # the point — but it cannot tell a stale attribute from one the caller
        # has just set and not yet written. The completion flow assigns the
        # worker's new rating and then calls this, and without the flush that
        # rating was silently thrown away.
        db.flush()

        # Find active escrow hold
        tx = db.query(Transaction).filter(
            Transaction.jobId == job_id,
            Transaction.type == "escrow_hold",
            Transaction.status == "held"
        ).populate_existing().with_for_update().first()

        if not tx:
            raise HTTPException(status_code=404, detail="Ushbu ish uchun muzlatilgan mablag' topilmadi")

        total_amount = tx.amount // 100 # convert tiyin to UZS
        platform_fee = int(total_amount * (PLATFORM_FEE_PERCENT / 100.0))
        worker_payout = total_amount - platform_fee

        worker = db.query(models.User).filter(models.User.id == worker_id).populate_existing().with_for_update().first()
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
        db.flush()
        return tx

    @staticmethod
    def pay_completion_bonus(
        db: Session, job_id: str, employer_id: str, worker_id: str, amount_uzs: int
    ) -> None:
        """Move a completion bonus from the employer to the worker.

        The bonus is decided at completion, so unlike the wage nothing was
        escrowed for it at hire — the employer is debited here, at the moment
        they choose to give it.

        No platform fee. The completion modal tells the employer "Kiritilgan
        summa ishchining balansiga qo'shiladi" — *the amount entered* is added
        to the worker's balance — and taking a cut would make that sentence
        false.

        Callers must check the employer can cover the total before changing
        any state; this raises rather than paying a partial bonus.
        """
        if amount_uzs <= 0:
            return

        employer = (db.query(models.User).filter(models.User.id == employer_id)
                    .populate_existing().with_for_update().first())
        if not employer or (employer.balance or 0) < amount_uzs:
            raise HTTPException(
                status_code=400,
                detail="Bonus uchun ish beruvchi balansida yetarli mablag' yo'q",
            )

        worker = (db.query(models.User).filter(models.User.id == worker_id)
                  .populate_existing().with_for_update().first())
        if not worker:
            raise HTTPException(status_code=404, detail="Ishchi topilmadi")

        employer.balance = (employer.balance or 0) - amount_uzs
        worker.balance = (worker.balance or 0) + amount_uzs
        db.add(employer)
        db.add(worker)

        db.add(Transaction(
            id=str(uuid.uuid4()),
            jobId=job_id,
            employerId=employer.id,
            workerId=worker.id,
            amount=amount_uzs * 100,
            type="completion_bonus",
            status="released",
        ))
        db.add(AuditLedger(
            userId=employer.id, amountDelta=-amount_uzs,
            balanceAfter=employer.balance, entryType="completion_bonus",
            referenceType="job", referenceId=job_id,
            description=f"Ishchiga bonus to'landi ({amount_uzs} so'm)",
        ))
        db.add(AuditLedger(
            userId=worker.id, amountDelta=amount_uzs,
            balanceAfter=worker.balance, entryType="completion_bonus",
            referenceType="job", referenceId=job_id,
            description=f"Ish yakunlangani uchun bonus ({amount_uzs} so'm)",
        ))
        db.flush()

    @staticmethod
    def refund_funds(db: Session, job_id: str) -> Transaction:
        # Flush before taking any lock below. populate_existing() overwrites
        # what is in the session with the row as the database has it, which is
        # the point — but it cannot tell a stale attribute from one the caller
        # has just set and not yet written. The completion flow assigns the
        # worker's new rating and then calls this, and without the flush that
        # rating was silently thrown away.
        db.flush()

        tx = db.query(Transaction).filter(
            Transaction.jobId == job_id,
            Transaction.type == "escrow_hold",
            Transaction.status == "held"
        ).populate_existing().with_for_update().first()

        if not tx:
            raise HTTPException(status_code=404, detail="Muzlatilgan mablag' topilmadi")

        refund_amount = tx.amount // 100
        employer = db.query(models.User).filter(models.User.id == tx.employerId).populate_existing().with_for_update().first()
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
        db.flush()
        return tx
