from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app import models
from app.api import deps
from app.core.money import salary_to_uzs
from app.models.job import JobStatus
from app.models.job_day import JobDayStatus
from app.models.job_payout import JobPayout
from app.services import job_days

from .admin_users import get_admin_user
from .audit import record_admin_action

router = APIRouter()

VALID_STATUSES = {
    JobStatus.OPEN, JobStatus.CONFIRMED, JobStatus.IN_PROGRESS,
    JobStatus.COMPLETED, JobStatus.CANCELLED,
}


class JobStatusPayload(BaseModel):
    status: str
    reason: Optional[str] = Field(default=None, max_length=500)


class JobWorkerPayload(BaseModel):
    workerId: Optional[str] = None
    reason: Optional[str] = Field(default=None, max_length=500)


def _iso(value) -> Optional[str]:
    return value.isoformat() if value else None


def _serialize_job(j: models.Job, employer_name: str = "", worker=None) -> dict:
    return {
        "id": j.id,
        "title": j.title,
        "company": j.company,
        "employerId": j.employerId,
        "employerName": employer_name,
        "workerId": worker.id if worker else None,
        "workerName": worker.name if worker else "",
        "salary": j.salary,
        "location": j.location,
        "description": j.description,
        "status": j.status,
        "durationLabel": j.durationLabel,
        "createdAt": str(j.createdAt) if j.createdAt else None,
        "workDate": j.workDate,
        # The shift that was advertised, and what actually happened against it.
        # Both are needed together: on their own, "09:00 - 18:00" says nothing
        # about whether anyone turned up at nine.
        "workTime": j.workTime,
        "startedAt": _iso(j.startedAt),
        "completedAt": _iso(j.completedAt),
        "category": j.category,
        "tags": j.tags,
        "urgent": j.urgent,
        "logoUrl": j.logoUrl,
        "imageUrl": j.imageUrl,
        "salaryCurrency": j.salaryCurrency,
        "neededWorkers": j.neededWorkers,
        "hourlyRate": j.hourlyRate,
        "transportRate": j.transportRate,
        "responsibilities": j.responsibilities,
        "requirements": j.requirements,
        "importantNote": j.importantNote,
        "rawLocation": j.rawLocation,
        "views": j.views,
        "coordinateX": j.coordinateX,
        "coordinateY": j.coordinateY,
    }


@router.get("/jobs")
def get_admin_jobs(
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    status: Optional[str] = None,
) -> Any:
    """List jobs for the admin panel.

    This used to run two or three extra queries per row — roughly 600 round
    trips for a single page of 200 jobs. Everything is batched now.
    """
    query = db.query(models.Job)
    if status:
        query = query.filter(models.Job.status == status)

    total = query.count()
    jobs = (
        query.order_by(models.Job.createdAt.desc()).offset(skip).limit(limit).all()
    )
    if not jobs:
        return {"total": total, "items": []}

    job_ids = [j.id for j in jobs]
    employer_ids = {j.employerId for j in jobs}

    employer_map = {
        u.id: u for u in db.query(models.User).filter(models.User.id.in_(employer_ids)).all()
    }

    hired_apps = (
        db.query(models.Application)
        .filter(
            models.Application.jobId.in_(job_ids),
            models.Application.status.in_(["hired", "confirmed", "in_progress", "completed"]),
        )
        .all()
    )
    hired_by_job = {}
    for app in hired_apps:
        hired_by_job.setdefault(app.jobId, app)

    fallback_worker_ids = {j.hiredWorkerId for j in jobs if j.hiredWorkerId}
    worker_ids = {a.workerId for a in hired_apps} | fallback_worker_ids
    worker_map = {
        u.id: u for u in db.query(models.User).filter(models.User.id.in_(worker_ids)).all()
    } if worker_ids else {}

    items = []
    for j in jobs:
        app = hired_by_job.get(j.id)
        worker = worker_map.get(app.workerId) if app else worker_map.get(j.hiredWorkerId)
        items.append(_serialize_job(
            j,
            employer_name=getattr(employer_map.get(j.employerId), "name", ""),
            worker=worker,
        ))

    return {"total": total, "items": items}


def _build_steps(job, applications, hire_date, payout) -> list[dict]:
    """The job's whole life as an ordered checklist, not a pile of events.

    ``timeline`` answers "what happened and when", and only carries entries that
    actually have a timestamp. That leaves the stages nobody recorded a time for
    invisible, so a job sitting at "hired, waiting to start" looks identical to
    one that never got that far. This answers the other question — where is this
    job in its lifecycle — by listing every stage, reached or not.

    Nothing here is derived from a stage's own timestamp: several of them have
    none. Each is decided from the state that stage leaves behind, so a stage
    without a recorded date still reads as done.
    """
    hired = bool(job.hiredWorkerId) or any(
        a["status"] in ("hired", "completed") for a in applications
    )
    started = job.status in (JobStatus.IN_PROGRESS, JobStatus.COMPLETED)
    completed = job.status == JobStatus.COMPLETED
    first_applied = min(
        (a["appliedDate"] for a in applications if a["appliedDate"]), default=None
    )

    stages = [
        ("created", "E'lon joylandi", True, _iso(job.createdAt), None),
        (
            "applied",
            "Ariza keldi",
            bool(applications),
            first_applied,
            f"{len(applications)} ta ariza" if applications else None,
        ),
        ("hired", "Ishchi olindi", hired, hire_date, None),
        ("started", "Ish boshlandi", started, _iso(job.startedAt), None),
        ("completed", "Ish yakunlandi", completed, _iso(job.completedAt), None),
        (
            "worker_paid",
            "Ishchiga to'landi",
            payout is not None,
            _iso(payout.paidAt) if payout else None,
            f"{payout.amount:,} so'm".replace(",", " ") if payout else None,
        ),
        (
            "invoiced",
            "Hisob-faktura yuborildi",
            bool(payout and payout.invoiceSentAt),
            _iso(payout.invoiceSentAt) if payout else None,
            payout.invoiceNumber if payout and payout.invoiceSentAt else None,
        ),
        (
            "payment_declared",
            "Korxona to'ladim dedi",
            bool(payout and payout.invoicePaidDeclaredAt),
            _iso(payout.invoicePaidDeclaredAt) if payout else None,
            payout.invoicePaidReference if payout and payout.invoicePaidDeclaredAt else None,
        ),
        (
            "payment_confirmed",
            "To'lov tasdiqlandi",
            bool(payout and payout.invoiceConfirmedAt),
            _iso(payout.invoiceConfirmedAt) if payout else None,
            None,
        ),
    ]

    # A cancelled job has not merely stopped advancing — the stages it never
    # reached are never going to be reached, and calling one of them "current"
    # would tell an administrator to wait for something that is not coming.
    cancelled = job.status == JobStatus.CANCELLED
    steps: list[dict] = []
    current_taken = False
    for key, label, done, date, detail in stages:
        if done:
            state = "done"
        elif cancelled:
            state = "skipped"
        elif not current_taken:
            state, current_taken = "current", True
        else:
            state = "pending"
        steps.append({
            "key": key, "label": label, "state": state,
            "date": date, "detail": detail,
        })

    if cancelled:
        steps.append({
            "key": "cancelled", "label": "Bekor qilindi", "state": "cancelled",
            "date": None, "detail": None,
        })

    return steps


@router.get("/jobs/{job_id}/detail")
def get_admin_job_detail(
    job_id: str,
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    """Full job detail with timeline, applications and transactions."""
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Ish topilmadi")

    employer = db.query(models.User).filter(models.User.id == job.employerId).first()

    applications = (
        db.query(models.Application).filter(models.Application.jobId == job_id).all()
    )
    transactions = (
        db.query(models.Transaction).filter(models.Transaction.jobId == job_id).all()
    )

    # Single lookup covering applicants and both sides of every transaction.
    participant_ids = (
        {a.workerId for a in applications}
        | {t.employerId for t in transactions}
        | {t.workerId for t in transactions if t.workerId}
    )
    participant_map = {
        u.id: u
        for u in db.query(models.User).filter(models.User.id.in_(participant_ids)).all()
    } if participant_ids else {}

    apps_data = []
    hired_app = None
    for app in applications:
        w = participant_map.get(app.workerId)
        app_item = {
            "id": app.id,
            "workerId": app.workerId,
            "workerName": w.name if w else "",
            "workerPhone": w.phone if w else "",
            "workerAvatar": getattr(w, 'avatarUrl', None) if w else None,
            "status": app.status,
            "appliedDate": app.appliedDate.isoformat() if app.appliedDate else None,
            "rating": app.rating,
            "review": app.review,
            "bonus": app.bonus,
        }
        apps_data.append(app_item)
        if app.status in ("hired", "completed"):
            hired_app = app_item

    txn_data = []
    for t in transactions:
        emp = participant_map.get(t.employerId)
        wrk = participant_map.get(t.workerId) if t.workerId else None
        txn_data.append({
            "id": t.id,
            "type": t.type,
            "status": t.status,
            "amount": t.amount,
            "platformFee": t.platformFee,
            "employerName": emp.name if emp else "",
            "workerName": wrk.name if wrk else "",
            "createdAt": t.createdAt.isoformat() if t.createdAt else None,
            "providerTransactionId": t.providerTransactionId,
            "performTime": t.performTime,
            "cancelTime": t.cancelTime,
        })

    timeline = []
    if job.createdAt:
        timeline.append({
            "event": "created", "label": "E'lon yaratildi",
            "date": job.createdAt.isoformat(), "icon": "plus",
        })

    # Nothing records when a worker was hired. This used to borrow the escrow
    # hold's timestamp, which was the moment of hiring because hiring is what
    # froze the money; with nothing frozen there is no such row. The posting's
    # start is the closest thing that is actually written down, and the
    # application date is the fallback — the same one this had before.
    hire_date = job.startedAt.isoformat() if job.startedAt else None

    for app_d in sorted(apps_data, key=lambda x: x["appliedDate"] or ""):
        if app_d["appliedDate"]:
            timeline.append({
                "event": "applied",
                "label": f"{app_d['workerName']} ariza yubordi",
                "date": app_d["appliedDate"],
                "icon": "user",
            })
        if app_d["status"] in ("hired", "completed"):
            timeline.append({
                "event": "hired",
                "label": f"{app_d['workerName']} tasdiqlandi",
                "date": hire_date or app_d["appliedDate"],
                "icon": "check",
            })

    for tx in sorted(txn_data, key=lambda x: x["createdAt"] or ""):
        if tx["type"] == "deposit" and tx["status"] in ("paid", "pending"):
            timeline.append({
                "event": "deposit",
                "label": f"Depozit: {tx['amount'] // 100} so'm",
                "date": tx["createdAt"],
                "icon": "dollar",
            })
        if tx["type"] in ("payment", "worker_earning", "completion_bonus") and tx["status"] in ("paid", "credited"):
            timeline.append({
                "event": "payment",
                "label": f"To'lov: {tx['amount'] // 100} so'm",
                "date": tx["createdAt"],
                "icon": "credit-card",
            })

    if job.startedAt:
        timeline.append({
            "event": "started", "label": "Ish boshlandi",
            "date": job.startedAt.isoformat(), "icon": "clock",
        })

    if job.completedAt:
        timeline.append({
            "event": "completed", "label": "Ish yakunlandi",
            "date": job.completedAt.isoformat(), "icon": "check",
        })

    # The settlement half. Everything above happens inside the app; these four
    # are the money actually moving, and they were missing from the history an
    # administrator reads when a company asks where its invoice stands.
    payout = db.query(JobPayout).filter(JobPayout.jobId == job_id).first()
    if payout:
        amount = f"{payout.amount:,}".replace(",", " ")
        timeline.append({
            "event": "worker_paid", "label": f"Ishchiga to'landi: {amount} so'm",
            "date": _iso(payout.paidAt), "icon": "dollar",
        })
        if payout.invoiceSentAt:
            timeline.append({
                "event": "invoiced",
                "label": f"Hisob-faktura yuborildi: {payout.invoiceNumber}",
                "date": _iso(payout.invoiceSentAt), "icon": "file",
            })
        if payout.invoicePaidDeclaredAt:
            timeline.append({
                "event": "payment_declared", "label": "Korxona to'ladim dedi",
                "date": _iso(payout.invoicePaidDeclaredAt), "icon": "credit-card",
            })
        if payout.invoiceConfirmedAt:
            timeline.append({
                "event": "payment_confirmed", "label": "To'lov tasdiqlandi",
                "date": _iso(payout.invoiceConfirmedAt), "icon": "check",
            })

    timeline.sort(key=lambda x: x.get("date") or "")

    job_data = _serialize_job(job, employer_name=employer.name if employer else "")
    job_data["employerPhone"] = employer.phone if employer else ""

    return {
        "job": job_data,
        "hiredWorker": hired_app,
        "applications": apps_data,
        "transactions": txn_data,
        "timeline": timeline,
        "steps": _build_steps(job, apps_data, hire_date, payout),
    }


@router.patch("/jobs/{job_id}/status")
def change_job_status(
    job_id: str,
    payload: JobStatusPayload,
    request: Request,
    db: Session = Depends(deps.get_db),
    admin: models.User = Depends(get_admin_user),
) -> Any:
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Ish topilmadi")

    # An untyped dict used to let any string through, so a typo could put a
    # job into a status no query would ever match again.
    if payload.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Noma'lum holat. Ruxsat etilgan: {', '.join(sorted(VALID_STATUSES))}",
        )

    # Marking a posting finished from this dropdown used to set the column and
    # nothing else: the day rows stayed pending and the worker was credited for
    # none of them. The posting read as done while nobody was owed anything —
    # production has one in exactly that state.
    #
    # Rather than credit somebody from a status dropdown, this refuses and
    # points at the flow that settles the work properly. Completing a day is
    # what credits that day's wage, and only the employer finishing the work
    # can say it happened.
    if payload.status == JobStatus.COMPLETED and job.status != JobStatus.COMPLETED:
        payable = job_days.payable_days(db, job.id)
        if payable:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Bu ishning {len(payable)} kuni hali yakunlanmagan. Holatni "
                    "shu yerdan o'zgartirish ishchiga hech narsa hisoblamaydi. "
                    "Ishni kunlar bo'yicha yakunlang yoki bekor qiling."
                ),
            )

    previous = job.status
    job.status = payload.status

    if payload.status == JobStatus.OPEN:
        job.hiredWorkerId = None
        active_apps = (
            db.query(models.Application)
            .filter(
                models.Application.jobId == job_id,
                models.Application.status.in_(["hired", "confirmed", "in_progress", "start_requested", "completed"]),
            )
            .all()
        )
        for app in active_apps:
            app.status = "rejected"
            db.add(models.Notification(
                userId=app.workerId,
                title="Ish holati o'zgardi",
                message=f"'{job.title}' ishi qaytadan ochiq holatga o'tkazildi.",
                type="system",
                relatedJobId=job.id,
            ))
    elif payload.status == JobStatus.CANCELLED:
        job.hiredWorkerId = None
        active_apps = (
            db.query(models.Application)
            .filter(
                models.Application.jobId == job_id,
                models.Application.status.in_(["hired", "confirmed", "in_progress", "start_requested"]),
            )
            .all()
        )
        for app in active_apps:
            app.status = "cancelled"

        # The employer's own cancel closes the days; doing it from here has
        # to mean the same thing, or a cancelled posting keeps offering work.

        for day in job_days.days_of(db, job.id):
            if day.status == JobDayStatus.PENDING:
                day.status = JobDayStatus.CANCELLED
                db.add(day)

    record_admin_action(
        db, admin, "job.status", target_type="job", target_id=job.id,
        details={"from": previous, "to": payload.status},
        request=request, note=payload.reason,
    )
    db.commit()
    return {"success": True, "status": job.status}


@router.patch("/jobs/{job_id}/worker")
def change_job_worker(
    job_id: str,
    payload: JobWorkerPayload,
    request: Request,
    db: Session = Depends(deps.get_db),
    admin: models.User = Depends(get_admin_user),
) -> Any:
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Ish topilmadi")

    new_worker_id = payload.workerId
    if new_worker_id:
        worker = db.query(models.User).filter(models.User.id == new_worker_id).first()
        if not worker:
            raise HTTPException(status_code=404, detail="Ishchi topilmadi")
        if worker.role != "worker":
            raise HTTPException(status_code=400, detail="Bu foydalanuvchi ishchi emas")

    current_apps = (
        db.query(models.Application)
        .filter(
            models.Application.jobId == job_id,
            models.Application.status.in_(["hired", "confirmed", "in_progress", "start_requested", "completed"]),
        )
        .all()
    )
    for app in current_apps:
        if app.workerId != new_worker_id:
            app.status = "rejected"
            db.add(models.Notification(
                userId=app.workerId,
                title="Ish tayinlanishi o'zgardi",
                message=f"'{job.title}' ishi bo'yicha tayinlov administrator tomonidan o'zgartirildi.",
                type="system",
                relatedJobId=job.id,
            ))

    if new_worker_id:
        new_app = (
            db.query(models.Application)
            .filter(
                models.Application.jobId == job_id,
                models.Application.workerId == new_worker_id,
            )
            .first()
        )
        if new_app:
            new_app.status = "hired"
        else:
            db.add(models.Application(jobId=job_id, workerId=new_worker_id, status="hired"))

        db.add(models.Notification(
            userId=new_worker_id,
            title="Sizni ishga tayinlashdi",
            message=f"'{job.title}' ishiga administrator tomonidan tayinlandingiz.",
            type="hired",
            relatedJobId=job.id,
        ))

        job.hiredWorkerId = new_worker_id
        if job.status == JobStatus.OPEN:
            job.status = JobStatus.CONFIRMED

        # The wage each day is worth, pinned now rather than read from the
        # posting later: editing the salary afterwards must not restate a day
        # already agreed. Nothing is taken from the employer — the worker is
        # credited as each day is worked, and the company invoiced after.
        wage = salary_to_uzs(job.salary)
        if wage > 0:
            for day in job_days.sync_days(db, job):
                if not day.amount:
                    day.amount = wage
                    db.add(day)

    else:
        job.hiredWorkerId = None
        if job.status != JobStatus.CANCELLED:
            job.status = JobStatus.OPEN


    record_admin_action(
        db, admin, "job.worker", target_type="job", target_id=job.id,
        details={"workerId": new_worker_id}, request=request, note=payload.reason,
    )
    db.commit()
    return {"success": True}


@router.delete("/jobs/{job_id}")
def delete_job(
    job_id: str,
    request: Request,
    db: Session = Depends(deps.get_db),
    admin: models.User = Depends(get_admin_user),
) -> Any:
    """Cancel a job.

    ``db.delete(job)`` left applications, chats, bookmarks and transactions
    pointing at a missing row — and on PostgreSQL the foreign keys made the
    delete fail outright once anyone had applied.
    """
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Ish topilmadi")

    affected = (
        db.query(models.Application)
        .filter(
            models.Application.jobId == job_id,
            models.Application.status.notin_(["rejected", "cancelled", "completed"]),
        )
        .all()
    )
    for app in affected:
        app.status = "cancelled"
        db.add(models.Notification(
            userId=app.workerId,
            title="Ish e'loni bekor qilindi",
            message=f"'{job.title}' e'loni administrator tomonidan bekor qilindi.",
            type="system",
            relatedJobId=job.id,
        ))

    job.status = JobStatus.CANCELLED

    record_admin_action(
        db, admin, "job.cancel", target_type="job", target_id=job.id,
        details={"affectedApplications": len(affected)}, request=request,
    )
    db.commit()
    return {"success": True, "status": JobStatus.CANCELLED}
