"""The days a posting covers, as rows that can be finished and paid one by one.

``Job.workDate`` says a shift runs for three days. Until these rows existed
that was decoration: the posting had one status and one escrow hold, so
finishing the first day finished the other two and paid once for all of them.

A day is now the unit of work and the unit of payment. The posting still hires
one worker for the whole run — what is split is the work and the money.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models.job_day import JobDay, JobDayStatus
from app.services.work_dates import job_dates


def sync_days(db: Session, job: Any) -> list[JobDay]:
    """Make the day rows match what the posting's ``workDate`` now says.

    Called when a posting is created and whenever its dates are edited. Adds
    the days that appeared and drops the ones that went away — but only while
    they are still ``pending``. A day that has been worked and paid is history;
    editing the date field must not be able to erase it.
    """
    wanted = job_dates(job)
    existing = {d.workDate: d for d in
                db.query(JobDay).filter(JobDay.jobId == job.id).all()}

    for day in wanted:
        if day not in existing:
            db.add(JobDay(jobId=job.id, workDate=day, status=JobDayStatus.PENDING))

    for day, row in existing.items():
        if day not in wanted and row.status == JobDayStatus.PENDING:
            db.delete(row)

    db.flush()
    return days_of(db, job.id)


def days_of(db: Session, job_id: str) -> list[JobDay]:
    """Every day of a posting, earliest first."""
    return (
        db.query(JobDay)
        .filter(JobDay.jobId == job_id)
        .order_by(JobDay.workDate.asc())
        .all()
    )


def payable_days(db: Session, job_id: str) -> list[JobDay]:
    """The days still owed: not yet worked, not called off."""
    return [d for d in days_of(db, job_id) if d.status == JobDayStatus.PENDING]


def day_count(db: Session, job: Any) -> int:
    """How many days a posting is worth paying for.

    Never zero. A posting whose date field cannot be parsed at all is still one
    day of somebody's work, and reading it as zero would escrow nothing and
    leave the worker owed nothing.
    """
    rows = days_of(db, job.id)
    if rows:
        return len(rows)
    return max(1, len(job_dates(job)))


def serialise(day: JobDay) -> dict:
    return {
        "id": day.id,
        "jobId": day.jobId,
        "workDate": day.workDate,
        "status": day.status,
        "amount": day.amount,
        "completedAt": day.completedAt.isoformat() if day.completedAt else None,
    }
