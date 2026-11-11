# Baito v3 — Post-Roast Confirmed Findings & Remediation

## Executive Overview

Following the adversarial "Ultimate Full Project Roast" audit and an independent code-level verification, this document details the verified defects, implemented code fixes, and dismissed false positives for the Baito v3 platform.

All remediations were implemented directly in the codebase and verified through exhaustive regression testing on isolated test infrastructure.

---

## Confirmed Findings & Implemented Fixes

### 1. P1: Authenticated GeoJSON HTTP Cache Privacy Violation
- **Affected File:** `backend/app/api/v1/endpoints/jobs/read.py` (`get_map_geojson`)
- **Vulnerability:**
  The `/api/v1/jobs/map/geojson` endpoint previously issued a static public cache header:
  `Cache-Control: public, max-age=15, stale-while-revalidate=30`
  regardless of whether the requester was an anonymous visitor or an authenticated worker.
  When an authenticated worker accessed the endpoint, the GeoJSON feature properties contained personalized fields:
  ```json
  "properties": {
    "applied": true,
    "bookmarked": false
  }
  ```
  If intermediate shared caches, CDNs, or corporate forward proxies cached this response under the public header, subsequent requests from anonymous users or other workers could receive Worker A's personalized GeoJSON payload.
- **Remediation:**
  In `get_map_geojson`:
  1. If `current_user` is present, `Cache-Control` is dynamically set to `private, no-cache`.
  2. If `current_user` is anonymous, `Cache-Control` remains `public, max-age=15, stale-while-revalidate=30`.
  3. Added `Vary: Cookie, Authorization, Accept-Encoding` to both 200 and 304 responses to ensure HTTP caches partition responses by client authentication context.

---

### 2. P2: Viewport Cache Key Collision via Sub-Decimal Bounding Coordinates
- **Affected File:** `backend/app/api/v1/endpoints/jobs/read.py`, `backend/app/core/map_cache.py`
- **Vulnerability:**
  The GeoJSON cache key was originally computed by rounding bounding box coordinates to 2 decimal places:
  `f"cache:jobs:geojson:v{version}:{round(min_lat, 2)}:{round(max_lat, 2)}:{round(min_lng, 2)}:{round(max_lng, 2)}"`
  Two decimal places correspond to a spatial resolution of ~1.11 km. Two distinct viewports (e.g. `min_lat=41.306` vs `min_lat=41.314`) rounded to `41.31`, colliding on the identical Redis cache key. A user viewing the narrower bounds would receive cached pins falling outside their requested viewport.
- **Remediation:**
  1. Implemented `build_map_geojson_cache_key()` in `app/core/map_cache.py` utilizing the canonical IEEE-754 coordinate formatter `_format_coord()`:
     ```python
     def build_map_geojson_cache_key(version: int, *, min_lat, max_lat, min_lng, max_lng) -> str:
         return f"{CACHE_MAP_GEOJSON_PREFIX}:v{version}:{_format_coord(min_lat)}:{_format_coord(max_lat)}:{_format_coord(min_lng)}:{_format_coord(max_lng)}"
     ```
  2. Integrated `build_map_geojson_cache_key` into `get_map_geojson`, completely eliminating viewport key collisions while preserving strict IEEE-754 precision.

---

### 3. P2: Internal 304 Not Modified Delegation Crash in GeoJSON & Tile Projections
- **Affected File:** `backend/app/api/v1/endpoints/jobs/read.py` (`get_map_geojson`, `get_map_tile`)
- **Vulnerability:**
  `get_map_geojson` and `get_map_tile` wrap `get_map_jobs(request, ...)` internally to retrieve pins before projecting them into GeoJSON or tile formats.
  When the external client sent an `If-None-Match` header matching the internal pins ETag, Starlette's `request` scope passed this header down into `get_map_jobs`.
  Consequently, `get_map_jobs` returned a conditional `Response(status_code=304)` with an empty body (`body=b""`).
  The outer `get_map_geojson` then attempted `json.loads(raw_pins_res.body)`, immediately crashing with `JSONDecodeError: line 1 column 1 (char 0)` and returning HTTP 500 Internal Server Error.
- **Remediation:**
  1. Before delegating to `get_map_jobs`, the internal request scope is sanitized by stripping conditional headers (`if-none-match`, `if-modified-since`):
     ```python
     clean_headers = [(k, v) for k, v in request.scope.get("headers", []) if k.lower() not in (b"if-none-match", b"if-modified-since")]
     internal_scope = dict(request.scope, headers=clean_headers)
     internal_request = Request(internal_scope)
     ```
  2. Explicitly verified `raw_pins_res.status_code == 200 and raw_pins_res.body` before invoking `json.loads`.

---

### 4. P2: WebSocket Token Exposure in Query Parameters & URL Logs
- **Affected Files:** `backend/app/api/v1/endpoints/chats/main.py`, `backend/app/api/v1/endpoints/chats/websocket.py`
- **Vulnerability:**
  WebSocket connections in browsers and mobile environments cannot always supply custom authorization headers during the initial HTTP upgrade handshake. Passing long-lived access JWT tokens in query parameters (`/ws?token=ey...`) exposes credentials in access logs, proxy logs, and mobile logging bridges.
- **Remediation:**
  1. Created endpoint `POST /api/v1/chats/{chat_id}/ws-ticket` requiring valid user authentication and participant authorization for the specified `chat_id`.
  2. The endpoint generates a cryptographically random 32-byte URL-safe ticket (`secrets.token_urlsafe(32)`), stored in Redis under `chat:ws_ticket:{ticket}` with a 60-second TTL.
  3. Updated `websocket_endpoint` to accept `?ticket=...`. The ticket is authenticated via single-use atomic consumption (`GET` + `DELETE`).
  4. Preserved backward compatibility for Cookie-based and legacy token-based upgrades.

---

### 5. P3: Frontend Type Definitions & Test Mock Alignment
- **Affected Files:** `frontend/src/types.ts`, `frontend/src/components/map/useJobMarkers.test.ts`
- **Vulnerability:**
  The `Job` interface in `frontend/src/types.ts` was missing optional fields (`coordinateX`, `coordinateY`, `latitude`, `longitude`, `salaryCurrency`) that the backend emits. This led to type assertion errors and discrepancies in mock unit test fixtures.
- **Remediation:**
  Added the missing fields to `frontend/src/types.ts` and updated mock factories in `useJobMarkers.test.ts`.

---

### 6. P3: Localized Error String Contract Enforcement
- **Affected File:** `frontend/src/utils/apiErrorTranslator.ts`
- **Vulnerability:**
  The new ticket generation error detail (`Chipta yaratishda xatolik yuz berdi`) was not registered in the frontend error dictionary, failing `test_every_error_detail_is_translated` in `backend/tests/test_error_details_are_known.py`.
- **Remediation:**
  Registered `Chipta yaratishda xatolik yuz berdi` with Russian and English translations in `frontend/src/utils/apiErrorTranslator.ts`.

---

## Dismissed False Positives

### False Positive: Payment Card Addition Race Condition & Redis Redlock Requirement
- **Previous Audit Claim:**
  The previous audit asserted that `backend/app/api/v1/endpoints/payments.py:add_payment_card` suffers from a concurrency race condition allowing users to bypass the 5-card limit unless a distributed Redis Redlock is added.
- **Direct Code & Database Inspection:**
  Inspection of `payments.py` lines 120-135 revealed:
  ```python
  user = (
      db.query(models.User)
      .filter(models.User.id == current_user.id)
      .populate_existing()
      .with_for_update()
      .first()
  )
  ```
  1. The user record is locked with `FOR UPDATE` in PostgreSQL. This serializes all concurrent requests for the same user across all Gunicorn/Uvicorn worker processes at the database engine level.
  2. The table `PaymentCard` contains a database-level composite unique constraint:
     `UniqueConstraint("userId", "last4", "bank", name="uq_payment_card_user_last4_bank")`
  3. Introducing Redis Redlock would introduce external distributed failure modes (Redis network partition, clock skew, split-brain) without adding any concurrency guarantee beyond PostgreSQL's native ACID row lock.
- **Conclusion:**
  The database row-level lock and unique constraint provide complete transaction serialization. Redlock was properly rejected.
