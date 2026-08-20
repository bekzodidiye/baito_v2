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

# Temporary in-memory store for SMS verification codes.
# In a real app, this should be in Redis.
sms_verification_codes = {}

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

    # Generate a random 6-digit code
    import random
    code = f"{random.randint(100000, 999999)}"
    
    # Save to memory (simulated cache)
    sms_verification_codes[payload.phone] = code
    
    # Simulate saving to DB or cache
    # In a real app, save to Redis or DB with expiration
    print("\n" + "="*50)
    print(f"🚀 SMS VERIFICATION CODE FOR {payload.phone}: {code}")
    print("="*50 + "\n")
        
    try:
        async with httpx.AsyncClient() as client:
            # 1. Authenticate with TextUp
            login_res = await client.post("https://api-auth.textup.uz/v1/login", json={
                "email": settings.TEXTUP_EMAIL,
                "password": settings.TEXTUP_PASSWORD
            })
            if login_res.status_code == 200:
                token_data = login_res.json()
                access_token = token_data.get("accessToken")
                user_id = token_data.get("user", {}).get("id")
                
                # 2. Send SMS using sms-api.textup.uz/v1/send
                sms_payload = {
                    "message": f"Baito ilovasiga kirish uchun tasdiqlash kodi: {code}",
                    "userId": user_id,
                    "name": "Baito Verification",
                    "templateId": "f885a2db-85e9-4d51-9c92-fe260fb7af59",
                    "recipients": [payload.phone]
                }
                
                sms_res = await client.post(
                    "https://sms-api.textup.uz/v1/send",
                    headers={"Authorization": f"Bearer {access_token}"},
                    json=sms_payload
                )
                
                if sms_res.status_code in (200, 201):
                    return {"success": True, "message": "SMS sent"}
                else:
                    print(f"⚠️ TextUp SMS send failed: {sms_res.text}")
                    return {"success": True, "message": "SMS sent (simulated)"}
            else:
                # Fallback: still log the code so user can test
                print(f"⚠️ Failed to authenticate with Textup.uz: {login_res.text}")
                return {"success": True, "message": "SMS sent (simulated)"}
    except Exception as e:
        print(f"⚠️ SMS sending error: {e}. Code logged above.")
        return {"success": True, "message": "SMS sent (simulated)"}

@router.post("/verify-sms")
async def verify_sms(payload: VerifySMSRequest) -> Any:
    """
    Verify the SMS code sent to the user.
    """
    stored_code = sms_verification_codes.get(payload.phone)
    if not stored_code:
        raise HTTPException(status_code=400, detail="Tasdiqlash kodi topilmadi yoki muddati o'tgan")
        
    if stored_code != payload.code:
        raise HTTPException(status_code=400, detail="Tasdiqlash kodi xato")
        
    # Code is valid, remove it from memory so it can't be reused
    sms_verification_codes.pop(payload.phone, None)
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
