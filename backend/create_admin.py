#!/usr/bin/env python
"""
Create an admin user from the server shell. Replaces the old unauthenticated
POST /admin-user endpoint, which let anyone on the internet claim admin.

Usage:
    python create_admin.py <phone> <email> [name]

The password is read interactively so it never lands in shell history.
"""
import getpass
import sys
import uuid

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models import User


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 1

    phone, email = sys.argv[1], sys.argv[2]
    name = sys.argv[3] if len(sys.argv) > 3 else "Admin"

    password = getpass.getpass("Password: ")
    if len(password) < 12:
        print("Refusing: admin password must be at least 12 characters.")
        return 1
    if password != getpass.getpass("Confirm password: "):
        print("Passwords do not match.")
        return 1

    with SessionLocal() as db:
        if db.query(User).filter((User.phone == phone) | (User.email == email)).first():
            print("A user with that phone or email already exists.")
            return 1

        admin = User(
            id=str(uuid.uuid4()),
            uid=str(uuid.uuid4()),
            email=email,
            hashed_password=get_password_hash(password),
            name=name,
            phone=phone,
            role="admin",
            balance=0,
            isBanned=False,
            isVerified=True,
        )
        db.add(admin)
        db.commit()
        print(f"Admin created: {admin.email} (id={admin.id})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
