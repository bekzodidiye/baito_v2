import json
import logging
import time
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import func
from starlette.concurrency import run_in_threadpool

from app import crud, models
from app.api import deps
from app.core.config import settings
from app.db.session import SessionLocal
from app.redis_client import redis_client
from app.schemas.chat import MAX_MESSAGE_LENGTH
from app.services.session_window import is_live
from .manager import manager

logger = logging.getLogger(__name__)
router = APIRouter()

# Per-socket flood control: at most this many messages in the window.
MSG_RATE_LIMIT = 20
MSG_RATE_WINDOW_SECONDS = 10












def _consume_ticket_atomic(ticket_key: str) -> Optional[str]:
    """Atomically retrieves and deletes a connection ticket.
    Fails closed if atomic consumption is not supported or fails.
    Never uses a non-atomic get-then-delete fallback.
    """
    # 1. Native Redis GETDEL (Redis >= 6.2)
    getdel_fn = getattr(redis_client, "getdel", None)
    if callable(getdel_fn):
        try:
            val = getdel_fn(ticket_key)
            if val is not None:
                return val.decode("utf-8") if isinstance(val, bytes) else str(val)
            return None
        except Exception as e:
            logger.debug("Redis getdel failed or unsupported, trying Lua fallback: %s", type(e).__name__)

    # 2. Atomic Lua script (supported across all Redis versions)
    eval_fn = getattr(redis_client, "eval", None)
    if callable(eval_fn):
        try:
            lua_script = """
            local val = redis.call('GET', KEYS[1])
            if val then
                redis.call('DEL', KEYS[1])
            end
            return val
            """
            val = eval_fn(lua_script, 1, ticket_key)
            if val is not None:
                return val.decode("utf-8") if isinstance(val, bytes) else str(val)
            return None
        except Exception as e:
            logger.debug("Redis Lua atomic consumption failed: %s", type(e).__name__)

    # 3. Transactional pipeline (MULTI / EXEC)
    pipeline_fn = getattr(redis_client, "pipeline", None)
    if callable(pipeline_fn):
        try:
            pipe = pipeline_fn(transaction=True)
            pipe.get(ticket_key)
            pipe.delete(ticket_key)
            results = pipe.execute()
            if results and results[0] is not None:
                val = results[0]
                return val.decode("utf-8") if isinstance(val, bytes) else str(val)
            return None
        except Exception as e:
            logger.debug("Redis transactional pipeline consumption failed: %s", type(e).__name__)

    # Fail closed: non-atomic consumption is strictly forbidden for security tickets.
    logger.error("No verified atomic Redis consumption method available; failing closed for ticket consumption.")
    return None


def _authenticate_ticket(ticket: Optional[str], chat_id: str) -> Optional[dict]:
    """Validate and consume a single-use connection ticket for this chat.
    Enforces atomic consumption, chat binding, user status, and session validity.
    Never logs ticket values.
    """
    if not ticket or not isinstance(ticket, str):
        return None
    ticket_clean = ticket.strip()
    if not ticket_clean or len(ticket_clean) > 128:
        return None

    ticket_key = f"chat:ws_ticket:{ticket_clean}"
    try:
        raw_val = _consume_ticket_atomic(ticket_key)
        if not raw_val:
            return None

        data = json.loads(raw_val)
        if not isinstance(data, dict):
            return None

        if data.get("chat_id") != chat_id:
            return None

        user_uid = data.get("user_uid")
        session_id = data.get("session_id")

        with SessionLocal() as db:
            user = crud.user.get_by_uid(db, uid=user_uid)
            if not user or user.isBanned:
                return None

            # Revalidate session revocation if session ID was attached at issuance
            if session_id:
                session_record = (
                    db.query(models.ActiveSession)
                    .filter(models.ActiveSession.id == session_id)
                    .first()
                )
                if not is_live(session_record):
                    return None

            return {"id": user.id, "uid": getattr(user, "uid", None), "role": user.role}
    except Exception as e:
        logger.warning("Ticket authentication error: %s", type(e).__name__)
        return None


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
            if not is_live(session):
                return None
        return {"id": user.id, "uid": getattr(user, "uid", None), "role": user.role}


@router.websocket("/ws/{chat_id}")
async def websocket_endpoint(websocket: WebSocket, chat_id: str):
    # Support short-lived single-use connection ticket (avoids reusable JWT in URL query string)
    ticket = websocket.query_params.get("ticket")
    query_token = websocket.query_params.get("token")
    if query_token:
        logger.warning("Deprecated: WebSocket connected via ?token= query parameter; client should migrate to ?ticket=")

    token = (
        websocket.cookies.get(settings.ACCESS_COOKIE_NAME)
        or query_token
    )

    if ticket:
        user_info = await run_in_threadpool(_authenticate_ticket, ticket, chat_id)
    else:
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

            # Malformed frames used to escape as an unhandled exception and
            # kill the connection loop.
            try:
                message_data = json.loads(data)
                if not isinstance(message_data, dict):
                    raise ValueError("payload must be an object")
            except (ValueError, TypeError):
                await websocket.send_json({"error": "invalid_payload"})
                continue

            msg_type = message_data.get("type")
            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})
                continue
            if msg_type == "typing":
                is_typing_val = message_data.get("isTyping") if "isTyping" in message_data else message_data.get("is_typing", True)
                await manager.broadcast_to_chat({
                    "type": "typing",
                    "senderId": user_id,
                    "userId": user_id,
                    "chatId": chat_id,
                    "isTyping": bool(is_typing_val),
                    "is_typing": bool(is_typing_val),
                }, chat_id)
                continue
            if msg_type == "read":
                def mark_read():
                    with SessionLocal() as db:
                        u_ids = [str(uid) for uid in [user_info["id"], user_info.get("uid")] if uid]
                        updated = (
                            db.query(models.Message)
                            .filter(
                                models.Message.chatId == chat_id,
                                models.Message.senderId.notin_(u_ids),
                                models.Message.readAt.is_(None),
                            )
                            .update({models.Message.readAt: func.now()}, synchronize_session=False)
                        )
                        db.commit()
                        return updated
                marked = await run_in_threadpool(mark_read)
                if marked:
                    await manager.broadcast_to_chat({
                        "type": "read",
                        "chatId": chat_id,
                        "readerId": user_id,
                        "userId": user_id,
                    }, chat_id)
                continue

            # Flood control for chat messages.
            now = time.monotonic()
            sent_times = [t for t in sent_times if now - t < MSG_RATE_WINDOW_SECONDS]
            if len(sent_times) >= MSG_RATE_LIMIT:
                await websocket.send_json({"error": "rate_limited"})
                continue
            sent_times.append(now)

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
