# Baito v3 — Post-Roast V3 Security Architecture Report

## 1. Executive Summary

This document details the V3 security remediations implemented on branch `fix/map-performance-safe` relative to base commit `e67c75e855600fc207b330ee8674d6627f9d3a2c`.

The V3 remediation resolves the remaining blockers identified during independent review of the V2 patch:
1. **Complete Mobile WebSocket Ticket Integration:** Replaced URL JWT query strings with HTTPS ticket acquisition in native/mobile clients.
2. **Guaranteed Atomic Ticket Consumption:** Enforced atomic `GETDEL` (with Lua and transactional multi/exec fallbacks) and eliminated non-atomic fallbacks.
3. **Preserved Session Revocation Security:** Bound connection tickets to `session_id` and enforced real-time `ActiveSession.is_live()` validation.
4. **Category Cache Key Case Sensitivity:** Aligned cache key generation with SQL `models.Job.category == category` exact equality semantics.
5. **Endpoint Rate Limiting & Resource Abuse Prevention:** Implemented `@limiter.limit("30/minute")` on the ticket issuance endpoint.
6. **Real Connection Handshake Verification:** Added end-to-end WebSocket upgrade, concurrent atomic consumption, and session revocation tests.
7. **Slippy Map Tile Conditional Request Safety:** Verified conditional 304 handling and ETag protection on `/api/v1/jobs/map/tile`.

---

## 2. In-Depth Security Remediation Details

### Fix 1: Complete Mobile WebSocket Ticket Integration
- **Affected File:** `mobile/src/api/chatSocket.ts`
- **Architecture:**
  - Before opening a native WebSocket, `openChatSocket` invokes `fetchWsTicket(chatId)`.
  - `fetchWsTicket` makes an authenticated HTTPS `POST /api/v1/chats/{chat_id}/ws-ticket` using `apiClient`, leveraging standard Authorization Bearer headers or secure cookies.
  - The WebSocket URL is constructed strictly with `?ticket={ticket}` via `getChatWebSocketUrl(chatId, ticket)`. Reusable JWTs (`?token=...`) are **never** appended to URLs.
  - On every reconnect (e.g. network handover or socket drop), `connect()` requests a fresh, single-use ticket. Consumed tickets are never reused.
  - In-flight safety: `closedByUs` and `connectEpoch` state guards guarantee that if the user leaves the chat or closes the view while a ticket request is in-flight, the returned ticket is discarded and no WebSocket is opened.
  - If ticket acquisition fails, exponential backoff reconnect is scheduled, while background HTTP polling fallback preserves chat continuity.
- **Web Client Parity:** The web frontend (`frontend/src/api/chatSocket.ts`) relies on secure HTTP-only cookies (`settings.ACCESS_COOKIE_NAME`) sent automatically during the browser WebSocket HTTP upgrade handshake, never exposing JWTs in query strings.

### Fix 2: Guaranteed Atomic Ticket Consumption
- **Affected Files:** `backend/app/api/v1/endpoints/chats/websocket.py`, `backend/app/redis_client.py`
- **Architecture:**
  - Implemented `_consume_ticket_atomic(ticket_key)`:
    1. Primary: Native Redis `GETDEL` command (atomic O(1) in Redis >= 6.2).
    2. Secondary: Atomic Lua script (`eval`) executing `GET` followed by `DEL` inside Redis's single-threaded script engine.
    3. Tertiary: Transactional Redis pipeline (`MULTI` + `GET` + `DEL` + `EXEC`).
    4. **Fail-Closed Guarantee:** If no verified atomic primitive is available, the function logs an error and returns `None`. Non-atomic get-then-delete is strictly prohibited.
  - `MockRedis` in `backend/app/redis_client.py` implements atomic `getdel`, atomic Lua script evaluation, and transactional pipelines for development and testing.
  - **Zero Ticket Logging:** Ticket tokens and user secrets are never written to server logs. Any exceptions are logged by exception type name only.

### Fix 3: Preserved Session Revocation Security
- **Affected Files:** `backend/app/api/v1/endpoints/chats/main.py`, `backend/app/api/v1/endpoints/chats/websocket.py`
- **Architecture:**
  - During ticket issuance (`create_chat_ws_ticket`), the issuing session's ID is retrieved from `current_user.current_session_id` (populated by `deps.get_current_user` from the token's `sid` claim) and stored in `ticket_data["session_id"]`.
  - During ticket consumption (`_authenticate_ticket`), if `session_id` is present, the server queries `models.ActiveSession` and validates `is_live(session_record)`.
  - If the user logged out, had their session revoked, or if the session expired past the idle window, the ticket authentication fails immediately (`return None`), and the WebSocket handshake is closed with code `1008 Policy Violation`.
  - Account status (`not user or user.isBanned`) is strictly revalidated.

### Fix 4: Category Cache Key Case Sensitivity
- **Affected Files:** `backend/app/core/map_cache.py`, `backend/app/api/v1/endpoints/jobs/read.py`
- **Architecture:**
  - In SQL, `location` and `search` filters utilize case-insensitive ILIKE queries (`models.Job.location.ilike(...)`).
  - In contrast, `category` filtering utilizes strict case-sensitive equality:
    `models.Job.category == category`
  - Previously, `_clean_str` in `build_map_pins_cache_key` and `build_map_geojson_cache_key` converted categories to lowercase, causing `category=IT` and `category=it` to share identical cache keys despite returning different database results.
  - Updated `_clean_str(val, preserve_case=True)` for `category` across map pins and GeoJSON cache keys. Cache keys now strictly match database query semantics.

### Fix 5: Endpoint Rate Limiting & Resource Abuse Prevention
- **Affected File:** `backend/app/api/v1/endpoints/chats/main.py`
- **Architecture:**
  - Applied `@limiter.limit("30/minute")` to `POST /api/v1/chats/{chat_id}/ws-ticket`.
  - Permits normal rapid reconnects (up to 30 tickets/min per IP/user) while preventing malicious flooding of Redis ticket keys.

### Fix 6: Real WebSocket Handshake & Integration Testing
- **Affected File:** `backend/tests/test_map_geojson_privacy_and_collision.py`
- **Architecture:**
  - Added tests establishing real WebSocket connections via TestClient `websocket_connect`:
    - Full HTTP issuance -> WS upgrade -> ping/pong communication.
    - Missing ticket -> immediate disconnect (code 1008).
    - Expired/invalid ticket -> immediate disconnect (code 1008).
    - Replayed ticket -> immediate disconnect (code 1008).
    - Revoked session -> immediate disconnect (code 1008).
    - Concurrent atomic consumption -> exactly 1 thread succeeds, 1 thread fails.

### Fix 7: Slippy Map Tile Conditional Request Safety
- **Affected File:** `backend/app/api/v1/endpoints/jobs/read.py` (`get_map_tile`)
- **Architecture:**
  - Internal scope strips `If-None-Match` and `If-Modified-Since` before delegating to `get_map_jobs`.
  - Verified conditional 304 handling and ETag caching for tile vector endpoints.
