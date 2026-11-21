# Baito V3 — Dead Code, Unused Files & Duplication Audit

**Document:** `05_DEAD_CODE_AND_DUPLICATION.md`  
**Scope:** Comprehensive inventory of dead files, orphaned stubs, duplicate codebases, confidence ratings, and safe removal risks.

---

## 1. Audit Methodology & Confidence Rubric

Every candidate identified in this audit was verified through:
1. **Source Code Static Analysis:** Traced all imports, dynamic references, and string lookups across the repository.
2. **Graphify Dependency Queries:** Verified inbound edge counts and community memberships in `graphify-out/graph.json`.
3. **Git History Inspection:** Checked commit provenance to ensure files are not dynamic runtime fixtures or active hooks.

### Confidence Levels:
- **CONFIRMED:** Zero imports, zero references in git, 100% verified dead boilerplate or duplicate.
- **HIGH:** Unreferenced in runtime code; may have legacy references in historical logs or docs.
- **MEDIUM:** Appears unused, but dynamic reflection or runtime string dispatch is possible.

### Removal Risk:
- **ZERO RISK:** Safe to delete immediately with no runtime or test impact.
- **LOW RISK:** Requires updating a mock or test import.
- **HIGH RISK:** Touches database schema or core API contracts.

---

## 2. Confirmed Dead Files & Boilerplate Inventory

| File Path | Type / Description | Size | Confidence | Removal Risk | Action |
|---|---|---|---|---|---|
| `mobile/src/pages/Home.tsx` | Untouched Ionic starter page template | 627 B | **CONFIRMED** | **ZERO RISK** | Delete immediately. |
| `mobile/src/pages/Home.css` | Empty stylesheet for Home.tsx | 0 B | **CONFIRMED** | **ZERO RISK** | Delete immediately. |
| `mobile/src/components/ExploreContainer.tsx` | Ionic boilerplate component | 433 B | **CONFIRMED** | **ZERO RISK** | Delete immediately. |
| `mobile/src/components/ExploreContainer.css` | Stylesheet for ExploreContainer | 185 B | **CONFIRMED** | **ZERO RISK** | Delete immediately. |
| `mobile/src/pages/auth/` | Empty directory scaffolded Aug 26 | 0 B | **CONFIRMED** | **ZERO RISK** | Delete directory. |
| `mobile/src/pages/common/` | Empty directory scaffolded Aug 26 | 0 B | **CONFIRMED** | **ZERO RISK** | Delete directory. |
| `mobile/src/pages/employer/` | Empty directory scaffolded Aug 26 | 0 B | **CONFIRMED** | **ZERO RISK** | Delete directory. |
| `mobile/src/pages/worker/` | Empty directory scaffolded Aug 26 | 0 B | **CONFIRMED** | **ZERO RISK** | Delete directory. |
| `mobile/src/types/` | Empty directory | 0 B | **CONFIRMED** | **ZERO RISK** | Delete directory. |
| `frontend/src/middleware/` | Empty directory | 0 B | **CONFIRMED** | **ZERO RISK** | Delete directory. |
| `mobile/src/middleware/` | Empty directory | 0 B | **CONFIRMED** | **ZERO RISK** | Delete directory. |
| `public-components/CLAUDE.md` | Sole file in public-components; no UI components | 37 KB | **HIGH** | **ZERO RISK** | Move to docs/ or delete. |
| `backend/app/s3_client.py.patch`| Stray git diff patch committed in Python source | 1.4 KB | **CONFIRMED** | **ZERO RISK** | Delete immediately. |
| `backend/baito_new.db` | Stray SQLite database generated from unset env | 737 KB | **CONFIRMED** | **ZERO RISK** | Delete from repository. |
| `backend/baito.db` | Empty SQLite file | 0 B | **CONFIRMED** | **ZERO RISK** | Delete from repository. |
| `backend/database.db` | Empty SQLite file | 0 B | **CONFIRMED** | **ZERO RISK** | Delete from repository. |
| `backend/test.db` | Empty SQLite file | 0 B | **CONFIRMED** | **ZERO RISK** | Delete from repository. |
| `*.patch` (14 files in root) | Old git patches from previous fix iterations | >400 KB | **CONFIRMED** | **ZERO RISK** | Delete from root. |
| `*.log` (10 files in root) | Execution logs (deploy.log, full.log, etc.) | >1.1 MB | **CONFIRMED** | **ZERO RISK** | Delete from root. |
| `backup_db.sh` | Obsolete root backup script superseded by scripts/backup.sh | 2.5 KB | **HIGH** | **LOW RISK** | Delete from root. |

---

## 3. Duplicate Modules & Code Clones

### 3.1 Frontend vs. Mobile Component Duplication (`ARCH-001`)
27 components exist in duplicate trees:
- `frontend/src/components/*` vs `mobile/src/components/*`
- `frontend/src/chatTranslations.ts` (11,393 B) vs `mobile/src/chatTranslations.ts` (11,393 B) — **100% Bit-for-Bit Identical**
- `frontend/src/translations.ts` (3,253 B) vs `mobile/src/translations.ts` (3,253 B) — **100% Bit-for-Bit Identical**
- `frontend/src/jobDataEn.ts` (6,394 B) vs `mobile/src/jobDataEn.ts` (6,394 B) — **100% Bit-for-Bit Identical**
- `frontend/src/jobDataRu.ts` (9,769 B) vs `mobile/src/jobDataRu.ts` (9,769 B) — **100% Bit-for-Bit Identical**

**Risk of Immediate Deletion:** HIGH. Mobile must be refactored to import from a shared package before files can be safely deleted.

### 3.2 Backup Script Triplication
- `scripts/backup.sh` (11,015 B): Canonical, enterprise host backup script.
- `backup_db.sh` (2,478 B in root): Primitive precursor script reading `backend/.env`.
- `local_backup_sync.sh` (2,152 B in root): Script containing hardcoded credentials.

**Remediation:** Retain `scripts/backup.sh`; safely delete `backup_db.sh` and `local_backup_sync.sh`.

### 3.3 Hollow CRUD Stubs
- `backend/app/crud/crud_job.py` (197 B):
  ```python
  from app.crud.base import CRUDBase
  from app.models.job import Job
  from app.schemas.job import JobCreate, JobUpdate
  class CRUDJob(CRUDBase[Job, JobCreate, JobUpdate]):
      pass
  job = CRUDJob(Job)
  ```
  `job` is never used for actual domain querying in `jobs/read.py` or `jobs/main.py`. The endpoints bypass `crud_job` and query `db.query(models.Job)` directly.
- `backend/app/crud/crud_chat.py` (211 B): Similarly unused.
- `backend/app/crud/crud_application.py` (295 B): Similarly bypassed.

**Remediation:** Consolidate data queries inside domain services; eliminate empty CRUD stubs.

---

## 4. What NOT to Touch (False Positives)

During automated scans, certain files appear "unused" because they are loaded dynamically, invoked via CLI, or executed by background daemons. **Do NOT delete or modify the following:**

1. **`backend/scripts/backup_bot.py` (50 KB):**
   Not imported by any Python module because it runs as a standalone daemon in the `backup_bot` Docker container (`Dockerfile.bot`). It provides critical interactive Telegram-based disaster recovery.
2. **`backend/alembic/versions/*.py` (28 files):**
   Historical migrations may appear to contain dead columns or reverted logic (e.g. `f1263e379685_schema_fixes_and_uzum_removal.py`). **Never alter or delete historical Alembic migrations**, as doing so breaks `alembic_version` state tracking on production databases.
3. **`backend/app/tasks.py`:**
   Tasks like `expire_stale_jobs` and `purge_expired_idempotency_keys` are never called directly in Python code because they are scheduled by Celery Beat crontab strings (`celery_app.py`).
4. **`qa/test_nginx_upstream_down_regression.py`:**
   Stand-alone regression test invoked directly by GitHub Actions runner in `ci.yml`.

---

## 5. Execution Safety Checklist for Cleanup

- [ ] Verify git status is clean before beginning.
- [ ] Stage deletions in a dedicated cleanup branch (`refactor/repo-hygiene`).
- [ ] Run backend tests (`pytest backend/tests/`).
- [ ] Run frontend typecheck & tests (`cd frontend && npm run build && npm test`).
- [ ] Verify Docker Compose configuration (`docker compose config`).
