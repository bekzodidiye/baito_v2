from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Text
from sqlalchemy.sql import func

from app.db.base_class import Base
from .user import generate_uuid


class AdminAuditLog(Base):
    """Append-only record of privileged administrator actions.

    The admin panel already had an audit-log screen; nothing was ever writing
    to it. Bans, role changes, balance adjustments and document deletions all
    land here now.
    """

    __tablename__ = "admin_audit_logs"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    adminId = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    adminName = Column(String, nullable=True)
    action = Column(String, nullable=False, index=True)   # e.g. "user.ban", "user.balance"
    targetType = Column(String, nullable=True)            # "user", "job", "settings"
    targetId = Column(String, nullable=True, index=True)
    details = Column(JSON, nullable=True)
    ipAddress = Column(String, nullable=True)
    note = Column(Text, nullable=True)
    createdAt = Column(DateTime(timezone=True), server_default=func.now(), index=True)
