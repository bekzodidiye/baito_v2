from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class JobBase(BaseModel):
    title: str
    company: str
    salary: str
    location: str
    description: str
    logoUrl: Optional[str] = None
    imageUrl: Optional[str] = None
    tags: Optional[List[str]] = None
    urgent: Optional[bool] = False
    salaryCurrency: Optional[str] = 'UZS'
    workDate: Optional[str] = None
    workTime: Optional[str] = None
    neededWorkers: Optional[str] = '1'
    hourlyRate: Optional[str] = None
    transportRate: Optional[str] = None
    category: Optional[str] = None
    responsibilities: Optional[str] = None
    requirements: Optional[str] = None
    importantNote: Optional[str] = None
    rawLocation: Optional[str] = None
    views: Optional[int] = 0
    coordinateX: Optional[float] = None
    coordinateY: Optional[float] = None

class JobCreate(JobBase):
    pass

class JobUpdate(JobBase):
    title: Optional[str] = None
    company: Optional[str] = None
    salary: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

class JobInDBBase(JobBase):
    id: str
    employerId: str
    status: str
    createdAt: datetime
    
    class Config:
        from_attributes = True

class Job(JobInDBBase):
    pass

class JobWithApplicationStatus(Job):
    applied: bool = False
    hiredCount: int = 0
    vacancies: int = 1
    appliedDate: Optional[datetime] = None
