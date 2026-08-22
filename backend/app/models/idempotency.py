from sqlalchemy import Column, String, Integer, DateTime, Text
from sqlalchemy.sql import func
from app.db.base_class import Base

class IdempotencyKey(Base):
    """
    Idempotency key storage to protect payment/critical endpoints against network retries.
    """
    __tablename__ = "idempotency_keys"

    id = Column(String, primary_key=True, index=True) # The idempotency key provided by client/provider
    userId = Column(String, nullable=True, index=True)
    requestPath = Column(String, nullable=False)
    responseCode = Column(Integer, nullable=False)
    responseBody = Column(Text, nullable=False)
    createdAt = Column(DateTime(timezone=True), server_default=func.now(), index=True)
