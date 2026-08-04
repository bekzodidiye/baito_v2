import os
import secrets
from typing import List
from pydantic_settings import BaseSettings

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

    SQL_HOST: str = os.getenv("DATABASE_URL", "sqlite:///./baito_new.db")

    CORS_ORIGINS_RAW: str = os.getenv("CORS_ORIGINS", "")

    class Config:
        env_file = "../.env"
        case_sensitive = True

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() in ("production", "prod")

    @property
    def cors_origins(self) -> List[str]:
        if self.CORS_ORIGINS_RAW:
            return [o.strip() for o in self.CORS_ORIGINS_RAW.split(",") if o.strip()]
        if self.is_production:
            return ["https://baito.uz"]
        return ["http://localhost:5173", "http://localhost:3000", "https://baito.uz"]

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

if settings.SQL_HOST.startswith("postgres://"):
    settings.SQL_HOST = settings.SQL_HOST.replace("postgres://", "postgresql://", 1)
