from sqlalchemy import Column, String, Boolean, DateTime, Integer
from app.db.base_class import Base
import uuid

class Promotion(Base):
    __tablename__ = "promotions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String, index=True, unique=True)
    discountType = Column(String)  # 'percentage' | 'fixed'
    amount = Column(Integer)
    usageCount = Column(Integer, default=0)
    maxUsage = Column(Integer)
    expiresAt = Column(String, nullable=True)
    isActive = Column(Boolean, default=True)
    forNewUsersOnly = Column(Boolean, default=False)
