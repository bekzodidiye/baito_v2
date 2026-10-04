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
    # Unread since escrow was removed: nothing is frozen, so nothing is
    # auto-released. The columns stay until a migration drops them.
    escrowAutoReleaseEnabled = Column(Boolean, default=False)
    escrowAutoReleaseHours = Column(Integer, default=24)

    # Daily digest to a Telegram channel.
    telegramDigestEnabled = Column(Boolean, default=False)
    telegramDigestChannel = Column(String, nullable=True)

    # Thresholds the recommendation query applies.
    matchMinScore = Column(Integer, default=80)
    matchMaxDistanceKm = Column(Integer, default=15)
    matchMinWorkerRating = Column(Float, default=0.0)

    # Notification wording an administrator can edit. Only the two events that
    # exist are stored: the templates screen also listed "new job in your
    # area" and an inactivity reminder, neither of which anything sends.
    # {user_name} is substituted when the message is written.
    notifVerifiedTemplate = Column(Text, nullable=True)
    notifRejectedTemplate = Column(Text, nullable=True)

    # Our own bank details. They belong on the invoice that bills a company for
    # a shift, and there was nowhere to put them — so the invoice would have
    # had to hard-code an account number, which is exactly the kind of thing
    # that is wrong for months before anyone notices.
    payoutCompanyName = Column(String, nullable=True)
    payoutBankName = Column(String, nullable=True)
    payoutBankAccount = Column(String, nullable=True)   # hisob raqami
    payoutBankMfo = Column(String, nullable=True)       # MFO
    payoutCompanyInn = Column(String, nullable=True)    # INN / STIR
    payoutCompanyAddress = Column(Text, nullable=True)
