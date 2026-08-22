from sqlalchemy import Column, String, Boolean
from app.db.base_class import Base
import uuid

class Region(Base):
    __tablename__ = "regions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, index=True)
    type = Column(String)  # 'city' or 'region'
    parentId = Column(String, nullable=True)
    isActive = Column(Boolean, default=True)
