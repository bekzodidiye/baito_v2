from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class TransactionBase(BaseModel):
    jobId: Optional[str] = None
    employerId: str
    workerId: Optional[str] = None
    amount: int
    platformFee: int = 0
    type: str
    status: str = "pending"

class TransactionCreate(TransactionBase):
    pass

class TransactionInDBBase(TransactionBase):
    id: str
    createdAt: datetime

    class Config:
        from_attributes = True

class Transaction(TransactionInDBBase):
    pass


class TicketMessageBase(BaseModel):
    text: str
    senderId: str

class TicketMessageCreate(TicketMessageBase):
    ticketId: str

class TicketMessageInDBBase(TicketMessageBase):
    id: str
    ticketId: str
    timestamp: datetime

    class Config:
        from_attributes = True

class TicketMessage(TicketMessageInDBBase):
    pass


class SupportTicketBase(BaseModel):
    userId: str
    subject: str
    category: str = "general"
    status: str = "new"
    priority: str = "medium"

class SupportTicketCreate(SupportTicketBase):
    pass

class SupportTicketInDBBase(SupportTicketBase):
    id: str
    createdAt: datetime
    messages: List[TicketMessage] = []

    class Config:
        from_attributes = True

class SupportTicket(SupportTicketInDBBase):
    pass
