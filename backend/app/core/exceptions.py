import logging

from fastapi import Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.core.error_reporter import report_exception

logger = logging.getLogger(__name__)


def _actor(request: Request) -> str | None:
    """Best-effort user id, so an alert says who hit the error."""
    try:
        user = getattr(request.state, "user", None)
        return getattr(user, "id", None)
    except Exception:
        return None


async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.error("Database error: %s", exc, exc_info=True)
    report_exception(
        exc, where="database", method=request.method,
        path=request.url.path, user_id=_actor(request),
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Database error occurred. Please try again later."},
    )


async def generic_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled error: %s", exc, exc_info=True)
    # Without this the only trace of a production failure was a log line in a
    # container that gets recreated on every deploy.
    report_exception(
        exc, where="unhandled", method=request.method,
        path=request.url.path, user_id=_actor(request),
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


class DomainException(Exception):
    """Base exception for all domain logic errors."""
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class JobNotFoundError(DomainException):
    def __init__(self, message: str = "Ish e'loni topilmadi"):
        super().__init__(message, status_code=404)


class ActionForbiddenError(DomainException):
    def __init__(self, message: str = "Ushbu amalni bajarish taqiqlanadi"):
        super().__init__(message, status_code=403)


class InvalidJobStateError(DomainException):
    def __init__(self, message: str = "Ushbu ish uchun bu amalni bajarib bo'lmaydi"):
        super().__init__(message, status_code=400)


class ApplicationError(DomainException):
    def __init__(self, message: str):
        super().__init__(message, status_code=400)


