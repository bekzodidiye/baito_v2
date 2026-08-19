from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class TransactionBase(BaseModel):
    jobId: Optional[str] = None
    employerId: str
    workerId: Optional[str] = None
    amount: int
    platformFee: int
    type: str
    status: str

class TransactionOut(TransactionBase):
    id: str
    createdAt: datetime
    providerTransactionId: Optional[str] = None
    performTime: Optional[int] = None
    cancelTime: Optional[int] = None
    cancelReason: Optional[int] = None

    class Config:
        from_attributes = True
