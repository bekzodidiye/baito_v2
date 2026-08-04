from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

class MessageBase(BaseModel):
    chatId: str
    senderId: str
    text: str
    hasMap: Optional[bool] = False
    mapLocation: Optional[str] = None

class Message(MessageBase):
    id: str
    createdAt: Optional[datetime] = None

    class Config:
        from_attributes = True

class ChatBase(BaseModel):
    workerId: str
    employerId: str
    jobId: Optional[str] = None

class ChatCreate(ChatBase):
    pass

class ChatUpdate(BaseModel):
    isContactRevealed: Optional[bool] = None

class ChatInDBBase(ChatBase):
    id: str
    isContactRevealed: bool = False
    createdAt: Optional[datetime] = None

    class Config:
        from_attributes = True

class Chat(ChatInDBBase):
    otherUserName: Optional[str] = None
    otherUserAvatar: Optional[str] = None
    lastMessage: Optional[str] = None
    lastMessageTime: Optional[datetime] = None
