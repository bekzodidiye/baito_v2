import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Baito API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Read SECRET_KEY securely from environment variable or fallback to env file
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY", 
        "d04a6b2c8f9344d183fbc3df23d706a6b8ef98b10f8a8bb231f822ccb5774a9d"
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # Database URL configurable from env
    SQL_HOST: str = os.getenv("DATABASE_URL", "sqlite:///./baito_new.db")
    
    class Config:
        env_file = "../.env"
        case_sensitive = True

settings = Settings()

if settings.SQL_HOST.startswith("postgres://"):
    settings.SQL_HOST = settings.SQL_HOST.replace("postgres://", "postgresql://", 1)
