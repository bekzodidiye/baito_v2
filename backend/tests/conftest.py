import os
import tempfile

os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("SECRET_KEY", "test_secret_key_for_pytest_only_0123456789abcdef")
_DB_DIR = tempfile.mkdtemp(prefix="baito-tests-")
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_DB_DIR}/test.db")
os.environ.setdefault("SEED_DEMO_DATA", "false")
os.environ["TEXTUP_EMAIL"] = ""
os.environ["TEXTUP_PASSWORD"] = ""
os.environ["SMS_DEV_ECHO_CODE"] = "true"
os.environ["BCRYPT_ROUNDS"] = "4"
# Point at a port nothing listens on so the suite always falls back to the
# in-process MockRedis. Without this, tests silently attached to whatever Redis
# happened to be running on the developer's machine and picked up state from
# previous runs — the error-reporter dedupe test passed once and then failed
# for an hour because its key was still live in that real Redis.
os.environ.setdefault("REDIS_URL", "redis://127.0.0.1:1/0")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.core.limiter import limiter  # noqa: E402
from app.core.security import get_password_hash  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Job, User  # noqa: E402
from app.models.job import JobStatus  # noqa: E402

TEST_PASSWORD = "Str0ngPassw0rd"


from app.core.config import settings  # noqa: E402
settings.TEXTUP_EMAIL = ""
settings.TEXTUP_PASSWORD = ""
settings.SMS_DEV_ECHO_CODE = True
settings.BCRYPT_ROUNDS = 4
settings.UZUM_TERMINAL_ID = ""
settings.UZUM_SECRET_KEY = ""
settings.TELEGRAM_BOT_TOKEN = ""
settings.TELEGRAM_CHAT_ID = ""
limiter.enabled = False


@pytest.fixture(scope="session", autouse=True)
def _schema():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def _clean_tables(_schema):
    yield
    with SessionLocal() as db:
        for table in reversed(Base.metadata.sorted_tables):
            db.execute(table.delete())
        db.commit()


def _flush_redis():
    """Empty whichever client is in use.

    Only the in-memory fallback used to be cleared, so against a real Redis the
    fixture did nothing: keys with a long TTL — the error reporter dedupes for
    an hour — survived between runs and the second run of the suite failed.
    """
    from app.redis_client import redis_client

    store = getattr(redis_client, "store", None)
    if isinstance(store, dict):
        store.clear()
        return
    try:
        redis_client.flushdb()
    except Exception:
        # A Redis that cannot be flushed is not a reason to fail every test;
        # the suite is simply back to the isolation it had before.
        pass


@pytest.fixture(autouse=True)
def _clean_redis():
    _flush_redis()
    yield
    _flush_redis()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def make_user(role="worker", phone="+998901112233", email=None, **kwargs) -> User:
    import uuid
    with SessionLocal() as db:
        user = User(
            id=str(uuid.uuid4()),
            uid=str(uuid.uuid4()),
            email=email,
            phone=phone,
            name=kwargs.pop("name", f"Test {role}"),
            role=role,
            hashed_password=get_password_hash(TEST_PASSWORD),
            balance=kwargs.pop("balance", 0),
            isVerified=True,
            isBanned=False,
            **kwargs,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        db.expunge(user)
        return user


def make_job(employer_id: str, **kwargs) -> Job:
    import uuid
    with SessionLocal() as db:
        job = Job(
            id=str(uuid.uuid4()),
            employerId=employer_id,
            title=kwargs.pop("title", "Kassir kerak"),
            company=kwargs.pop("company", "Korzinka"),
            salary=kwargs.pop("salary", "250000"),
            location=kwargs.pop("location", "Toshkent"),
            description=kwargs.pop("description", "Oddiy kassir ishi"),
            status=kwargs.pop("status", JobStatus.OPEN),
            neededWorkers=kwargs.pop("neededWorkers", "1"),
            **kwargs,
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        db.expunge(job)
        return job


def login(client: TestClient, user: User) -> None:
    """Authenticate the shared TestClient cookie jar as ``user``."""
    resp = client.post(
        "/api/v1/auth/login",
        data={"username": user.phone, "password": TEST_PASSWORD},
    )
    assert resp.status_code == 200, resp.text
