import asyncio
import json
import logging
import time
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app import crud, models, schemas
from app.api import deps
from app.core.config import settings
from app.db.session import SessionLocal
from app.redis_client import redis_client, redis_is_mock
from app.schemas.chat import MAX_MESSAGE_LENGTH

logger = logging.getLogger(__name__)
router = APIRouter()

# Per-socket flood control: at most this many messages in the window.
MSG_RATE_LIMIT = 20
MSG_RATE_WINDOW_SECONDS = 10


def _get_participant_chat(db: Session, chat_id: str, user: models.User) -> models.Chat:
    chat = db.query(models.Chat).filter(models.Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Suhbat topilmadi")
    if user.id not in (chat.workerId, chat.employerId):
        raise HTTPException(status_code=403, detail="Bu suhbatga kirish huquqingiz yo'q")
    return chat


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


@router.get("", response_model=List[schemas.Chat])
def get_chats(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    chats = (
        db.query(models.Chat)
        .filter(
            or_(
                models.Chat.workerId == current_user.id,
                models.Chat.employerId == current_user.id,
            )
        )
        .all()
    )
    if not chats:
        return []

    chat_ids = [c.id for c in chats]
    other_user_ids = [
        c.employerId if current_user.id == c.workerId else c.workerId for c in chats
    ]

    other_users = (
        db.query(models.User).filter(models.User.id.in_(set(other_user_ids))).all()
    )
    user_map = {u.id: u for u in other_users}

    # Fetch only the newest message per chat. The previous implementation
    # loaded EVERY message of EVERY chat into memory just to pick the last one.
    newest = (
        db.query(
            models.Message.chatId.label("chat_id"),
            func.max(models.Message.createdAt).label("max_created"),
        )
        .filter(models.Message.chatId.in_(chat_ids))
        .group_by(models.Message.chatId)
        .subquery()
    )
    last_message_rows = (
        db.query(models.Message)
        .join(
            newest,
            (models.Message.chatId == newest.c.chat_id)
            & (models.Message.createdAt == newest.c.max_created),
        )
        .all()
    )
    last_messages = {m.chatId: m for m in last_message_rows}

    unread_rows = (
        db.query(models.Message.chatId, func.count(models.Message.id))
        .filter(
            models.Message.chatId.in_(chat_ids),
            models.Message.senderId != current_user.id,
        )
        .group_by(models.Message.chatId)
        .all()
    )
    unread_map = {row[0]: row[1] for row in unread_rows}

    enriched = []
    for c in chats:
        other_user_id = c.employerId if current_user.id == c.workerId else c.workerId
        other_user = user_map.get(other_user_id)
        last_message = last_messages.get(c.id)

        enriched.append({
            "id": c.id,
            "jobId": c.jobId,
            "workerId": c.workerId,
            "employerId": c.employerId,
            "createdAt": c.createdAt,
            "otherUserName": other_user.name if other_user and other_user.name else "Foydalanuvchi",
            "otherUserAvatar": other_user.avatarUrl if other_user else None,
            "lastMessage": last_message.text if last_message else "",
            "lastMessageTime": last_message.createdAt if last_message else c.createdAt,
            "unreadCount": unread_map.get(c.id, 0),
        })

    enriched.sort(key=lambda c: c["lastMessageTime"] or c["createdAt"], reverse=True)
    return enriched


@router.post("", response_model=schemas.Chat)
def create_chat(
    chat_in: schemas.ChatCreate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Open (or re-open) a conversation between a worker and an employer.

    Whichever side the caller is on is taken from the session, so the client
    only has to name the other participant.
    """
    worker_id = chat_in.workerId
    employer_id = chat_in.employerId

    if current_user.role == "employer":
        employer_id = employer_id or current_user.id
    else:
        worker_id = worker_id or current_user.id

    # Fall back to deriving the counterpart from the job when only one side
    # was supplied.
    job = None
    if chat_in.jobId:
        job = db.query(models.Job).filter(models.Job.id == chat_in.jobId).first()
        if not job:
            raise HTTPException(status_code=404, detail="Ish e'loni topilmadi")
        employer_id = employer_id or job.employerId

    if not worker_id or not employer_id:
        raise HTTPException(status_code=400, detail="Suhbat ishtirokchisi aniqlanmadi")

    # The caller must be one side of the chat they are creating, otherwise
    # anyone could open a conversation between two unrelated users.
    if current_user.id not in (worker_id, employer_id):
        raise HTTPException(status_code=403, detail="Faqat o'z suhbatingizni ocha olasiz")

    if worker_id == employer_id:
        raise HTTPException(status_code=400, detail="O'zingiz bilan suhbat ochib bo'lmaydi")

    counterpart_id = employer_id if current_user.id == worker_id else worker_id
    if not db.query(models.User.id).filter(models.User.id == counterpart_id).first():
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")

    existing = (
        db.query(models.Chat)
        .filter(
            models.Chat.jobId == chat_in.jobId,
            models.Chat.workerId == worker_id,
            models.Chat.employerId == employer_id,
        )
        .first()
    )
    if existing:
        return existing

    db_chat = models.Chat(workerId=worker_id, employerId=employer_id, jobId=chat_in.jobId)
    db.add(db_chat)
    db.commit()
    db.refresh(db_chat)
    return db_chat


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


def _authenticate_socket(token: Optional[str]) -> Optional[str]:
    """Resolve a socket's user id using a short-lived DB session.

    A request-scoped ``Depends(get_db)`` stayed open for the entire life of the
    connection, so a few dozen idle chat windows exhausted the pool.
    """
    token_data = deps._decode(token, "access") if token else None
    if not token_data:
        return None
    with SessionLocal() as db:
        user = crud.user.get_by_uid(db, uid=token_data.sub)
        if not user or user.isBanned:
            return None
        if token_data.sid:
            session = (
                db.query(models.ActiveSession)
                .filter(models.ActiveSession.id == token_data.sid)
                .first()
            )
            if not session or not session.is_active:
                return None
        return user.id


@router.websocket("/ws/{chat_id}")
async def websocket_endpoint(websocket: WebSocket, chat_id: str):
    # The socket carries the same httpOnly session cookie as REST calls.
    # Native clients that use bearer tokens can pass one via ?token=.
    token = (
        websocket.cookies.get(settings.ACCESS_COOKIE_NAME)
        or websocket.query_params.get("token")
    )

    user_id = await run_in_threadpool(_authenticate_socket, token)
    if not user_id:
        await websocket.close(code=1008)
        return

    def _load_chat():
        with SessionLocal() as db:
            chat = db.query(models.Chat).filter(models.Chat.id == chat_id).first()
            if not chat:
                return None
            return (chat.workerId, chat.employerId)

    participants = await run_in_threadpool(_load_chat)
    if not participants or user_id not in participants:
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, chat_id)

    sent_times: list[float] = []
    try:
        while True:
            data = await websocket.receive_text()

            # Flood control.
            now = time.monotonic()
            sent_times = [t for t in sent_times if now - t < MSG_RATE_WINDOW_SECONDS]
            if len(sent_times) >= MSG_RATE_LIMIT:
                await websocket.send_json({"error": "rate_limited"})
                continue
            sent_times.append(now)

            # Malformed frames used to escape as an unhandled exception and
            # kill the connection loop.
            try:
                message_data = json.loads(data)
                if not isinstance(message_data, dict):
                    raise ValueError("payload must be an object")
            except (ValueError, TypeError):
                await websocket.send_json({"error": "invalid_payload"})
                continue

            text = (message_data.get("text") or "").strip()
            if not text:
                await websocket.send_json({"error": "empty_message"})
                continue
            if len(text) > MAX_MESSAGE_LENGTH:
                await websocket.send_json({"error": "message_too_long"})
                continue

            has_map = bool(message_data.get("hasMap", False))
            map_location = (message_data.get("mapLocation") or "")[:500]

            def save_message():
                # senderId comes from the session, never from the client payload.
                with SessionLocal() as db:
                    new_msg = models.Message(
                        chatId=chat_id,
                        senderId=user_id,
                        text=text,
                        hasMap=has_map,
                        mapLocation=map_location,
                    )
                    db.add(new_msg)
                    db.commit()
                    db.refresh(new_msg)
                    return {
                        "id": new_msg.id,
                        "chatId": new_msg.chatId,
                        "senderId": new_msg.senderId,
                        "text": new_msg.text,
                        "createdAt": new_msg.createdAt.isoformat() if new_msg.createdAt else None,
                        "hasMap": new_msg.hasMap,
                        "mapLocation": new_msg.mapLocation,
                    }

            msg_dict = await run_in_threadpool(save_message)
            await manager.broadcast_to_chat(msg_dict, chat_id)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.warning("Chat socket error on %s: %s", chat_id, e)
    finally:
        manager.disconnect(websocket, chat_id)
