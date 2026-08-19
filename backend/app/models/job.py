from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, JSON, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base
from .user import generate_uuid

class Job(Base):
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    employerId = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    logoUrl = Column(String)
    imageUrl = Column(String)
    salary = Column(String, nullable=False)
    salaryCurrency = Column(String, default='UZS')
    tags = Column(JSON)
    location = Column(String, nullable=False)
    rawLocation = Column(String)
    coordinateX = Column(Float)
    coordinateY = Column(Float)
    durationLabel = Column(String)
    urgent = Column(Boolean, default=False)
    description = Column(String, nullable=False)
    status = Column(String, nullable=False, default='open')
    views = Column(Integer, default=0)
    hiredWorkerId = Column(String, ForeignKey("users.id"))
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    
    # Extended fields
    workDate = Column(String)
    workTime = Column(String)
    neededWorkers = Column(String, default='1')
    hourlyRate = Column(String)
    transportRate = Column(String)
    category = Column(String)
    responsibilities = Column(String)
    requirements = Column(String)
    importantNote = Column(String)

    employer = relationship("User", foreign_keys=[employerId])
    hiredWorker = relationship("User", foreign_keys=[hiredWorkerId])
