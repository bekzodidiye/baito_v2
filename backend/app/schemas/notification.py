from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class NotificationBase(BaseModel):
    title: str
    message: str
    type: str = "system"
    relatedJobId: Optional[str] = None

class NotificationCreate(NotificationBase):
    userId: str

class NotificationUpdate(BaseModel):
    isRead: Optional[bool] = None

class NotificationInDBBase(NotificationBase):
    id: str
    userId: str
    isRead: bool
    createdAt: datetime

    class Config:
        from_attributes = True

class Notification(NotificationInDBBase):
    pass
