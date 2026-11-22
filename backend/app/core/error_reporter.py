"""Report unhandled exceptions to Telegram.

Production had no error reporting at all: the global handler caught every
exception, returned "Internal server error" and wrote a line to the container's
stdout. That log rotates at 50 MB and is thrown away whenever the container is
recreated — which happens on every deploy — so nobody ever saw it. A payment
that silently failed to settle looked exactly like a healthy request.

Sentry is wired up but has no DSN. This is the zero-infrastructure stand-in: it
reuses the Telegram bot the backup bot already talks to.

Three things it must never do, because it runs on the error path:

* block the response — reporting happens on a small background pool;
* raise — every failure inside the reporter is swallowed;
* flood — identical errors are collapsed to one message per hour.
"""

from __future__ import annotations

import hashlib
import html
import logging
import re
import traceback
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# Small and bounded: reporting must never become the thing that exhausts the box.
_pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix="err-report")

# Telegram caps a message at 4096 characters.
_MAX_MESSAGE = 3800
_DEDUPE_TTL_SECONDS = 3600

# Sensitive patterns for redacting authorization tokens, passwords, cookies, and PII
_SENSITIVE_PATTERNS = [
    # JWT tokens: eyJ...
    (re.compile(r'\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b'), '[REDACTED_JWT]'),
    # Authorization / Proxy-Authorization headers
    (re.compile(r'(?i)(["\']?(?:authorization|proxy-authorization)["\']?\s*[:=]\s*)(["\']?)((?:Bearer\s+)?)[^\r\n"\'<>,;{}]+\2'), r'\1\2\3[REDACTED]\2'),
    # Standalone Bearer tokens
    (re.compile(r'(?i)\b(bearer\s+)[^\s"\'<>,;{}]+'), r'\1[REDACTED]'),
    # Passwords, secrets, tokens, api keys (quoted with possible spaces, or unquoted)
    (re.compile(r'(?i)(["\']?(?:password|passwd|pwd|secret|access_token|refresh_token|api_key|private_key|client_secret)["\']?\s*[:=]\s*)(["\'])(?:(?!\2).)*\2'), r'\1\2[REDACTED]\2'),
    (re.compile(r'(?i)(["\']?(?:password|passwd|pwd|secret|access_token|refresh_token|api_key|private_key|client_secret)["\']?\s*[:=]\s*)([^\s"\'<>,;{}]+)'), r'\1[REDACTED]'),
    # Cookies & Session tokens
    (re.compile(r'(?i)(["\']?cookie["\']?\s*[:=]\s*["\']?)[^"\'\r\n]+(["\']?)'), r'\1[REDACTED]\2'),
    (re.compile(r'(?i)(baito_sid=)[^;\s&]+'), r'\1[REDACTED]'),
    (re.compile(r'(?i)(session_token=)[^;\s&]+'), r'\1[REDACTED]'),
    # Bank card numbers (16 digits with optional spaces or hyphens)
    (re.compile(r'\b(?:\d{4}[ -]?){3}\d{4}\b'), '[REDACTED_CARD]'),
    # Uzbekistan phone numbers (+998...)
    (re.compile(r'(?:\+?998)[ -]?(?:\(?\d{2}\)?)[ -]?\d{3}[ -]?\d{2}[ -]?\d{2}\b'), '[REDACTED_PHONE]'),
    # URL query string sensitive parameters (?token=..., &key=..., &password=...)
    (re.compile(r'(?i)([?&](?:token|key|password|access_token|secret)=)[^&\s]+'), r'\1[REDACTED]'),
]


def sanitize_sensitive_data(text: str) -> str:
    """Redact sensitive authorization tokens, passwords, cookies, cards, and PII."""
    if not text:
        return text
    sanitized = text
    for pattern, replacement in _SENSITIVE_PATTERNS:
        sanitized = pattern.sub(replacement, sanitized)
    return sanitized


def _fingerprint(exc: BaseException, where: str) -> str:
    """Group identical failures.

    Uses the exception type plus the last frame, so the same bug reported from
    the same line collapses into one alert however often it fires.
    """
    tb = exc.__traceback__
    last = ""
    while tb is not None:
        last = f"{tb.tb_frame.f_code.co_filename}:{tb.tb_lineno}"
        tb = tb.tb_next
    raw = f"{type(exc).__name__}|{where}|{last}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def _should_send(fingerprint: str) -> bool:
    """One alert per distinct error per hour. Fails open if Redis is unavailable."""
    try:
        from app.redis_client import redis_client

        key = f"err_report:{fingerprint}"
        if redis_client.get(key) is not None:
            return False
        redis_client.setex(key, _DEDUPE_TTL_SECONDS, "1")
        return True
    except Exception:
        return True


def _post(text: str) -> None:
    try:
        with httpx.Client(timeout=8.0) as client:
            client.post(
                f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": settings.TELEGRAM_CHAT_ID,
                    "text": text,
                    "parse_mode": "HTML",
                    "disable_web_page_preview": True,
                },
            )
    except Exception as e:
        # Never let the reporter become a second failure.
        logger.warning("Could not deliver the error report: %s", e)


def report_exception(
    exc: BaseException,
    *,
    where: str,
    method: Optional[str] = None,
    path: Optional[str] = None,
    user_id: Optional[str] = None,
) -> None:
    """Queue an exception for delivery. Returns immediately."""
    if not settings.error_reporting_enabled:
        return

    try:
        fingerprint = _fingerprint(exc, where)
        if not _should_send(fingerprint):
            return

        tb = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
        tb = sanitize_sensitive_data(tb)
        # The tail is the useful end — the frames nearest the failure.
        if len(tb) > _MAX_MESSAGE:
            tb = "…\n" + tb[-_MAX_MESSAGE:]

        location = f"{method} {path}" if method and path else where
        location = sanitize_sensitive_data(location)
        exc_str = sanitize_sensitive_data(str(exc)[:200])
        header = (
            f"🔴 <b>Baito xatosi</b>\n"
            f"<b>{html.escape(type(exc).__name__)}</b>: {html.escape(exc_str)}\n"
            f"<code>{html.escape(location)}</code>\n"
        )
        if user_id:
            safe_user_id = sanitize_sensitive_data(user_id)
            header += f"foydalanuvchi: <code>{html.escape(safe_user_id)}</code>\n"
        header += f"id: <code>{fingerprint}</code>\n"

        message = header + f"\n<pre>{html.escape(tb)}</pre>"
        _pool.submit(_post, message)
    except Exception as e:
        logger.warning("Error reporter itself failed: %s", e)


def report_message(title: str, body: str) -> None:
    """Report something that is worth an alert but is not an exception.

    Used for conditions the code handles but a human still needs to know about —
    an escrow release that could not be completed, for instance.
    """
    if not settings.error_reporting_enabled:
        return
    try:
        if not _should_send(hashlib.sha256(title.encode()).hexdigest()[:16]):
            return
        safe_title = sanitize_sensitive_data(title)
        safe_body = sanitize_sensitive_data(body[:_MAX_MESSAGE])
        text = f"⚠️ <b>{html.escape(safe_title)}</b>\n\n{html.escape(safe_body)}"
        _pool.submit(_post, text)
    except Exception as e:
        logger.warning("Error reporter itself failed: %s", e)
