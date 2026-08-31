from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, JSON, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base
from .user import generate_uuid


class JobStatus:
    """Canonical job lifecycle vocabulary.

    Several endpoints used to filter on ``"active"``, which no code path ever
    wrote — the column default is ``open`` — so those queries always returned
    nothing. Everything now goes through these constants.
    """

    OPEN = "open"                # accepting applications
    CONFIRMED = "confirmed"      # at least one worker hired
    IN_PROGRESS = "in_progress"  # work has started
    COMPLETED = "completed"
    CANCELLED = "cancelled"

    # Statuses a job seeker may still see and apply to.
    OPEN_STATUSES = (OPEN, CONFIRMED)
    # Statuses that mean the job is done with and should stay out of listings.
    CLOSED_STATUSES = (COMPLETED, CANCELLED)


class Job(Base):
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    employerId = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    logoUrl = Column(String)
    imageUrl = Column(String)
    salary = Column(String, nullable=False)
    salaryCurrency = Column(String, default='UZS')
    tags = Column(JSON)
    location = Column(String, nullable=False, index=True)
    rawLocation = Column(String)
    coordinateX = Column(Float)
    coordinateY = Column(Float)
    durationLabel = Column(String)
    urgent = Column(Boolean, default=False)
    description = Column(String, nullable=False)
    status = Column(String, nullable=False, default=JobStatus.OPEN, index=True)
    views = Column(Integer, default=0)
    hiredWorkerId = Column(String, ForeignKey("users.id"))
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    # When the employer marked the work done. The auto-release timer counts
    # from here, and there was nothing recording it.
    completedAt = Column(DateTime(timezone=True), nullable=True)
    
    # Extended fields
    workDate = Column(String, index=True)
    workTime = Column(String)
    neededWorkers = Column(String, default='1')
    hourlyRate = Column(String)
    transportRate = Column(String)
    category = Column(String, index=True)
    responsibilities = Column(String)
    requirements = Column(String)
    importantNote = Column(String)

    employer = relationship("User", foreign_keys=[employerId])
    hiredWorker = relationship("User", foreign_keys=[hiredWorkerId])
