from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from app.db.base_class import Base
from .user import generate_uuid

class Chat(Base):
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    jobId = Column(String, ForeignKey("jobs.id"), index=True)
    workerId = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    employerId = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    isContactRevealed = Column(Boolean, default=False)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())

class Message(Base):
    __table_args__ = (
        Index("ix_messages_unread", "chatId", "senderId", "readAt"),
    )

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    chatId = Column(String, ForeignKey("chats.id"), nullable=False, index=True)
    senderId = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    text = Column(String, nullable=False)
    hasMap = Column(Boolean, default=False)
    mapLocation = Column(String)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    # Null until the recipient opens the conversation. Without this the unread
    # count was every message the other side had ever sent, and never fell.
    readAt = Column(DateTime(timezone=True), nullable=True, index=True)
