from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.sql import func

from app.db.base_class import Base
from .user import generate_uuid


class JobDayStatus:
    """Where one day of a posting stands.

    A day is the unit of work and the unit of payment. It is not the posting:
    a three-day shift is three of these, and finishing the second says nothing
    about the third.
    """

    PENDING = "pending"        # not worked yet
    COMPLETED = "completed"    # worked, and that day's wage released
    CANCELLED = "cancelled"    # not worked; the day's wage goes back


class JobDay(Base):
    """One calendar day of a posting, with its own status and its own wage.

    ``Job.workDate`` is free text — "2026-09-02, 2026-09-03, 2026-09-04" — and
    for a long time that was the only record of a multi-day shift. One Job row
    carried one status and one escrow hold, so finishing the first day
    finished all three and paid once for all three. The days had no separate
    existence to complete or to pay.

    They do now. The posting still hires one worker for the whole run; what is
    split is the work and the money. Each row here owns its own escrow hold
    (``Transaction.jobDayId``), so a day is paid when that day is done and
    refunded when it is not worked.
    """

    __tablename__ = "job_days"
    __table_args__ = (
        # The same date twice on one posting would mean paying for it twice.
        UniqueConstraint("jobId", "workDate", name="uq_job_days_job_date"),
    )

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    jobId = Column(String, ForeignKey("jobs.id"), nullable=False, index=True)

    # ``YYYY-MM-DD``. A real Date would be tidier, but every other date in this
    # schema is a string in this format and the calendar compares them as
    # strings; one column in a different type is how a comparison silently
    # stops matching.
    workDate = Column(String, nullable=False, index=True)

    status = Column(String, nullable=False, default=JobDayStatus.PENDING, index=True)

    # UZS, like users.balance — not tiyin. Written when the worker is hired,
    # from the posting's wage as it stood at that moment. Frozen there on
    # purpose: an employer editing the salary afterwards must not change what
    # is owed for a day already agreed.
    amount = Column(Integer, nullable=True)

    completedAt = Column(DateTime(timezone=True), nullable=True)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
