from typing import List, Optional
from sqlalchemy import or_, select
from sqlalchemy.orm import Session
from app import models, schemas
from app.models.job import JobStatus


class JobQueryService:
    @staticmethod
    def get_visible_jobs(
        db: Session,
        current_user: Optional[models.User],
        skip: int,
        limit: int,
        employer_id: Optional[str] = None,
        search: Optional[str] = None,
        location: Optional[str] = None,
        category: Optional[str] = None,
    ) -> List[schemas.JobWithApplicationStatus]:
        query = db.query(models.Job)

        if search:
            term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    models.Job.title.ilike(term),
                    models.Job.company.ilike(term),
                    models.Job.description.ilike(term),
                    models.Job.location.ilike(term),
                )
            )
        if location:
            query = query.filter(models.Job.location.ilike(f"%{location.strip()}%"))
        if category:
            query = query.filter(models.Job.category == category)

        is_admin = bool(current_user and current_user.role == 'admin')
        is_employer = bool(current_user and current_user.role == 'employer')

        if employer_id:
            from app.core.exceptions import ActionForbiddenError
            if not (is_admin or (current_user and employer_id == current_user.id)):
                raise ActionForbiddenError("Bu ma'lumotni ko'rish huquqingiz yo'q")
            query = query.filter(models.Job.employerId == employer_id)
        elif is_employer:
            query = query.filter(models.Job.employerId == current_user.id)
        elif not is_admin:
            visible = models.Job.status.in_(JobStatus.OPEN_STATUSES)
            if current_user:
                own = (
                    db.query(models.Application.jobId)
                    .filter(models.Application.workerId.in_([current_user.id]))
                    .subquery()
                )
                visible = or_(visible, models.Job.id.in_(select(own.c.jobId)))
            query = query.filter(visible)

        jobs = (
            query.order_by(models.Job.createdAt.desc(), models.Job.id.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        if not jobs:
            return []

        job_ids = [j.id for j in jobs]

        worker_apps = []
        if current_user:
            worker_apps = (
                db.query(models.Application)
                .filter(
                    models.Application.workerId == current_user.id,
                    models.Application.jobId.in_(job_ids),
                )
                .all()
            )

        bookmarked_ids: set[str] = set()
        if current_user:
            bookmarked_ids = {
                b.jobId
                for b in db.query(models.Bookmark.jobId)
                .filter(
                    models.Bookmark.userId == current_user.id,
                    models.Bookmark.jobId.in_(job_ids),
                )
                .all()
            }

        HIRED_STATUSES = ['hired', 'confirmed', 'completed', 'in_progress', 'start_requested']
        hired_apps = (
            db.query(models.Application)
            .filter(
                models.Application.jobId.in_(job_ids),
                models.Application.status.in_(HIRED_STATUSES),
            )
            .all()
        )

        hired_counts: dict[str, int] = {}
        job_hired_workers: dict[str, list] = {}
        if hired_apps:
            for app in hired_apps:
                hired_counts[app.jobId] = hired_counts.get(app.jobId, 0) + 1

            hired_worker_ids = list({app.workerId for app in hired_apps})
            hired_users = (
                db.query(models.User).filter(models.User.id.in_(hired_worker_ids)).all()
            )
            user_map = {user.id: user for user in hired_users}

            from app.schemas.job import HiredWorkerInfo
            employer_job_ids = {j.id for j in jobs if j.employerId in
                                ((current_user.id,) if current_user else ())}

            for app in hired_apps:
                user = user_map.get(app.workerId)
                if not user:
                    continue
                may_see_phone = bool(
                    is_admin
                    or app.jobId in employer_job_ids
                    or (current_user and current_user.id == user.id)
                )
                job_hired_workers.setdefault(app.jobId, []).append(HiredWorkerInfo(
                    id=user.id,
                    name=user.name or "Foydalanuvchi",
                    phone=user.phone if may_see_phone else None,
                    avatarUrl=user.avatarUrl,
                ))

        worker_apps_map = {a.jobId: a for a in worker_apps}
        job_hired_apps_map = {}
        for a in hired_apps:
            job_hired_apps_map.setdefault(a.jobId, []).append(a)

        result = []
        for job in jobs:
            app_item = worker_apps_map.get(job.id)
            job_status = job.status
            if app_item:
                if app_item.status == 'in_progress' or job.status == JobStatus.IN_PROGRESS:
                    job_status = 'in_progress'
                elif app_item.status == 'completed' or job.status == JobStatus.COMPLETED:
                    job_status = 'completed'
                elif app_item.status == 'start_requested' or job.status == 'start_requested':
                    job_status = 'start_requested'
                elif app_item.status == 'hired':
                    job_status = 'hired'
                elif app_item.status == 'applied':
                    job_status = 'applied'
            elif current_user and job.employerId == current_user.id:
                job_apps = job_hired_apps_map.get(job.id, [])
                if job.status not in (JobStatus.IN_PROGRESS, JobStatus.COMPLETED, JobStatus.CANCELLED):
                    if any(a.status == 'in_progress' for a in job_apps):
                        job_status = 'in_progress'
                    elif any(a.status == 'start_requested' for a in job_apps):
                        job_status = 'start_requested'

            job_dict = schemas.JobWithApplicationStatus.model_validate(job)
            job_dict.status = job_status
            job_dict.applied = bool(app_item)
            job_dict.bookmarked = job.id in bookmarked_ids
            if app_item:
                job_dict.appliedDate = app_item.appliedDate

            vacancies_num = job.vacancies
            hired_cnt = hired_counts.get(job.id, 0)
            if job.status == JobStatus.OPEN and job.hiredWorkerId is None and vacancies_num <= 1:
                hired_cnt = 0

            job_dict.hiredCount = hired_cnt
            job_dict.vacancies = vacancies_num
            job_dict.hiredWorkers = job_hired_workers.get(job.id, [])

            is_filled = (
                (job.status != JobStatus.OPEN and hired_cnt >= vacancies_num)
                or (job.status in (JobStatus.COMPLETED, JobStatus.IN_PROGRESS))
            )

            if not (is_admin or is_employer):
                if is_filled and not app_item:
                    continue

            result.append(job_dict)

        return result

    @staticmethod
    def get_employer_jobs(
        db: Session,
        current_user: models.User,
        skip: int,
        limit: int,
    ) -> List[dict]:
        employer_ids = [current_user.id]
        if getattr(current_user, 'uid', None):
            employer_ids.append(current_user.id)

        jobs = (
            db.query(models.Job)
            .filter(models.Job.employerId.in_(employer_ids))
            .order_by(models.Job.createdAt.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        job_ids = [j.id for j in jobs]
        apps = (
            db.query(models.Application)
            .filter(
                models.Application.jobId.in_(job_ids),
                models.Application.status.in_(["hired", "confirmed", "in_progress", "completed", "start_requested"]),
            )
            .all()
        ) if job_ids else []

        hired_counts = {}
        for a in apps:
            hired_counts[a.jobId] = hired_counts.get(a.jobId, 0) + 1

        payouts = {}
        if job_ids:
            for p in (
                db.query(models.JobPayout)
                .filter(models.JobPayout.jobId.in_(job_ids))
                .order_by(models.JobPayout.paidAt.asc())
                .all()
            ):
                if p.invoiceNumber:
                    payouts[p.jobId] = p

        result = []
        for job in jobs:
            vacancies_num = job.vacancies
            hired_cnt = hired_counts.get(job.id, 0)

            job_data = schemas.Job.model_validate(job).model_dump()
            job_data.update({
                "applied": False,
                "bookmarked": False,
                "hiredCount": hired_cnt,
                "vacancies": vacancies_num,
                "appliedDate": None,
                "hiredWorkers": [],
            })

            payout = payouts.get(job.id)
            job_data.update({
                "payoutStatus": payout.status if payout else None,
                "invoiceNumber": payout.invoiceNumber if payout else None,
                "invoiceAmount": (payout.invoiceAmount or payout.amount) if payout else None,
            })
            result.append(job_data)

        return result

    @staticmethod
    def get_job_details(db: Session, job_id: str, current_user: Optional[models.User]) -> models.Job:
        from app.core.exceptions import JobNotFoundError
        job = db.query(models.Job).filter(models.Job.id == job_id).first()
        if not job:
            raise JobNotFoundError("Ish e'loni topilmadi")

        is_owner = bool(current_user and job.employerId == current_user.id)
        is_admin = bool(current_user and current_user.role == 'admin')
        if job.status in JobStatus.CLOSED_STATUSES and not (is_owner or is_admin):
            raise JobNotFoundError("Ish e'loni topilmadi")

        return job
