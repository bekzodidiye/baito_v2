from sqlalchemy import BigInteger, Column, String, DateTime, Float, ForeignKey, Integer
from sqlalchemy.sql import func
from app.db.base_class import Base
from .user import generate_uuid

class Transaction(Base):
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    jobId = Column(String, ForeignKey("jobs.id"))
    # Which day of the posting this holds money for. A multi-day shift
    # credits the worker once per day, so a day that was worked can be
    # worked and refunded when it is not. Null on everything else — top-ups,
    # payouts, and the single-day holds made before this existed.
    jobDayId = Column(String, ForeignKey("job_days.id"), nullable=True, index=True)
    employerId = Column(String, ForeignKey("users.id"), nullable=False)
    workerId = Column(String, ForeignKey("users.id"))
    amount = Column(Integer, nullable=False)
    platformFee = Column(Integer, nullable=False, default=0)
    # The commission rate this hold was taken under. An administrator can change
    # the rate, and the worker is quoted their net wage when they apply — so the
    # rate has to be the one in force when the money was frozen, not whatever it
    # happens to be on payout day. Null on holds made before this existed, and
    # on everything that is not a worker credit.
    feePercent = Column(Float, nullable=True)
    type = Column(String, nullable=False) # 'deposit' | 'withdraw' | 'payment'
    status = Column(String, nullable=False, default='pending') # 'pending' | 'paid' | 'canceled'
    createdAt = Column(DateTime(timezone=True), server_default=func.now())

    # Provider specific fields (Payme/Click)
    providerTransactionId = Column(String, nullable=True, index=True)
    # Milliseconds, not seconds — which does not fit a 32-bit integer. Every
    # writer of these columns multiplies by 1000, so on PostgreSQL the insert
    # raised NumericValueOutOfRange and rolled back the whole credit.
    performTime = Column(BigInteger, nullable=True)  # unix ms
    cancelTime = Column(BigInteger, nullable=True)  # unix ms
    cancelReason = Column(Integer, nullable=True)
