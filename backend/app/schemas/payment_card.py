from typing import Optional
from pydantic import BaseModel

class PaymentCardBase(BaseModel):
    type: str
    last4: str
    bank: str
    token: Optional[str] = None
    isActive: Optional[bool] = True

class PaymentCardCreate(PaymentCardBase):
    pass

class PaymentCardInDB(PaymentCardBase):
    id: str
    userId: str

    class Config:
        from_attributes = True
