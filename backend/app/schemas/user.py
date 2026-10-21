from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.config import settings

# bcrypt silently truncates at 72 bytes, so anything longer is a false sense
# of security rather than extra strength — reject it instead.
MAX_PASSWORD_BYTES = 72


def _validate_password(value: str) -> str:
    if len(value) < settings.MIN_PASSWORD_LENGTH:
        raise ValueError(
            f"Parol kamida {settings.MIN_PASSWORD_LENGTH} ta belgidan iborat bo'lishi kerak"
        )
    if len(value.encode("utf-8")) > MAX_PASSWORD_BYTES:
        raise ValueError("Parol juda uzun (72 baytdan oshmasligi kerak)")
    if value.isdigit() or value.isalpha():
        raise ValueError("Parol harf va raqamdan iborat bo'lishi kerak")
    return value


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
    name: str = Field(min_length=1, max_length=120)
    # Proof that /auth/verify-sms succeeded for this phone number. Without it
    # registration could claim a number the caller does not own.
    verification_token: Optional[str] = None

    @field_validator("password")
    @classmethod
    def check_password(cls, v: str) -> str:
        return _validate_password(v)


class UserUpdate(BaseModel):
    """Fields a user may change on their own account.

    Deliberately excludes role, balance, isVerified and isBanned: those are
    privilege-bearing and only the admin endpoints may set them.
    """
    name: Optional[str] = Field(default=None, max_length=120)
    email: Optional[str] = Field(default=None, max_length=254)
    phone: Optional[str] = Field(default=None, max_length=20)
    companyName: Optional[str] = Field(default=None, max_length=200)
    avatarUrl: Optional[str] = Field(default=None, max_length=500)
    password: Optional[str] = None
    region: Optional[str] = Field(default=None, max_length=120)
    category: Optional[str] = Field(default=None, max_length=120)
    bio: Optional[str] = Field(default=None, max_length=2000)
    skills: Optional[list | dict | str] = None
    birthDate: Optional[str] = Field(default=None, max_length=32)
    gender: Optional[str] = Field(default=None, max_length=16)
    passportSeries: Optional[str] = Field(default=None, max_length=32)
    passportJshshir: Optional[str] = Field(default=None, max_length=32)
    passportDocFront: Optional[str] = Field(default=None, max_length=500)
    passportDocBack: Optional[str] = Field(default=None, max_length=500)
    selfieWithDoc: Optional[str] = Field(default=None, max_length=500)
    notify_new_jobs: Optional[bool] = None
    notify_interviews: Optional[bool] = None
    notify_general: Optional[bool] = None
    two_factor_enabled: Optional[bool] = None
    biometrics_enabled: Optional[bool] = None

    @field_validator("password")
    @classmethod
    def check_password(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return v
        return _validate_password(v)


class UserInDBBase(UserBase):
    id: str
    uid: str
    balance: int
    totalSpent: Optional[int] = 0
    totalEarned: Optional[int] = 0
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

    model_config = ConfigDict(from_attributes=True)


class User(UserInDBBase):
    pass


class PasswordChange(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def check_password(cls, v: str) -> str:
        return _validate_password(v)
