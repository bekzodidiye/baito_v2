"""Phone-number normalisation and the SMS verification handshake.

Registration used to accept any phone number outright: the frontend called
``/auth/verify-sms`` first, but nothing tied that result to the account being
created, so a direct ``POST /users`` could claim someone else's number. The
``phone_verified:*`` grant below is what closes that gap.
"""

import hmac
import re
import secrets

from app.core.config import settings
from app.redis_client import redis_client

_NON_DIGITS = re.compile(r"[^\d]")

SMS_CODE_KEY = "sms_code:{phone}"
VERIFIED_KEY = "phone_verified:{phone}"


def normalize_phone(raw: str | None) -> str | None:
    """Reduce any accepted input format to canonical ``+998XXXXXXXXX``.

    This logic used to be copy-pasted into two endpoints, which meant a number
    could normalise one way at registration and another at profile update.
    """
    if not raw:
        return None
    digits = _NON_DIGITS.sub("", raw)
    if not digits:
        return None
    if len(digits) == 9:
        return "+998" + digits
    if len(digits) == 12 and digits.startswith("998"):
        return "+" + digits
    return "+" + digits


def is_valid_uz_phone(phone: str | None) -> bool:
    return bool(phone and re.fullmatch(r"\+998\d{9}", phone))


def issue_verification_grant(phone: str) -> str:
    """Record that this phone number was just proven, and return the proof."""
    token = secrets.token_urlsafe(32)
    redis_client.setex(
        VERIFIED_KEY.format(phone=phone),
        settings.PHONE_VERIFICATION_TTL_SECONDS,
        token,
    )
    return token


def consume_verification_grant(phone: str, token: str | None) -> bool:
    """Check and burn a grant. A grant is single-use, like the code itself."""
    if not token:
        return False
    stored = redis_client.get(VERIFIED_KEY.format(phone=phone))
    if not stored:
        return False
    if not hmac.compare_digest(str(stored), str(token)):
        return False
    redis_client.delete(VERIFIED_KEY.format(phone=phone))
    return True
