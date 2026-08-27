from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.config import settings

engine_kwargs = {}
if settings.SQL_HOST.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
    if ":memory:" in settings.SQL_HOST:
        engine_kwargs["poolclass"] = StaticPool
    engine = create_engine(settings.SQL_HOST, **engine_kwargs)
else:
    engine_kwargs["pool_size"] = 20
    engine_kwargs["max_overflow"] = 10
    engine_kwargs["pool_recycle"] = 1800
    engine_kwargs["pool_timeout"] = 30
    engine = create_engine(settings.SQL_HOST, pool_pre_ping=True, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
