# Baito v3 — Post-Roast V3 Test Results & Verification Metrics

## 1. Overview

This document records the exact test execution metrics and build verification outputs following the completion of the V3 post-roast remediation on repository `bekzodidiye/baito-v3-` (branch: `fix/map-performance-safe`).

All checks were executed on isolated local test infrastructure.

---

## 2. Test Execution Metrics

### Backend (`pytest`)
- **Command:** `cd backend && pytest tests/ -q`
- **Result:** **462 passed**, 0 failed, 2 warnings (FastAPI deprecation warnings) in **17.93s**
- **Platform:** Linux, Python 3.11.9, pytest-9.1.1, pluggy-1.6.0

#### Detailed Map & WebSocket Test Breakdown (102 tests total)
| Test Suite File | Tests Passed | Focus Area |
|---|---|---|
| `tests/test_map_cache.py` | 22 | HMAC canonicalization, PIN signature verification, cache version invalidation |
| `tests/test_map_clustering.py` | 58 | Spatial grid clustering, zoom level slicing, cluster signature integrity, zero-DB query cache hits |
| `tests/test_map_pins_api.py` | 10 | `/api/v1/jobs/map` endpoint behavior, query parameter validation |
| `tests/test_map_geojson_privacy_and_collision.py` | 12 | **NEW / EXPANDED**: GeoJSON `Cache-Control: private` privacy, sub-decimal viewport key distinction, internal 304 delegation safety, Redis fallback, single-use ticket lifecycle, real WebSocket handshake, session revocation rejection, atomic concurrent consumption, category case sensitivity, `/map/tile` conditional 304 handling, ticket rate limiting error handling |
| **Total Map & WS Suite** | **102** | **100% Pass** |

#### Other Core Test Suites Verified
- `tests/test_admin_finance.py`: 25 passed (Admin payouts, balance verification, transaction auditing)
- `tests/test_error_details_are_known.py`: 2 passed (Translation contract guard)

---

### Frontend Web (`Vitest`)
- **Command:** `npm --prefix frontend test -- --run`
- **Result:** **90 test files passed**, **862 tests passed**, 0 failed in **18.61s**
- **Framework:** Vitest v2.1.9, React 19, Vite v6.4.3
- **Typecheck / Lint:** `npm --prefix frontend run lint` (`tsc --noEmit`) -> **Clean (0 errors)**
- **Production Build:** `npm --prefix frontend run build` (`vite build`) -> **Clean in 4.50s**

---

### Mobile App (`Vitest` & `Vite`)
- **Command:** `npm --prefix mobile run test.unit`
- **Result:** **6 test files passed**, **39 tests passed** (including 8 comprehensive chatSocket ticket tests), 0 failed in **1.78s**
- **Framework:** Vitest v4.1.11, Capacitor 8.5.0, Ionic React 9.0.0
- **Production Build:** `npm --prefix mobile run build` (`vite build`) -> **Clean in 1.29s**

---

### Static Analysis & Repository Health
| Tool / Check | Command | Result |
|---|---|---|
| Backend Linter | `ruff check backend/app` | **All checks passed!** (0 errors) |
| Git Whitespace Check | `git diff --check` | **Clean** (0 whitespace/conflict errors) |
