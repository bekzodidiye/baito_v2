from sqlalchemy import Boolean, Column, Float, Integer, String, Text
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

    # Everything below backs a control the admin panel already showed. They had
    # nowhere to be stored, so each screen kept its value in React state and
    # forgot it on reload — the setting looked applied and never was.

    # Spam moderation. The keyword list used to be hard-coded in
    # SpamFraudDetector, so an administrator could not add to it.
    spamKeywords = Column(Text, nullable=True)
    spamAutoFineAmount = Column(Integer, default=0)
    spamAutoBanHours = Column(Integer, default=0)

    # Escrow released without anyone pressing a button, once the work has been
    # marked complete and nobody has objected.
    escrowAutoReleaseEnabled = Column(Boolean, default=False)
    escrowAutoReleaseHours = Column(Integer, default=24)

    # Daily digest to a Telegram channel.
    telegramDigestEnabled = Column(Boolean, default=False)
    telegramDigestChannel = Column(String, nullable=True)

    # Thresholds the recommendation query applies.
    matchMinScore = Column(Integer, default=80)
    matchMaxDistanceKm = Column(Integer, default=15)
    matchMinWorkerRating = Column(Float, default=0.0)
