from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.db.base_class import Base
from .user import generate_uuid

class Application(Base):
    __table_args__ = (
        UniqueConstraint("jobId", "workerId", name="uq_application_job_worker"),
    )

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    jobId = Column(String, ForeignKey("jobs.id"), nullable=False, index=True)
    workerId = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    status = Column(String, nullable=False, default='applied', index=True)
    appliedDate = Column(DateTime(timezone=True), server_default=func.now())
    rating = Column(Integer)
    review = Column(String)
    bonus = Column(Integer, default=0)
