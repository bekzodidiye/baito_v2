from .main import _get_participant_chat
import asyncio
import json
import logging
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, WebSocket
from sqlalchemy import func
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app import models, schemas
from app.api import deps
from app.redis_client import redis_client, redis_is_mock

logger = logging.getLogger(__name__)
router = APIRouter()

# Per-socket flood control: at most this many messages in the window.
MSG_RATE_LIMIT = 20
MSG_RATE_WINDOW_SECONDS = 10




class ConnectionManager:
    """Fan-out for chat sockets.

    Messages are published to Redis so that sockets served by a *different*
    uvicorn worker also receive them; each process subscribes once and
    re-broadcasts to its own local connections. Previously the publish existed
    but nothing ever subscribed, so cross-worker delivery silently did nothing.
    """

    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}
        self._pubsub_task: Optional[asyncio.Task] = None

    async def connect(self, websocket: WebSocket, chat_id: str):
        await websocket.accept()
        self.active_connections.setdefault(chat_id, []).append(websocket)
        self._ensure_pubsub()

    def disconnect(self, websocket: WebSocket, chat_id: str):
        conns = self.active_connections.get(chat_id)
        if not conns:
            return
        if websocket in conns:
            conns.remove(websocket)
        if not conns:
            self.active_connections.pop(chat_id, None)

    def _ensure_pubsub(self):
        if redis_is_mock():
            return  # single process anyway
        if self._pubsub_task and not self._pubsub_task.done():
            return
        self._pubsub_task = asyncio.create_task(self._consume_pubsub())

    async def _consume_pubsub(self):
        try:
            pubsub = await run_in_threadpool(redis_client.pubsub)
            await run_in_threadpool(pubsub.psubscribe, "chat:*")
            while True:
                message = await run_in_threadpool(
                    pubsub.get_message, ignore_subscribe_messages=True, timeout=1.0
                )
                if not message:
                    await asyncio.sleep(0.05)
                    continue
                try:
                    channel = message["channel"]
                    chat_id = channel.split(":", 1)[1]
                    payload = json.loads(message["data"])
                except Exception:
                    continue
                await self._send_local(payload, chat_id)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.warning("Chat pub/sub consumer stopped: %s", e)

    async def _send_local(self, message: dict, chat_id: str):
        dead = []
        for connection in list(self.active_connections.get(chat_id, [])):
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)
        for connection in dead:
            self.disconnect(connection, chat_id)

    async def broadcast_to_chat(self, message: dict, chat_id: str):
        await self._send_local(message, chat_id)
        if redis_is_mock():
            return
        try:
            # Other workers pick this up in _consume_pubsub and deliver it to
            # their own sockets. They skip their local copy via "origin".
            await run_in_threadpool(
                redis_client.publish, f"chat:{chat_id}", json.dumps(message)
            )
        except Exception as e:
            logger.debug("Chat publish failed: %s", e)


manager = ConnectionManager()






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

    updated = (
        db.query(models.Message)
        .filter(
            models.Message.chatId == chat_id,
            models.Message.senderId != current_user.id,
            models.Message.readAt.is_(None),
        )
        .update({models.Message.readAt: func.now()}, synchronize_session=False)
    )
    db.commit()
    return {"success": True, "marked": updated}


@router.post("/{chat_id}/messages", response_model=schemas.Message)
def post_chat_message(
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
        senderId=current_user.id,
        text=payload.text,
        hasMap=bool(payload.hasMap),
        mapLocation=payload.mapLocation,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    if not redis_is_mock():
        try:
            redis_client.publish(f"chat:{chat_id}", json.dumps({
                "id": msg.id,
                "chatId": msg.chatId,
                "senderId": msg.senderId,
                "text": msg.text,
                "createdAt": msg.createdAt.isoformat() if msg.createdAt else None,
                "hasMap": msg.hasMap,
                "mapLocation": msg.mapLocation,
            }))
        except Exception as e:
            logger.debug("Chat publish failed: %s", e)

    return msg


@router.delete("/{chat_id}/messages/{message_id}")
def delete_chat_message(
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
        raise HTTPException(status_code=404, detail="Message not found")

    if msg.senderId != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this message")

    db.delete(msg)
    db.commit()

    if not redis_is_mock():
        try:
            redis_client.publish(
                f"chat:{chat_id}",
                json.dumps({
                    "type": "delete",
                    "messageId": message_id,
                    "chatId": chat_id,
                }),
            )
        except Exception as e:
            logger.debug("Chat delete publish failed: %s", e)

    return {"success": True, "messageId": message_id}
