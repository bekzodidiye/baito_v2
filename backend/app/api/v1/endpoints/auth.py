from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app import crud
from app.api import deps
from app.core import security
from app.models.session import ActiveSession
from pydantic import BaseModel
import httpx
from datetime import datetime, timezone
from app.core.config import settings
from app.core.limiter import limiter

router = APIRouter()

import json
from app.redis_client import redis_client
from app.tasks import send_sms_task

class SendSMSRequest(BaseModel):
    phone: str

class VerifySMSRequest(BaseModel):
    
    phone: str
    code: str

@router.post("/send-sms")
@limiter.limit("3/minute")
async def send_verification_sms(
    request: Request,
    payload: SendSMSRequest,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    Send verification SMS using textup.uz API.
    """
    if not settings.TEXTUP_EMAIL or not settings.TEXTUP_PASSWORD:
        return {"success": True, "message": "SMS simulated (no credentials)"}

    # Generate a cryptographically secure 6-digit code
    import secrets
    code = f"{secrets.SystemRandom().randint(100000, 999999)}"
    
    # Save to Redis with 5-minute expiration
    import json
    redis_client.setex(
        f"sms_code:{payload.phone}",
        300,
        json.dumps({"code": code, "attempts": 0})
    )
    
    print("\n" + "="*50)
    print(f"🚀 SMS VERIFICATION CODE FOR {payload.phone}: {code}")
    print("="*50 + "\n")
        
    try:
        # Trigger Celery task
        try:
            send_sms_task.delay(payload.phone, code)
        except Exception as e:
            print(f"⚠️ Celery delay failed ({e}), falling back to synchronous.")
            send_sms_task(payload.phone, code)
        return {"success": True, "message": "SMS sent"}
    except Exception as e:
        print(f"⚠️ Celery task error: {e}. Code logged above.")
        return {"success": True, "message": "SMS sent (simulated)"}

@router.post("/verify-sms")
@limiter.limit("5/minute")
async def verify_sms(request: Request, payload: VerifySMSRequest) -> Any:
    """
    Verify the SMS code sent to the user.
    """
    stored_entry_str = redis_client.get(f"sms_code:{payload.phone}")
    if not stored_entry_str:
        raise HTTPException(status_code=400, detail="Tasdiqlash kodi topilmadi yoki muddati o'tgan")
    
    import json
    stored_entry = json.loads(stored_entry_str)
    
    stored_entry["attempts"] = stored_entry.get("attempts", 0) + 1
    if stored_entry["attempts"] > 5:
        redis_client.delete(f"sms_code:{payload.phone}")
        raise HTTPException(status_code=429, detail="Ko'p noto'g'ri urinishlar. Iltimos, yangi kod so'rang")
        
    stored_code = stored_entry.get("code")

    if stored_code != payload.code:
        # update attempts
        redis_client.setex(
            f"sms_code:{payload.phone}",
            300, # reset timer roughly
            json.dumps(stored_entry)
        )
        raise HTTPException(status_code=400, detail="Tasdiqlash kodi xato")
        
    # Code is valid, remove it from memory so it can't be reused
    redis_client.delete(f"sms_code:{payload.phone}")
    return {"success": True, "message": "Kodi tasdiqlandi"}

def _set_auth_cookies(response: Response, subject: str, sid: str = None) -> None:
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

def _clear_auth_cookies(response: Response) -> None:
    for name in (settings.ACCESS_COOKIE_NAME, settings.REFRESH_COOKIE_NAME):
        response.delete_cookie(
            name,
            path="/",
            httponly=True,
            secure=settings.cookie_secure,
            samesite=settings.cookie_samesite,
        )

@router.post("/login")
@limiter.limit("5/minute")
def login(
    request: Request,
    response: Response,
    db: Session = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Any:
    """
    Authenticate and set httpOnly session cookies. No token is returned to JavaScript.
    """
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
        
    user_agent = request.headers.get("user-agent", "Unknown Device")
    ip_address = request.client.host if request.client else "Unknown IP"
    
    # Simple device name mapping
    device_name = "Unknown Device"
    if "iPhone" in user_agent:
        device_name = "iPhone"
    elif "iPad" in user_agent:
        device_name = "iPad"
    elif "Android" in user_agent:
        device_name = "Android Device"
    elif "Windows" in user_agent:
        device_name = "Windows PC"
    elif "Mac" in user_agent:
        device_name = "Mac"
    elif "Linux" in user_agent:
        device_name = "Linux PC"
    else:
        device_name = user_agent[:30]

    session_record = ActiveSession(
        user_uid=str(user.uid or user.id),
        device_name=device_name,
        ip_address=ip_address,
        location="Unknown Location",
    )
    db.add(session_record)
    db.commit()
    db.refresh(session_record)

    _set_auth_cookies(response, str(user.uid or user.id), sid=session_record.id)
    return {"success": True, "role": user.role}

@router.post("/refresh")
@limiter.limit("20/minute")
def refresh(
    request: Request,
    response: Response,
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    Exchange a valid, unexpired refresh cookie for a fresh session.
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
        
    if token_data.sid:
        session_record = db.query(ActiveSession).filter(ActiveSession.id == token_data.sid).first()
        if session_record and session_record.is_active:
            session_record.last_active_at = datetime.now(timezone.utc)
            db.commit()
        else:
            _clear_auth_cookies(response)
            raise HTTPException(status_code=401, detail="Sessiya yaroqsiz")

    _set_auth_cookies(response, str(user.uid or user.id), sid=token_data.sid)
    return {"success": True}

@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    Clear httpOnly session cookies and deactivate current session.
    """
    token = deps.get_access_token(request)
    if token:
        token_data = deps._decode(token, "access")
        if token_data and token_data.sid:
            session_record = db.query(ActiveSession).filter(ActiveSession.id == token_data.sid).first()
            if session_record:
                session_record.is_active = False
                db.commit()
                
    _clear_auth_cookies(response)
    return {"success": True}
