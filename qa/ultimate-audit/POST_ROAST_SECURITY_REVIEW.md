# Baito v3 — Post-Roast Security Review & Threat Model Analysis

## 1. Scope & Objective

This security review evaluates the security boundaries, threat vectors, and data privacy controls touched during the post-roast remediation of Baito v3.

Specific areas audited:
- HTTP Cache Privacy and Multi-Tenant Isolation
- Cryptographic Token Handling over WebSocket Handshakes
- Geospatial Cache Partitioning & Anti-Poisoning
- Internal RPC / Delegation Boundaries in FastAPI

---

## 2. Threat Modeling & Boundary Analysis

### Threat Vector A: Shared Cache Poisoning & Cross-User Information Leakage
- **Threat Scenario:**
  Shared HTTP proxies (corporate proxy, ISP cache, CDN edge node) serving responses cached under `Cache-Control: public` without evaluating client credentials.
- **Risk:**
  Worker A requests `/api/v1/jobs/map/geojson`. The response contains personalized metadata (`applied: true`, `bookmarked: false`). If cached under `public`, Worker B requests the same URL from behind the same corporate NAT/proxy and receives Worker A's cached response, leaking Worker A's job application activity.
- **Mitigation Implemented:**
  1. Dynamic `Cache-Control` header emission:
     - Anonymous users: `Cache-Control: public, max-age=15, stale-while-revalidate=30`
     - Authenticated users: `Cache-Control: private, no-cache`
  2. Mandatory `Vary: Cookie, Authorization, Accept-Encoding` emitted on all responses (both 200 OK and 304 Not Modified).
  3. Verification: Verified by `test_authenticated_geojson_http_cache_privacy_and_isolation`.

### Threat Vector B: WebSocket Token Exposure via URL Query Strings
- **Threat Scenario:**
  Web browsers and mobile native WebView environments executing WebSocket handshakes (`new WebSocket(url)`).
- **Risk:**
  Because the browser WebSocket API does not allow custom HTTP request headers (such as `Authorization: Bearer <token>`), developers frequently append the user's primary JWT access token to the URL query string (`wss://api.baito.uz/ws?token=<jwt>`).
  Access URLs are routinely logged by:
  - Reverse proxies (NGINX, Cloudflare, Traefik)
  - Application access logs
  - Mobile platform logging layers (Logcat, Android console)
  - Browser network monitoring tools
  A compromised access log exposes long-lived user tokens.
- **Mitigation Implemented:**
  1. Two-step Ticket-Granting Protocol:
     - The authenticated client issues a standard HTTP `POST /api/v1/chats/{chat_id}/ws-ticket` using its normal `Authorization` header or secure `HttpOnly` cookie.
     - The server validates authorization (user must be a participant in `chat_id`).
     - The server issues a cryptographically secure ticket: `secrets.token_urlsafe(32)` (256 bits of entropy).
     - The ticket is stored in Redis with an aggressive 60-second TTL:
       `chat:ws_ticket:{ticket} -> {"user_id": ..., "user_uid": ..., "chat_id": ..., "role": ...}`
     - The client connects via `wss://api.baito.uz/api/v1/chats/{chat_id}/ws?ticket={ticket}`.
     - The WebSocket handshake handler consumes the ticket via an atomic `GET` and `DELETE`.
  2. Replay Prevention: Once read, the ticket is immediately deleted from Redis. Any attempt to reuse the ticket fails.
  3. Chat Binding: If a ticket granted for `chat_id_1` is supplied to `chat_id_2`, the handshake is immediately rejected with HTTP 403 / WebSocket close code 4003.

### Threat Vector C: Viewport Cache Key Collision & Spatial Data Starvation
- **Threat Scenario:**
  A malicious client or standard user navigating dense urban areas generates bounding box requests where coordinates differ in decimal precision beyond 2 decimal places.
- **Risk:**
  When bounding box coordinates were rounded to 2 decimal places (`~1.11 km`), multiple distinct bounding boxes shared identical cache keys. A cache hit from a broader viewport could starve or corrupt the pins returned for a narrower viewport.
- **Mitigation Implemented:**
  1. `build_map_geojson_cache_key()` formats all 4 bounding box coordinates using `_format_coord()`, preserving full IEEE-754 float precision.
  2. Keys are namespace-prefixed (`cache:jobs:geojson:v{version}:{min_lat}:{max_lat}:{min_lng}:{max_lng}`) and isolated across cache versions.

### Threat Vector D: Starlette Request Scope Header Bleed
- **Threat Scenario:**
  A client issues a conditional request with `If-None-Match: "w/<etag>"` against an outer projection endpoint (`/geojson` or `/tile`).
- **Risk:**
  If the outer endpoint delegates to an inner handler (`get_map_jobs`) by passing Starlette's `request` directly, the inner handler processes the client's `If-None-Match` header. If the inner handler returns 304, the outer handler crashes when attempting to parse the body as JSON.
- **Mitigation Implemented:**
  1. Sanitized internal request scope by explicitly stripping conditional request headers before calling internal handlers.
  2. Added defensive checks verifying non-empty bodies before JSON parsing.

---

## 3. Residual Risk Assessment

| Vector | Inherent Risk | Residual Risk | Defense Mechanism |
|---|---|---|---|
| Public Cache Leakage | High (P1) | Low (P3) | Dynamic `Cache-Control: private` + `Vary: Authorization, Cookie` |
| Viewport Key Collision | Medium (P2) | Negligible | Full IEEE-754 canonical string formatting in key derivation |
| WS Query Token Leakage | Medium (P2) | Low (P3) | 60-second single-use ticket pattern with atomic consumption |
| Internal 304 Crash | Medium (P2) | Negligible | Scope header sanitization & safe body validation |
