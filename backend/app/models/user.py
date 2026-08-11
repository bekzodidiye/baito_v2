from sqlalchemy import Column, String, Boolean, DateTime, Integer, Float, Text, JSON
from sqlalchemy.sql import func
from app.db.base_class import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    uid = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String)
    name = Column(String, nullable=False)
    phone = Column(String, unique=True, index=True)
    role = Column(String, nullable=False, default='worker')
    companyName = Column(String)
    avatarUrl = Column(String)
    balance = Column(Integer, default=0)
    isBanned = Column(Boolean, default=False)
    isVerified = Column(Boolean, default=False)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    
    # Extended Profile Fields
    birthDate = Column(String)
    gender = Column(String)
    region = Column(String)
    category = Column(String)
    bio = Column(Text)
    skills = Column(JSON)
    rating = Column(Float, default=0.0)
    completedJobsCount = Column(Integer, default=0)
    
    # Verification Documents
    passportSeries = Column(String)
    passportJshshir = Column(String)
    passportDocFront = Column(String)
    passportDocBack = Column(String)
    selfieWithDoc = Column(String)
    
    # Meta / Admin extra
    bankCardMask = Column(String)
    sourceApp = Column(String, default="Organik (Play Store)")
