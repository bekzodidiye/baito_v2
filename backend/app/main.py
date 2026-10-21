import logging

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.exceptions import DomainException, sqlalchemy_exception_handler, generic_exception_handler
from app.core.limiter import limiter
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.db.init_db import init_db
from app.redis_client import redis_client, redis_is_mock
from app.s3_client import create_bucket_if_not_exists

logger = logging.getLogger(__name__)

if not settings.SENTRY_DSN and not settings.error_reporting_enabled and settings.is_production:
    # Silence here is the problem: the integration is wired up and the package
    # is installed, so everything looks fine, but with no DSN every production
    # exception goes nowhere. Say so loudly at boot and again in /api/health.
    logger.error(
        "SENTRY_DSN is not set — production errors are NOT being reported anywhere."
    )

if settings.SENTRY_DSN:
    try:
        import sentry_sdk
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            traces_sample_rate=0.2,
            profiles_sample_rate=0.2,
            environment=settings.ENVIRONMENT,
            send_default_pii=False,
        )
        logger.info("Sentry error reporting is active.")
    except ImportError:
        logger.warning("sentry_sdk not installed, skipping Sentry initialization.")
    except Exception as e:
        # A malformed DSN used to raise BadDsn at import time and take the
        # whole application down — uvicorn workers died in a loop and the API
        # went offline because of a typo in a monitoring setting. Observability
        # config must never be able to stop the app from serving.
        logger.error(
            "Sentry could not be initialised (%s). Continuing without it — "
            "check that SENTRY_DSN is a full DSN URL.", e
        )

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Prepare storage and schema.

    In production the schema is owned by Alembic (``alembic upgrade head`` runs
    as part of deployment); calling ``create_all`` there would quietly diverge
    from the migration history, so it is limited to development.
    """
    import anyio
    limiter = anyio.to_thread.current_default_thread_limiter()
    limiter.total_tokens = 200

    if not settings.is_production:
        Base.metadata.create_all(bind=engine)

    if settings.ENVIRONMENT != "test":
        try:
            create_bucket_if_not_exists(settings.AWS_BUCKET_NAME)
        except Exception as e:
            logger.warning("Could not prepare the media bucket: %s", e)

    try:
        with SessionLocal() as db:
            init_db(db)
    except Exception as e:
        logger.warning("Demo data seeding skipped: %s", e)
        
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=None if settings.is_production else f"{settings.API_V1_STR}/openapi.json",
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None,
    lifespan=lifespan,
)





# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=500)

# Exception Handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning("422 Validation error on %s: %s", request.url.path, exc.errors())
    return JSONResponse(
        status_code=422,
        content={"detail": jsonable_encoder(exc.errors())},
    )


@app.exception_handler(DomainException)
async def domain_exception_handler(request: Request, exc: DomainException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message},
    )

app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# The API only ever returns JSON, so it needs no script/style sources at all.
# The HTML shell is served by nginx, which sets its own (looser) policy.
CSP = (
    "default-src 'none'; "
    "img-src 'self' data: blob:; "
    "frame-ancestors 'none'; "
    "base-uri 'none'; "
    "form-action 'none'"
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Content-Security-Policy"] = CSP
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(self), camera=(), microphone=()"
    # Media responses carry their own caching rules; everything else is
    # per-user data that must never land in a shared cache.
    response.headers.setdefault("Cache-Control", "no-store")
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


# CORS — credentials are cookies now, so the origin list must stay explicit.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Refresh-Token", "Idempotency-Key"],
)

# Include router for both /api/v1 and /api for full frontend compatibility
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(api_router, prefix="/api")


@app.get("/api/health")
@app.get("/api/v1/health")
def health_check(response: Response):
    """Liveness/readiness probe.

    Failure details are logged, never returned — the old version echoed the
    raw driver exception, which includes the database connection string.
    """
    health_status = {
        "status": "ok",
        "version": settings.VERSION,
        "database": "unknown",
        "redis": "unknown",
    }

    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
        health_status["database"] = "connected"
    except Exception as e:
        logger.error("Health check: database unhealthy: %s", e)
        health_status["database"] = "unhealthy"
        health_status["status"] = "degraded"
        response.status_code = 503

    if settings.SENTRY_DSN:
        health_status["error_reporting"] = "sentry"
    elif settings.error_reporting_enabled:
        health_status["error_reporting"] = "telegram"
    else:
        health_status["error_reporting"] = "none"

    if redis_is_mock():
        # An in-process stand-in is not a working Redis; say so.
        health_status["redis"] = "unavailable (in-memory fallback)"
        if health_status["status"] == "ok":
            health_status["status"] = "degraded"
    else:
        try:
            redis_client.ping()
            health_status["redis"] = "connected"
        except Exception as e:
            logger.error("Health check: redis unhealthy: %s", e)
            health_status["redis"] = "unhealthy"
            if health_status["status"] == "ok":
                health_status["status"] = "degraded"

    return health_status
