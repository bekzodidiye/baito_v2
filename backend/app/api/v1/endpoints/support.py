"""The user's own side of support.

The ticket and message models existed, and the admin panel could read and
reply to tickets — but nothing let a user open one. An administrator was
watching a queue that no one could ever put anything into, and the app's
"support" conversation was a local mock that fabricated a reply saying an
operator would be in touch.

A user has one conversation with support, not a list of tickets: whichever of
their tickets is still open, or a new one on the first message.
"""

import logging
from typing import Any

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app import models
from app.api import deps
from app.core.limiter import limiter

logger = logging.getLogger(__name__)
router = APIRouter()

# Anything not yet resolved is the conversation the user is still having.
OPEN_STATUSES = ("new", "open", "pending")
DEFAULT_SUBJECT = "Yordam markazi"


class SupportMessageIn(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


def _open_ticket(db: Session, user: models.User) -> models.SupportTicket | None:
    user_ids = [uid for uid in [user.id, getattr(user, 'uid', None)] if uid]
    return (
        db.query(models.SupportTicket)
        .filter(
            models.SupportTicket.userId.in_(user_ids),
            models.SupportTicket.status.in_(OPEN_STATUSES),
        )
        .order_by(models.SupportTicket.createdAt.desc())
        .first()
    )


def _serialise(db: Session, ticket: models.SupportTicket | None) -> dict:
    if ticket is None:
        return {"ticketId": None, "status": None, "messages": []}

    messages = (
        db.query(models.TicketMessage)
        .filter(models.TicketMessage.ticketId == ticket.id)
        .order_by(models.TicketMessage.timestamp.asc())
        .all()
    )
    # Who said it matters to the client only as "me" or "support".
    sender_ids = {m.senderId for m in messages if m.senderId}
    admin_users = (
        db.query(models.User)
        .filter(
            or_(models.User.id.in_(sender_ids), models.User.uid.in_(sender_ids)),
            models.User.role == "admin",
        )
        .all()
    ) if sender_ids else []
    admin_ids = {u.id for u in admin_users} | {u.uid for u in admin_users if getattr(u, "uid", None)}
    return {
        "ticketId": ticket.id,
        "status": ticket.status,
        "messages": [
            {
                "id": m.id,
                "senderId": m.senderId,
                "fromSupport": m.senderId in admin_ids,
                "text": m.text,
                "timestamp": m.timestamp.isoformat() if m.timestamp else None,
            }
            for m in messages
        ],
    }


@router.get("/conversation")
def get_support_conversation(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """The user's open support conversation, or an empty one.

    Deliberately does not create a ticket: opening the Messages screen should
    not put an empty ticket in the administrator's queue. The first message
    creates it.
    """
    return _serialise(db, _open_ticket(db, current_user))


@router.post("/messages")
@limiter.limit("20/hour")
def send_support_message(
    request: Request,
    payload: SupportMessageIn,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Write to support, opening a ticket if there is not one already."""
    ticket = _open_ticket(db, current_user)
    is_new = False
    if ticket is None:
        ticket = models.SupportTicket(
            userId=current_user.id,
            subject=DEFAULT_SUBJECT,
            category="general",
            status="new",
            priority="medium",
        )
        db.add(ticket)
        db.flush()
        is_new = True

    message = models.TicketMessage(
        ticketId=ticket.id,
        senderId=current_user.id,
        text=payload.text.strip(),
    )
    db.add(message)

    # If ticket was waiting in pending/answered status, mark it open again
    if ticket.status in ("pending", "answered"):
        ticket.status = "open"
        db.add(ticket)

    # Notify administrators of incoming user message or ticket
    admins = db.query(models.User).filter(models.User.role == "admin").all()
    user_label = current_user.name or current_user.phone or "Foydalanuvchi"
    summary_text = payload.text.strip()
    if len(summary_text) > 80:
        summary_text = summary_text[:77] + "..."
    for admin in admins:
        db.add(models.Notification(
            userId=admin.id,
            title="Yangi yordam so'rovi" if is_new else "Yordam markaziga xabar",
            message=f"Foydalanuvchi {user_label} yordam so'radi: {summary_text}",
            type="support",
        ))

    db.commit()
    db.refresh(ticket)
    return _serialise(db, ticket)


@router.delete("/messages/{message_id}")
def delete_support_message(
    message_id: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    from fastapi import HTTPException
    msg = db.query(models.TicketMessage).filter(models.TicketMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Xabar topilmadi")
    user_ids = [uid for uid in [current_user.id, getattr(current_user, 'uid', None)] if uid]
    if msg.senderId not in user_ids and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Bu xabarni o'chirish huquqingiz yo'q")
    db.delete(msg)
    db.commit()
    return {"success": True, "messageId": message_id}

