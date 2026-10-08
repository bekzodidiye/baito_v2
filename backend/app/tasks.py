import logging
from datetime import datetime, timedelta, timezone

import httpx

from app.celery_app import celery_app
from app.core.config import settings

logger = logging.getLogger(__name__)

# TextUp's login endpoint is slow and rate limited, so the access token is
# cached in Redis instead of being re-fetched for every single SMS.
TEXTUP_TOKEN_KEY = "textup:token"
TEXTUP_TOKEN_TTL = 50 * 60
HTTP_TIMEOUT = httpx.Timeout(10.0, connect=5.0)


def _delivery_failed(phone: str, reason: str) -> bool:
    """Record a verification SMS that was never delivered.

    /auth/send-sms has already told the user "SMS yuborildi" by the time this
    runs, so a failure that only reaches the container log is a signup the user
    abandons and nobody hears about. Always returns False, so callers can
    ``return _delivery_failed(...)``.
    """
    logger.error("Verification SMS to %s was not delivered: %s", phone, reason)
    try:
        from app.core.error_reporter import report_message

        report_message(
            "SMS yuborilmadi",
            f"{phone} raqamiga tasdiqlash SMS'i yetkazilmadi.\nSabab: {reason}",
        )
    except Exception:
        # Reporting must never be the reason the task fails.
        pass
    return False


def _fetch_textup_token(client: httpx.Client) -> tuple[str, str] | None:
    login_res = client.post(
        "https://api-auth.textup.uz/v1/login",
        json={"email": settings.TEXTUP_EMAIL, "password": settings.TEXTUP_PASSWORD},
    )
    if login_res.status_code != 200:
        logger.error("Failed to authenticate with textup.uz (HTTP %s)", login_res.status_code)
        return None
    data = login_res.json()
    token = data.get("accessToken")
    user_id = data.get("user", {}).get("id")
    if not token or not user_id:
        logger.error("textup.uz login response missing accessToken/user id")
        return None
    return token, user_id


@celery_app.task(
    name="app.tasks.send_sms_task",
    # max_retries alone retried nothing: retries need either self.retry() or
    # autoretry_for. A gateway blip silently cost the user their signup.
    autoretry_for=(httpx.TimeoutException, httpx.NetworkError),
    retry_backoff=True,
    retry_backoff_max=60,
    max_retries=3,
)
def send_sms_task(phone: str, code: str) -> bool:
    """Send the verification SMS.

    Every network call is bounded by a timeout — without one a hung gateway
    pinned a Celery worker indefinitely. The code itself is never logged.

    Transient network errors are raised so Celery retries them. Anything the
    gateway rejects outright is reported: the caller already replied
    "SMS yuborildi" to the user, so a failure here is invisible unless it is
    pushed somewhere a human looks.
    """
    if not settings.TEXTUP_EMAIL or not settings.TEXTUP_PASSWORD:
        logger.info("SMS gateway not configured; nothing sent to %s", phone)
        return True

    from app.redis_client import redis_client

    try:
        with httpx.Client(timeout=HTTP_TIMEOUT) as client:
            cached = None
            try:
                cached = redis_client.get(TEXTUP_TOKEN_KEY)
            except Exception:
                pass

            if cached and "|" in cached:
                access_token, user_id = cached.split("|", 1)
            else:
                credentials = _fetch_textup_token(client)
                if not credentials:
                    return _delivery_failed(phone, "TextUp'ga kirib bo'lmadi")
                access_token, user_id = credentials
                try:
                    redis_client.setex(
                        TEXTUP_TOKEN_KEY, TEXTUP_TOKEN_TTL, f"{access_token}|{user_id}"
                    )
                except Exception:
                    pass

            sms_res = client.post(
                "https://sms-api.textup.uz/v1/send",
                headers={"Authorization": f"Bearer {access_token}"},
                json={
                    "message": f"Baito ilovasiga kirish uchun tasdiqlash kodi: {code}",
                    "userId": user_id,
                    "name": "Baito Verification",
                    "templateId": "f885a2db-85e9-4d51-9c92-fe260fb7af59",
                    "recipients": [phone],
                },
            )

            if sms_res.status_code == 401:
                # Cached token expired early — drop it and try once more.
                try:
                    redis_client.delete(TEXTUP_TOKEN_KEY)
                except Exception:
                    pass
                credentials = _fetch_textup_token(client)
                if not credentials:
                    return _delivery_failed(phone, "TextUp'ga kirib bo'lmadi")
                access_token, user_id = credentials
                sms_res = client.post(
                    "https://sms-api.textup.uz/v1/send",
                    headers={"Authorization": f"Bearer {access_token}"},
                    json={
                        "message": f"Baito ilovasiga kirish uchun tasdiqlash kodi: {code}",
                        "userId": user_id,
                        "name": "Baito Verification",
                        "templateId": "f885a2db-85e9-4d51-9c92-fe260fb7af59",
                        "recipients": [phone],
                    },
                )

            if sms_res.status_code in (200, 201):
                logger.info("Successfully sent SMS to %s", phone)
                return True

            return _delivery_failed(phone, f"TextUp javobi HTTP {sms_res.status_code}")
    except (httpx.TimeoutException, httpx.NetworkError):
        # Let these out: autoretry_for above turns them into a retry. Only the
        # last attempt reaches the worker's error log.
        logger.warning("TextUp unreachable for %s, will retry", phone)
        raise
    except Exception as e:
        return _delivery_failed(phone, f"{type(e).__name__}: {e}")


@celery_app.task(name="app.tasks.expire_stale_jobs")
def expire_stale_jobs() -> int:
    """Close postings nobody acted on.

    The admin panel exposes "auto expire jobs" settings; nothing was ever
    scheduled to act on them.
    """
    from app.db.session import SessionLocal
    from app.models import Job, SystemSetting
    from app.models.job import JobStatus

    with SessionLocal() as db:
        row = db.query(SystemSetting).filter(SystemSetting.id == "singleton").first()
        if row is not None and not row.autoExpireJobs:
            return 0
        days = row.autoExpireDays if row and row.autoExpireDays else 14

        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        stale = (
            db.query(Job)
            .filter(Job.status == JobStatus.OPEN, Job.createdAt < cutoff)
            .all()
        )
        for job in stale:
            job.status = JobStatus.CANCELLED
        db.commit()
        if stale:
            logger.info("Expired %d stale job postings", len(stale))
        return len(stale)


@celery_app.task(name="app.tasks.purge_expired_idempotency_keys")
def purge_expired_idempotency_keys() -> int:
    """Idempotency records are only useful for a short retry window."""
    from app.db.session import SessionLocal
    from app.models import IdempotencyKey

    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    with SessionLocal() as db:
        deleted = (
            db.query(IdempotencyKey)
            .filter(IdempotencyKey.createdAt < cutoff)
            .delete(synchronize_session=False)
        )
        db.commit()
        return deleted or 0


@celery_app.task(name="app.tasks.send_telegram_digest")
def send_telegram_digest() -> bool:
    """A daily summary to the channel named in the admin panel.

    That field, too, was a text box wired to nothing.
    """
    from sqlalchemy import func as sa_func

    from app.db.session import SessionLocal
    from app.models import Job, SystemSetting, User
    from app.models.job import JobStatus

    with SessionLocal() as db:
        row = db.query(SystemSetting).filter(SystemSetting.id == "singleton").first()
        if not row or not row.telegramDigestEnabled or not row.telegramDigestChannel:
            return False
        if not settings.TELEGRAM_BOT_TOKEN:
            logger.warning("Telegram digest is on but no bot token is configured.")
            return False

        since = datetime.now(timezone.utc) - timedelta(days=1)
        new_users = db.query(sa_func.count(User.id)).filter(User.createdAt >= since).scalar() or 0
        new_jobs = db.query(sa_func.count(Job.id)).filter(Job.createdAt >= since).scalar() or 0
        completed = (
            db.query(sa_func.count(Job.id))
            .filter(Job.status == JobStatus.COMPLETED, Job.completedAt >= since)
            .scalar()
            or 0
        )
        owed = (
            db.query(sa_func.coalesce(sa_func.sum(User.balance), 0))
            .filter(User.role == "worker")
            .scalar()
            or 0
        )

    text = (
        "📊 <b>Baito — sutkalik hisobot</b>\n"
        f"👤 Yangi foydalanuvchilar: {new_users}\n"
        f"📋 Yangi e'lonlar: {new_jobs}\n"
        f"✅ Yakunlangan ishlar: {completed}\n"
        f"💰 Ishchilarga qarz: {owed:,} so'm"
    )

    try:
        with httpx.Client(timeout=HTTP_TIMEOUT) as client:
            resp = client.post(
                f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": row.telegramDigestChannel,
                    "text": text,
                    "parse_mode": "HTML",
                },
            )
        if resp.status_code != 200:
            logger.error("Telegram digest rejected with HTTP %s", resp.status_code)
            return False
    except Exception as e:
        logger.error("Telegram digest could not be sent: %s", e)
        return False
    return True



