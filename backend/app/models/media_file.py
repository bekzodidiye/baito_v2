from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.db.base_class import Base
from .user import generate_uuid


class MediaVisibility:
    """Who may read an uploaded object.

    ``PUBLIC`` covers things already visible in public listings — job photos,
    company logos, avatars. ``PRIVATE`` covers identity documents, which may
    only be read by their owner or an administrator.
    """

    PUBLIC = "public"
    PRIVATE = "private"


class MediaFile(Base):
    """Ownership and visibility record for every object in the media bucket.

    The bucket itself is no longer world-readable, so this table is what the
    ``/media`` endpoint consults before streaming anything back.
    """

    __tablename__ = "media_files"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    # Object key inside the bucket, e.g. "9f3c….webp".
    objectKey = Column(String, nullable=False, unique=True, index=True)
    ownerId = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    visibility = Column(String, nullable=False, default=MediaVisibility.PRIVATE, index=True)
    contentType = Column(String, nullable=True)
    sizeBytes = Column(Integer, nullable=True)
    createdAt = Column(DateTime(timezone=True), server_default=func.now(), index=True)
