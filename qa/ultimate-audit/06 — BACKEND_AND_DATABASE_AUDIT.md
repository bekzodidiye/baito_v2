# 06 — BACKEND AND DATABASE AUDIT: FASTAPI, SQLALCHEMY & ALEMBIC

## 1. FastAPI Framework & Endpoint Architecture

- **Dependency Injection**:
  - Database sessions are provided via `deps.get_db` (read/general) and `deps.get_tx_db` (transaction-managed for write endpoints).
  - Previously identified issue: In long-lived WebSocket connections, `Depends(get_db)` held database connections open for the duration of the socket.
  - Fix verified: `websocket.py` now uses localized, short-lived `SessionLocal()` context blocks for authentication and participant checks, instantly releasing connection pool slots.
- **Pydantic Validation**:
  - Request models enforce strict boundary validations (`WithdrawRequest` requires `MIN_WITHDRAWAL_UZS` of 5,000 to `MAX_WITHDRAWAL_UZS` of 50,000,000).
  - Response models utilize `model_validate(from_attributes=True)` ensuring ORM entities are sanitized before serialization.

---

## 2. Database Schema, Indexing & Alembic Migrations

### Migration Tree Status
- The migration history is linear with a single clean head:
  `0023_add_dispute_unique (head)`
- Historical branch reconciliations (`75143b7a6f6a_merge_migration_branches.py`) successfully resolved divergent heads.

### Indexing Analysis & PostGIS Performance
- **Spatial Map Queries**:
  - Migration `0020_spatial_map_indexes.py` added composite indexes on coordinates and job status:
    `CREATE INDEX ix_jobs_status_lat_lng ON jobs (status, latitude, longitude);`
    `CREATE INDEX ix_jobs_status_coord_xy ON jobs (status, coordinate_x, coordinate_y);`
  - Allows BBox queries `WHERE status = 'open' AND latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?` to execute index range scans rather than full table scans.
- **Foreign Key Indexes**:
  - Migration `0003_message_read_and_fk_indexes.py` ensured indexes on `messages.chatId`, `applications.jobId`, `applications.workerId`, and `transactions.userId`.
  - Prevents table locks during cascade operations and eliminates sequential scans on joined lookups.
- **Unique Constraints for Concurrency Protection**:
  - Migration `0022_add_application_unique_constraint.py` added a database-level unique constraint on `(job_id, worker_id)` for non-cancelled applications. Even under extreme parallel races, duplicate applications cannot be written to PostgreSQL.
  - Migration `0023_add_dispute_unique.py` enforced a unique constraint on `(job_id, initiated_by_id)`.

---

## 3. Query Performance & Concurrency Hotspots

1. **SQL Chunking for Bulk Queries**:
   - In `backend/app/api/v1/endpoints/jobs/read.py:968`, lookups for hired applications count across large job sets are chunked in batches of 500 (`chunk_size = 500`). This prevents exceeding PostgreSQL query variable parameter limits (maximum 65,535 parameters).
2. **N+1 Query Elimination in Job Feeds**:
   - `get_jobs` and `get_map_jobs` fetch company and employer metadata via batched lookups or SQL `GROUP BY` aggregations rather than per-row queries inside loops.
3. **Session Revocation Garbage Collection**:
   - Migration `0019_close_idle_sessions.py` and `app/services/session_window.py` enforce a 30-day idle window. Stale tokens are rejected at the ORM layer without unbounded session table growth.
