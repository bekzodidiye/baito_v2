#!/usr/bin/env python
"""
Create an admin user from the server shell. Replaces the old unauthenticated
POST /admin-user endpoint, which let anyone on the internet claim admin.

Usage:
    python create_admin.py <phone> <email> [name]

The password is read interactively so it never lands in shell history.
"""
import getpass
import os
import sys
import uuid

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models import User


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--password=")]
    password_flag = None
    for a in sys.argv[1:]:
        if a.startswith("--password="):
            password_flag = a.split("=", 1)[1]

    if len(args) < 2:
        print(__doc__)
        return 1

    phone, email = args[0], args[1]
    name = args[2] if len(args) > 2 else "Admin"

    password = password_flag or os.environ.get("ADMIN_PASSWORD")
    if not password:
        password = getpass.getpass("Password: ")
        if len(password) < 12:
            print("Refusing: admin password must be at least 12 characters.")
            return 1
        if password != getpass.getpass("Confirm password: "):
            print("Passwords do not match.")
            return 1
    elif len(password) < 12:
        print("Refusing: admin password must be at least 12 characters.")
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
