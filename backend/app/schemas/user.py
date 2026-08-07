from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: Optional[str] = None  # can be phone number or email
    name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = 'worker'
    companyName: Optional[str] = None
    avatarUrl: Optional[str] = None
    birthDate: Optional[str] = None
    gender: Optional[str] = None

class UserCreate(UserBase):
    uid: Optional[str] = None
    password: str
    name: str

class UserUpdate(BaseModel):
    """Fields a user may change on their own account.

    Deliberately excludes role, balance, isVerified and isBanned: those are
    privilege-bearing and only the admin endpoints may set them.
    """
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    companyName: Optional[str] = None
    avatarUrl: Optional[str] = None
    password: Optional[str] = None
    region: Optional[str] = None
    category: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[list | dict | str] = None
    birthDate: Optional[str] = None
    gender: Optional[str] = None
    passportSeries: Optional[str] = None
    passportJshshir: Optional[str] = None
    passportDocFront: Optional[str] = None
    passportDocBack: Optional[str] = None
    selfieWithDoc: Optional[str] = None
    notify_new_jobs: Optional[bool] = None
    notify_interviews: Optional[bool] = None
    notify_general: Optional[bool] = None
    two_factor_enabled: Optional[bool] = None
    biometrics_enabled: Optional[bool] = None

class UserInDBBase(UserBase):
    id: str
    uid: str
    balance: int
    isBanned: bool
    isVerified: bool
    createdAt: datetime
    region: Optional[str] = None
    category: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[list | dict | str] = None
    rating: float
    completedJobsCount: int
    passportSeries: Optional[str] = None
    passportJshshir: Optional[str] = None
    passportDocFront: Optional[str] = None
    passportDocBack: Optional[str] = None
    selfieWithDoc: Optional[str] = None
    bankCardMask: Optional[str] = None
    sourceApp: Optional[str] = None
    notify_new_jobs: Optional[bool] = None
    notify_interviews: Optional[bool] = None
    notify_general: Optional[bool] = None
    two_factor_enabled: Optional[bool] = None
    biometrics_enabled: Optional[bool] = None

    class Config:
        from_attributes = True

class User(UserInDBBase):
    pass

class UserInDB(UserInDBBase):
    hashed_password: str

class PasswordChange(BaseModel):
    current_password: str
    new_password: str
