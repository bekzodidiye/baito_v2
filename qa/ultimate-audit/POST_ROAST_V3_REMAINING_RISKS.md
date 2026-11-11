# Baito v3 — Post-Roast V3 Remaining Risks & Production Hardening Guide

## 1. Executive Summary

This document provides a candid, evidence-based assessment of the remaining architectural risks, residual threat surfaces, and ongoing operational considerations following the V3 security and correctness remediations.

In accordance with Senior Engineering Standards, no distributed system is ever declared "100% bug-free". Identifying and documenting remaining boundaries ensures proper monitoring and safe operations in staging and production.

---

## 2. Residual Security & Architectural Risks

### 1. Phased Migration of Legacy Server-Side `?token=` Parameter
- **Current State:**
  - The mobile app has migrated to HTTPS single-use ticket acquisition (`POST /ws-ticket`) with WebSocket `?ticket=...`.
  - The web frontend utilizes secure HTTP-only cookies (`settings.ACCESS_COOKIE_NAME`).
  - To maintain backward compatibility with older native app versions installed on users' mobile devices, the backend currently accepts `?token=` as a fallback, logging a deprecation warning:
    `"Deprecated: WebSocket connected via ?token= query parameter; client should migrate to ?ticket="`
- **Residual Threat:**
  If an un-updated legacy client connects using `?token=`, the JWT token appears in reverse proxy access logs (e.g. NGINX access.log) unless URL query string redaction is active at the reverse proxy.
- **Migration & Decommissioning Plan:**
  1. **Immediate:** Ensure NGINX/reverse-proxy configurations redact query strings on `/api/v1/chats/ws/` paths (e.g., using `log_format` rules that strip `$args` on websocket endpoints).
  2. **Release v3.0:** Monitor deprecation log events to track the proportion of legacy mobile clients.
  3. **Release v3.1:** Fully remove `websocket.query_params.get("token")` fallback from `backend/app/api/v1/endpoints/chats/websocket.py`.

---

### 2. Rate Limiting During Redis Outage
- **Current State:**
  The ticket endpoint `POST /api/v1/chats/{chat_id}/ws-ticket` is protected by slowapi `@limiter.limit("30/minute")`.
- **Behavior during Redis Downtime:**
  If the Redis cluster is unreachable, slowapi falls back to in-memory per-process rate limiting. In a multi-worker deployment (`--workers 4`), the effective rate limit across all workers is `30 * 4 = 120/minute`.
- **Operational Defense:**
  Redis high availability (Sentinel or managed Redis cluster) with automated failover is strongly recommended to maintain centralized rate-limiting state.

---

### 3. High-Concurrency Multi-Node Throughput Verification
- **Current State:**
  Micro-benchmarks and local unit tests confirm sub-millisecond in-memory HMAC hashing and O(1) Redis lookups.
- **Unverified Scope:**
  End-to-end network saturation under massive concurrent client load (e.g., 10,000 active concurrent WebSocket connections and 50,000 HTTP map queries/sec) has not been evaluated with distributed load generators (k6, Locust, wrk) on production-scaled multi-container infrastructure.
- **Recommendation:**
  Execute dedicated staging load tests simulating peak regional map queries before major nationwide marketing campaigns.

---

## 3. Operational Release Checklist

1. **Database Schema:** Confirm migration `0020_spatial_map_indexes.py` is applied on the production PostgreSQL database.
2. **Redis Eviction Policy:** Ensure `volatile-lru` or `allkeys-lru` is active with sufficient memory headroom for spatial and ticket caches.
3. **Log Monitoring:** Set up Datadog / Grafana alerts on:
   - Deprecation warnings: `Deprecated: WebSocket connected via ?token=`
   - Ticket generation failures: `Chipta yaratishda xatolik yuz berdi`
   - Cache invalidation latency spikes
