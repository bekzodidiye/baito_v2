from typing import Generator, Optional
from fastapi import Depends, HTTPException, Request, status
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.core.config import settings
from app.db.session import SessionLocal

def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
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
    return request.cookies.get(settings.ACCESS_COOKIE_NAME)

def get_refresh_token(request: Request) -> Optional[str]:
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
    user = crud.user.get_by_uid(db, uid=token_data.sub)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Foydalanuvchi topilmadi")
    if user.isBanned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hisobingiz bloklangan")
    return user

def get_current_active_user(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    return current_user

def get_current_user_optional(
    request: Request, db: Session = Depends(get_db)
) -> Optional[models.User]:
    token = get_access_token(request)
    if not token:
        return None
    token_data = _decode(token, "access")
    if not token_data:
        return None
    user = crud.user.get_by_uid(db, uid=token_data.sub)
    if not user or user.isBanned:
        return None
    return user

def get_current_employer(
    current_user: models.User = Depends(get_current_active_user),
) -> models.User:
    if current_user.role not in ("employer", "admin"):
        raise HTTPException(status_code=403, detail="Ish beruvchi huquqi talab etiladi")
    return current_user

def get_current_admin(
    current_user: models.User = Depends(get_current_active_user),
) -> models.User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin huquqi talab etiladi")
    return current_user
