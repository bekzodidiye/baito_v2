from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Integer, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from .database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    uid = Column(String, unique=True, index=True)
    email = Column(String)
    name = Column(String, nullable=False)
    phone = Column(String)
    role = Column(String, nullable=False, default='worker')
    companyName = Column(String)
    avatarUrl = Column(String)
    balance = Column(Integer, default=0)
    isBanned = Column(Boolean, default=False)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())

class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    employerId = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    logoUrl = Column(String)
    salary = Column(String, nullable=False)
    salaryCurrency = Column(String, default='UZS')
    tags = Column(JSON)
    location = Column(String, nullable=False)
    rawLocation = Column(String)
    coordinateX = Column(Float)
    coordinateY = Column(Float)
    durationLabel = Column(String)
    urgent = Column(Boolean, default=False)
    description = Column(String, nullable=False)
    status = Column(String, nullable=False, default='open')
    hiredWorkerId = Column(String, ForeignKey("users.id"))
    createdAt = Column(DateTime(timezone=True), server_default=func.now())

class Application(Base):
    __tablename__ = "applications"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    jobId = Column(String, ForeignKey("jobs.id"), nullable=False)
    workerId = Column(String, ForeignKey("users.id"), nullable=False)
    status = Column(String, nullable=False, default='applied')
    appliedDate = Column(DateTime(timezone=True), server_default=func.now())
    rating = Column(Integer)

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    jobId = Column(String, ForeignKey("jobs.id"))
    employerId = Column(String, ForeignKey("users.id"), nullable=False)
    workerId = Column(String, ForeignKey("users.id"))
    amount = Column(Integer, nullable=False)
    platformFee = Column(Integer, nullable=False, default=0)
    type = Column(String, nullable=False)
    status = Column(String, nullable=False, default='pending')
    createdAt = Column(DateTime(timezone=True), server_default=func.now())

class Chat(Base):
    __tablename__ = "chats"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    jobId = Column(String, ForeignKey("jobs.id"))
    workerId = Column(String, ForeignKey("users.id"), nullable=False)
    employerId = Column(String, ForeignKey("users.id"), nullable=False)
    isContactRevealed = Column(Boolean, default=False)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())

class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    chatId = Column(String, ForeignKey("chats.id"), nullable=False)
    senderId = Column(String, ForeignKey("users.id"), nullable=False)
    text = Column(String, nullable=False)
    hasMap = Column(Boolean, default=False)
    mapLocation = Column(String)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())

class Bookmark(Base):
    __tablename__ = "bookmarks"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    userId = Column(String, ForeignKey("users.id"), nullable=False)
    jobId = Column(String, ForeignKey("jobs.id"), nullable=False)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
