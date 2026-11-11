# 16 — NEXT SPRINT ENGINEERING PLAN: POST-AUDIT ROADMAP

## 1. High-Priority Correctness & Concurrency
- **Task 1.1: Distributed Redis Lock Migration for Payment Cards**
  - *Component*: `backend/app/api/v1/endpoints/payments.py`
  - *Objective*: Replace process-local `threading.Lock()` (`_user_card_locks`) with distributed Redis locks (`redis_client.lock`) to ensure seamless concurrency protection across multi-process Gunicorn container replicas.
  - *Risk*: Low.
- **Task 1.2: Asynchronous Gemini AI Translation Worker**
  - *Component*: `backend/app/tasks.py` (`translate_job_task`)
  - *Objective*: Migrate synchronous Gemini API client calls inside Celery to asynchronous httpx coroutines or dedicate a separate worker queue (`ai_queue`) so long-running translations do not delay urgent transactional tasks.
  - *Risk*: Low.

---

## 2. Security & Compliance
- **Task 2.1: Automated PII Masking in Sentry Breadcrumbs**
  - *Component*: `backend/app/core/logging.py`
  - *Objective*: Implement a Sentry before-send filter to scrub phone numbers and passport identifiers from error breadcrumbs and context dictionaries.
  - *Risk*: Low.
- **Task 2.2: Automated Rate Limit Headers**
  - *Component*: Ingress / SlowAPI
  - *Objective*: Expose standard RFC rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) to clients for improved backoff UX.
  - *Risk*: Very Low.

---

## 3. Performance & Asset Optimization
- **Task 3.1: GeoJSON Polygon Vector Compression**
  - *Component*: `frontend/src/data/geo/uzbekistan_districts.json`
  - *Objective*: Apply TopoJSON conversion or Douglas-Peucker simplification (preserving border topology) to reduce the uncompressed 745 kB payload to under 150 kB.
  - *Risk*: Medium (requires verification that district centroids remain inside administrative boundaries).
- **Task 3.2: Image WebP Auto-Conversion on Direct Upload**
  - *Component*: S3 Media Pipeline
  - *Objective*: Automatically convert user-uploaded identity and job photos to optimized WebP format upon receipt to reduce S3 storage footprint and mobile network consumption.
  - *Risk*: Low.

---

## 4. UI/UX & Mobile Quality
- **Task 4.1: Mobile ESLint Ignore & Cleanup**
  - *Component*: `mobile/.eslintignore` & `mobile/src/`
  - *Objective*: Exclude compiled Android assets (`android/app/build/`) and prune unused imports to achieve 0 errors and 0 warnings on `npm run lint`.
  - *Risk*: Very Low.
- **Task 4.2: Telegram Mini App Haptic Feedback Alignment**
  - *Component*: `frontend/src/hooks/useTelegramHaptics.ts`
  - *Objective*: Ensure smooth haptic vibrations on critical user actions (job application submitted, shift started, payment declared) when running inside Telegram WebView.
  - *Risk*: Very Low.

---

## 5. Technical Debt & Documentation
- **Task 5.1: OpenAPI Specification Auto-Generation & Schema Drift CI Check**
  - *Component*: GitHub Actions CI
  - *Objective*: Add a CI step that compares the generated `openapi.json` against frontend API contracts to automatically detect breaking schema drifts before merge.
  - *Risk*: Low.
- **Task 5.2: Unified Money DB Composite Type**
  - *Component*: Backend Database Models
  - *Objective*: Transition from separate UZS integer vs Tiyin integer modeling to a unified SQLAlchemy composite type that encapsulates currency conversion rules transparently.
  - *Risk*: Medium (requires careful database migration).
