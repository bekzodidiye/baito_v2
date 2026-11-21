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
from .manager import manager, is_session_revoked

logger = logging.getLogger(__name__)
router = APIRouter()

_is_session_revoked = is_session_revoked

# Per-socket flood control limits:
TOTAL_FRAME_LIMIT = 40        # Maximum total frames per window
CONTROL_FRAME_LIMIT = 20      # Maximum ping / typing / read frames per window
MSG_RATE_LIMIT = 20           # Maximum text messages per window
RATE_WINDOW_SECONDS = 10      # Sliding window duration in seconds
MAX_RATE_VIOLATIONS = 5       # Max sustained rate limit violations before closing socket












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
        if not user_uid or not session_id:
            logger.warning("Ticket authentication error: session_id is required")
            return None

        with SessionLocal() as db:
            user = crud.user.get_by_uid(db, uid=user_uid)
            if not user or user.isBanned:
                return None

            session_record = (
                db.query(models.ActiveSession)
                .filter(
                    models.ActiveSession.id == session_id,
                    models.ActiveSession.user_uid == user_uid,
                )
                .first()
            )
            if not session_record or session_record.user_uid != user_uid or not is_live(session_record):
                return None

            return {
                "id": user.id,
                "uid": getattr(user, "uid", None),
                "role": user.role,
                "session_id": session_id,
            }
    except Exception as e:
        logger.warning("Ticket authentication error: %s", type(e).__name__)
        return None


def _authenticate_socket(token: Optional[str]) -> Optional[dict]:
    """Resolve a socket's user id using a short-lived DB session.

    A request-scoped ``Depends(get_db)`` stayed open for the entire life of the
    connection, so a few dozen idle chat windows exhausted the pool.
    """
    token_data = deps._decode(token, "access") if token else None
    if not token_data or not token_data.sid:
        logger.warning("Socket authentication rejected: session-bound token (sid) is required")
        return None
    with SessionLocal() as db:
        user = crud.user.get_by_uid(db, uid=token_data.sub)
        if not user or user.isBanned:
            return None
        session = (
            db.query(models.ActiveSession)
            .filter(
                models.ActiveSession.id == token_data.sid,
                models.ActiveSession.user_uid == user.uid,
            )
            .first()
        )
        if not session or session.user_uid != user.uid or not is_live(session):
            return None
        return {
            "id": user.id,
            "uid": getattr(user, "uid", None),
            "role": user.role,
            "session_id": token_data.sid,
        }


@router.websocket("/ws/{chat_id}")
async def websocket_endpoint(websocket: WebSocket, chat_id: str):
    # Origin validation against configured CORS origins to prevent Cross-Site WebSocket Hijacking (CSWSH)
    origin = websocket.headers.get("origin")
    if origin and settings.cors_origins:
        allowed = {o.rstrip("/") for o in settings.cors_origins if o}
        if origin.rstrip("/") not in allowed:
            logger.warning("WebSocket rejected untrusted origin: %s", origin)
            await websocket.close(code=1008)
            return

    # Strictly reject ANY query string in WebSocket handshake (CWE-598).
    # Credentials (tokens, tickets, secrets) must NEVER appear in URLs to prevent leakage
    # into reverse proxy access/error logs, upstream headers, ASGI logs, or browser history.
    if websocket.query_params or websocket.scope.get("query_string"):
        logger.warning(
            "Rejected WebSocket connection attempt with forbidden query parameters; "
            "WebSocket endpoint strictly forbids query strings. Clients must use "
            "Sec-WebSocket-Protocol (mobile) or HttpOnly session cookies (web)."
        )
        await websocket.close(code=1008)
        return

    # Extract ticket from Sec-WebSocket-Protocol (RFC 6455 subprotocol negotiation)
    subprotocol_ticket: Optional[str] = None
    subprotocols = websocket.scope.get("subprotocols") or []
    if "baito-ticket" in subprotocols:
        idx = subprotocols.index("baito-ticket")
        if idx + 1 < len(subprotocols):
            subprotocol_ticket = subprotocols[idx + 1].strip()
    if not subprotocol_ticket:
        raw_proto = websocket.headers.get("sec-websocket-protocol", "")
        if "baito-ticket" in raw_proto:
            parts = [p.strip() for p in raw_proto.split(",") if p.strip()]
            if "baito-ticket" in parts:
                idx = parts.index("baito-ticket")
                if idx + 1 < len(parts):
                    subprotocol_ticket = parts[idx + 1]

    # Support Sec-WebSocket-Protocol ticket (mobile) or HttpOnly session cookie (web)
    ticket = subprotocol_ticket
    token = websocket.cookies.get(settings.ACCESS_COOKIE_NAME)
    selected_subprotocol = "baito-ticket" if subprotocol_ticket else None

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

    await manager.connect(
        websocket,
        chat_id,
        user_uid=user_info.get("uid"),
        session_id=user_info.get("session_id"),
        subprotocol=selected_subprotocol,
    )

    frame_times: list[float] = []
    control_times: list[float] = []
    msg_times: list[float] = []
    rate_violations: int = 0

    try:
        while True:
            data = await websocket.receive_text()

            # Global per-socket frame rate limit
            now = time.monotonic()
            frame_times = [t for t in frame_times if now - t < RATE_WINDOW_SECONDS]
            if len(frame_times) >= TOTAL_FRAME_LIMIT:
                rate_violations += 1
                if rate_violations >= MAX_RATE_VIOLATIONS:
                    logger.warning("Closing WebSocket for chat %s: sustained frame flood (%d violations)", chat_id, rate_violations)
                    await websocket.send_json({"error": "flood_detected"})
                    await websocket.close(code=1008)
                    break
                await websocket.send_json({"error": "rate_limited"})
                continue
            frame_times.append(now)

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

            # Rate limiting on control frames (ping, typing, read) BEFORE session DB check
            # Guarantees that control frame floods are dropped in-memory with 0 DB overhead
            if msg_type in ("ping", "typing", "read"):
                control_times = [t for t in control_times if now - t < RATE_WINDOW_SECONDS]
                if len(control_times) >= CONTROL_FRAME_LIMIT:
                    rate_violations += 1
                    if rate_violations >= MAX_RATE_VIOLATIONS:
                        logger.warning("Closing WebSocket for chat %s: sustained control flood (%d violations)", chat_id, rate_violations)
                        await websocket.send_json({"error": "flood_detected"})
                        await websocket.close(code=1008)
                        break
                    await websocket.send_json({"error": "rate_limited"})
                    continue
                control_times.append(now)

            # Re-verify active authorization and session state for the open connection
            is_revoked = await run_in_threadpool(
                _is_session_revoked,
                user_info.get("uid"),
                user_info.get("session_id"),
            )
            if is_revoked:
                logger.info("Closing active WebSocket for chat %s: session revoked or unverified", chat_id)
                await websocket.send_json({"error": "session_revoked"})
                await websocket.close(code=1008)
                break

            if msg_type == "ping":
                rate_violations = max(0, rate_violations - 1)
                await websocket.send_json({"type": "pong"})
                continue
            if msg_type == "typing":
                rate_violations = max(0, rate_violations - 1)
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
                rate_violations = max(0, rate_violations - 1)
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
            msg_times = [t for t in msg_times if now - t < RATE_WINDOW_SECONDS]
            if len(msg_times) >= MSG_RATE_LIMIT:
                rate_violations += 1
                if rate_violations >= MAX_RATE_VIOLATIONS:
                    logger.warning("Closing WebSocket for chat %s: sustained message flood (%d violations)", chat_id, rate_violations)
                    await websocket.send_json({"error": "flood_detected"})
                    await websocket.close(code=1008)
                    break
                await websocket.send_json({"error": "rate_limited"})
                continue
            msg_times.append(now)

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
            rate_violations = max(0, rate_violations - 1)
            await manager.broadcast_to_chat(msg_dict, chat_id)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.warning("Chat socket error on %s: %s", chat_id, e)
    finally:
        manager.disconnect(websocket, chat_id)
