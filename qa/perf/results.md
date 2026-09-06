# Performance — Baito

Local stack, API running four uvicorn workers — the same count as production
(`docker-compose.yml`). Not run against production: §2 MUST NOT 1.

## Job board read — 1000 requests, 200 concurrent

- requests: 1000, concurrency: 200, wall: 3.5s
- throughput: **282 req/s**
- responses: {200: 1000}
- latency: p50 **630ms** · p95 **1045ms** · p99 **1432ms** · max 1865ms

## Server-side search — 300 requests, 100 concurrent

- requests: 300, concurrency: 100, wall: 0.9s
- throughput: **341 req/s**
- responses: {200: 300}
- latency: p50 **252ms** · p95 **378ms** · p99 **419ms** · max 427ms

## Authenticated profile read — 300 requests, 100 concurrent

- requests: 300, concurrency: 100, wall: 0.5s
- throughput: **571 req/s**
- responses: {200: 300}
- latency: p50 **157ms** · p95 **212ms** · p99 **254ms** · max 270ms

## Cost per request

N/A — no metered third party on these paths (no model provider; SMS and
payments are not exercised by a read).
