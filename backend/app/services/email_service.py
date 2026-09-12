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


# Providers that refuse mail without a login. The check used to pass on host
# and from alone, so a Gmail setup with no credentials was reported as
# configured, smtp.login was skipped because SMTP_USER was empty, and the
# provider answered "530 Authentication Required" — a worse error, one step
# further in, after the operator thought they were done.
_AUTH_REQUIRED_HOSTS = (
    "gmail.com", "googlemail.com",
    "outlook.com", "office365.com", "hotmail.com",
    "yahoo.com", "yandex.ru", "mail.ru",
    "sendgrid.net", "mailgun.org", "postmarkapp.com", "amazonaws.com",
)


def missing_config() -> str | None:
    """What stops mail being sent, phrased so an operator can act on it.

    Returns None when nothing does.
    """
    if not settings.SMTP_HOST or not settings.SMTP_FROM:
        return "Pochta serveri sozlanmagan (SMTP_HOST va SMTP_FROM kerak)"

    host = settings.SMTP_HOST.strip().lower()
    if any(host == d or host.endswith("." + d) for d in _AUTH_REQUIRED_HOSTS):
        if not (settings.SMTP_USER and settings.SMTP_PASSWORD):
            return (
                f"{settings.SMTP_HOST} autentifikatsiya talab qiladi — "
                "SMTP_USER va SMTP_PASSWORD ham kerak "
                "(Gmail uchun oddiy parol emas, App Password)"
            )

    # Half a credential is a mistake whichever half is missing.
    if bool(settings.SMTP_USER) != bool(settings.SMTP_PASSWORD):
        return "SMTP_USER va SMTP_PASSWORD birgalikda kiritilishi kerak"

    return None


def is_configured() -> bool:
    """Whether mail can be sent at all.

    Checked by the endpoint before it does any work, so an operator is told
    what is missing instead of watching a payout half-complete.
    """
    return missing_config() is None


def send_email(*, to: str, subject: str, text_body: str, html_body: str | None = None) -> None:
    """Send one message, or raise.

    Never returns a boolean. A caller that has to remember to check a return
    value is a caller that will eventually forget, and the thing it would
    forget about is whether a company was ever billed.
    """
    problem = missing_config()
    if problem:
        raise HTTPException(status_code=503, detail=problem)

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
