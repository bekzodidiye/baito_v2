"""Support ticket conversation.

The ticket and message models existed and the admin panel already had a chat
component, but there was no endpoint behind either — an administrator could
see that someone had written in and had no way to answer.
"""

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app import models
from app.api import deps

from .admin_users import get_admin_user
from .audit import record_admin_action

router = APIRouter()

VALID_STATUSES = {"new", "open", "pending", "resolved", "closed"}


class TicketReply(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    # Replying usually moves the ticket along; the caller says where to.
    status: Optional[str] = None


class TicketStatusUpdate(BaseModel):
    status: str
    priority: Optional[str] = None


@router.get("/support-tickets/{ticket_id}")
def get_ticket(
    ticket_id: str,
    db: Session = Depends(deps.get_db),
    _: models.User = Depends(get_admin_user),
) -> Any:
    """A ticket with its full conversation."""
    ticket = (
        db.query(models.SupportTicket)
        .filter(models.SupportTicket.id == ticket_id)
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Murojaat topilmadi")

    messages = (
        db.query(models.TicketMessage)
        .filter(models.TicketMessage.ticketId == ticket_id)
        .order_by(models.TicketMessage.timestamp.asc())
        .all()
    )

    author_ids = {m.senderId for m in messages} | {ticket.userId}
    authors = {
        u.id: u
        for u in db.query(models.User).filter(models.User.id.in_(author_ids)).all()
    }

    return {
        "id": ticket.id,
        "userId": ticket.userId,
        "userName": getattr(authors.get(ticket.userId), "name", ""),
        "userPhone": getattr(authors.get(ticket.userId), "phone", ""),
        "subject": ticket.subject,
        "category": ticket.category,
        "status": ticket.status,
        "priority": ticket.priority,
        "createdAt": ticket.createdAt.isoformat() if ticket.createdAt else None,
        "messages": [
            {
                "id": m.id,
                "senderId": m.senderId,
                "senderName": getattr(authors.get(m.senderId), "name", ""),
                "isAdmin": getattr(authors.get(m.senderId), "role", "") == "admin",
                "text": m.text,
                "timestamp": m.timestamp.isoformat() if m.timestamp else None,
            }
            for m in messages
        ],
    }


@router.post("/support-tickets/{ticket_id}/messages")
def reply_to_ticket(
    ticket_id: str,
    payload: TicketReply,
    request: Request,
    db: Session = Depends(deps.get_db),
    admin: models.User = Depends(get_admin_user),
) -> Any:
    """Answer a support ticket and notify the person who opened it."""
    ticket = (
        db.query(models.SupportTicket)
        .filter(models.SupportTicket.id == ticket_id)
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Murojaat topilmadi")

    if payload.status is not None and payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Noma'lum holat")

    message = models.TicketMessage(
        ticketId=ticket.id, senderId=admin.id, text=payload.text
    )
    db.add(message)

    # An unanswered ticket is "new"; once someone replies it is in progress,
    # unless the admin explicitly closed it.
    ticket.status = payload.status or ("open" if ticket.status == "new" else ticket.status)

    db.add(models.Notification(
        userId=ticket.userId,
        title="Murojaatingizga javob",
        message=f"'{ticket.subject}' bo'yicha qo'llab-quvvatlash javob berdi.",
        type="system",
    ))

    record_admin_action(
        db, admin, "support.reply", target_type="ticket", target_id=ticket.id,
        details={"status": ticket.status}, request=request,
    )
    db.commit()
    db.refresh(message)

    return {
        "success": True,
        "status": ticket.status,
        "message": {
            "id": message.id,
            "senderId": message.senderId,
            "senderName": admin.name,
            "isAdmin": True,
            "text": message.text,
            "timestamp": message.timestamp.isoformat() if message.timestamp else None,
        },
    }


@router.patch("/support-tickets/{ticket_id}")
def update_ticket(
    ticket_id: str,
    payload: TicketStatusUpdate,
    request: Request,
    db: Session = Depends(deps.get_db),
    admin: models.User = Depends(get_admin_user),
) -> Any:
    """Change a ticket's status or priority."""
    ticket = (
        db.query(models.SupportTicket)
        .filter(models.SupportTicket.id == ticket_id)
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Murojaat topilmadi")

    if payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Noma'lum holat")

    previous = ticket.status
    ticket.status = payload.status
    if payload.priority:
        ticket.priority = payload.priority

    record_admin_action(
        db, admin, "support.status", target_type="ticket", target_id=ticket.id,
        details={"from": previous, "to": ticket.status}, request=request,
    )
    db.commit()
    return {"success": True, "status": ticket.status, "priority": ticket.priority}
