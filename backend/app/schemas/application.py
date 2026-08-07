from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class ApplicationBase(BaseModel):
    jobId: str
    workerId: str
    status: str = "applied"

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationUpdate(BaseModel):
    status: Optional[str] = None

class ApplicationInDBBase(ApplicationBase):
    id: str
    appliedDate: Optional[datetime] = None
    rating: Optional[int] = None

    class Config:
        from_attributes = True

class Application(ApplicationInDBBase):
    pass
