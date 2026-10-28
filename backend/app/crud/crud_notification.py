from typing import List
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.notification import Notification
from app.schemas.notification import NotificationCreate, NotificationUpdate

class CRUDNotification(CRUDBase[Notification, NotificationCreate, NotificationUpdate]):
    def get_multi_by_user(
        self, db: Session, *, user_id: str | list[str], skip: int = 0, limit: int = 100
    ) -> List[Notification]:
        uids = [user_id] if isinstance(user_id, str) else user_id
        return (
            db.query(self.model)
            .filter(Notification.userId.in_(uids))
            .order_by(Notification.createdAt.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def mark_all_as_read(self, db: Session, *, user_id: str | list[str]) -> None:
        uids = [user_id] if isinstance(user_id, str) else user_id
        db.query(self.model).filter(
            # .is_(False) rather than `== False`: ruff's suggested `not
            # Notification.isRead` evaluates in Python and builds no SQL at all,
            # which is why it offers that one only as an unsafe fix.
            Notification.userId.in_(uids), Notification.isRead.is_(False)
        ).update({"isRead": True}, synchronize_session=False)
        db.commit()

notification = CRUDNotification(Notification)
