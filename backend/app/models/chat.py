from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.base_class import Base
from .user import generate_uuid

class Chat(Base):
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    jobId = Column(String, ForeignKey("jobs.id"))
    workerId = Column(String, ForeignKey("users.id"), nullable=False)
    employerId = Column(String, ForeignKey("users.id"), nullable=False)
    isContactRevealed = Column(Boolean, default=False)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())

class Message(Base):
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    chatId = Column(String, ForeignKey("chats.id"), nullable=False)
    senderId = Column(String, ForeignKey("users.id"), nullable=False)
    text = Column(String, nullable=False)
    hasMap = Column(Boolean, default=False)
    mapLocation = Column(String)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
