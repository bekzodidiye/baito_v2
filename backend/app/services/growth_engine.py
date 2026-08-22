from sqlalchemy.orm import Session
from app import models
from app.models.audit_ledger import AuditLedger
import uuid

REFERRAL_BONUS_AMOUNT = 20_000 # 20,000 UZS reward for both referrer and worker

class GrowthEngine:
    """
    Growth & Viral Referral Loop Engine.
    Handles referral rewards, re-engagement incentives, and user retention hooks.
    """
    @staticmethod
    def generate_referral_code(user_id: str) -> str:
        return f"BAITO-{user_id[:6].upper()}"

    @staticmethod
    def apply_referral_bonus_on_first_job(db: Session, worker: models.User, referrer_id: str) -> bool:
        """
        Awards referral bonus when the referred worker completes their first job.
        """
        if (worker.completedJobsCount or 0) != 1:
            return False # Only triggered on the very first completed job

        referrer = db.query(models.User).filter(models.User.id == referrer_id).with_for_update().first()
        if not referrer:
            return False

        # 1. Reward Referrer
        referrer.balance = (referrer.balance or 0) + REFERRAL_BONUS_AMOUNT
        db.add(referrer)
        
        ledger_ref = AuditLedger(
            userId=referrer.id,
            amountDelta=REFERRAL_BONUS_AMOUNT,
            balanceAfter=referrer.balance,
            entryType="referral_bonus",
            referenceType="user",
            referenceId=worker.id,
            description=f"Do'stingiz ({worker.name}) birinchi ishini bajardi: +{REFERRAL_BONUS_AMOUNT} so'm bonus!"
        )
        db.add(ledger_ref)

        # 2. Reward Worker (Referee welcome bonus)
        worker.balance = (worker.balance or 0) + REFERRAL_BONUS_AMOUNT
        db.add(worker)

        ledger_wrk = AuditLedger(
            userId=worker.id,
            amountDelta=REFERRAL_BONUS_AMOUNT,
            balanceAfter=worker.balance,
            entryType="referral_bonus",
            referenceType="user",
            referenceId=referrer.id,
            description=f"Referral dasturi orqali birinchi ish bonusi: +{REFERRAL_BONUS_AMOUNT} so'm!"
        )
        db.add(ledger_wrk)
        db.commit()
        return True
