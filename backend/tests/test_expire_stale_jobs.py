from datetime import datetime, timedelta, timezone
from app.db.session import SessionLocal
from app.models import Job, Application, SystemSetting
from app.models.job import JobStatus
from app.tasks import expire_stale_jobs
from tests.conftest import make_job, make_user


def test_expire_stale_jobs_cancels_past_work_date_jobs():
    """A job whose workDate is in the past must be expired even if posted recently."""
    employer = make_user(role="employer", phone="+998909988771")
    yesterday = (datetime.now(timezone.utc) + timedelta(hours=5) - timedelta(days=1)).strftime("%Y-%m-%d")

    past_job = make_job(employer.id, title="Yesterday Job", workDate=yesterday, status=JobStatus.OPEN)

    with SessionLocal() as db:
        # Enable auto-expiration
        setting = db.query(SystemSetting).filter(SystemSetting.id == "singleton").first()
        if not setting:
            setting = SystemSetting(id="singleton", autoExpireJobs=True, autoExpireDays=14)
            db.add(setting)
        else:
            setting.autoExpireJobs = True
            setting.autoExpireDays = 14
            db.add(setting)
        db.commit()

    count = expire_stale_jobs()
    assert count >= 1

    with SessionLocal() as db:
        j = db.query(Job).filter(Job.id == past_job.id).first()
        assert j.status == JobStatus.CANCELLED


def test_expire_stale_jobs_preserves_future_work_date_jobs():
    """A job with a future work date is NOT expired even if created 20 days ago."""
    employer = make_user(role="employer", phone="+998909988772")
    future_date = (datetime.now(timezone.utc) + timedelta(hours=5) + timedelta(days=7)).strftime("%Y-%m-%d")

    future_job = make_job(employer.id, title="Next Week Job", workDate=future_date, status=JobStatus.OPEN)

    with SessionLocal() as db:
        # Simulate creation 20 days ago
        db_job = db.query(Job).filter(Job.id == future_job.id).first()
        db_job.createdAt = datetime.now(timezone.utc) - timedelta(days=20)
        db.add(db_job)
        db.commit()

    expire_stale_jobs()

    with SessionLocal() as db:
        j = db.query(Job).filter(Job.id == future_job.id).first()
        assert j.status == JobStatus.OPEN
