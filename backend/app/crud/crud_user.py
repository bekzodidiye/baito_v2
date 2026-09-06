from typing import Optional
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.core.security import get_password_hash, verify_password
from app.crud.base import CRUDBase
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate

class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    def get_by_email(self, db: Session, *, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email).first()
        
    def get_by_uid(self, db: Session, *, uid: str) -> Optional[User]:
        """Resolve a token subject to a user.

        Tokens carry ``user.uid``, so that column is checked first. This used
        to try four columns in sequence with a separate round trip each, on
        every authenticated request; a single OR covers the same ground.
        """
        if not uid:
            return None
        return (
            db.query(User)
            .filter(or_(User.uid == uid, User.id == uid))
            .first()
        )

    def get_by_phone(self, db: Session, *, phone: str) -> Optional[User]:
        return db.query(User).filter(User.phone == phone).first()

    def create(self, db: Session, *, obj_in: UserCreate) -> User:
        # Never let a request body pick 'admin'.
        role = obj_in.role if obj_in.role in ("worker", "employer") else "worker"
        db_obj = User(
            email=obj_in.email,
            hashed_password=get_password_hash(obj_in.password),
            name=obj_in.name,
            uid=obj_in.uid or str(__import__('uuid').uuid4()),
            role=role,
            phone=obj_in.phone,
            companyName=obj_in.companyName,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def authenticate(
        self, db: Session, *, email: str, password: str
    ) -> Optional[User]:
        """Look a user up by email or phone, then check the password."""
        from app.core.phone import normalize_phone

        candidates = [User.email == email, User.phone == email]
        normalized = normalize_phone(email)
        if normalized:
            candidates.append(User.phone == normalized)

        user = db.query(User).filter(or_(*candidates)).first()
        if not user:
            # Always run a hash comparison so a missing account and a wrong
            # password take the same amount of time.
            verify_password(password, "$2b$12$" + "." * 53)
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user


user = CRUDUser(User)
