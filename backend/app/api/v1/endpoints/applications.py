from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, models
from app.api import deps

router = APIRouter()

def _load_owned_application(db: Session, app_id: str, current_user: models.User):
    """Fetch an application together with its job, asserting the caller owns that job."""
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Ariza topilmadi")

    job = crud.job.get(db=db, id=app.jobId)
    if not job:
        raise HTTPException(status_code=404, detail="Ish e'loni topilmadi")

    if current_user.role != "admin" and job.employerId not in (current_user.id, current_user.uid):
        raise HTTPException(status_code=403, detail="Bu arizani boshqarish huquqingiz yo'q")

    return app, job

@router.get("/worker")
def get_worker_applications(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get all applications for the current worker, enriched with job details.
    """
    apps = db.query(models.Application).filter(
        models.Application.workerId.in_([current_user.id, current_user.uid])
    ).all()
    if not apps:
        return []

    job_ids = {a.jobId for a in apps}
    jobs = db.query(models.Job).filter(models.Job.id.in_(job_ids)).all()
    job_map = {j.id: j for j in jobs}

    result = []
    for app in apps:
        job = job_map.get(app.jobId)
        if not job:
            continue

        result.append({
            "id": app.id,
            "jobId": app.jobId,
            "jobTitle": job.title,
            "jobCompany": job.company or "Baito",
            "jobLocation": job.location,
            "jobDate": str(job.workDate) if job.workDate else "",
            "status": app.status,
            "appliedDate": str(app.appliedDate) if app.appliedDate else None,
            "rating": app.rating,
            "review": app.review,
            "bonus": app.bonus,
            "earnedAmount": int(''.join(filter(str.isdigit, job.salary))) + (app.bonus or 0) if job.salary and any(c.isdigit() for c in job.salary) else (app.bonus or 0)
        })

    result.sort(key=lambda x: x.get("appliedDate") or "", reverse=True)
    return result

@router.get("/employer")
def get_employer_applications(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_employer),
) -> Any:
    """
    Get applications for jobs posted by the current employer only.
    """
    employer_jobs = db.query(models.Job).filter(
        models.Job.employerId.in_([current_user.id, current_user.uid])
    ).all()
    if not employer_jobs:
        return []

    job_map = {j.id: j for j in employer_jobs}

    apps = db.query(models.Application).filter(
        models.Application.jobId.in_(list(job_map.keys()))
    ).all()
    if not apps:
        return []

    worker_ids = {a.workerId for a in apps}
    workers = db.query(models.User).filter(
        (models.User.id.in_(worker_ids)) | (models.User.uid.in_(worker_ids))
    ).all()
    worker_map = {}
    for w in workers:
        worker_map[w.id] = w
        if w.uid:
            worker_map[w.uid] = w

    result = []
    for app in apps:
        worker = worker_map.get(app.workerId)
        job = job_map.get(app.jobId)
        result.append({
            "id": app.id,
            "jobId": app.jobId,
            "jobTitle": job.title if job else "Ish e'loni",
            "workerId": app.workerId,
            "workerName": worker.name if worker else "Ishchi",
            "workerPhone": worker.phone if worker else "+998 90 *** ** **",
            "workerAvatar": worker.avatarUrl if worker else None,
            "workerRating": worker.rating if worker else 5.0,
            "workerCompletedJobs": worker.completedJobsCount if worker else 0,
            "workerBirthDate": worker.birthDate if worker else None,
            "workerGender": worker.gender if worker else None,
            "workerSkills": worker.skills if worker else [],
            "workerBio": worker.bio if worker else None,
            "status": app.status,
            "appliedDate": str(app.appliedDate) if app.appliedDate else None
        })
    return result

@router.post("/{id}/hire")
def hire_applicant(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    current_user: models.User = Depends(deps.get_current_employer),
) -> Any:
    """
    Hire an applicant for one of the caller's own jobs.
    """
    app, job = _load_owned_application(db, id, current_user)

    app.status = "hired"
    job.status = "confirmed"
    db.add(job)
    db.add(app)

    # A worker can only hold one job per day: drop their other pending applications
    # that collide with this job's date(s).
    from app.api.v1.endpoints.job_actions import get_job_dates_set
    job_dates = get_job_dates_set(job)
    if job_dates:
        other_apps = db.query(models.Application).filter(
            models.Application.workerId == app.workerId,
            models.Application.id != app.id,
            models.Application.status == "applied"
        ).all()
        if other_apps:
            other_job_ids = {a.jobId for a in other_apps}
            other_jobs = db.query(models.Job).filter(models.Job.id.in_(other_job_ids)).all()
            other_job_map = {j.id: j for j in other_jobs}
            for other_app in other_apps:
                other_j = other_job_map.get(other_app.jobId)
                if not other_j:
                    continue
                other_app_dates = get_job_dates_set(other_j)
                if job_dates.intersection(other_app_dates):
                    db.delete(other_app)

    db.commit()
    db.refresh(app)

    return {"success": True, "application_status": "hired"}

@router.post("/{id}/reject")
def reject_applicant(
    *,
    db: Session = Depends(deps.get_db),
    id: str,
    current_user: models.User = Depends(deps.get_current_employer),
) -> Any:
    """
    Reject an applicant for one of the caller's own jobs.
    """
    app, _ = _load_owned_application(db, id, current_user)

    app.status = "rejected"
    db.add(app)
    db.commit()
    db.refresh(app)

    return {"success": True, "application_status": "rejected"}
