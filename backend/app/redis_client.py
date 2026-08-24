"""Redis handle.

In development an in-process stand-in keeps the app runnable without a Redis
server. In production that fallback is refused: it is per-process, so with more
than one uvicorn worker an SMS code written by one worker is invisible to the
other, and — worse — the health endpoint used to report ``redis: connected``
while Redis was actually down.
"""

import logging
import time

import redis

from app.core.config import settings

logger = logging.getLogger(__name__)


class MockRedis:
    """Single-process, non-durable stand-in. Development only."""

    is_mock = True

    def __init__(self):
        self.store = {}

    def _expired(self, item) -> bool:
        return item["expires_at"] is not None and time.time() > item["expires_at"]

    def set(self, name, value, ex=None):
        self.store[name] = {"value": value, "expires_at": time.time() + ex if ex else None}
        return True

    def setex(self, name, time_seconds, value):
        return self.set(name, value, ex=time_seconds)

    def get(self, name):
        item = self.store.get(name)
        if not item:
            return None
        if self._expired(item):
            del self.store[name]
            return None
        return item["value"]

    def delete(self, *names):
        for name in names:
            self.store.pop(name, None)
        return True

    def exists(self, name) -> int:
        return 1 if self.get(name) is not None else 0

    def incr(self, name) -> int:
        current = int(self.get(name) or 0) + 1
        item = self.store.get(name)
        self.store[name] = {
            "value": str(current),
            "expires_at": item["expires_at"] if item else None,
        }
        return current

    def expire(self, name, seconds) -> bool:
        item = self.store.get(name)
        if not item:
            return False
        item["expires_at"] = time.time() + seconds
        return True

    def ttl(self, name) -> int:
        item = self.store.get(name)
        if not item or item["expires_at"] is None:
            return -1
        return max(0, int(item["expires_at"] - time.time()))

    def publish(self, channel, message):
        return 0

    def pubsub(self, **kwargs):
        raise RuntimeError("MockRedis does not support pub/sub")

    def ping(self):
        return True


def _build_client():
    try:
        client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        client.ping()
        return client
    except Exception as e:
        if settings.is_production:
            # Fail loudly: silently degrading to per-process memory in
            # production breaks verification codes and hides an outage.
            raise RuntimeError(
                f"Redis is required in production but is unreachable at "
                f"{settings.REDIS_URL}: {e}"
            ) from e
        logger.warning("Redis connection failed (%s). Using MockRedis for local development.", e)
        return MockRedis()


redis_client = _build_client()


def redis_is_mock() -> bool:
    return getattr(redis_client, "is_mock", False)
