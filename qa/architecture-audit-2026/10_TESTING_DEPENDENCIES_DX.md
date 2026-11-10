# Baito V3 — Testing, Dependencies & Developer Experience Audit

**Document:** `10_TESTING_DEPENDENCIES_DX.md`  
**Scope:** Test pyramid assessment, backend/frontend/mobile test coverage, dependency supply chain, agent instruction sprawl, and developer onboarding.

---

## 1. Test Engineering & Pyramid Evaluation

The Baito platform exhibits **impressive, adversarial test suites in its backend financial and spatial logic**, but suffers from **significant gaps in mobile coverage and End-to-End browser scenarios**.

```
[Test Suite Layer]              [File Count]   [Execution Engine]   [Coverage Quality]
Backend Integration & Unit       44 files       Pytest (Python 3.11) A- (Exceptional adversarial coverage)
Frontend Unit & Component        91 files       Vitest / JSDOM       B+ (Strong utils, i18n, & card tests)
Frontend End-to-End (E2E)        5 files        Playwright Chromium  B (Covers auth, employer, worker)
Mobile Unit & Integration        7 files        Vitest               D (Only map tests; no business flows)
Nginx Log Security Regression    1 file         Custom Python Harness A (Validates upstream 502 leakage)
```

### 1.1 Backend Test Highlights
The backend test suite ([`backend/tests/`](file:///home/Bekzod/Desktop/baito-v3-/backend/tests/)) goes far beyond trivial unit tests:
- `test_adversarial_financial_ledger.py` (28.6 KB): Simulates double-spend attempts, negative balance mutations, and concurrent escrow claims.
- `test_adversarial_concurrency.py` (16.7 KB): Spawns parallel threads attempting to accept the same job simultaneously, proving that row locking (`with_for_update`) and unique constraints reject races.
- `test_map_clustering.py` (178 KB!): An exhaustive suite testing Mercator projection boundary cases, polar coordinates, tile boundaries, and zoom level aggregations.
- `test_map_geojson_privacy_and_collision.py` (63 KB): Validates coordinate jittering to ensure worker privacy is never violated.

### 1.2 Testing Deficiencies & Blind Spots
1. **Mobile Testing Void:**
   `mobile/src/` contains only 7 test files, all focused on Leaflet map markers. There are **zero unit or integration tests for mobile worker applications, employer job posts, authentication, or payment cards**.
2. **Missing CI Execution for Mobile:**
   Mobile tests are never invoked during pull request validation in GitHub Actions.
3. **Database Migration Rollback Tests:**
   CI verifies `alembic upgrade head`, but **never tests downgrade migrations** (`alembic downgrade -1`). A migration that cannot be downgraded is a severe production operational risk.

---

## 2. Dependencies & Supply Chain Security

### 2.1 Backend Dependencies (`backend/requirements.txt`)
- Pinned core libraries: `fastapi==0.111.0`, `uvicorn==0.30.1`, `sqlalchemy==2.0.31`, `alembic==1.13.2`, `pydantic==2.8.2`, `celery==5.4.0`, `redis==5.0.7`, `boto3==1.34.140`.
- **Finding:** Most dependencies are pinned to specific minor versions, minimizing unexpected upstream breakage.
- **Vulnerability Audit:** Python dependencies are regularly audited via Dependabot ([`.github/dependabot.yml`](file:///home/Bekzod/Desktop/baito-v3-/.github/dependabot.yml)).

### 2.2 Frontend Dependencies (`frontend/package.json`)
- Upgraded to modern versions: `react: ^19.0.0`, `tailwindcss: ^4.0.0-beta.4`, `vite: ^6.0.1`, `zustand: ^5.0.1`.
- **Finding:** Frontend uses bleeding-edge React 19 and Tailwind v4, ensuring high performance and modern DOM features.

### 2.3 Mobile Dependency Drift (`mobile/package.json`)
- **Finding:** While web runs React 19, mobile package manifests still list React 18 in certain peer dependencies (`@ionic/react: ^8.0.0`, `react: ^18.3.1`).
- **Risk:** Dependency version drift between web and mobile prevents seamless component sharing and creates subtle styling and hydration discrepancies.

---

## 3. Developer Experience (DX) & Documentation

### 3.1 The "Agent Rule Sprawl" Phenomenon
A unique issue in this repository is the accumulation of competing AI agent rule files:
1. `AGENTS.md` (Root, 35.5 KB)
2. `.agents/AGENTS.md` (35.5 KB — identical copy)
3. `AI-rules/rules.md` (35.6 KB — near-identical copy)
4. `CLAUDE.md` (Root, 9.3 KB)
5. `public-components/CLAUDE.md` (37 KB)
6. `agents/` folder containing **15 individual role files** (`a11y-engineer.md`, `qa-lead.md`, `security-engineer.md`, etc.).

**Impact:**
- Over 150 KB of prompt tokens are wasted or duplicated.
- Conflicting instructions accumulate over time.
- New engineers or AI assistants receive contradictory instructions on code conventions, component paths, and test requirements.
**Remediation:** Consolidate all engineering rules into a single authoritative `AGENTS.md` in the repository root; delete `AI-rules/` and `agents/`.

### 3.2 Local Development Onboarding
- **Strengths:** `docker compose up` brings up the complete platform (Postgres, Redis, MinIO, FastAPI, Nginx).
- **Friction Points:**
  - Presence of multiple Python virtualenvs (`venv/` in root, `backend/venv/`).
  - Developers executing pytest locally without `DATABASE_URL` accidentally generate a local SQLite file `backend/baito_new.db`.
  - Hardcoded credential scripts (`local_backup_sync.sh`) confuse developers regarding canonical backup procedures.

---

## 4. Graphify Integration Analysis

Graphify was installed and indexed for Baito V3 (`graphify-out/graph.json` contains **6,779 nodes, 18,158 edges, and 411 communities**).

### Evaluation:
- **Navigation Velocity:** Graphify dramatically accelerated discovery of God components (`User`, `Job`, `jobs/read.py`, `admin_payouts.py`) and revealed cross-layer imports in seconds.
- **Verification Caveat:** Graphify indexes static declarations, but can miss dynamic runtime dispatch (such as FastAPI dependency injection overrides or Celery crontab task strings). It serves as an exceptional accelerator, but must always be backed by direct source inspection.
