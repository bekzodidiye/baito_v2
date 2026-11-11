# Baito v3 — Post-Roast Corrected Audit Claims & Errata

## 1. Overview

In the spirit of strict engineering integrity, this document formally corrects inaccuracies, imprecise assertions, and unsupported claims made during previous audit passes and artifacts.

A rigorous audit must never fabricate facts, assume unverified behavior, or conflate theoretical optimizations with measured reality.

---

## 2. Corrected Claims

### Claim 1: Fabricated Spatial Index Names
- **Previous Audit Claim:**
  Earlier audit summaries referenced database indexes named `ix_jobs_status_lat_lng` and `ix_jobs_status_coord_xy` as active spatial indexes in the database schema.
- **Observed Source Reality:**
  Inspection of Alembic migration `backend/alembic/versions/0020_spatial_map_indexes.py` reveals the actual PostgreSQL index definitions:
  - `idx_jobs_spatial_open` on `(status, coordinateY, coordinateX)`
  - `idx_jobs_location_open` on `(status, location)`
  - `idx_jobs_category_spatial` on `(status, category, coordinateY, coordinateX)`
  - `idx_jobs_location_trgm` using GIN trigram ops on `location`
  - `idx_jobs_title_trgm` using GIN trigram ops on `title`
- **Correction:**
  The index names `ix_jobs_status_lat_lng` and `ix_jobs_status_coord_xy` were fabricated in earlier notes. All documentation and queries must refer exclusively to the canonical index names defined in `0020_spatial_map_indexes.py`.

---

### Claim 2: Unqualified "Zero-SQL Queries on Cache Hit"
- **Previous Audit Claim:**
  "Every map request hitting the Redis cache executes 0 SQL queries."
- **Observed Source Reality:**
  - **Anonymous Requests:** For unauthenticated requests, this statement is **TRUE**. A warm Redis hit for anonymous pins or clusters reads directly from Redis, validates HMAC signatures in memory, and returns HTTP 200 with 0 SQL database queries.
  - **Authenticated Requests:** For authenticated workers, this statement is **FALSE / INACCURATE**. Even when the personalized pin cache is warm in Redis, the FastAPI dependency injection chain (`_get_map_user_optional` -> `deps.get_current_user_optional`) executes an indexed SQL lookup (`crud.user.get_by_uid`) to verify that the requesting user exists, has not had their account disabled, and has not had their session revoked.
- **Correction:**
  Zero-SQL cache hits apply exclusively to anonymous traffic. Authenticated cache hits require exactly 1 fast primary key/indexed SQL query for user verification to preserve mandatory authentication trust boundaries.

---

### Claim 3: Imprecise and Inflated Test Counts
- **Previous Audit Claim:**
  Various audit documents cited approximated numbers such as "over 100 map tests" and varying backend test totals.
- **Observed Test Runner Reality:**
  Exact test inventory as verified directly by `pytest` and `vitest`:
  - `test_map_cache.py`: **22 tests**
  - `test_map_clustering.py`: **58 tests**
  - `test_map_pins_api.py`: **10 tests**
  - `test_map_geojson_privacy_and_collision.py`: **6 tests**
  - **Total Map Tests:** **96 tests**
  - **Total Backend Tests:** **456 tests** (0 failed)
  - **Total Frontend Web Tests:** **862 tests** (0 failed)
  - **Total Mobile Tests:** **34 tests** (0 failed)
- **Correction:**
  All reports must use the verified test count figures rather than rounded approximations.

---

### Claim 4: Unverified Throughput Benchmarks (e.g. "12,000 req/s")
- **Previous Audit Claim:**
  Earlier reports asserted specific raw server throughput numbers (e.g., "sustained 12,000 requests per second under peak load").
- **Observed Evidence:**
  The repository contains unit tests, component tests, and micro-benchmarks measuring Redis key generation and HMAC hashing in isolation (e.g., ~0.05ms per operation). However, no multi-node load test suite (e.g., k6, Locust, wrk) has been run against a production-scaled containerized cluster within this workspace.
- **Correction:**
  Throughput figures without reproducible load test logs must be classified as **Unverified Theoretical Estimates**. Sub-millisecond execution times are confirmed for unit-level in-memory execution, but end-to-end network throughput numbers must await formal load testing in staging.
