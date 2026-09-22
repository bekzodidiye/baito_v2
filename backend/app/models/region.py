from sqlalchemy import Column, Float, Integer, String, Boolean
from app.db.base_class import Base
import uuid

class Region(Base):
    __tablename__ = "regions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, index=True)
    type = Column(String)  # 'city' or 'region'
    parentId = Column(String, nullable=True)
    isActive = Column(Boolean, default=True)
    # The employer's commission has two halves: what the work is and where it
    # is. This is the second half, added to the category's rate.
    commissionPercent = Column(Float, default=0.0)

    # What a shift here should not pay less than, and how many districts the
    # region covers. Both are settings somebody may want to vary by market.
    # Worker and job counts are deliberately not stored: a saved copy of a count
    # is wrong the moment anything changes, so the endpoint computes those.
    minSalary = Column(Integer, nullable=True)
    districtsCount = Column(Integer, nullable=True)
