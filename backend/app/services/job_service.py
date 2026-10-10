import logging
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app import models, crud
from app.models.job import JobStatus
from app.models.job_day import JobDay, JobDayStatus
from app.services import job_days as job_days_service
from app.services.work_dates import get_job_dates_set
from app.services.earnings_service import WorkerEarnings
from app.core.money import salary_to_uzs
from app.core.exceptions import (
    JobNotFoundError,
    ActionForbiddenError,
    InvalidJobStateError,
    ApplicationError,
)

logger = logging.getLogger(__name__)

ACTIVE_APP_STATUSES = ['applied', 'hired', 'confirmed', 'in_progress', 'start_requested']
COMMITTED_APP_STATUSES = ['hired', 'confirmed', 'in_progress', 'start_requested']

# Uzbekistan is UTC+5
TASHKENT = timezone(datetime.now().astimezone().utcoffset() or timezone.utc)


def _wage_for_day(job: models.Job, day: Optional[JobDay]) -> int:
    if day is not None and getattr(day, "amount", None):
        return int(day.amount)
    return salary_to_uzs(job.salary)


def _today_in_tashkent() -> str:
    from datetime import timedelta
    return datetime.now(timezone(timedelta(hours=5))).strftime("%Y-%m-%d")


def _hired_count(db: Session, job_id: str) -> int:
    return (
        db.query(models.Application)
        .filter(
            models.Application.jobId == job_id,
            models.Application.status.in_(COMMITTED_APP_STATUSES + ['completed']),
        )
        .count()
    )


class JobService:

    @staticmethod
    def _get_dates_for_job(db: Session, job: models.Job) -> set:
        from app.models.job_day import JobDay
        
        days = db.query(JobDay).filter(JobDay.jobId == job.id).all()
        if days:
            return {str(d.workDate) for d in days if d.workDate}
        return get_job_dates_set(job)

    @staticmethod
    def _get_dates_for_jobs_bulk(db: Session, jobs: list[models.Job]) -> dict:
        from app.models.job_day import JobDay
        
        job_ids = [j.id for j in jobs]
        job_days = db.query(JobDay).filter(JobDay.jobId.in_(job_ids)).all()
        
        result = {}
        for d in job_days:
            if d.workDate:
                result.setdefault(d.jobId, set()).add(str(d.workDate))
                
        for job in jobs:
            if job.id not in result:
                result[job.id] = get_job_dates_set(job)
                
        return result

    @staticmethod
    def get_job_or_fail(db: Session, job_id: str) -> models.Job:
        job = crud.job.get(db=db, id=job_id)
        if not job:
            raise JobNotFoundError()
        return job

    @staticmethod
    def apply_to_job(db: Session, job_id: str, current_user: models.User) -> dict:
        if not all([current_user.name, current_user.phone, current_user.region, current_user.email]):
            raise ActionForbiddenError("Iltimos, ariza topshirishdan oldin profilingizni to'liq to'ldiring")
        
        if len(current_user.name.split()) < 2:
            raise ActionForbiddenError("Iltimos, ism va familiyangizni to'liq kiriting")

        job = JobService.get_job_or_fail(db, job_id)

        if job.status not in JobStatus.OPEN_STATUSES:
            raise InvalidJobStateError("Bu e'lon endi ariza qabul qilmaydi")

        if _hired_count(db, job.id) >= job.vacancies:
            raise InvalidJobStateError("Bu ish bo'yicha o'rinlar to'lgan")

        existing_app = (
            db.query(models.Application)
            .filter(
                models.Application.jobId == job_id,
                models.Application.workerId == current_user.id,
            )
            .first()
        )

        if existing_app:
            return {
                "success": True,
                "id": existing_app.id,
                "jobId": existing_app.jobId,
                "status": existing_app.status,
            }

        target_dates = JobService._get_dates_for_job(db, job)
        worker_apps = (
            db.query(models.Application)
            .filter(
                models.Application.workerId == current_user.id,
                models.Application.status.in_(ACTIVE_APP_STATUSES),
            )
            .all()
        )

        if target_dates and worker_apps:
            app_job_ids = {a.jobId for a in worker_apps}
            app_jobs = db.query(models.Job).filter(models.Job.id.in_(app_job_ids)).all()
            app_job_dates = JobService._get_dates_for_jobs_bulk(db, app_jobs)

            for t_date in target_dates:
                same_day_count = 0
                has_confirmed_job = False
                for app in worker_apps:
                    app_dates = app_job_dates.get(app.jobId, set())
                    if t_date in app_dates:
                        same_day_count += 1
                        if app.status in COMMITTED_APP_STATUSES:
                            has_confirmed_job = True

                if has_confirmed_job:
                    raise ApplicationError("Siz bu kun uchun allaqachon tasdiqlangan ishga egasiz!")
                if same_day_count >= 2:
                    raise ApplicationError("Bir kunda ko'pi bilan 2 ta ishga ariza topshirishingiz mumkin!")

        with db.begin_nested():
            db_app = models.Application(
                id=str(uuid.uuid4()), jobId=job_id, workerId=current_user.id, status="applied"
            )
            db.add(db_app)
            db.add(models.Notification(
                id=str(uuid.uuid4()), userId=job.employerId, title="Yangi ariza keldi",
                message=f"Ishchi '{job.title}' ishiga ariza topshirdi.",
                type="apply", relatedJobId=job_id,
            ))
        db.commit()
        db.refresh(db_app)
        return {"success": True, "id": db_app.id, "jobId": db_app.jobId, "status": db_app.status}


    @staticmethod
    def request_start_job(db: Session, job_id: str, current_user: models.User) -> dict:
        job = JobService.get_job_or_fail(db, job_id)

        app = (
            db.query(models.Application)
            .filter(
                models.Application.jobId == job_id,
                models.Application.workerId == current_user.id,
                models.Application.status.in_(COMMITTED_APP_STATUSES),
            )
            .first()
        )
        if not app:
            raise ActionForbiddenError("Siz bu ishga yollanmagansiz")

        if job.status in JobStatus.CLOSED_STATUSES:
            raise InvalidJobStateError("Bu ish allaqachon yakunlangan")

        if app.status == 'in_progress':
            return {"success": True, "status": "in_progress"}

        with db.begin_nested():
            app.status = 'in_progress'
            db.add(app)

            job.status = JobStatus.IN_PROGRESS
            if job.startedAt is None:
                job.startedAt = datetime.now(timezone.utc)
            db.add(job)

            today = _today_in_tashkent()
            day = (
                db.query(JobDay)
                .filter(JobDay.jobId == job.id, JobDay.status == JobDayStatus.PENDING)
                .order_by(JobDay.workDate)
                .first()
            )
            if day is not None and day.startedAt is None and day.workDate <= today:
                day.startedAt = datetime.now(timezone.utc)
                db.add(day)

            job_dates = JobService._get_dates_for_job(db, job)
            if job_dates:
                others = (
                    db.query(models.Application)
                    .filter(
                        models.Application.workerId == app.workerId,
                        models.Application.jobId != job_id,
                        models.Application.status == "applied",
                    )
                    .all()
                )
                if others:
                    other_jobs = db.query(models.Job).filter(models.Job.id.in_({a.jobId for a in others})).all()
                    other_job_dates = JobService._get_dates_for_jobs_bulk(db, other_jobs)
                    for other in others:
                        if job_dates & other_job_dates.get(other.jobId, set()):
                            other.status = "withdrawn"
                            db.add(other)

            db.add(models.Notification(
                id=str(uuid.uuid4()), userId=job.employerId,
                title="Ish boshlandi",
                message=f"'{job.title}' ishi bo'yicha ishchi ishni boshladi.",
                type="start_confirmed", relatedJobId=job_id,
            ))
        db.commit()
        return {"success": True, "status": JobStatus.IN_PROGRESS}


    @staticmethod
    def confirm_start_job(db: Session, job_id: str, current_user: models.User) -> dict:
        job = JobService.get_job_or_fail(db, job_id)

        is_employer = job.employerId == current_user.id
        if not (is_employer or current_user.role == 'admin'):
            raise ActionForbiddenError("Faqat ish beruvchi ishni tasdiqlay oladi")

        if job.status in JobStatus.CLOSED_STATUSES:
            raise InvalidJobStateError("Bu ish allaqachon yakunlangan")

        apps = (
            db.query(models.Application)
            .filter(
                models.Application.jobId == job_id,
                models.Application.status.in_(COMMITTED_APP_STATUSES),
            )
            .all()
        )
        if not apps:
            raise InvalidJobStateError("Bu ishga hali hech kim yollanmagan")

        with db.begin_nested():
            job.status = JobStatus.IN_PROGRESS
            if job.startedAt is None:
                job.startedAt = datetime.now(timezone.utc)
            db.add(job)

            today = _today_in_tashkent()
            day = (
                db.query(JobDay)
                .filter(JobDay.jobId == job.id, JobDay.status == JobDayStatus.PENDING)
                .order_by(JobDay.workDate)
                .first()
            )
            if day is not None and day.startedAt is None and day.workDate <= today:
                day.startedAt = datetime.now(timezone.utc)
                db.add(day)

            job_dates = JobService._get_dates_for_job(db, job)

            if job_dates:
                worker_ids = [app.workerId for app in apps]
                all_other_apps = (
                    db.query(models.Application)
                    .filter(
                        models.Application.workerId.in_(worker_ids),
                        models.Application.jobId != job_id,
                        models.Application.status == "applied",
                    )
                    .all()
                )
                if all_other_apps:
                    other_job_ids = {a.jobId for a in all_other_apps}
                    other_jobs = db.query(models.Job).filter(models.Job.id.in_(other_job_ids)).all()
                    other_job_dates = JobService._get_dates_for_jobs_bulk(db, other_jobs)
                    for other_app in all_other_apps:
                        if job_dates & other_job_dates.get(other_app.jobId, set()):
                            other_app.status = "withdrawn"
                            db.add(other_app)

            for app in apps:
                app.status = "in_progress"
                db.add(app)

                db.add(models.Notification(
                    id=str(uuid.uuid4()), userId=app.workerId, title="Ish boshlandi!",
                    message=f"'{job.title}' ishi rasman boshlandi.",
                    type="start_confirmed", relatedJobId=job_id,
                ))

            db.add(models.Notification(
                id=str(uuid.uuid4()), userId=job.employerId, title="Ish boshlandi!",
                message=f"'{job.title}' ishi rasman boshlandi.",
                type="start_confirmed", relatedJobId=job_id,
            ))

        db.commit()
        return {"success": True, "status": JobStatus.IN_PROGRESS}

    @staticmethod
    def complete_job_day(db: Session, job_id: str, day_id: str, current_user: models.User) -> dict:
        job = JobService.get_job_or_fail(db, job_id)

        if job.employerId != current_user.id and current_user.role != 'admin':
            raise ActionForbiddenError("Faqat ish beruvchi ishni yakunlay oladi")

        if job.status == JobStatus.CANCELLED:
            raise InvalidJobStateError("Bekor qilingan ishni yakunlab bo'lmaydi")
        if job.status not in (JobStatus.IN_PROGRESS, JobStatus.CONFIRMED):
            raise InvalidJobStateError("Kunni yakunlash uchun avval ishni boshlash kerak")

        day = (
            db.query(JobDay)
            .filter(JobDay.id == day_id, JobDay.jobId == job.id)
            .first()
        )
        if not day:
            raise JobNotFoundError("Bu ish kuni topilmadi")
        if day.status == JobDayStatus.COMPLETED:
            raise InvalidJobStateError("Bu kun allaqachon yakunlangan")
        if day.status == JobDayStatus.CANCELLED:
            raise InvalidJobStateError("Bu kun bekor qilingan")

        if current_user.role != 'admin' and str(day.workDate) > _today_in_tashkent():
            raise InvalidJobStateError(f"{day.workDate} hali kelmadi — o'sha kuni yakunlang")

        apps = (
            db.query(models.Application)
            .filter(
                models.Application.jobId == job.id,
                models.Application.status.in_(COMMITTED_APP_STATUSES),
            )
            .all()
        )
        if not apps:
            raise InvalidJobStateError("Yakunlash uchun yollangan ishchi yo'q")

        remaining_after = [
            d for d in job_days_service.payable_days(db, job.id) if d.id != day.id
        ]
        is_last_day = not remaining_after

        with db.begin_nested():
            day.status = JobDayStatus.COMPLETED
            day.completedAt = datetime.now(timezone.utc)
            db.add(day)

            paid, unpaid = [], []
            for app in apps:
                try:
                    WorkerEarnings.credit_worker(
                        db, job=job, worker_id=app.workerId,
                        amount_uzs=_wage_for_day(job, day),
                        job_day_id=day.id,
                        count_completed_job=is_last_day,
                    )
                    paid.append(app.workerId)
                except Exception as e:
                    logger.warning("Crediting skipped for job %s day %s / worker %s: %s",
                                   job.id, day.workDate, app.workerId, str(e))
                    unpaid.append(app.workerId)

                if app.workerId in paid:
                    message = (
                        f"'{job.title}' ishining {day.workDate} kuni yakunlandi, "
                        "shu kun uchun to'lov hisobingizga o'tkazildi."
                    )
                else:
                    message = (
                        f"'{job.title}' ishining {day.workDate} kuni yakunlandi. "
                        "To'lov ish beruvchi tomonidan alohida amalga oshiriladi."
                    )
                db.add(models.Notification(
                    id=str(uuid.uuid4()), userId=app.workerId, title="Ish kuni yakunlandi",
                    message=message, type="completed", relatedJobId=job.id,
                ))

            if is_last_day:
                job.status = JobStatus.COMPLETED
                job.completedAt = datetime.now(timezone.utc)
                for app in apps:
                    app.status = "completed"
                    db.add(app)
                db.add(job)
            else:
                job.status = JobStatus.CONFIRMED
                for app in apps:
                    app.status = "confirmed"
                    db.add(app)
                db.add(job)

        db.commit()
        return {
            "success": True,
            "dayId": day.id,
            "workDate": day.workDate,
            "day_status": JobDayStatus.COMPLETED,
            "job_status": job.status,
            "remaining_days": len(remaining_after),
            "paid_workers": len(paid),
            "unpaid_workers": len(unpaid),
        }

    @staticmethod
    def complete_job(db: Session, job_id: str, rating: Optional[int], review: Optional[str], bonus: Optional[int], current_user: models.User) -> dict:
        job = JobService.get_job_or_fail(db, job_id)

        is_employer = job.employerId in (current_user.id, getattr(current_user, 'uid', None)) or current_user.role == 'admin'

        caller_apps = (
            db.query(models.Application)
            .filter(
                models.Application.jobId == job_id,
                models.Application.workerId.in_([current_user.id, getattr(current_user, 'uid', None)]),
                models.Application.status.in_(COMMITTED_APP_STATUSES),
            )
            .all()
        )
        is_hired_worker = bool(caller_apps)

        if not is_employer and not is_hired_worker:
            raise ActionForbiddenError("Faqat ish beruvchi yoki tayinlangan ishchi ishni yakunlay oladi")

        if job.status == JobStatus.COMPLETED:
            raise InvalidJobStateError("Bu ish allaqachon yakunlangan")
        if job.status == JobStatus.CANCELLED:
            raise InvalidJobStateError("Bekor qilingan ishni yakunlab bo'lmaydi")
        if job.status not in (JobStatus.IN_PROGRESS, JobStatus.CONFIRMED):
            raise InvalidJobStateError("Ishni yakunlash uchun avval uni boshlash kerak")

        apps = (
            db.query(models.Application)
            .filter(
                models.Application.jobId == job_id,
                models.Application.status.in_(COMMITTED_APP_STATUSES),
            )
            .all()
        )
        if not apps:
            raise InvalidJobStateError("Yakunlash uchun yollangan ishchi yo'q")

        bonus_each = (bonus or 0) if is_employer else 0
        if bonus_each > 0:
            employer = db.query(models.User).filter(models.User.id == job.employerId).first()
            if not employer:
                raise JobNotFoundError("Ish beruvchi topilmadi")

        remaining = job_days_service.payable_days(db, job.id)
        now = datetime.now(timezone.utc)
        
        is_single_day_completion = False
        
        with db.begin_nested():
            if remaining:
                original_remaining_count = len(remaining)
                today_str = _today_in_tashkent()

                arrived = [d for d in remaining if str(d.workDate) <= today_str]
                if not arrived and current_user.role != 'admin':
                    soonest = min(str(d.workDate) for d in remaining)
                    raise InvalidJobStateError(f"{soonest} hali kelmadi — o'sha kuni yakunlang")
                first_day = next(
                    (d for d in remaining if str(d.workDate) == today_str),
                    (arrived or remaining)[0],
                )
                
                first_day.status = JobDayStatus.COMPLETED
                first_day.completedAt = now
                db.add(first_day)
                
                remaining = [first_day]
                
                if original_remaining_count > 1:
                    is_single_day_completion = True
                    job.status = JobStatus.CONFIRMED
                else:
                    job.status = JobStatus.COMPLETED
                    job.completedAt = now
                db.add(job)
            else:
                job.status = JobStatus.COMPLETED
                job.completedAt = now
                db.add(job)

            paid, unpaid, bonus_paid = [], [], []

            # 1. Update all apps first
            for app in apps:
                if is_single_day_completion:
                    app.status = "confirmed"
                else:
                    app.status = "completed"
                    app.rating = rating
                    app.review = review
                    app.bonus = bonus or 0
                db.add(app)
            
            db.flush()

            # 2. Compute avg ratings in bulk and update workers
            if rating and not is_single_day_completion:
                worker_ids = [app.workerId for app in apps]
                avg_ratings_query = (
                    db.query(models.Application.workerId, func.avg(models.Application.rating))
                    .filter(
                        models.Application.workerId.in_(worker_ids),
                        models.Application.rating.isnot(None),
                    )
                    .group_by(models.Application.workerId)
                    .all()
                )
                avg_ratings_map = {w_id: avg for w_id, avg in avg_ratings_query}
                
                workers = db.query(models.User).filter(models.User.id.in_(worker_ids)).all()
                for worker in workers:
                    avg = avg_ratings_map.get(worker.id)
                    if avg is not None:
                        worker.rating = round(avg, 2)
                        db.add(worker)
                db.flush()

            for app in apps:

                try:
                    if remaining:
                        for index, day in enumerate(remaining):
                            WorkerEarnings.credit_worker(
                                db, job=job, worker_id=app.workerId,
                                amount_uzs=_wage_for_day(job, day), job_day_id=day.id,
                                count_completed_job=(index == 0 and not is_single_day_completion),
                            )
                    else:
                        WorkerEarnings.credit_worker(
                            db, job=job, worker_id=app.workerId,
                            amount_uzs=_wage_for_day(job, None),
                        )
                    paid.append(app.workerId)
                except Exception as e:
                    logger.warning("Crediting skipped for job %s / worker %s: %s",
                                   job.id, app.workerId, str(e))
                    unpaid.append(app.workerId)

                if bonus_each > 0:
                    try:
                        WorkerEarnings.pay_completion_bonus(
                            db, job=job, worker_id=app.workerId, amount_uzs=bonus_each,
                        )
                        bonus_paid.append(app.workerId)
                    except Exception as e:
                        logger.warning("Completion bonus skipped for job %s / worker %s: %s",
                                       job.id, app.workerId, str(e))

                if app.workerId in paid:
                    message = f"'{job.title}' ishi bo'yicha to'lov hisobingizga o'tkazildi."
                    if app.workerId in bonus_paid:
                        message += f" Ish beruvchi qo'shimcha {bonus_each} so'm bonus qo'shdi."
                else:
                    message = (
                        f"'{job.title}' ishi yakunlandi. "
                        "To'lov ish beruvchi tomonidan alohida amalga oshiriladi."
                    )
                db.add(models.Notification(
                    id=str(uuid.uuid4()), userId=app.workerId, title="Ish yakunlandi",
                    message=message, type="completed", relatedJobId=job_id,
                ))

            if is_hired_worker:
                db.add(models.Notification(
                    id=str(uuid.uuid4()),
                    userId=job.employerId,
                    title="Ish yakunlandi",
                    message=f"'{job.title}' ishi ishchi tomonidan yakunlandi. Iltimos, ishchiga baho va sharh qoldiring.",
                    type="job_completed",
                    relatedJobId=job_id,
                ))

        db.commit()
        return {
            "success": True,
            "job_status": job.status,
            "is_single_day_completion": is_single_day_completion,
            "paid_workers": len(paid),
            "unpaid_workers": len(unpaid),
            "bonus_paid_workers": len(bonus_paid),
            "bonus_each": bonus_each,
        }
