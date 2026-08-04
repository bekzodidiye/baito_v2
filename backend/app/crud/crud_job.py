from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.crud.base import CRUDBase
from app.models.job import Job
from app.models.application import Application
from app.schemas.job import JobCreate, JobUpdate

class CRUDJob(CRUDBase[Job, JobCreate, JobUpdate]):
    def get_open_jobs(self, db: Session, skip: int = 0, limit: int = 100) -> List[Job]:
        return db.query(Job).filter(Job.status == 'open').order_by(Job.createdAt.desc()).offset(skip).limit(limit).all()
        
    def get_employer_jobs(self, db: Session, employer_id: str, skip: int = 0, limit: int = 100) -> List[Job]:
        return db.query(Job).filter(Job.employerId == employer_id).order_by(Job.createdAt.desc()).offset(skip).limit(limit).all()

    def get_jobs_for_worker(self, db: Session, worker_id: str) -> List[Job]:
        worker_apps = db.query(Application).filter(Application.workerId == worker_id).all()
        applied_job_ids = [app.jobId for app in worker_apps]
        
        if applied_job_ids:
            return db.query(Job).filter(
                or_(Job.status == 'open', Job.id.in_(applied_job_ids))
            ).order_by(Job.createdAt.desc()).all()
        else:
            return db.query(Job).filter(Job.status == 'open').order_by(Job.createdAt.desc()).all()

job = CRUDJob(Job)
