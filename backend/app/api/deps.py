from typing import Generator, Optional
from fastapi import Depends, HTTPException, Request, status
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.core.config import settings
from app.services.session_window import is_live
from app.db.session import SessionLocal
from sqlalchemy import event


def invalidate_session_cache(sid: str) -> None:
    """Evict session liveness from Redis cache immediately."""
    try:
        from app.redis_client import redis_client
        redis_client.delete(f"session:live:{sid}")
    except Exception:
        pass


@event.listens_for(models.ActiveSession, "after_update")
@event.listens_for(models.ActiveSession, "after_delete")
def _on_session_model_change(mapper, connection, target):
    if hasattr(target, "id") and target.id:
        invalidate_session_cache(str(target.id))


def check_session_liveness_cached(db: Session, sid: str) -> bool:
    """Fast Redis caching for session liveness.

    Avoids 2x PostgreSQL queries per authenticated request.
    Caches active state for a short TTL (60s). If the session is revoked or idle,
    the cache key is invalidated or evaluated to False.
    """
    cache_key = f"session:live:{sid}"
    try:
        from app.redis_client import redis_client
        cached = redis_client.get(cache_key)
        if cached is not None:
            return cached == "1"
    except Exception:
        pass

    session_record = db.query(models.ActiveSession).filter(models.ActiveSession.id == sid).first()
    live = is_live(session_record)
    try:
        from app.redis_client import redis_client
        redis_client.setex(cache_key, 60 if live else 10, "1" if live else "0")
    except Exception:
        pass
    return live

def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

def _decode(token: str, expected_type: str) -> Optional[schemas.TokenPayload]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        token_data = schemas.TokenPayload(**payload)
    except (JWTError, ValidationError):
        return None
    if token_data.type != expected_type:
        return None
    return token_data

def get_access_token(request: Request) -> Optional[str]:
    auth_header = (
        request.headers.get("authorization")
        or request.headers.get("Authorization")
        or request.headers.get("HTTP_AUTHORIZATION")
    )
    if auth_header:
        cleaned = auth_header.strip()
        if cleaned.lower().startswith("bearer "):
            return cleaned.split(" ", 1)[1].strip()
        elif len(cleaned.split(".")) == 3:
            return cleaned
    return request.cookies.get(settings.ACCESS_COOKIE_NAME)

def get_refresh_token(request: Request) -> Optional[str]:
    ref_header = (
        request.headers.get("x-refresh-token")
        or request.headers.get("X-Refresh-Token")
        or request.headers.get("HTTP_X_REFRESH_TOKEN")
    )
    if ref_header:
        return ref_header.strip()
    return request.cookies.get(settings.REFRESH_COOKIE_NAME)

def get_current_user(
    request: Request, db: Session = Depends(get_db)
) -> models.User:
    token = get_access_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tizimga kiring",
        )
    token_data = _decode(token, "access")
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessiya muddati tugagan yoki yaroqsiz",
        )
    if token_data.sid:
        if not check_session_liveness_cached(db, token_data.sid):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Sessiya bekor qilingan",
            )
            
    user = crud.user.get_by_uid(db, uid=token_data.sub)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Foydalanuvchi topilmadi")
    if user.isBanned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hisobingiz bloklangan")
    
    # Optional: Attach session_id to user object for reference
    if token_data.sid:
        setattr(user, 'current_session_id', token_data.sid)
        
    return user

def get_current_active_user(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    return current_user

def get_db_optional() -> Optional[Session]:
    return None

def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db),
) -> Optional[models.User]:
    token = get_access_token(request)
    if not token:
        return None
    token_data = _decode(token, "access")
    if not token_data:
        return None

    if token_data.sid:
        if not check_session_liveness_cached(db, token_data.sid):
            return None

    user = crud.user.get_by_uid(db, uid=token_data.sub)
    if not user or user.isBanned:
        return None

    if token_data.sid:
        setattr(user, 'current_session_id', token_data.sid)

    return user

def get_current_employer(
    current_user: models.User = Depends(get_current_active_user),
) -> models.User:
    if current_user.role not in ("employer", "admin"):
        raise HTTPException(status_code=403, detail="Ish beruvchi huquqi talab etiladi")
    return current_user


# What "verified" means here is that an administrator has looked at the
# documents the account uploaded and marked it so. It is not a formality: a
# worker turns up at a stranger's address, and an employer's posting moves
# money out of a balance. Editing a document field clears the flag
# again (see users.py), so this cannot be passed once and then changed.
#
# Administrators are exempt. They are created by scripts/create_accounts.py,
# which has no document step, and they are the ones doing the verifying.
def _require_verified(user: models.User) -> models.User:
    if user.role == "admin" or user.isVerified:
        return user
    raise HTTPException(
        status_code=403,
        detail="Hujjatlaringiz hali tasdiqlanmagan. Tasdiqlangach davom etishingiz mumkin.",
    )


def get_verified_worker(
    current_user: models.User = Depends(get_current_active_user),
) -> models.User:
    if current_user.role not in ("worker", "admin"):
        raise HTTPException(status_code=403, detail="Faqat ishchilar ariza topshira oladi")
    return _require_verified(current_user)

def get_verified_employer(
    current_user: models.User = Depends(get_current_active_user),
) -> models.User:
    if current_user.role not in ("employer", "admin"):
        raise HTTPException(status_code=403, detail="Ish beruvchi huquqi talab etiladi")
    return _require_verified(current_user)

def get_current_admin(
    current_user: models.User = Depends(get_current_active_user),
) -> models.User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin huquqi talab etiladi")
    return current_user

def get_tx_db() -> Generator:
    """A transactional database session that automatically commits on success."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

def get_idempotent_response(db: Session, key: Optional[str], user_id: str) -> Optional[dict]:
    if not key:
        return None
    import json
    prior = db.query(models.IdempotencyKey).filter(models.IdempotencyKey.id == key).first()
    if prior:
        if prior.userId != user_id:
            raise HTTPException(status_code=409, detail="Idempotency key already used")
        return json.loads(prior.responseBody)
    return None

def save_idempotent_response(db: Session, key: Optional[str], user_id: str, path: str, result: dict):
    if not key:
        return
    import json
    db.add(models.IdempotencyKey(
        id=key,
        userId=user_id,
        requestPath=path,
        responseCode=200,
        responseBody=json.dumps(result),
    ))
