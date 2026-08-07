import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime
from app.db.base_class import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    userId = Column(String, index=True, nullable=False)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    type = Column(String, default="system") # apply, hire, start_request, start_confirmed, completed, system
    relatedJobId = Column(String, nullable=True)
    isRead = Column(Boolean, default=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
