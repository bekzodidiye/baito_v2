from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class BookmarkBase(BaseModel):
    jobId: str

class BookmarkCreate(BookmarkBase):
    pass

class Bookmark(BookmarkBase):
    id: str
    userId: str
    createdAt: Optional[datetime] = None

    class Config:
        from_attributes = True
