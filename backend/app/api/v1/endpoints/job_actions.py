import uuid
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app import crud, models
from app.api import deps

class JobCompleteRequest(BaseModel):
    rating: Optional[int] = None
    review: Optional[str] = None
    bonus: Optional[int] = 0

router = APIRouter()

def get_job_date(job: Any) -> str:
    if not job:
        return ""
    date_val = job.workDate
    if not date_val:
        return ""
    return str(date_val).split(" ")[0].split("~")[0].strip()

def _get_job_or_404(db: Session, id: str) -> models.Job:
    job = crud.job.get(db=db, id=id)
    if not job:
        raise HTTPException(status_code=404, detail="Ish e'loni topilmadi")
    return job

@router.post("/{id}/apply")
def apply_to_job(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    job = _get_job_or_404(db, id)

    if current_user.role != 'worker':
        raise HTTPException(status_code=403, detail="Faqat ishchilar ariza topshira oladi")

    existing_app = db.query(models.Application).filter(
        models.Application.jobId == id,
        models.Application.workerId == current_user.id
    ).first()

    if existing_app:
        return {"success": True, "id": existing_app.id, "jobId": existing_app.jobId, "status": existing_app.status}

    # Max 2 applications per day, and none at all once a job that day is confirmed.
    target_date = get_job_date(job)
    worker_apps = db.query(models.Application).filter(
        models.Application.workerId == current_user.id,
        models.Application.status.in_(['applied', 'hired', 'confirmed', 'in_progress'])
    ).all()

    same_day_count = 0
    has_confirmed_job = False
    if target_date and worker_apps:
        app_job_ids = {a.jobId for a in worker_apps}
        app_jobs = db.query(models.Job).filter(models.Job.id.in_(app_job_ids)).all()
        app_job_map = {j.id: j for j in app_jobs}
        for app in worker_apps:
            if get_job_date(app_job_map.get(app.jobId)) == target_date:
                same_day_count += 1
                if app.status in ['hired', 'confirmed', 'in_progress']:
                    has_confirmed_job = True

    if has_confirmed_job:
        raise HTTPException(
            status_code=400,
            detail="Siz bu kun uchun allaqachon tasdiqlangan ishga egasiz!"
        )

    if same_day_count >= 2:
        raise HTTPException(
            status_code=400,
            detail="Bir kunda ko'pi bilan 2 ta ishga ariza topshirishingiz mumkin!"
        )

    db_app = models.Application(id=str(uuid.uuid4()), jobId=id, workerId=current_user.id, status="applied")
    db.add(db_app)
    notif = models.Notification(
        id=str(uuid.uuid4()), userId=job.employerId, title="Yangi ariza keldi",
        message=f"Ishchi '{job.title}' ishiga ariza topshirdi.", type="apply", relatedJobId=id
    )
    db.add(notif)
    db.commit()
    db.refresh(db_app)
    return {"success": True, "id": db_app.id, "jobId": db_app.jobId, "status": db_app.status}

@router.post("/{id}/request-start")
@router.post("/{id}/confirm-start")
@router.post("/{id}/start")
def confirm_start_job(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    job = _get_job_or_404(db, id)

    app = db.query(models.Application).filter(
        models.Application.jobId == id,
        models.Application.status.in_(['hired', 'confirmed', 'start_requested'])
    ).first()

    is_employer = job.employerId in (current_user.id, current_user.uid)
    is_hired_worker = bool(app and app.workerId == current_user.id)
    if not (is_employer or is_hired_worker or current_user.role == 'admin'):
        raise HTTPException(status_code=403, detail="Bu ishni boshlash huquqingiz yo'q")

    job.status = "in_progress"
    db.add(job)

    if app:
        app.status = "in_progress"
        db.add(app)

        # Free the worker's day: drop their other pending applications for the same date.
        job_date = get_job_date(job)
        if job_date:
            other_apps = db.query(models.Application).filter(
                models.Application.workerId == app.workerId,
                models.Application.jobId != id,
                models.Application.status == "applied"
            ).all()
            other_job_ids = {a.jobId for a in other_apps}
            other_jobs = db.query(models.Job).filter(models.Job.id.in_(other_job_ids)).all() if other_job_ids else []
            other_job_map = {j.id: j for j in other_jobs}
            for other_app in other_apps:
                if get_job_date(other_job_map.get(other_app.jobId)) == job_date:
                    db.delete(other_app)

    notif = models.Notification(
        id=str(uuid.uuid4()), userId=job.employerId, title="Ish boshlandi!",
        message=f"'{job.title}' ishi rasman boshlandi.",
        type="start_confirmed", relatedJobId=id
    )
    db.add(notif)

    db.commit()
    return {"success": True, "status": "in_progress"}

@router.post("/{id}/complete")
def complete_job(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    req: JobCompleteRequest,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    job = _get_job_or_404(db, id)

    if job.employerId not in (current_user.id, current_user.uid) and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Faqat ish beruvchi ishni yakunlay oladi")

    job.status = "completed"
    db.add(job)
    
    # We complete all hired/confirmed/in_progress applications for this job
    apps = db.query(models.Application).filter(
        models.Application.jobId == id,
        models.Application.status.in_(['hired', 'confirmed', 'in_progress'])
    ).all()
    
    for app in apps:
        app.status = "completed"
        app.rating = req.rating
        app.review = req.review
        app.bonus = req.bonus
        db.add(app)
        
        notif = models.Notification(
            id=str(uuid.uuid4()), userId=app.workerId, title="Ish yakunlandi",
            message=f"'{job.title}' ishi bo'yicha to'lov amalga oshirildi.",
            type="completed", relatedJobId=id
        )
        db.add(notif)

    db.commit()
    return {"success": True, "job_status": "completed"}

@router.post("/{id}/bookmark")
def toggle_bookmark(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    _get_job_or_404(db, id)

    existing = db.query(models.Bookmark).filter(models.Bookmark.jobId == id, models.Bookmark.userId == current_user.id).first()
    if existing:
        db.delete(existing)
        db.commit()
        return {"success": True, "bookmarked": False}

    db.add(models.Bookmark(jobId=id, userId=current_user.id))
    db.commit()
    return {"success": True, "bookmarked": True}
