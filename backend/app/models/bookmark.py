from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.base_class import Base
from .user import generate_uuid

class Bookmark(Base):
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    userId = Column(String, ForeignKey("users.id"), nullable=False)
    jobId = Column(String, ForeignKey("jobs.id"), nullable=False)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
