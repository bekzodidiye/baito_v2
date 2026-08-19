from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid

from app.db.base_class import Base

def generate_uuid():
    return str(uuid.uuid4())

class ActiveSession(Base):
    __tablename__ = "active_sessions"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    user_uid = Column(String, ForeignKey("users.uid", ondelete="CASCADE"), nullable=False, index=True)
    
    device_name = Column(String, nullable=True) # e.g., "iPhone 14 Pro", "Windows PC • Chrome"
    location = Column(String, nullable=True) # E.g., "Toshkent, O'zbekiston" or simple parsing of IP
    ip_address = Column(String, nullable=True)
    
    is_active = Column(Boolean, default=True, index=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_active_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", backref="active_sessions")
