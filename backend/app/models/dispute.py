from sqlalchemy import Column, String
from app.db.base_class import Base
import uuid

class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    jobId = Column(String, index=True)
    employerId = Column(String, index=True)
    workerId = Column(String, index=True)
    reason = Column(String)
    status = Column(String, default="open") # 'open', 'resolved'
    adminNotes = Column(String, nullable=True)
