import json
import logging
import secrets
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app import crud
from app.api import deps
from app.core import security
from app.core.config import settings
from app.core.limiter import limiter
from app.core.phone import (
    SMS_CODE_KEY,
    is_valid_uz_phone,
    issue_verification_grant,
    normalize_phone,
)
from app.models.session import ActiveSession
from app.services.session_window import expire_idle, is_live
from app.redis_client import redis_client
from app.tasks import send_sms_task

logger = logging.getLogger(__name__)
router = APIRouter()


class SendSMSRequest(BaseModel):
    phone: str = Field(min_length=7, max_length=20)


class VerifySMSRequest(BaseModel):
    phone: str = Field(min_length=7, max_length=20)
    code: str = Field(min_length=4, max_length=8)


def _require_valid_phone(raw: str) -> str:
    phone = normalize_phone(raw)
    if not is_valid_uz_phone(phone):
        raise HTTPException(status_code=400, detail="Telefon raqam formati noto'g'ri")
    return phone


@router.post("/send-sms")
@limiter.limit("3/minute")
@limiter.limit("10/hour")
async def send_verification_sms(
    request: Request,
    payload: SendSMSRequest,
    background_tasks: BackgroundTasks,
) -> Any:
    """Send a verification SMS via TextUp, through Celery when it is available."""
    phone = _require_valid_phone(payload.phone)

    code = f"{secrets.SystemRandom().randint(100000, 999999)}"

    redis_client.setex(
        SMS_CODE_KEY.format(phone=phone),
        settings.SMS_CODE_TTL_SECONDS,
        json.dumps({"code": code, "attempts": 0}),
    )

    # The code is a credential: it is never logged and never printed.
    credentials_present = bool(settings.TEXTUP_EMAIL and settings.TEXTUP_PASSWORD)
    if credentials_present:
        try:
            send_sms_task.delay(phone, code)
        except Exception as e:
            logger.warning("Celery unavailable, sending SMS inline: %s", e)
            background_tasks.add_task(send_sms_task, phone, code)
        return {"success": True, "message": "SMS yuborildi"}

    # Development without an SMS gateway. The code is still stored, so the
    # rest of the signup flow behaves exactly as it does in production.
    logger.info("SMS gateway not configured; verification code was not sent.")
    body: dict[str, Any] = {"success": True, "message": "SMS yuborildi (dev rejimi)"}
    if not settings.is_production and settings.SMS_DEV_ECHO_CODE:
        body["dev_code"] = code
    return body


@router.post("/verify-sms")
@limiter.limit("10/minute")
async def verify_sms(request: Request, payload: VerifySMSRequest) -> Any:
    """Check the SMS code and hand back a short-lived proof of ownership.

    That proof is what ``POST /users`` requires; without it, registration can
    no longer claim an unverified phone number.
    """
    phone = _require_valid_phone(payload.phone)
    key = SMS_CODE_KEY.format(phone=phone)

    stored_entry_str = redis_client.get(key)
    if not stored_entry_str:
        raise HTTPException(status_code=400, detail="Tasdiqlash kodi topilmadi yoki muddati o'tgan")

    try:
        stored_entry = json.loads(stored_entry_str)
    except (TypeError, ValueError):
        redis_client.delete(key)
        raise HTTPException(status_code=400, detail="Tasdiqlash kodi yaroqsiz, yangi kod so'rang")

    attempts = int(stored_entry.get("attempts", 0)) + 1
    if attempts > settings.SMS_MAX_ATTEMPTS:
        redis_client.delete(key)
        raise HTTPException(
            status_code=429,
            detail="Ko'p noto'g'ri urinishlar. Iltimos, yangi kod so'rang",
        )

    stored_code = str(stored_entry.get("code", ""))
    if not secrets.compare_digest(stored_code, payload.code):
        stored_entry["attempts"] = attempts
        # Preserve the ORIGINAL expiry: re-setting a full TTL on every wrong
        # guess used to give an attacker an indefinite window.
        remaining = redis_client.ttl(key)
        if not isinstance(remaining, int) or remaining <= 0:
            remaining = 60
        redis_client.setex(key, remaining, json.dumps(stored_entry))
        raise HTTPException(status_code=400, detail="Tasdiqlash kodi xato")

    redis_client.delete(key)
    token = issue_verification_grant(phone)
    return {
        "success": True,
        "message": "Kod tasdiqlandi",
        "phone": phone,
        "verification_token": token,
    }


def _set_auth_cookies(response: Response, subject: str, sid: str = None) -> tuple[str, str]:
    access = security.create_access_token(subject, sid=sid)
    refresh = security.create_refresh_token(subject, sid=sid)
    common = {
        "httponly": True,
        "secure": settings.cookie_secure,
        "samesite": settings.cookie_samesite,
        "path": "/",
    }
    response.set_cookie(
        settings.ACCESS_COOKIE_NAME,
        access,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        **common,
    )
    response.set_cookie(
        settings.REFRESH_COOKIE_NAME,
        refresh,
        max_age=settings.REFRESH_TOKEN_EXPIRE_MINUTES * 60,
        **common,
    )
    return access, refresh


def _clear_auth_cookies(response: Response) -> None:
    for name in (settings.ACCESS_COOKIE_NAME, settings.REFRESH_COOKIE_NAME):
        response.delete_cookie(
            name,
            path="/",
            httponly=True,
            secure=settings.cookie_secure,
            samesite=settings.cookie_samesite,
        )


def _device_name(user_agent: str) -> str:
    for needle, label in (
        ("iPhone", "iPhone"),
        ("iPad", "iPad"),
        ("Android", "Android Device"),
        ("Windows", "Windows PC"),
        ("Mac", "Mac"),
        ("Linux", "Linux PC"),
    ):
        if needle in user_agent:
            return label
    return (user_agent or "Unknown Device")[:30]


@router.post("/login")
@limiter.limit("5/minute")
@limiter.limit("30/hour")
def login(
    request: Request,
    response: Response,
    db: Session = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Any:
    """Authenticate and set httpOnly session cookies."""
    user = crud.user.authenticate(
        db, email=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Telefon raqam yoki parol xato",
        )
    if user.isBanned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Hisobingiz bloklangan"
        )

    # Signing in is a write on this user's rows already: the sessions they have
    # let go idle are closed here rather than left reading "active" forever.
    expire_idle(db, user.uid)

    session_record = ActiveSession(
        user_uid=user.uid,
        device_name=_device_name(request.headers.get("user-agent", "")),
        ip_address=request.client.host if request.client else None,
        location="Unknown Location",
    )
    db.add(session_record)
    db.commit()
    db.refresh(session_record)

    access_token, refresh_token = _set_auth_cookies(
        response, user.uid, sid=session_record.id
    )
    return {
        "success": True,
        "role": user.role,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/refresh")
@limiter.limit("120/minute")
def refresh(
    request: Request,
    response: Response,
    db: Session = Depends(deps.get_db),
) -> Any:
    """Exchange a valid refresh token for a fresh pair.

    A refresh token is only accepted while its session row is still active, so
    logging out (or revoking a session) immediately kills the whole chain — the
    previous version let an old refresh token live for its full 7 days.
    """
    token = deps.get_refresh_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Sessiya topilmadi")

    token_data = deps._decode(token, "refresh")
    if not token_data:
        _clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="Sessiya muddati tugagan, qayta kiring")

    user = crud.user.get_by_uid(db, uid=token_data.sub)
    if not user or user.isBanned:
        _clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="Sessiya bekor qilingan")

    # Every token issued by /login carries a sid. A refresh token without one
    # predates session tracking and is no longer honoured.
    if not token_data.sid:
        _clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="Sessiya yaroqsiz, qayta kiring")

    session_record = (
        db.query(ActiveSession).filter(ActiveSession.id == token_data.sid).first()
    )
    if not is_live(session_record):
        # An idle session is closed on the way out, so the row stops claiming
        # to be active the moment we have established that it is not.
        if session_record and session_record.is_active:
            session_record.is_active = False
            db.commit()
        _clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="Sessiya yaroqsiz")

    session_record.last_active_at = datetime.now(timezone.utc)
    db.commit()

    access_token, refresh_token = _set_auth_cookies(
        response, user.uid, sid=token_data.sid
    )
    return {
        "success": True,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(deps.get_db),
) -> Any:
    """Clear session cookies and deactivate the current session."""
    token = deps.get_access_token(request) or deps.get_refresh_token(request)
    if token:
        token_data = deps._decode(token, "access") or deps._decode(token, "refresh")
        if token_data and token_data.sid:
            session_record = (
                db.query(ActiveSession).filter(ActiveSession.id == token_data.sid).first()
            )
            if session_record:
                session_record.is_active = False
                db.commit()

    _clear_auth_cookies(response)
    return {"success": True}
