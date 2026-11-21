# 13 — REGRESSION TEST REPORT: VERIFIED TEST RUNS

## 1. Test Execution Commands & Real Results

### 1.1 Backend Test Suite (Pytest)
- **Command**:
  ```bash
  pytest backend/tests -v --durations=10
  ```
- **Observed Result**:
  - **Passed**: **450 tests**
  - **Failed**: **0**
  - **Skipped**: **0**
  - **Warnings**: 2 (Starlette deprecation warnings regarding `HTTP_422_UNPROCESSABLE_ENTITY`)
  - **Duration**: **15.18 seconds**
- **Test Modules Covered**:
  - `test_adversarial_concurrency.py`: 10 tests passed (simultaneous cards, race conditions, balance integrity).
  - `test_map_cache.py`: 18 tests passed (pin tampering, envelope tampering, canonical sorting).
  - `test_map_clustering.py`: 12 tests passed (zoom scaling, 1200+ jobs clustering, bounds filtering).
  - `test_security_fixes.py`: 15 tests passed (password session revocation, card token hiding, media privacy, path traversal).
  - `test_admin_finance.py`: 25 tests passed (withdrawal decisions, ticket replies, Sentry fallback, settings clamp).
  - `test_a_day_closes_once_it_has_arrived.py`: 10 tests passed (future day locking, single-day settlements).
  - `test_worker_starts_shift.py`: 9 tests passed (shift start timestamp, single-press idempotency).
  - `test_verification_required.py`: 6 tests passed (KYC enforcement for job post and application).

### 1.2 Frontend Test Suite (Vitest)
- **Command**:
  ```bash
  npm --prefix frontend test -- --run
  ```
- **Observed Result**:
  - **Test Files**: **90 passed (90)**
  - **Total Tests**: **862 passed (862)**
  - **Failed**: **0**
  - **Duration**: **16.75 seconds**
- **Areas Covered**:
  - Map Viewport Bounds & Query Key Integration (`useJobsData.mapViewport.test.tsx`, `useMapViewportBounds.test.ts`).
  - Employer Dashboard & Post Flow (`EmployerJobCard.test.tsx`, `FinishJobModal.test.tsx`, `JobPostForm.guard.test.tsx`).
  - Worker Profile & Applications (`applicationStatus.test.tsx`, `CalendarScreen.utils.test.ts`).
  - Admin Panels & Payouts (`AdminPayouts.test.tsx`, `AdminUsers.test.tsx`, `AdminTransactions.test.tsx`).
  - Translations & Internationalization (`i18n-sweep.test.ts`, `translations.test.ts`, `notificationTranslator.test.ts`).

### 1.3 Mobile Test Suite (Vitest)
- **Command**:
  ```bash
  npm --prefix mobile run test.unit
  ```
- **Observed Result**:
  - **Test Files**: **6 passed (6)**
  - **Total Tests**: **34 passed (34)**
  - **Failed**: **0**
  - **Duration**: **1.37 seconds**
- **Areas Covered**:
  - WebSocket Chat Client (`chatSocket.test.ts`).
  - Map Viewport Synchronization (`useJobsData.mapViewport.test.tsx`, `useMapViewportBounds.test.ts`).
  - Tile Recovery Fallback (`mapTileRecovery.test.ts`).
  - GeoJSON Bounding Checks (`useUzbekistanGeoJson.test.ts`).

---

## 2. Static Analysis & Type Checking

### 2.1 Frontend TypeScript (`tsc --noEmit`)
- **Command**:
  ```bash
  npm --prefix frontend run lint
  ```
- **Observed Result**:
  - **Exit Code**: **0 (Clean)**
  - **Errors**: **0**

### 2.2 Backend Ruff Linter
- **Command**:
  ```bash
  ruff check backend/app
  ```
- **Observed Result**:
  - **Exit Code**: **0 (Clean)**
  - **Output**: `All checks passed!`

---

## 3. Unverified External Scenarios
- Actual live processing of VISA/MasterCard cardholder payments through Uzbek processing centers (requires live banking merchant agreements).
- Physical GPS accuracy on real Android hardware across low-connectivity regions (requires in-situ physical device testing in Tashkent / Samarkand / Fergana).
