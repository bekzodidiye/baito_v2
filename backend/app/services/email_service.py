"""Sending mail. The only caller today is the payout invoice.

Deliberately small and deliberately loud. The failure this guards against is
the one that costs money quietly: an invoice the admin panel reports as sent,
which never left the building. So an unconfigured or unreachable SMTP server
raises rather than returning, and the caller does not record a send that did
not happen.
"""

from __future__ import annotations

import logging
import smtplib
import ssl
from email.message import EmailMessage

from fastapi import HTTPException

from app.core.config import settings

logger = logging.getLogger(__name__)


def is_configured() -> bool:
    """Whether mail can be sent at all.

    Checked by the endpoint before it does any work, so an operator is told
    "SMTP is not configured" instead of watching a payout half-complete.
    """
    return bool(settings.SMTP_HOST and settings.SMTP_FROM)


def send_email(*, to: str, subject: str, text_body: str, html_body: str | None = None) -> None:
    """Send one message, or raise.

    Never returns a boolean. A caller that has to remember to check a return
    value is a caller that will eventually forget, and the thing it would
    forget about is whether a company was ever billed.
    """
    if not is_configured():
        raise HTTPException(
            status_code=503,
            detail="Pochta serveri sozlanmagan (SMTP_HOST va SMTP_FROM kerak)",
        )

    recipient = (to or "").strip()
    if not recipient or "@" not in recipient:
        raise HTTPException(status_code=400, detail="Qabul qiluvchi pochtasi noto'g'ri")

    message = EmailMessage()
    message["From"] = settings.SMTP_FROM
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content(text_body)
    if html_body:
        message.add_alternative(html_body, subtype="html")

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as smtp:
            if settings.SMTP_STARTTLS:
                smtp.starttls(context=ssl.create_default_context())
            if settings.SMTP_USER:
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(message)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 — the reason varies; the outcome does not
        # The address is logged, the body is not: an invoice carries bank
        # details and a company's business with us.
        logger.warning("Invoice email to %s failed: %s", recipient, exc)
        raise HTTPException(
            status_code=502,
            detail="Pochta yuborilmadi. Server javob bermadi yoki rad etdi.",
        ) from exc
