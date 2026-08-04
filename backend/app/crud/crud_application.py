from typing import Any, Dict, Optional, Union

from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.application import Application
from app.schemas.application import ApplicationCreate, ApplicationUpdate

class CRUDApplication(CRUDBase[Application, ApplicationCreate, ApplicationUpdate]):
    def get_by_job(self, db: Session, *, job_id: str) -> list[Application]:
        return db.query(Application).filter(Application.jobId == job_id).all()

application = CRUDApplication(Application)
