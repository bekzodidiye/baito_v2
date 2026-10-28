from .main import _get_participant_chat
import asyncio
import json
import logging
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, WebSocket
from sqlalchemy import func
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool
from starlette.requests import Request

from app import models, schemas
from app.api import deps
from app.core.limiter import limiter
from app.redis_client import redis_client, redis_is_mock

logger = logging.getLogger(__name__)
router = APIRouter()

# Per-socket flood control: at most this many messages in the window.
MSG_RATE_LIMIT = 20
MSG_RATE_WINDOW_SECONDS = 10

from .manager import manager, ConnectionManager






@router.get("/{chat_id}/messages", response_model=List[schemas.Message])
def get_chat_messages(
    chat_id: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
    skip: int = 0,
    limit: int = 200,
) -> Any:
    _get_participant_chat(db, chat_id, current_user)
    return (
        db.query(models.Message)
        .filter(models.Message.chatId == chat_id)
        .order_by(models.Message.createdAt.asc())
        .offset(max(0, skip))
        .limit(min(max(1, limit), 500))
        .all()
    )


@router.post("/{chat_id}/read")
def mark_chat_read(
    chat_id: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Mark everything the other participant sent in this chat as read.

    Kept off the GET that fetches messages: a read should not be a side effect
    of looking, and the client needs to be able to fetch a conversation — for
    a search, say — without silently clearing its badge.
    """
    _get_participant_chat(db, chat_id, current_user)

    user_ids = [str(uid) for uid in [current_user.id, getattr(current_user, "uid", None)] if uid]
    updated = (
        db.query(models.Message)
        .filter(
            models.Message.chatId == chat_id,
            models.Message.senderId.notin_(user_ids),
            models.Message.readAt.is_(None),
        )
        .update({models.Message.readAt: func.now()}, synchronize_session=False)
    )
    db.commit()
    return {"success": True, "marked": updated}


@router.post("/{chat_id}/messages", response_model=schemas.Message)
@limiter.limit("60/minute")
async def post_chat_message(
    request: Request,
    chat_id: str,
    payload: schemas.MessageSend,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Send a message over plain HTTP.

    The WebSocket was the only way to send anything, so a blocked upgrade (as
    happens behind a proxy without ``Upgrade`` headers) left chat completely
    unusable. This is the fallback path.
    """
    _get_participant_chat(db, chat_id, current_user)

    msg = models.Message(
        chatId=chat_id,
        senderId=str(current_user.id),
        text=payload.text,
        hasMap=bool(payload.hasMap),
        mapLocation=payload.mapLocation,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    msg_dict = {
        "id": msg.id,
        "chatId": msg.chatId,
        "senderId": msg.senderId,
        "text": msg.text,
        "createdAt": msg.createdAt.isoformat() if msg.createdAt else None,
        "hasMap": msg.hasMap,
        "mapLocation": msg.mapLocation,
    }
    await manager.broadcast_to_chat(msg_dict, chat_id)

    return msg


@router.delete("/{chat_id}/messages/{message_id}")
async def delete_chat_message(
    chat_id: str,
    message_id: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Delete a chat message."""
    from fastapi import HTTPException

    _get_participant_chat(db, chat_id, current_user)

    msg = (
        db.query(models.Message)
        .filter(models.Message.id == message_id, models.Message.chatId == chat_id)
        .first()
    )
    if not msg:
        raise HTTPException(status_code=404, detail="Xabar topilmadi")

    if str(msg.senderId) != str(current_user.id) and getattr(current_user, "role", None) != "admin":
        raise HTTPException(status_code=403, detail="Bu xabarni o'chirish huquqingiz yo'q")

    db.delete(msg)
    db.commit()

    await manager.broadcast_to_chat(
        {
            "type": "delete",
            "messageId": message_id,
            "chatId": chat_id,
        },
        chat_id,
    )

    return {"success": True, "messageId": message_id}
