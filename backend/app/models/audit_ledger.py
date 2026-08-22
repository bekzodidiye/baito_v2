from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from app.db.base_class import Base
import uuid

class AuditLedger(Base):
    """
    Immutable Double-entry Financial Audit Ledger for FinTech compliance.
    Every balance increment or decrement creates a permanent record here.
    """
    __tablename__ = "audit_ledgers"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    userId = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    amountDelta = Column(Integer, nullable=False) # positive for credit, negative for debit (in UZS)
    balanceAfter = Column(Integer, nullable=False)
    entryType = Column(String, nullable=False) # 'deposit', 'payout', 'fee', 'escrow_hold', 'escrow_release', 'refund'
    referenceType = Column(String, nullable=True) # 'transaction', 'job', 'application'
    referenceId = Column(String, nullable=True, index=True)
    description = Column(Text, nullable=True)
    createdAt = Column(DateTime(timezone=True), server_default=func.now(), index=True)
