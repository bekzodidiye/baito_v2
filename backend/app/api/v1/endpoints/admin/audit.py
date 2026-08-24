"""Helper for recording privileged administrator actions."""

from typing import Any, Optional

from fastapi import Request
from sqlalchemy.orm import Session

from app import models


def record_admin_action(
    db: Session,
    admin: models.User,
    action: str,
    *,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    details: Optional[dict[str, Any]] = None,
    request: Optional[Request] = None,
    note: Optional[str] = None,
) -> None:
    """Append an entry to the admin audit log.

    Added to the session but not committed — the caller commits it together
    with the change it describes, so the log can never record an action that
    was rolled back.
    """
    db.add(models.AdminAuditLog(
        adminId=admin.id,
        adminName=admin.name,
        action=action,
        targetType=target_type,
        targetId=target_id,
        details=details,
        ipAddress=(request.client.host if request and request.client else None),
        note=note,
    ))
