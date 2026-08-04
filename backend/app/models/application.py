from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.base_class import Base
from .user import generate_uuid

class Application(Base):
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    jobId = Column(String, ForeignKey("jobs.id"), nullable=False)
    workerId = Column(String, ForeignKey("users.id"), nullable=False)
    status = Column(String, nullable=False, default='applied')
    appliedDate = Column(DateTime(timezone=True), server_default=func.now())
    rating = Column(Integer)
    review = Column(String)
    bonus = Column(Integer, default=0)
