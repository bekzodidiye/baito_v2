"""
Backend Main Entrypoint Delegate.
Re-exports the FastAPI app instance from app.main for convenience.
"""
from app.main import app

__all__ = ["app"]
