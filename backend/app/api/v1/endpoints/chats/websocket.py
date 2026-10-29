import asyncio
import json
import logging
import time
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.concurrency import run_in_threadpool

from app import crud, models
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

from .manager import manager, ConnectionManager












def _authenticate_socket(token: Optional[str]) -> Optional[dict]:
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
        return {"id": user.id, "uid": getattr(user, "uid", None), "role": user.role}


@router.websocket("/ws/{chat_id}")
async def websocket_endpoint(websocket: WebSocket, chat_id: str):
    # The socket carries the same httpOnly session cookie as REST calls.
    # Native clients that use bearer tokens can pass one via ?token=.
    token = (
        websocket.cookies.get(settings.ACCESS_COOKIE_NAME)
        or websocket.query_params.get("token")
    )

    user_info = await run_in_threadpool(_authenticate_socket, token)
    if not user_info:
        await websocket.close(code=1008)
        return

    user_id = user_info["id"]
    user_ids = {str(uid) for uid in [user_info["id"], user_info.get("uid")] if uid}
    user_role = user_info.get("role")

    def _load_chat():
        with SessionLocal() as db:
            chat = db.query(models.Chat).filter(models.Chat.id == chat_id).first()
            if not chat:
                return None
            return {str(chat.workerId), str(chat.employerId)}

    participants = await run_in_threadpool(_load_chat)
    if not participants or (user_role != "admin" and not (user_ids & participants)):
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
