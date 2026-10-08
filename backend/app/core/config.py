import os
import secrets
from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Baito API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    SECRET_KEY: str = os.getenv("SECRET_KEY", "")

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    ACCESS_COOKIE_NAME: str = "baito_access"
    REFRESH_COOKIE_NAME: str = "baito_refresh"

    # Minimum password length accepted anywhere a user sets one.
    MIN_PASSWORD_LENGTH: int = 8
    # bcrypt work factor. Lowered only by the test suite.
    BCRYPT_ROUNDS: int = int(os.getenv("BCRYPT_ROUNDS", "12"))

    # A verified phone number stays claimable for this long after /verify-sms,
    # which is how registration proves the caller actually owns the number.
    PHONE_VERIFICATION_TTL_SECONDS: int = 30 * 60
    SMS_CODE_TTL_SECONDS: int = 300
    SMS_MAX_ATTEMPTS: int = 5

    SQL_HOST: str = os.getenv("DATABASE_URL", "sqlite:///./baito_new.db")

    # Redis & Celery
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # Sentry (Monitoring)
    SENTRY_DSN: str = os.getenv("SENTRY_DSN", "")

    # AWS S3 / MinIO Configuration
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    AWS_BUCKET_NAME: str = os.getenv("AWS_BUCKET_NAME", "baito-bucket")
    AWS_ENDPOINT_URL: str = os.getenv("AWS_ENDPOINT_URL", "http://localhost:9000") # for MinIO

    CORS_ORIGINS_RAW: str = os.getenv("CORS_ORIGINS", "")

    # Where a link in an email points. Mail is read outside the application, so
    # a relative path is worthless there — this has to be the absolute address
    # the public actually reaches us on.
    PUBLIC_APP_URL: str = os.getenv("PUBLIC_APP_URL", "")

    # Telegram — reused by the error reporter. The backup bot already owns a
    # channel; pointing exceptions at it costs no extra infrastructure.
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    TELEGRAM_CHAT_ID: str = os.getenv("TELEGRAM_CHAT_ID", "")

    # TextUp SMS Integration
    TEXTUP_EMAIL: str = os.getenv("TEXTUP_EMAIL", "")
    TEXTUP_PASSWORD: str = os.getenv("TEXTUP_PASSWORD", "")

    # SMTP, for the invoice a company is sent after a shift is paid out. With
    # no host configured the send is refused rather than silently dropped —
    # an invoice that was never delivered but reported as sent is worse than
    # one that plainly failed.
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM: str = os.getenv("SMTP_FROM", "")
    SMTP_STARTTLS: bool = os.getenv("SMTP_STARTTLS", "true").lower() in ("1", "true", "yes")

    # Development-only conveniences. Both are refused in production.
    SEED_DEMO_DATA: bool = os.getenv("SEED_DEMO_DATA", "false").lower() in ("1", "true", "yes")
    # When SMS credentials are absent in development, /send-sms returns the code
    # in its response so the signup flow stays testable without a real gateway.
    SMS_DEV_ECHO_CODE: bool = os.getenv("SMS_DEV_ECHO_CODE", "true").lower() in ("1", "true", "yes")

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() in ("production", "prod")

    @property
    def error_reporting_enabled(self) -> bool:
        """Telegram reporting is on when both credentials are present.

        Deliberately not gated on production: a staging box with the values set
        should report too, and a box without them stays silent rather than
        failing.
        """
        return bool(self.TELEGRAM_BOT_TOKEN and self.TELEGRAM_CHAT_ID)

    @property
    def cors_origins(self) -> List[str]:
        if self.CORS_ORIGINS_RAW:
            return [o.strip() for o in self.CORS_ORIGINS_RAW.split(",") if o.strip()]
        return [
            "https://baito.uz",
            "http://localhost",
            "https://localhost",
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:8080",
            "capacitor://localhost",
            "ionic://localhost",
            "http://127.0.0.1",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
        ]

    @property
    def public_app_url(self) -> str:
        """The address to put in an email, without a trailing slash.

        Falls back to the first real https origin we accept, because that is
        the same list the deployment already has to keep correct — one more
        variable that can silently disagree with reality is one more way for a
        link in an invoice to lead nowhere.
        """
        if self.PUBLIC_APP_URL:
            return self.PUBLIC_APP_URL.rstrip("/")
        for origin in self.cors_origins:
            if origin.startswith("https://") and "localhost" not in origin:
                return origin.rstrip("/")
        return "https://baito.uz"

    @property
    def cookie_secure(self) -> bool:
        return self.is_production

    @property
    def cookie_samesite(self) -> str:
        return "strict" if self.is_production else "lax"

settings = Settings()

if not settings.SECRET_KEY:
    if settings.is_production:
        raise RuntimeError(
            "SECRET_KEY environment variable is required in production. "
            "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
        )
    # Ephemeral per-process key for local development: tokens die with the server,
    # which is what we want — no shared secret can leak into the repo.
    settings.SECRET_KEY = secrets.token_hex(32)
    print("WARNING: SECRET_KEY not set. Using an ephemeral development key.")

if settings.is_production:
    # These carry real consequences in production, so refuse to boot on a
    # value that came from a repo default rather than the deployment.
    _WEAK_SECRETS = {
        "baito_secret_jwt_key_2026",
        "test_secret_key",
        "changeme",
        "secret",
    }
    if settings.SECRET_KEY in _WEAK_SECRETS:
        raise RuntimeError(
            "SECRET_KEY is a known placeholder value. Generate a fresh one before deploying."
        )
    if not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY:
        raise RuntimeError(
            "AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are required in production."
        )
    if settings.AWS_SECRET_ACCESS_KEY == "minioadmin":
        raise RuntimeError(
            "Refusing to start with the default MinIO password in production. "
            "Set MINIO_ROOT_USER and MINIO_ROOT_PASSWORD in .env, then restart "
            "the minio service so it picks up the new credentials."
        )
    if settings.SEED_DEMO_DATA:
        raise RuntimeError("SEED_DEMO_DATA cannot be enabled in production.")

if settings.SQL_HOST.startswith("postgres://"):
    settings.SQL_HOST = settings.SQL_HOST.replace("postgres://", "postgresql://", 1)
