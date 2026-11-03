import uuid
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.core import security
from app.core.limiter import limiter
from app.core.phone import consume_verification_grant, is_valid_uz_phone, normalize_phone
from app.models.transaction import Transaction
from sqlalchemy import func
from app.core.security import get_password_hash
from app.models.session import ActiveSession
from app.services.session_window import is_live

router = APIRouter()


def _deactivate_other_sessions(db: Session, user: models.User, keep_session_id: str | None) -> int:
    """Revoke every session except the caller's own."""
    query = db.query(ActiveSession).filter(
        ActiveSession.user_uid == user.uid,
        ActiveSession.is_active == True,  # noqa: E712 — SQL boolean, not Python
    )
    if keep_session_id:
        query = query.filter(ActiveSession.id != keep_session_id)
    sessions = query.all()
    for record in sessions:
        record.is_active = False
    return len(sessions)


@router.get("/me", response_model=schemas.User)
def read_user_me(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Get current user."""
    user_ids = [uid for uid in [current_user.id, getattr(current_user, 'uid', None)] if uid]
    if current_user.role == 'employer':
        spent_from_payouts = db.query(func.sum(func.coalesce(models.JobPayout.invoiceAmount, models.JobPayout.amount))).filter(
            models.JobPayout.employerId.in_(user_ids),
            models.JobPayout.status.in_(["payment_confirmed", "paid"]),
        ).scalar() or 0
        spent_from_tx = db.query(func.sum(Transaction.amount)).filter(
            Transaction.employerId.in_(user_ids),
            Transaction.type == 'payout',
            Transaction.status == 'paid'
        ).scalar() or 0
        total_spent = max(spent_from_payouts, (spent_from_tx // 100) if spent_from_tx else 0)
        setattr(current_user, 'totalSpent', total_spent)
    elif current_user.role == 'worker':
        earnings_sum = db.query(func.sum(Transaction.amount)).filter(
            Transaction.workerId.in_(user_ids),
            Transaction.type.in_(['worker_earning', 'completion_bonus']),
            Transaction.status == 'credited'
        ).scalar() or 0
        if not earnings_sum:
            earnings_sum = db.query(func.sum(Transaction.amount)).filter(
                Transaction.workerId.in_(user_ids),
                Transaction.type == 'payout',
                Transaction.status == 'paid'
            ).scalar() or 0
        setattr(current_user, 'totalEarned', earnings_sum // 100 if earnings_sum else 0)
    return current_user


@router.post("/", response_model=schemas.User)
@limiter.limit("5/hour")
@limiter.limit("3/minute")
def create_user(
    request: Request,
    *,
    db: Session = Depends(deps.get_db),
    user_in: schemas.UserCreate,
) -> Any:
    """Register a new account.

    Requires the ``verification_token`` handed out by ``/auth/verify-sms`` for
    this exact phone number. Previously the two endpoints were unrelated, so a
    direct call here could register any number, including someone else's.
    """
    phone = normalize_phone(user_in.phone)
    if not is_valid_uz_phone(phone):
        raise HTTPException(status_code=400, detail="Telefon raqam formati noto'g'ri")
    user_in.phone = phone

    if not consume_verification_grant(phone, user_in.verification_token):
        raise HTTPException(
            status_code=400,
            detail="Telefon raqam tasdiqlanmagan. Iltimos, SMS kodni qaytadan kiriting.",
        )

    if user_in.email:
        if crud.user.get_by_email(db, email=user_in.email):
            raise HTTPException(status_code=400, detail="Bu email allaqachon ro'yxatdan o'tgan")

    if crud.user.get_by_phone(db, phone=phone):
        raise HTTPException(status_code=400, detail="Bu raqam allaqachon ro'yxatdan o'tgan")

    # Prevent privilege escalation: public registration can only create
    # 'worker' or 'employer'.
    assigned_role = user_in.role if user_in.role in ("worker", "employer") else "worker"

    user_id = str(uuid.uuid4())
    user_uid = user_in.uid if user_in.uid else user_id
    db_obj = models.User(
        id=user_id,
        uid=user_uid,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        name=user_in.name,
        phone=phone,
        role=assigned_role,
        companyName=user_in.companyName,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


@router.put("/me", response_model=schemas.User)
def update_user_me(
    *,
    db: Session = Depends(deps.get_db),
    user_in: schemas.UserUpdate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Update current user profile."""
    update_data = user_in.model_dump(exclude_unset=True)

    # Phone and email are login identifiers: letting one account take a value
    # another already holds would lock that user out of their own account.
    new_phone = update_data.get("phone")
    if new_phone:
        new_phone = normalize_phone(new_phone)
        if not is_valid_uz_phone(new_phone):
            raise HTTPException(status_code=400, detail="Telefon raqam formati noto'g'ri")
        update_data["phone"] = new_phone

        if new_phone != current_user.phone:
            if not user_in.verification_token or not consume_verification_grant(new_phone, user_in.verification_token):
                raise HTTPException(
                    status_code=400,
                    detail="Telefon raqam tasdiqlanmagan. Iltimos, SMS kodni qaytadan kiriting.",
                )
            clash = crud.user.get_by_phone(db, phone=new_phone)
            if clash and clash.id != current_user.id:
                raise HTTPException(status_code=400, detail="Bu raqam allaqachon ro'yxatdan o'tgan")
    update_data.pop("verification_token", None)

    new_email = update_data.get("email")
    if new_email and new_email != current_user.email:
        clash = crud.user.get_by_email(db, email=new_email)
        if clash and clash.id != current_user.id:
            raise HTTPException(status_code=400, detail="Bu email allaqachon ro'yxatdan o'tgan")

    password_changed = False
    if update_data.get("password"):
        update_data["hashed_password"] = get_password_hash(update_data["password"])
        password_changed = True
    update_data.pop("password", None)

    # Re-uploading identity documents invalidates the previous approval.
    document_fields = {"passportSeries", "passportJshshir", "passportDocFront",
                       "passportDocBack", "selfieWithDoc"}
    if document_fields & set(update_data) and current_user.isVerified:
        current_user.isVerified = False

    for field, value in update_data.items():
        setattr(current_user, field, value)

    if password_changed:
        _deactivate_other_sessions(
            db, current_user, getattr(current_user, "current_session_id", None)
        )

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/me/password")
def change_password(
    *,
    db: Session = Depends(deps.get_db),
    password_in: schemas.PasswordChange,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Change the current user's password and log every other device out.

    Leaving other sessions alive meant that changing a password after a
    compromise did not actually evict the attacker.
    """
    if not security.verify_password(password_in.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Joriy parol xato")

    if password_in.new_password == password_in.current_password:
        raise HTTPException(status_code=400, detail="Yangi parol eskisidan farq qilishi kerak")

    current_user.hashed_password = get_password_hash(password_in.new_password)
    db.add(current_user)

    revoked = _deactivate_other_sessions(
        db, current_user, getattr(current_user, "current_session_id", None)
    )
    db.commit()
    return {"success": True, "revoked_sessions": revoked}


@router.get("/me/sessions", response_model=List[schemas.ActiveSession])
def read_active_sessions(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """The devices that can still get into this account.

    A row left `is_active` but unused past the refresh window cannot sign back
    in, so listing it answers "who else is in my account?" wrongly. It is left
    out here and closed the next time this user signs in.
    """
    rows = (
        db.query(ActiveSession)
        .filter(
            ActiveSession.user_uid == current_user.uid,
            ActiveSession.is_active == True,  # noqa: E712
        )
        .order_by(ActiveSession.last_active_at.desc())
        .all()
    )
    return [row for row in rows if is_live(row)]


@router.delete("/me/sessions/{session_id}")
def deactivate_session(
    session_id: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Deactivate a specific session."""
    session_record = (
        db.query(ActiveSession)
        .filter(
            ActiveSession.id == session_id,
            ActiveSession.user_uid == current_user.uid,
        )
        .first()
    )

    if not session_record:
        raise HTTPException(status_code=404, detail="Sessiya topilmadi")

    session_record.is_active = False
    db.commit()
    return {"success": True}


@router.delete("/me/sessions")
def deactivate_all_other_sessions(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Deactivate all sessions EXCEPT the current one."""
    count = _deactivate_other_sessions(
        db, current_user, getattr(current_user, "current_session_id", None)
    )
    db.commit()
    return {"success": True, "deactivated_count": count}
