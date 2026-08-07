from typing import Any, Dict, Optional, Union
from sqlalchemy.orm import Session
from app.core.security import get_password_hash, verify_password
from app.crud.base import CRUDBase
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate

class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    def get_by_email(self, db: Session, *, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email).first()
        
    def get_by_uid(self, db: Session, *, uid: str) -> Optional[User]:
        if not uid:
            return None
        user = db.query(User).filter(User.id == uid).first()
        if not user:
            user = db.query(User).filter(User.uid == uid).first()
        if not user:
            user = db.query(User).filter(User.phone == uid).first()
        if not user:
            user = db.query(User).filter(User.email == uid).first()
        return user

    def get_by_phone(self, db: Session, *, phone: str) -> Optional[User]:
        return db.query(User).filter(User.phone == phone).first()

    def create(self, db: Session, *, obj_in: UserCreate) -> User:
        db_obj = User(
            email=obj_in.email,
            hashed_password=get_password_hash(obj_in.password),
            name=obj_in.name,
            uid=obj_in.uid or str(__import__('uuid').uuid4()),
            role=obj_in.role or 'worker',
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
        user = self.get_by_email(db, email=email)
        if not user:
            user = self.get_by_phone(db, phone=email)
        if not user:
            clean = email.replace(" ", "").replace("-", "").replace("(", "").replace(")", "").replace("+", "")
            for p in [clean, "+" + clean, "+998" + clean if len(clean) == 9 else clean]:
                user = self.get_by_phone(db, phone=p)
                if user:
                    break
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user


user = CRUDUser(User)
