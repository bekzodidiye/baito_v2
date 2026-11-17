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

    PENDING = "pending"          # awaiting admin approval / moderation
    OPEN = "open"                # accepting applications
    CONFIRMED = "confirmed"      # at least one worker hired
    IN_PROGRESS = "in_progress"  # work has started
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REJECTED = "rejected"        # rejected by admin

    # Statuses a job seeker may still see and apply to.
    OPEN_STATUSES = (OPEN, CONFIRMED, "active")
    # Statuses that mean the job is done with and should stay out of listings.
    CLOSED_STATUSES = (COMPLETED, CANCELLED, REJECTED)


class Job(Base):
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    employerId = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    logoUrl = Column(String)
    imageUrl = Column(String)
    salary = Column(Integer, nullable=False, default=0)
    salaryCurrency = Column(String, default='UZS')
    isNegotiable = Column(Boolean, default=False)
    tags = Column(JSON)
    location = Column(String, nullable=False, index=True)
    rawLocation = Column(String)
    coordinateX = Column(Float, index=True)
    coordinateY = Column(Float, index=True)
    durationLabel = Column(String)
    urgent = Column(Boolean, default=False)
    description = Column(String, nullable=False)
    status = Column(String, nullable=False, default=JobStatus.PENDING, index=True)
    views = Column(Integer, default=0)
    hiredWorkerId = Column(String, ForeignKey("users.id"))
    createdAt = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    # When the work actually began. ``workTime`` is the shift the posting
    # advertised — "09:00 - 18:00" — and it says nothing about whether anyone
    # turned up at nine. This is the moment the start was confirmed, which is
    # what makes lateness a thing anybody can see.
    startedAt = Column(DateTime(timezone=True), nullable=True)
    # When the employer marked the work done. The auto-release timer counts
    # from here, and there was nothing recording it.
    completedAt = Column(DateTime(timezone=True), nullable=True)
    
    # Extended fields
    workDate = Column(String, index=True)
    workTime = Column(String)
    neededWorkers = Column(String, default='1')
    hourlyRate = Column(Integer)
    transportRate = Column(Integer)
    category = Column(String, index=True)
    responsibilities = Column(String)
    requirements = Column(String)
    importantNote = Column(String)
    translations = Column(JSON, nullable=True, default=dict)

    employer = relationship("User", foreign_keys=[employerId])
    hiredWorker = relationship("User", foreign_keys=[hiredWorkerId])

    def __init__(self, **kwargs):
        lat = kwargs.pop("latitude", None)
        lng = kwargs.pop("longitude", None)
        if lat is not None and kwargs.get("coordinateX") is None:
            kwargs["coordinateX"] = lat
        if lng is not None and kwargs.get("coordinateY") is None:
            kwargs["coordinateY"] = lng
        super().__init__(**kwargs)

    @property
    def vacancies(self) -> int:
        raw = (self.neededWorkers or "1").strip()
        return int(raw) if raw.isdigit() and int(raw) > 0 else 1

    @property
    def latitude(self):
        """Canonical latitude (stored in legacy coordinateX column)."""
        return self.coordinateX

    @latitude.setter
    def latitude(self, val):
        self.coordinateX = val

    @property
    def longitude(self):
        """Canonical longitude (stored in legacy coordinateY column)."""
        return self.coordinateY

    @longitude.setter
    def longitude(self, val):
        self.coordinateY = val
