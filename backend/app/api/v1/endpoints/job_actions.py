import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, models
from app.api import deps

router = APIRouter()

def get_job_date(job: Any) -> str:
    if not job:
        return "2026-08-05"
    date_val = getattr(job, 'workDate', None) or getattr(job, 'periodText', None) or getattr(job, 'date', None)
    if not date_val:
        return "2026-08-05"
    cleaned = str(date_val).split(" ")[0].split("~")[0].strip()
    return cleaned if cleaned else "2026-08-05"

@router.post("/{id}/apply")
def apply_to_job(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    job = crud.job.get(db=db, id=id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    worker_user = current_user
    if current_user.role == 'employer':
        demo_worker = db.query(models.User).filter(models.User.role == 'worker').first()
        if demo_worker:
            worker_user = demo_worker

    existing_app = db.query(models.Application).filter(
        models.Application.jobId == id,
        models.Application.workerId == worker_user.id
    ).first()
    
    if existing_app:
        return {"success": True, "id": existing_app.id, "jobId": existing_app.jobId, "status": existing_app.status}
        
    # Max 2 applications per day check & confirmed job check
    target_date = get_job_date(job)
    worker_apps = db.query(models.Application).filter(
        models.Application.workerId == worker_user.id,
        models.Application.status.in_(['applied', 'hired', 'confirmed', 'in_progress'])
    ).all()
    same_day_count = 0
    has_confirmed_job = False
    for app in worker_apps:
        app_job = crud.job.get(db=db, id=app.jobId)
        app_date = get_job_date(app_job)
        if app_date == target_date:
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

    db_app = models.Application(id=str(uuid.uuid4()), jobId=id, workerId=worker_user.id, status="applied")
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
    job = crud.job.get(db=db, id=id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    job.status = "in_progress"
    db.add(job)
    
    app = db.query(models.Application).filter(models.Application.jobId == id).first()
    if app:
        app.status = "in_progress"
        db.add(app)
        
    # Auto-delete other applications for the same date when started
    job_date = get_job_date(job)
    if job_date:
        other_apps = db.query(models.Application).filter(
            models.Application.workerId == (app.workerId if app else current_user.id),
            models.Application.jobId != id,
            models.Application.status == "applied"
        ).all()
        for other_app in other_apps:
            other_j = crud.job.get(db=db, id=other_app.jobId)
            if other_j and get_job_date(other_j) == job_date:
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
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    job = crud.job.get(db=db, id=id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    job.status = "completed"
    db.add(job)
    app = db.query(models.Application).filter(models.Application.jobId == id).first()
    if app:
        app.status = "completed"
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
    job = crud.job.get(db=db, id=id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    existing = db.query(models.Bookmark).filter(models.Bookmark.jobId == id, models.Bookmark.userId == current_user.id).first()
    if existing:
        db.delete(existing)
        db.commit()
        return {"success": True, "bookmarked": False}
    else:
        new_bookmark = models.Bookmark(jobId=id, userId=current_user.id)
        db.add(new_bookmark)
        db.commit()
        return {"success": True, "bookmarked": True}
