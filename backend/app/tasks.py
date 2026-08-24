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


@celery_app.task(name="app.tasks.send_sms_task", max_retries=3)
def send_sms_task(phone: str, code: str) -> bool:
    """Send the verification SMS.

    Every network call is bounded by a timeout — without one a hung gateway
    pinned a Celery worker indefinitely. The code itself is never logged.
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
                    return False
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
                    return False
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

            logger.error("TextUp SMS send failed with HTTP %s", sms_res.status_code)
            return False
    except httpx.TimeoutException:
        logger.error("TextUp request timed out for %s", phone)
        return False
    except Exception as e:
        logger.error("Error in SMS task: %s", e)
        return False


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
