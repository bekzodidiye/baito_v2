from sqlalchemy import Column, String, DateTime, ForeignKey, Integer
from sqlalchemy.sql import func
from app.db.base_class import Base
from .user import generate_uuid

class Transaction(Base):
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    jobId = Column(String, ForeignKey("jobs.id"))
    employerId = Column(String, ForeignKey("users.id"), nullable=False)
    workerId = Column(String, ForeignKey("users.id"))
    amount = Column(Integer, nullable=False)
    platformFee = Column(Integer, nullable=False, default=0)
    type = Column(String, nullable=False) # 'deposit' | 'withdraw' | 'payment'
    status = Column(String, nullable=False, default='pending') # 'pending' | 'paid' | 'canceled'
    createdAt = Column(DateTime(timezone=True), server_default=func.now())

    # Provider specific fields (Payme/Click)
    providerTransactionId = Column(String, nullable=True, index=True)
    performTime = Column(Integer, nullable=True) # unix timestamp from payme
    cancelTime = Column(Integer, nullable=True) # unix timestamp from payme
    cancelReason = Column(Integer, nullable=True)
