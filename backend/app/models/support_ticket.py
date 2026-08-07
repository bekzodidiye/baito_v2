from sqlalchemy import Column, String, DateTime, ForeignKey, Integer
from sqlalchemy.sql import func
from app.db.base_class import Base
from .user import generate_uuid
from sqlalchemy.orm import relationship

class SupportTicket(Base):
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    userId = Column(String, ForeignKey("users.id"), nullable=False)
    subject = Column(String, nullable=False)
    category = Column(String, nullable=False, default="general")
    status = Column(String, nullable=False, default="new")
    priority = Column(String, nullable=False, default="medium")
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    
    messages = relationship("TicketMessage", back_populates="ticket", cascade="all, delete-orphan")
    user = relationship("User")

class TicketMessage(Base):
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    ticketId = Column(String, ForeignKey("supporttickets.id"), nullable=False)
    senderId = Column(String, ForeignKey("users.id"), nullable=False) # can be user or admin
    text = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    ticket = relationship("SupportTicket", back_populates="messages")
