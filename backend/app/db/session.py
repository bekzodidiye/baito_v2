from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.config import settings

engine_kwargs = {}
if settings.SQL_HOST.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
    if ":memory:" in settings.SQL_HOST:
        engine_kwargs["poolclass"] = StaticPool
    engine = create_engine(settings.SQL_HOST, **engine_kwargs)

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.execute("PRAGMA busy_timeout=10000;")
        if ":memory:" not in settings.SQL_HOST:
            try:
                cursor.execute("PRAGMA journal_mode=WAL;")
            except Exception:
                pass
        cursor.close()
else:
    # Every process that imports this gets its own pool, so the ceiling is
    # (pool_size + max_overflow) x processes, and it has to fit inside the
    # server's max_connections of 100:
    #
    #   4 uvicorn workers x 15 = 60
    #   2 celery workers   x 15 = 30
    #   beat + backup bot        =  4
    #                              --
    #                              94
    #
    # The previous 20+10 was sized for two workers (60 total). Raising the
    # worker count to four without shrinking this would have asked for 120
    # connections from a server that allows 100, and the overflow surfaces as
    # "too many clients" rather than as a queue.
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 5
    engine_kwargs["pool_recycle"] = 1800
    engine_kwargs["pool_timeout"] = 30
    engine = create_engine(settings.SQL_HOST, pool_pre_ping=True, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
