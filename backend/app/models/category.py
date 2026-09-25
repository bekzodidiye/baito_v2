from sqlalchemy import Column, String, Integer, Float, JSON
from app.db.base_class import Base
import uuid

class Category(Base):
    __tablename__ = "categories"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # What a job stores in ``Job.category``. The id is a uuid, and putting that
    # on a job would make the value unreadable everywhere it is displayed and
    # would stop matching the slugs jobs already carry.
    slug = Column(String, index=True, unique=True)
    name = Column(String, index=True)
    icon = Column(String)
    description = Column(String)
    commissionPercent = Column(Float, default=0.0)
    skills = Column(JSON, default=list)
    activeWorkersCount = Column(Integer, default=0)
    activeJobsCount = Column(Integer, default=0)
