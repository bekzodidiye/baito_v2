"""Rate limiter.

Two problems with the previous one-liner:

* ``get_remote_address`` reads ``request.client.host``. Behind the nginx
  container that is always the proxy's address, so every user in the world
  shared a single bucket — one person hitting the login limit locked out
  everybody. We now trust ``X-Forwarded-For`` from the reverse proxy.
* The default in-memory storage is per-process, so with ``--workers 2`` each
  worker enforced its own half of every limit. Limits now live in Redis when
  Redis is available.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

from app.core.config import settings
from app.redis_client import redis_is_mock


def client_identifier(request: Request) -> str:
    """Best-effort client IP.

    uvicorn is started with ``--proxy-headers``, so ``request.client.host`` is
    already securely rewritten in the normal deployment by stripping trusted
    private network proxies from the right side of X-Forwarded-For.
    """
    return get_remote_address(request)


_storage_uri = None if redis_is_mock() else settings.REDIS_URL

limiter = Limiter(
    key_func=client_identifier,
    storage_uri=_storage_uri,
)
