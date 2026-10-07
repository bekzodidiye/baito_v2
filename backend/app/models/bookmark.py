from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.db.base_class import Base
from .user import generate_uuid

class Bookmark(Base):
    __table_args__ = (
        UniqueConstraint("jobId", "userId", name="uq_bookmark_job_user"),
    )
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    userId = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    jobId = Column(String, ForeignKey("jobs.id"), nullable=False, index=True)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())

