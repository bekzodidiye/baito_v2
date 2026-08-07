from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError
from app.api.v1.api import api_router
from app.core.config import settings
from app.core.exceptions import sqlalchemy_exception_handler, generic_exception_handler
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.db.init_db import init_db

# Create tables
Base.metadata.create_all(bind=engine)

# Seed initial data if needed
try:
    with SessionLocal() as db:
        init_db(db)
except Exception as e:
    print(f"Warning DB seed error: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Exception Handlers
app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include router for both /api/v1 and /api for full frontend compatibility
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(api_router, prefix="/api")

@app.get("/api/health")
@app.get("/api/v1/health")
def health_check():
    return {"status": "ok", "version": settings.VERSION}
