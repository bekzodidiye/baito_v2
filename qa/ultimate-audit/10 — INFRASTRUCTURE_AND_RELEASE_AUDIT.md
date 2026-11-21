# 10 — INFRASTRUCTURE, DEVOPS & SRE AUDIT

## 1. Containerization & Docker Setup

- **Multi-Stage Dockerfiles**:
  - `backend/Dockerfile`: Uses lightweight `python:3.11-slim`. Compiles dependencies in builder stage, copies clean wheels, drops root privileges (`USER appuser`).
  - `frontend/Dockerfile`: Uses Node 20-alpine for building static assets with Vite, serves via lightweight Nginx 1.25-alpine.
- **Docker Compose Topology**:
  - Services defined:
    - `api`: FastAPI application behind Gunicorn Uvicorn workers.
    - `worker`: Celery asynchronous worker for task execution.
    - `beat`: Celery Beat for scheduled jobs (idle session cleanup, SMS retries).
    - `db`: PostgreSQL 16 with PostGIS extension.
    - `redis`: Redis 7.2 with persistent RDB snapshots.
    - `web`: Nginx frontend reverse proxy.
  - Health checks: Configured on `db` (`pg_isready`), `redis` (`redis-cli ping`), and `api` (`/api/v1/health`).

---

## 2. Observability, Logging & Error Tracking

- **Sentry Error Tracking**:
  - Protected initialization: If `SENTRY_DSN` is empty or invalid, the backend stays completely operational (`test_a_malformed_sentry_dsn_cannot_take_the_app_down`).
  - Rate limiting on error notifications: Identical unhandled exceptions are aggregated and throttled to prevent notification storms to Telegram webhooks (`test_identical_errors_are_reported_once_per_hour`).
- **Structured JSON Logging**:
  - Backend logs omit sensitive PII (credit card numbers, passport series, auth tokens).
  - Request IDs (`X-Request-ID`) propagate across HTTP calls, log entries, and Celery tasks for unified distributed tracing.

---

## 3. Backup, Disaster Recovery & Zero-Downtime Releases

- **Database Backup Strategy**:
  - Daily automated `pg_dump` with gzip compression stored to off-site S3 bucket with 30-day retention and object versioning.
  - Point-in-time recovery (PITR) via Write-Ahead Logging (WAL-G / pgBackRest) recommended for production scale.
- **Database Migration Safety**:
  - Zero-downtime deployment pattern: Migrations are strictly backward-compatible.
  - Columns are added as nullable or with defaults before application code references them.
  - Alembic check (`alembic heads`) must pass before rolling container updates.
