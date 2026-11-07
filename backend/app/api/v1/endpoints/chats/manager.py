import asyncio
import json
import logging
import time
import uuid
from typing import Optional

from fastapi import WebSocket
from starlette.concurrency import run_in_threadpool

from app import crud, models
from app.db.session import SessionLocal
from app.redis_client import redis_client, redis_is_mock
from app.services.session_window import is_live

logger = logging.getLogger(__name__)


def is_session_revoked(user_uid: Optional[str], session_id: Optional[str]) -> bool:
    """Checks if the user has been banned or the specific active session has been terminated/revoked.

    Fails closed:
    - If user_uid or session_id is missing/None, returns True (no unverified or cross-device logout bypass).
    - If the user is banned or does not exist, returns True.
    - If the session record is inactive, expired, or does not belong to user_uid, returns True.
    - On database errors, returns True.
    """
    if not user_uid or not session_id:
        return True
    try:
        with SessionLocal() as db:
            user = crud.user.get_by_uid(db, uid=user_uid)
            if not user or user.isBanned:
                return True

            session_record = (
                db.query(models.ActiveSession)
                .filter(
                    models.ActiveSession.id == session_id,
                    models.ActiveSession.user_uid == user_uid,
                )
                .first()
            )
            if not session_record or session_record.user_uid != user_uid or not is_live(session_record):
                return True
        return False
    except Exception as e:
        logger.error("Error verifying session revocation in DB (failing closed): %s", e)
        return True


class ConnectionManager:
    """Fan-out for chat sockets.

    Messages are published to Redis so that sockets served by a *different*
    uvicorn worker also receive them; each process subscribes once and
    re-broadcasts to its own local connections.
    """

    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}
        self.connection_meta: dict[WebSocket, dict] = {}
        self._pubsub_task: Optional[asyncio.Task] = None
        self._instance_id = str(uuid.uuid4())

    async def connect(
        self,
        websocket: WebSocket,
        chat_id: str,
        user_uid: Optional[str] = None,
        session_id: Optional[str] = None,
        subprotocol: Optional[str] = None,
    ):
        if subprotocol:
            await websocket.accept(subprotocol=subprotocol)
        else:
            await websocket.accept()
        self.active_connections.setdefault(chat_id, []).append(websocket)
        self.connection_meta[websocket] = {
            "user_uid": user_uid,
            "session_id": session_id,
            "last_checked": time.monotonic(),
            "is_revoked": False,
        }
        self._ensure_pubsub()

    def disconnect(self, websocket: WebSocket, chat_id: str):
        conns = self.active_connections.get(chat_id)
        if conns and websocket in conns:
            conns.remove(websocket)
        if not conns:
            self.active_connections.pop(chat_id, None)
        self.connection_meta.pop(websocket, None)

    def _ensure_pubsub(self):
        if redis_is_mock():
            return  # single process anyway
        if self._pubsub_task and not self._pubsub_task.done():
            return
        self._pubsub_task = asyncio.create_task(self._consume_pubsub())

    async def shutdown(self):
        """Cleanly cancel the background pubsub consumer on server shutdown."""
        if self._pubsub_task and not self._pubsub_task.done():
            self._pubsub_task.cancel()
            try:
                await self._pubsub_task
            except asyncio.CancelledError:
                pass
            self._pubsub_task = None

    async def _consume_pubsub(self):
        pubsub = None
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
                    if payload.pop("_origin", None) == self._instance_id:
                        continue  # Skip echo from this worker
                except Exception:
                    continue
                await self._send_local(payload, chat_id)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.warning("Chat pub/sub consumer stopped: %s", e)
        finally:
            if pubsub:
                try:
                    await run_in_threadpool(pubsub.close)
                except Exception:
                    pass

    async def _send_local(self, message: dict, chat_id: str):
        dead = []
        for connection in list(self.active_connections.get(chat_id, [])):
            meta = self.connection_meta.get(connection)
            if not meta:
                # Requirement 3: Fail-closed: untracked or unauthenticated connection must NEVER receive private chat messages
                dead.append(connection)
                try:
                    await connection.close(code=1008)
                except Exception:
                    pass
                continue

            # Outbound protection: do not deliver messages to revoked/banned users
            if meta.get("is_revoked"):
                dead.append(connection)
                continue

            user_uid = meta.get("user_uid")
            session_id = meta.get("session_id")
            if not user_uid or not session_id:
                dead.append(connection)
                try:
                    await connection.close(code=1008)
                except Exception:
                    pass
                continue

            # Check revocation on outbound delivery — ZERO cache lag window
            revoked = await run_in_threadpool(is_session_revoked, user_uid, session_id)
            if revoked:
                meta["is_revoked"] = True
                dead.append(connection)
                try:
                    await connection.send_json({"error": "session_revoked"})
                    await connection.close(code=1008)
                except Exception:
                    pass
                continue

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
            # their own sockets. They skip their local copy via "_origin".
            payload = dict(message)
            payload["_origin"] = self._instance_id
            await run_in_threadpool(
                redis_client.publish, f"chat:{chat_id}", json.dumps(payload)
            )
        except Exception as e:
            logger.debug("Chat publish failed: %s", e)


# Process-wide shared singleton
manager = ConnectionManager()
