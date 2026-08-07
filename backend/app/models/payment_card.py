from sqlalchemy import Column, String, Boolean, ForeignKey
from app.db.base_class import Base
from .user import generate_uuid

class PaymentCard(Base):
    __tablename__ = "payment_cards"
    
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    userId = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String, nullable=False) # 'uzcard' | 'humo'
    last4 = Column(String, nullable=False)
    bank = Column(String, nullable=False)
    token = Column(String, nullable=True) # for saving card via provider
    isActive = Column(Boolean, default=True)
