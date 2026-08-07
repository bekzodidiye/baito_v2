from typing import List, Optional
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.notification import Notification
from app.schemas.notification import NotificationCreate, NotificationUpdate

class CRUDNotification(CRUDBase[Notification, NotificationCreate, NotificationUpdate]):
    def get_multi_by_user(
        self, db: Session, *, user_id: str, skip: int = 0, limit: int = 100
    ) -> List[Notification]:
        return (
            db.query(self.model)
            .filter(Notification.userId == user_id)
            .order_by(Notification.createdAt.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def mark_all_as_read(self, db: Session, *, user_id: str) -> None:
        db.query(self.model).filter(
            Notification.userId == user_id, Notification.isRead == False
        ).update({"isRead": True})
        db.commit()

notification = CRUDNotification(Notification)
