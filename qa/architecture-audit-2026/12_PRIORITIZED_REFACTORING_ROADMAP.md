# Baito V3 — Prioritized Engineering Refactoring Roadmap

**Document:** `12_PRIORITIZED_REFACTORING_ROADMAP.md`  
**Scope:** Actionable 5-phase engineering backlog, task definitions, effort estimates, dependencies, and validation criteria.

---

## 1. Quick Wins vs. High-Value Strategic Initiatives

| Type | Action | Effort | Immediate Benefit |
|---|---|---|---|
| **Quick Win** | Delete root `*.patch`, `*.log`, and `backend/baito_new.db` | **S** (30 mins) | Eliminates 1.5+ MB of clutter; prevents false git detections. |
| **Quick Win** | Delete dead `mobile/src/pages/Home.tsx` and empty folders | **S** (15 mins) | Cleans dead boilerplate from mobile project tree. |
| **Quick Win** | Consolidate agent rules (`AGENTS.md`) and delete `AI-rules/` | **S** (1 hour) | Stops rule drift and saves 100K+ prompt tokens. |
| **High Value** | Invalidate Google session tokens and scrub `cookie.txt` | **M** (2 hours) | Eliminates P0 security liability and account compromise risk. |
| **High Value** | Add `mobile/` build and typecheck to CI pipeline | **M** (2 hours) | Prevents broken mobile code from merging to `main`. |
| **High Value** | Add Redis caching for `deps.py` session validation | **M** (1 day) | Cuts authenticated database load by up to 60%. |
| **Strategic** | Decompose 900-line map query in `jobs/read.py` | **L** (3 days) | Restores modularity and testability to core job controller. |
| **Strategic** | Extract shared UI & translations into npm workspaces | **XL** (1 sprint)| Eliminates dual-maintenance burden between web and mobile. |

---

## 2. Phase 1 — Critical Stability & Security (Pre-Release / Sprint 1)

*Goal: Resolve all P0 security blockers and P1 operational risks before production release.*

### TASK-101: Invalidate & Scrub Google Session Cookies (`SEC-001`)
- **Priority:** **P0 Critical** | **Effort:** **M** (2 hours)
- **Affected Files:** [`backend/app/services/ai_translator/cookie.txt`](file:///home/Bekzod/Desktop/baito-v3-/backend/app/services/ai_translator/cookie.txt)
- **Action:**
  1. Revoke active sessions on the affected Google Account.
  2. Remove `cookie.txt` from repository and add `**/cookie.txt` to `.gitignore`.
  3. Run `git-filter-repo` to scrub historical git commits.
- **Validation:** Run `grep -rn "SAPISID" .` across all git branches; assert 0 matches.

### TASK-102: Remove Hardcoded MinIO Credentials (`SEC-002`)
- **Priority:** **P0 Critical** | **Effort:** **S** (30 mins)
- **Affected Files:** [`local_backup_sync.sh`](file:///home/Bekzod/Desktop/baito-v3-/local_backup_sync.sh)
- **Action:** Delete `local_backup_sync.sh` from the repository. Rotate MinIO root password on host.
- **Validation:** Run `git status`; assert file deleted.

### TASK-103: Add Mobile Typecheck & Build to CI (`CICD-001`)
- **Priority:** **P1 High** | **Effort:** **M** (2 hours)
- **Affected Files:** [`.github/workflows/ci.yml`](file:///home/Bekzod/Desktop/baito-v3-/.github/workflows/ci.yml)
- **Action:** Add `test-mobile` job executing `npm ci && npm run build` inside `mobile/`.
- **Validation:** Trigger CI push; assert `test-mobile` passes on GitHub Actions.

### TASK-104: Workspace Hygiene & Noise Purge
- **Priority:** **P2 Medium** | **Effort:** **S** (1 hour)
- **Affected Files:** Root directory, `backend/`, `mobile/src/pages/`
- **Action:** Delete 14 `*.patch` files, 10 `*.log` files, 4 `.db` files, and dead `Home.tsx`.
- **Validation:** Run `git status --ignored`; assert clean workspace.

---

## 3. Phase 2 — Architectural Cleanup (Sprint 2 - 3)

*Goal: Eliminate God controllers, decouple presentation from domain logic, and harmonize state.*

### TASK-201: Decompose `jobs/read.py` God Controller (`CODE-001`)
- **Priority:** **P1 High** | **Effort:** **L** (3 days)
- **Affected Files:** [`backend/app/api/v1/endpoints/jobs/read.py`](file:///home/Bekzod/Desktop/baito-v3-/backend/app/api/v1/endpoints/jobs/read.py)
- **Action:**
  1. Extract spatial Mercator boundary logic into `app/services/spatial_query_service.py`.
  2. Move GeoJSON feature builders to `app/services/geojson_serializer.py`.
  3. Reduce `jobs/read.py` to a thin HTTP router under 150 lines.
- **Validation:** Run `pytest backend/tests/test_map_*.py`; assert 100% pass rate.

### TASK-202: Extract Payout Escrow Service (`CODE-002`)
- **Priority:** **P1 High** | **Effort:** **M** (2 days)
- **Affected Files:** [`backend/app/api/v1/endpoints/admin/admin_payouts.py`](file:///home/Bekzod/Desktop/baito-v3-/backend/app/api/v1/endpoints/admin/admin_payouts.py)
- **Action:** Extract 310-line `create_payout_for_job` transaction script into `app/services/payout_service.py`.
- **Validation:** Run `pytest backend/tests/test_admin_payouts.py`.

### TASK-203: State Management Harmonization (Context -> Zustand)
- **Priority:** **P2 Medium** | **Effort:** **L** (4 days)
- **Affected Files:** `frontend/src/context/AppContext.tsx`, `frontend/src/store/`
- **Action:** Migrate `AppContext` state variables into Zustand stores (`useChatStore`, `useJobsStore`). Deprecate and remove `AppContext.tsx`.
- **Validation:** Run `npm test` and Playwright E2E suite.

---

## 4. Phase 3 — Performance & Reliability (Sprint 4 - 5)

*Goal: Eliminate database query amplification and optimize real-time chat delivery.*

### TASK-301: Implement Redis Session Validation Cache (`PERF-001`)
- **Priority:** **P1 High** | **Effort:** **M** (2 days)
- **Affected Files:** [`backend/app/api/deps.py`](file:///home/Bekzod/Desktop/baito-v3-/backend/app/api/deps.py)
- **Action:**
  1. On token validation in `get_current_user`, check `SETEX auth:session:{sid} 60 "valid"` in Redis.
  2. Invalidate cache on logout or ban.
- **Validation:** Benchmark with Locust (`locustfile.py`); verify 60% reduction in PostgreSQL read queries.

### TASK-302: Redis-Backed WebSocket Revocation Set (`PERF-002`)
- **Priority:** **P2 Medium** | **Effort:** **M** (1 day)
- **Affected Files:** [`backend/app/api/v1/endpoints/chats/manager.py`](file:///home/Bekzod/Desktop/baito-v3-/backend/app/api/v1/endpoints/chats/manager.py)
- **Action:** Replace per-message database query in `_send_local` with Redis `SISMEMBER auth:revoked_sessions {sid}`.
- **Validation:** Run `pytest backend/tests/test_e2e_flow.py`.

### TASK-303: Non-Root Docker Container Security
- **Priority:** **P2 Medium** | **Effort:** **S** (2 hours)
- **Affected Files:** [`backend/Dockerfile`](file:///home/Bekzod/Desktop/baito-v3-/backend/Dockerfile)
- **Action:** Add non-root `appuser` (UID 1000) and execute Uvicorn as non-root.
- **Validation:** Run container locally; assert `whoami` outputs `appuser`.

---

## 5. Phase 4 — Maintainability & Developer Experience (Q1 2027)

*Goal: Restructure repository into Monorepo Lite and eliminate frontend/mobile code duplication.*

### TASK-401: Monorepo Lite Workspace Setup (`ARCH-001`)
- **Priority:** **P1 High** | **Effort:** **XL** (1 sprint)
- **Affected Directories:** `frontend/`, `mobile/`, `packages/`
- **Action:**
  1. Configure root `package.json` with npm workspaces (`apps/web`, `apps/mobile`, `packages/shared-ui`, `packages/shared-i18n`).
  2. Extract `translations.ts` and `chatTranslations.ts` to `packages/shared-i18n`.
  3. Extract shared components (`Header.tsx`, `BottomNav.tsx`, `LanguageSelector.tsx`) to `packages/shared-ui`.
  4. Point both web and mobile to shared packages.
- **Validation:** Build both web and mobile clients from root; assert 0 missing import errors.

### TASK-402: Consolidate AI Agent Directives
- **Priority:** **P3 Low** | **Effort:** **S** (2 hours)
- **Affected Directories:** `AI-rules/`, `agents/`, `AGENTS.md`
- **Action:** Unify persona rules into single authoritative `AGENTS.md`; remove legacy folders.
- **Validation:** Verify coding assistants reference single `AGENTS.md`.

---

## 6. Phase 5 — Long-Term Scalability (Late 2027+)

*Goal: Infrastructure enhancements justified only by 10x traffic growth (>100,000 DAU).*

- **TASK-501:** PostgreSQL streaming read-replica for map queries and reporting.
- **TASK-502:** Multi-node Redis Sentinel deployment for automated failover.
- **TASK-503:** PostGIS migration if polygon geofencing or advanced routing is required.
