"""Create accounts directly, for roles the public signup flow cannot produce.

Registration deliberately refuses to create an admin — `POST /users` clamps the
role to worker or employer, so privilege escalation is impossible from outside.
That leaves no way at all to add an admin, and no way to add any account
without a working SMS gateway and a real phone to receive the code. This script
is that missing door, and it is meant to be used from the server by whoever
already has shell access.

Passwords are generated here and printed exactly once. Nobody types a password
into a command line, where it would sit in shell history, and no password is
ever chosen by hand.

    python scripts/create_accounts.py admin:+998900000001:"Bosh admin" \
                                      worker:+998900000002:"Sinov ishchi"

Existing phone numbers are left completely alone: the script reports them and
moves on, so re-running it can never overwrite an account or reset a password.
"""

from __future__ import annotations

import secrets
import string
import sys
import uuid
from pathlib import Path

# Works both inside the image (/app/scripts/...) and from a checkout.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.phone import is_valid_uz_phone, normalize_phone  # noqa: E402
from app.core.security import get_password_hash  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.models import User  # noqa: E402

ROLES = ("admin", "worker", "employer")
# Ambiguous glyphs removed: these get read off a screen and typed by hand.
ALPHABET = (string.ascii_lowercase + string.ascii_uppercase + string.digits)
ALPHABET = "".join(c for c in ALPHABET if c not in "O0oIl1")


def make_password(length: int = 16) -> str:
    """A password that satisfies the app's own validator by construction."""
    while True:
        pw = "".join(secrets.choice(ALPHABET) for _ in range(length))
        # The API requires both a letter and a digit; do not hand out one the
        # user could not have set through the app itself.
        if any(c.isdigit() for c in pw) and any(c.isalpha() for c in pw):
            return pw


def parse(spec: str) -> tuple[str, str, str]:
    role, _, rest = spec.partition(":")
    phone, _, name = rest.partition(":")
    if role not in ROLES:
        raise SystemExit(f"Noma'lum rol: {role!r}. Ruxsat etilgan: {', '.join(ROLES)}")
    normalised = normalize_phone(phone)
    if not is_valid_uz_phone(normalised):
        raise SystemExit(f"Telefon raqam noto'g'ri: {phone!r}")
    if not name.strip():
        raise SystemExit(f"{role} uchun ism ko'rsatilmagan")
    return role, normalised, name.strip()


def main(argv: list[str]) -> int:
    if not argv:
        raise SystemExit(__doc__)

    specs = [parse(a) for a in argv]
    created: list[tuple[str, str, str, str]] = []
    skipped: list[tuple[str, str]] = []

    with SessionLocal() as db:
        for role, phone, name in specs:
            existing = db.query(User).filter(User.phone == phone).first()
            if existing:
                skipped.append((phone, existing.role))
                continue

            password = make_password()
            db.add(
                User(
                    id=str(uuid.uuid4()),
                    uid=str(uuid.uuid4()),
                    name=name,
                    phone=phone,
                    role=role,
                    hashed_password=get_password_hash(password),
                    isVerified=True,
                    isBanned=False,
                    balance=0,
                    sourceApp="Seed",
                    companyName=name if role == "employer" else None,
                )
            )
            created.append((role, phone, name, password))
        db.commit()

    for phone, role in skipped:
        print(f"o'tkazib yuborildi: {phone} allaqachon bor (rol: {role})")

    if created:
        print("\nYaratildi — parollar faqat shu yerda ko'rsatiladi:\n")
        width = max(len(r) for r, _, _, _ in created)
        for role, phone, name, password in created:
            print(f"  {role:<{width}}  {phone}  {password}   ({name})")
        print("\nBirinchi kirishdan keyin parollarni almashtiring.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
