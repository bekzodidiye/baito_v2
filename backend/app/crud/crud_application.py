

from app.crud.base import CRUDBase
from app.models.application import Application
from app.schemas.application import ApplicationCreate, ApplicationUpdate

class CRUDApplication(CRUDBase[Application, ApplicationCreate, ApplicationUpdate]):
    pass

application = CRUDApplication(Application)
