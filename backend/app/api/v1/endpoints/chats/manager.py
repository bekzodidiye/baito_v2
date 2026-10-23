import asyncio
import json
import logging
import uuid
from typing import Optional

from fastapi import WebSocket
from starlette.concurrency import run_in_threadpool

from app.redis_client import redis_client, redis_is_mock

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Fan-out for chat sockets.

    Messages are published to Redis so that sockets served by a *different*
    uvicorn worker also receive them; each process subscribes once and
    re-broadcasts to its own local connections.
    """

    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}
        self._pubsub_task: Optional[asyncio.Task] = None
        self._instance_id = str(uuid.uuid4())

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
