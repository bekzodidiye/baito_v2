"""The link an invoice email carries.

A company that has been billed must be able to open its invoice and pay it
without first having an account, remembering a password, or being the same
person who posted the shift — the address on the invoice is usually an
accountant's, not the poster's. So the link authenticates itself.

The token is deliberately not a session. It names one invoice and grants
exactly two things: reading that invoice, and declaring a payment against it.
It is bound to the invoice number, so re-issuing an invoice kills every link
that went out with the old one, and it expires on its own.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import time

from app.core.config import settings

# Long enough that an invoice sitting in an accountant's inbox across a holiday
# still opens; short enough that a mail forwarded on and on does not stay live
# indefinitely.
TOKEN_TTL_SECONDS = 60 * 24 * 3600


def _b64(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def _unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def _sign(payload: str) -> str:
    return _b64(
        hmac.new(settings.SECRET_KEY.encode(), payload.encode(), hashlib.sha256).digest()
    )


def sign(payout_id: str, invoice_number: str, *, issued_at: int | None = None) -> str:
    """A token naming one invoice, safe to put in a URL."""
    issued = int(issued_at if issued_at is not None else time.time())
    payload = f"{payout_id}|{invoice_number}|{issued}"
    encoded = _b64(payload.encode())
    return f"{encoded}.{_sign(encoded)}"


def verify(token: str) -> tuple[str, str] | None:
    """The (payout id, invoice number) a token names, or None.

    Returns None for anything that is not a token we issued and that has not
    expired. The caller then has one more check to make — that the invoice
    number still matches the row — which is what makes a re-issued invoice
    invalidate the links already in the world.
    """
    if not token or "." not in token:
        return None

    encoded, _, signature = token.rpartition(".")
    # compare_digest, not ==: string comparison returns early on the first
    # differing byte, and that timing is enough to forge a signature one byte
    # at a time given enough attempts.
    if not hmac.compare_digest(signature, _sign(encoded)):
        return None

    try:
        payout_id, invoice_number, issued = _unb64(encoded).decode().split("|")
        age = time.time() - int(issued)
    except (ValueError, UnicodeDecodeError):
        return None

    # A negative age means a clock moved, not that the token is from the
    # future in any meaningful sense — but it is also not something we issued
    # under normal conditions, so it does not open an invoice.
    if age < 0 or age > TOKEN_TTL_SECONDS:
        return None

    return payout_id, invoice_number


def invoice_url(payout_id: str, invoice_number: str) -> str:
    """The absolute address of the pay-this-invoice page.

    Absolute because mail is read outside the app: a relative path in an email
    resolves against the mail client, where it means nothing.
    """
    return f"{settings.public_app_url}/invoice/{sign(payout_id, invoice_number)}"
