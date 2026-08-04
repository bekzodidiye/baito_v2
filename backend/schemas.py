from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

class JobCreate(BaseModel):
    title: str
    company: str
    salary: str
    location: str
    description: str
    durationLabel: Optional[str] = None
    tags: Optional[List[str]] = None
    urgent: Optional[bool] = False

class JobResponse(BaseModel):
    id: str
    employerId: str
    title: str
    company: str
    salary: str
    location: str
    description: str
    status: str
    applied: Optional[bool] = False
    
    class Config:
        from_attributes = True

class ApplicationResponse(BaseModel):
    id: str
    jobId: str
    workerId: str
    status: str
    appliedDate: datetime
    
    class Config:
        from_attributes = True

class AdminSettingsUpdate(BaseModel):
    # Depending on what settings are updated
    platformFeePercentage: Optional[int] = None
    minWithdrawalAmount: Optional[int] = None

class AdminBroadcast(BaseModel):
    title: str
    message: str
    targetRole: Optional[str] = None

class BookmarkResponse(BaseModel):
    id: str
    jobId: str
    userId: str
    createdAt: datetime

    class Config:
        from_attributes = True

class MessageCreate(BaseModel):
    text: str
    hasMap: Optional[bool] = False
    mapLocation: Optional[str] = None

class MessageResponse(BaseModel):
    id: str
    chatId: str
    senderId: str
    text: str
    hasMap: bool
    mapLocation: Optional[str]
    createdAt: datetime

    class Config:
        from_attributes = True

class ChatCreate(BaseModel):
    jobId: Optional[str] = None
    employerId: str

class ChatResponse(BaseModel):
    id: str
    jobId: Optional[str]
    workerId: str
    employerId: str
    isContactRevealed: bool
    createdAt: datetime
    lastMessage: Optional[str] = None

    class Config:
        from_attributes = True
