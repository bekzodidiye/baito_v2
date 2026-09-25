from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime

from app.core.money import parse_salary_amounts

# A shift's crew, not a workforce. Past this it is a typo, not a vacancy count.
MAX_WORKERS_PER_JOB = 100

# PostgreSQL refuses a NUL byte in a text column, and it refuses it in the
# driver — past every check the schema makes. A posting carrying one answered
# 500 with an unhandled exception where the writer should have seen a 422 with
# a reason. Tab, newline and carriage return stay allowed: a description is
# written on several lines. Everything else below U+0020, and DEL, is not text
# anybody typed.
_FORBIDDEN_CHARS = frozenset(
    [chr(c) for c in range(0x20) if chr(c) not in "\t\n\r"] + ["\x7f"]
)


def _reject_control_chars(v):
    """Refuse text the database cannot store, at the boundary that can explain it.

    Applied to every field rather than a named list, so a field added later is
    covered without anybody remembering to add it here. Emoji, right-to-left
    scripts, mixed alphabets and accented Latin are all above U+0020 and are
    deliberately untouched.
    """
    if isinstance(v, str):
        if not _FORBIDDEN_CHARS.isdisjoint(v):
            raise ValueError("Matnda ruxsat etilmagan boshqaruv belgisi bor")
    elif isinstance(v, list):
        for item in v:
            _reject_control_chars(item)
    return v


def _validate_salary(v: str) -> str:
    if "-" in v and not any(c.isdigit() for c in v.split("-")[0]):
        # A leading minus: "-500000". The parser strips it and the employer
        # is charged the absolute value.
        raise ValueError("Maosh manfiy bo'lishi mumkin emas")
    written = parse_salary_amounts(v, bounded=False)
    if written and max(written) <= 0:
        # "kelishilgan holda" carries no figure and stays allowed. Only a
        # figure that is actually there and not positive is refused.
        raise ValueError("Maosh musbat bo'lishi kerak")
    # No ceiling here on purpose: the spam detector already screens an absurd
    # figure and answers 400 with the reason. Repeating the rule here replaced
    # that message with a bare 422.
    return v


def _validate_needed_workers(v: str) -> str:
    try:
        n = int(str(v).strip())
    except ValueError:
        raise ValueError("Ishchilar soni butun son bo'lishi kerak")
    if n < 1:
        raise ValueError("Kamida bitta ishchi kerak")
    if n > MAX_WORKERS_PER_JOB:
        raise ValueError(f"Ishchilar soni {MAX_WORKERS_PER_JOB} tadan oshmasligi kerak")
    return str(n)


class HiredWorkerInfo(BaseModel):
    id: str
    name: str
    phone: Optional[str] = None
    avatarUrl: Optional[str] = None

class JobBase(BaseModel):
    """The shape of a posting, in both directions.

    Deliberately unconstrained: the response models inherit this, and a row
    written before the input rules existed still has to be readable. Putting
    the constraints here made every listing containing such a row answer 500.
    """

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
    """What a client may send.

    None of these carried a constraint, so a posting could be created with an
    empty title, an empty description, a five-thousand-character title, or a
    salary of "-500000" — which the parser reads as 500,000, so the listing
    advertised a negative wage while the employer was charged a real one.
    """

    title: str = Field(min_length=3, max_length=200)
    company: str = Field(default="Ish beruvchi", min_length=1, max_length=200)
    salary: str = Field(min_length=1, max_length=100)
    location: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=10, max_length=5000)

    @field_validator("*")
    @classmethod
    def check_control_chars(cls, v):
        return _reject_control_chars(v)

    @field_validator("salary")
    @classmethod
    def check_salary(cls, v: str) -> str:
        return _validate_salary(v)

    @field_validator("neededWorkers")
    @classmethod
    def check_needed_workers(cls, v):
        if v is None or not str(v).strip():
            return v
        return _validate_needed_workers(v)


class JobUpdate(JobBase):
    title: Optional[str] = None
    company: Optional[str] = None
    salary: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = Field(default=None, min_length=10, max_length=5000)
    status: Optional[str] = None

    @field_validator("*")
    @classmethod
    def check_control_chars(cls, v):
        return _reject_control_chars(v)

    @field_validator("title")
    @classmethod
    def check_title(cls, v):
        if v is not None and not (3 <= len(v) <= 200):
            raise ValueError("Sarlavha 3-200 belgi bo'lishi kerak")
        return v

    @field_validator("company", "location")
    @classmethod
    def check_not_blank(cls, v):
        if v is not None and not (1 <= len(v) <= 200):
            raise ValueError("Bo'sh bo'lishi mumkin emas")
        return v

    @field_validator("salary")
    @classmethod
    def check_salary(cls, v):
        return v if v is None else _validate_salary(v)

    @field_validator("neededWorkers")
    @classmethod
    def check_needed_workers(cls, v):
        if v is None or not str(v).strip():
            return v
        return _validate_needed_workers(v)

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
    bookmarked: bool = False
    hiredCount: int = 0
    vacancies: int = 1
    appliedDate: Optional[datetime] = None
    hiredWorkers: Optional[List[HiredWorkerInfo]] = []
    # Invoice state, present only on the employer's own listing. None means no
    # invoice has been raised for this job yet, which is not the same as an
    # invoice sitting unpaid - the job card needs to tell those apart.
    payoutStatus: Optional[str] = None
    invoiceNumber: Optional[str] = None
    invoiceAmount: Optional[int] = None
