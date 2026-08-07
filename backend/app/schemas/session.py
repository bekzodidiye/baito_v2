from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class ActiveSessionBase(BaseModel):
    device_name: Optional[str] = None
    location: Optional[str] = None
    ip_address: Optional[str] = None

class ActiveSessionCreate(ActiveSessionBase):
    user_uid: str

class ActiveSessionUpdate(ActiveSessionBase):
    is_active: Optional[bool] = None
    last_active_at: Optional[datetime] = None

class ActiveSessionInDBBase(ActiveSessionBase):
    id: str
    user_uid: str
    is_active: bool
    created_at: datetime
    last_active_at: datetime

    class Config:
        from_attributes = True

class ActiveSession(ActiveSessionInDBBase):
    pass
