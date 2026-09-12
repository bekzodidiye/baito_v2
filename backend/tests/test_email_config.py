"""What the SMTP guard accepts, and what it now catches.

The guard used to check SMTP_HOST and SMTP_FROM only. A Gmail setup with no
credentials passed it, then smtp.login was skipped and Gmail answered
"530 Authentication Required" — the operator got a worse error one step
further in, having already been told the configuration was fine.
"""
import pytest

from app.core.config import settings
from app.services import email_service


@pytest.fixture
def smtp(monkeypatch):
    """Set the SMTP settings for one test, whatever the environment holds."""
    def apply(**values):
        for key in ("SMTP_HOST", "SMTP_FROM", "SMTP_USER", "SMTP_PASSWORD"):
            monkeypatch.setattr(settings, key, values.get(key, ""), raising=False)
    return apply


def test_nothing_configured_says_so(smtp):
    smtp()
    assert "SMTP_HOST" in (email_service.missing_config() or "")
    assert email_service.is_configured() is False


def test_gmail_without_credentials_is_refused(smtp):
    smtp(SMTP_HOST="smtp.gmail.com", SMTP_FROM="hisob@example.com")
    problem = email_service.missing_config() or ""
    assert "SMTP_USER" in problem
    assert "App Password" in problem
    assert email_service.is_configured() is False


def test_gmail_with_credentials_is_accepted(smtp):
    smtp(
        SMTP_HOST="smtp.gmail.com", SMTP_FROM="hisob@example.com",
        SMTP_USER="hisob@example.com", SMTP_PASSWORD="app-password",
    )
    assert email_service.missing_config() is None
    assert email_service.is_configured() is True


@pytest.mark.parametrize(
    "host",
    ["smtp.gmail.com", "smtp.office365.com", "smtp.yandex.ru", "email-smtp.eu-west-1.amazonaws.com"],
)
def test_every_provider_that_needs_a_login_is_covered(smtp, host):
    smtp(SMTP_HOST=host, SMTP_FROM="hisob@example.com")
    assert "SMTP_USER" in (email_service.missing_config() or "")


def test_an_unauthenticated_internal_relay_still_works(smtp):
    # A LAN relay that takes mail without a login is a legitimate setup and
    # must not be broken by the stricter check.
    smtp(SMTP_HOST="mailrelay.internal", SMTP_FROM="hisob@example.com")
    assert email_service.missing_config() is None


def test_half_a_credential_is_a_mistake(smtp):
    smtp(SMTP_HOST="mailrelay.internal", SMTP_FROM="hisob@example.com", SMTP_USER="someone")
    assert "birgalikda" in (email_service.missing_config() or "")

    smtp(SMTP_HOST="mailrelay.internal", SMTP_FROM="hisob@example.com", SMTP_PASSWORD="secret")
    assert "birgalikda" in (email_service.missing_config() or "")
