from sqlalchemy.orm import Session
from fastapi import HTTPException
from app import models
from app.models.audit_ledger import AuditLedger
from app.models.transaction import Transaction
import uuid

# Used only when nothing has been configured — a fresh database with no
# settings row yet. The live rate is the one an administrator set, and
# ``platform_fee_percent`` below is the only thing that should be read.
DEFAULT_PLATFORM_FEE_PERCENT = 10

# Kept for callers that imported it before the rate became configurable.
PLATFORM_FEE_PERCENT = DEFAULT_PLATFORM_FEE_PERCENT


def platform_fee_percent(db: Session) -> int:
    """The commission rate an administrator set, from the settings row.

    This used to be a module constant, so the "Platforma Komissiyasi (%)" field
    in the admin panel wrote a number that nothing ever read: every payout took
    10% no matter what was saved there.

    Falls back to the default when there is no settings row at all, which is
    only the case on a database nobody has configured yet.
    """
    row = (
        db.query(models.SystemSetting)
        .filter(models.SystemSetting.id == "singleton")
        .first()
    ) or db.query(models.SystemSetting).first()
    percent = getattr(row, "platformFeePercent", None)
    if percent is None:
        return DEFAULT_PLATFORM_FEE_PERCENT
    # The settings endpoint bounds this to 0..50 on the way in; clamp on the way
    # out too, so a row edited by hand cannot pay a worker a negative wage.
    return max(0, min(100, int(percent)))


def _region_of(location: str | None) -> str:
    """The city a posting's address begins with.

    ``location`` is built by the posting form as "<city>, <address>", so the
    city is the first comma-separated part. Anything else — a free-text address
    typed before the form asked for a city — simply will not match a region row,
    and that job falls back to the category's rate alone.
    """
    if not location:
        return ""
    return location.split(",")[0].strip()


def job_fee_percent(db: Session, job) -> float:
    """The commission an employer pays on a job: what the work is, plus where.

    A category carries a rate and a region carries a rate, and the employer is
    charged their sum. Either half can be missing — a posting in a city nobody
    has entered a rate for, a category an administrator has deleted — and a
    missing half contributes nothing rather than blocking the hire.

    When neither half resolves, the single platform-wide rate is used. That is
    what a database with no categories and no regions behaves like, which is
    every database before this was configured.
    """
    if job is None:
        return platform_fee_percent(db)

    category = (
        db.query(models.Category)
        .filter(models.Category.slug == (job.category or ""))
        .first()
    ) if job.category else None

    region_name = _region_of(job.location)
    region = (
        db.query(models.Region)
        .filter(models.Region.name == region_name)
        .first()
    ) if region_name else None

    if category is None and region is None:
        return platform_fee_percent(db)

    total = (getattr(category, "commissionPercent", 0) or 0) + \
            (getattr(region, "commissionPercent", 0) or 0)
    # Same clamp as the platform-wide rate: a row edited by hand must not be
    # able to pay a worker a negative wage.
    return max(0.0, min(100.0, float(total)))


def fee_for(amount_uzs: int, percent: float) -> int:
    """The commission on a wage, rounded down.

    The employer pays this on top of the wage — the worker is paid the figure
    the posting advertised, in full.
    """
    return int(amount_uzs * (percent / 100.0))


class WorkerEarnings:
    """What the platform owes a worker, and how it comes to owe it.

    Completing a day of work credits the worker's in-app balance. That balance
    is a promise, not a transfer: an administrator sends the real money by bank
    transfer afterwards, records the receipt against the job, and invoices the
    company for it. ``JobPayout`` is where that settlement lives.

    Nothing here touches the employer's balance. Money used to leave it twice
    for one shift — frozen in escrow when the worker was hired, and billed
    again on the invoice raised after the work was done, with nothing ever
    giving the first back. The employer pays once now, on the invoice.
    """

    @staticmethod
    def credit_worker(
        db: Session,
        job,
        worker_id: str,
        amount_uzs: int,
        job_day_id: str | None = None,
        count_completed_job: bool = True,
    ) -> Transaction:
        """Record a day's work as owed to the worker."""
        # Flush before the lock below. populate_existing() overwrites what is
        # in the session with the row as the database has it, which is the
        # point — but it cannot tell a stale attribute from one the caller has
        # just set and not yet written. The completion flow assigns the
        # worker's new rating and then calls this, and without the flush that
        # rating was silently thrown away.
        db.flush()

        worker = (
            db.query(models.User)
            .filter(models.User.id == worker_id)
            .populate_existing()
            .with_for_update()
            .first()
        )
        if not worker:
            raise HTTPException(status_code=404, detail="Ishchi topilmadi")

        # The commission is the company's, charged on top of the wage: the
        # worker is paid what the posting advertised. It is recorded beside the
        # amount rather than taken out of it, because the invoice raised later
        # bills the company for both halves and reads them from here.
        percent = job_fee_percent(db, job)
        fee_uzs = fee_for(amount_uzs, percent)

        worker.balance = (worker.balance or 0) + amount_uzs
        # A three-day shift is one job the worker did, not three. The counter
        # is bumped once, when the posting as a whole finishes — otherwise a
        # single week's work would read as a career.
        if count_completed_job:
            worker.completedJobsCount = (worker.completedJobsCount or 0) + 1
        db.add(worker)

        tx = Transaction(
            id=str(uuid.uuid4()),
            jobId=job.id,
            # One row per day of the posting, so a day that was worked can be
            # told from one that was not.
            jobDayId=job_day_id,
            employerId=job.employerId,
            workerId=worker.id,
            amount=amount_uzs * 100,
            platformFee=fee_uzs * 100,
            # Pinned here rather than read again at invoice time: this is the
            # rate the day was worked under, and a later change to the setting
            # must not reach back into work already done.
            feePercent=percent,
            type="worker_earning",
            status="credited",
        )
        db.add(tx)

        db.add(AuditLedger(
            userId=worker.id,
            amountDelta=amount_uzs,
            balanceAfter=worker.balance,
            entryType="worker_earning",
            referenceType="job",
            referenceId=job.id,
            description=f"Ish yakunlandi: {amount_uzs} so'm hisoblandi",
        ))
        db.flush()
        return tx

    @staticmethod
    def pay_completion_bonus(
        db: Session, job, worker_id: str, amount_uzs: int
    ) -> Transaction | None:
        """A bonus the employer chose to add when finishing the job.

        Credited to the worker like the wage, and billed to the company on the
        same invoice. It used to come straight out of the employer's balance,
        which is the same double charge the wage had.
        """
        if amount_uzs <= 0:
            return None

        worker = (
            db.query(models.User)
            .filter(models.User.id == worker_id)
            .populate_existing()
            .with_for_update()
            .first()
        )
        if not worker:
            raise HTTPException(status_code=404, detail="Ishchi topilmadi")

        worker.balance = (worker.balance or 0) + amount_uzs
        db.add(worker)

        tx = Transaction(
            id=str(uuid.uuid4()),
            jobId=job.id,
            employerId=job.employerId,
            workerId=worker.id,
            amount=amount_uzs * 100,
            platformFee=0,
            feePercent=0,
            type="completion_bonus",
            status="credited",
        )
        db.add(tx)

        db.add(AuditLedger(
            userId=worker.id,
            amountDelta=amount_uzs,
            balanceAfter=worker.balance,
            entryType="completion_bonus",
            referenceType="job",
            referenceId=job.id,
            description=f"Ish beruvchidan bonus: {amount_uzs} so'm",
        ))
        db.flush()
        return tx
