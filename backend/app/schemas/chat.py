from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

MAX_MESSAGE_LENGTH = 4000


class MessageBase(BaseModel):
    chatId: str
    senderId: str
    text: str
    hasMap: Optional[bool] = False
    mapLocation: Optional[str] = None


class Message(MessageBase):
    id: str
    createdAt: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ChatBase(BaseModel):
    workerId: str
    employerId: str
    jobId: Optional[str] = None


class ChatCreate(BaseModel):
    """Open a conversation.

    ``workerId`` used to be required, but the web client only ever sends
    ``employerId`` and ``jobId`` — so every worker-initiated chat failed
    validation with a 422. Either side may now be omitted and is filled in from
    the authenticated caller.
    """

    workerId: Optional[str] = None
    employerId: Optional[str] = None
    jobId: Optional[str] = None


class ChatUpdate(BaseModel):
    isContactRevealed: Optional[bool] = None


class ChatInDBBase(ChatBase):
    id: str
    isContactRevealed: bool = False
    createdAt: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Chat(ChatInDBBase):
    otherUserName: Optional[str] = None
    otherUserAvatar: Optional[str] = None
    lastMessage: Optional[str] = None
    lastMessageTime: Optional[datetime] = None
    unreadCount: int = 0


class MessageSend(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_MESSAGE_LENGTH)
    hasMap: Optional[bool] = False
    mapLocation: Optional[str] = Field(default=None, max_length=500)
