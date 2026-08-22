from sqlalchemy import Column, String, Integer, Boolean
from app.db.base_class import Base

class SystemSetting(Base):
    __tablename__ = "system_settings"

    # We will just use a single row with id = "singleton"
    id = Column(String, primary_key=True, default="singleton")
    platformFeePercent = Column(Integer, default=10)
    minHourlyRate = Column(Integer, default=15000)
    maintenanceMode = Column(Boolean, default=False)
    autoApproveJobs = Column(Boolean, default=True)
    autoExpireJobs = Column(Boolean, default=True)
    autoExpireDays = Column(Integer, default=14)
    autoDeleteSpamJobs = Column(Boolean, default=True)
