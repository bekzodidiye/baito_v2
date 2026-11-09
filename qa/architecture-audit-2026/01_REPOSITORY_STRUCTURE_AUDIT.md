# Baito V3 — Repository Structure & Hygiene Audit

**Document:** `01_REPOSITORY_STRUCTURE_AUDIT.md`  
**Scope:** Root layout, directory ownership, noise artifacts, structural liabilities, and proposed repository layout.

---

## 1. Current High-Level Repository Layout

```
baito-v3-/
├── .agents/                 # AGY agent persona definitions, workflows, scratchpad
├── .claude/                 # Legacy Claude worktrees
├── .claude-flow/            # Claude flow daemon state, logs, policies, sessions
├── .codex/                  # Codex tooling metadata
├── .githooks/               # Git hook scripts (post-checkout, post-commit, pre-push)
├── .github/                 # Workflows (ci.yml, dependabot, release, skylos)
├── .skylos/                 # Python dead code detector baseline and cache
├── .vscode/                 # Editor configurations
├── AGENTS.md                # Agent instruction handbook (35.5 KB, duplicates .agents/AGENTS.md)
├── AI-rules/                # Legacy AI rules folder (application_rules.md, rules.md)
├── CLAUDE.md                # Claude developer instructions
├── README.md                # Project README
├── *.patch                  # 14 loose git diff patches in repository root (total >400 KB)
├── *.log                    # 10 execution log files in repository root (total >1.1 MB)
├── agents/                  # 15 individual persona markdown files (from Sep 6)
├── artifacts/               # Verification screenshots
├── assets/                  # UI assets and studio definitions
├── backend/                 # FastAPI application root
│   ├── alembic/             # Database migration versions (28 revisions)
│   ├── app/                 # Application source package
│   │   ├── api/             # API routing, dependencies, v1 endpoints
│   │   ├── core/            # Config, security, exceptions, limiter, map_cache
│   │   ├── crud/            # CRUD abstractions (mostly empty / skeleton)
│   │   ├── data/            # Static Uzbekistan geo JSON datasets
│   │   ├── db/              # DB base classes, session, init_db
│   │   ├── models/          # 20 SQLAlchemy declarative ORM models
│   │   ├── schemas/         # Pydantic v2 validation schemas
│   │   ├── services/        # Business logic services (geo, earnings, jobs, ai)
│   │   ├── celery_app.py    # Celery application configuration & scheduler
│   │   ├── main.py          # FastAPI application entrypoint
│   │   ├── redis_client.py  # Redis connection & mock client
│   │   ├── s3_client.py     # MinIO / S3 client
│   │   ├── s3_client.py.patch # Accidental patch file tracked in source tree!
│   │   └── tasks.py         # Celery task definitions
│   ├── scripts/             # Backup bot, seed jobs, restore scripts
│   ├── tests/               # Pytest suite (44 test files)
│   ├── baito_new.db         # Dangling 737 KB SQLite database file!
│   └── Dockerfile           # Backend container build definition
├── backups/                 # 23 local backup ZIP archives (>25 MB)
├── docker-compose.yml       # Primary local & staging service orchestrator
├── docker-compose.prod.yml  # Production docker compose overlay
├── docs/                    # Architecture, QA, Uzum, security, release documentation
├── frontend/                # React 19 / Vite SPA web client
│   ├── src/                 # Web client source code
│   │   ├── api/             # Axios API client, websocket connection
│   │   ├── components/      # UI components (27 duplicated in mobile!)
│   │   ├── context/         # React Context providers (AppContext, useJobsData, useChatsData)
│   │   ├── features/        # Feature modules (admin, employer, worker, payments)
│   │   ├── hooks/           # Custom React hooks
│   │   ├── store/           # Zustand state stores (useAuthStore, useUIStore)
│   │   └── translations/    # Multi-language dictionary files (UZ, RU, EN)
│   ├── nginx.conf           # Production Nginx reverse proxy configuration
│   └── package.json         # React 19 dependencies & scripts
├── mobile/                  # Ionic / Capacitor mobile wrapper application
│   ├── android/             # Native Android project (Gradle, manifest, assets)
│   ├── src/                 # Mobile source code (diverged copy-paste of frontend/src)
│   │   ├── pages/           # Legacy empty folders (auth, common, employer, worker)
│   │   │   └── Home.tsx     # Dead Ionic boilerplate component
│   │   └── components/      # 27 components duplicated from frontend/src
│   └── package.json         # Mobile dependencies (Ionic, Capacitor, React 18)
├── public-components/       # Empty folder containing only CLAUDE.md!
├── qa/                      # QA checklists, reports, audit sessions, regression tests
├── scripts/                 # Operational deployment, backup, and release bash scripts
└── venv/                    # Root virtual environment (duplicates backend/venv)
```

---

## 2. Directory Responsibility & Ownership Assessment

| Directory | Intended Purpose | Observed Reality & Misplaced Content | Status / Recommendation |
|---|---|---|---|
| `/backend` | Core backend API, worker, and data layer. | Contains SQLite databases (`baito_new.db`), stray patch files (`s3_client.py.patch`), and an orphaned root `create_admin.py`. | **Refactor:** Remove SQLite databases, delete patch file, move `create_admin.py` to `backend/scripts/`. |
| `/frontend` | React web application. | Self-contained, but contains identical mock datasets (`jobDataEn.ts`, `jobDataRu.ts`) and translations copied into `mobile/`. | **Keep:** Extract shared logic into a shared package (`/packages/shared`). |
| `/mobile` | Capacitor mobile application. | Contains dead Ionic template code (`Home.tsx`, `ExploreContainer.tsx`, empty `pages/auth`), and duplicated components from `frontend/`. | **Refactor:** Delete dead boilerplate, eliminate empty folders, consume shared UI components. |
| `/public-components`| Standalone UI component catalog. | Contains **zero components**; contains only `CLAUDE.md` (37 KB). | **Delete:** Dead directory creating confusion. |
| `/backups` | Host backup storage. | Contains 23 compressed database dumps (>25 MB) inside the active git workspace. | **Ignore:** Ensure `.gitignore` prevents tracking binary backup archives. |
| `/qa` | Quality assurance reports and tests. | Contains valuable regression tests (`test_nginx_upstream_down_regression.py`) alongside static markdown audits. | **Keep:** Well-structured; maintain historical test logs. |
| `/docs` | System documentation. | Contains outdated Uzum merchant specs (`UZUM-MERCHANT.md`) despite Uzum removal migration (`f1263e379685`). | **Update:** Archive legacy integration specs; maintain single source of truth. |
| `/agents`, `/.agents`, `/AI-rules` | AI assistant prompts and rules. | **Massive rule sprawl:** 5 separate directories/files (`AGENTS.md`, `.agents/AGENTS.md`, `AI-rules/rules.md`, `agents/*.md`, `CLAUDE.md`) duplicating identical guidelines. | **Consolidate:** Unify into a single `.gemini/` or root `AGENTS.md`. |

---

## 3. Structural Problems & Technical Debt Inventory

### 3.1 Root Noise Artifacts
The repository root is heavily polluted with temporary artifacts from past debugging sessions:
1. **14 Git Patch Files:** `access_log_security_redaction-final.patch`, `access_log_security_redaction-v4-targeted.patch`, `baito-final-verified-v4.patch`, `baito-pr259-security-blockers.patch`, etc. Total size exceeds 400 KB.
2. **10 Log Files:** `deploy.log` (640 KB), `full.log` (190 KB), `full_run.log` (190 KB), `backend_failed.log` (61 KB), `debug.log` (42 KB). Total size exceeds 1.1 MB.
3. **4 Dangling SQLite DB Files:** `backend/baito.db` (0 B), `backend/database.db` (0 B), `backend/test.db` (0 B), and `backend/baito_new.db` (737 KB). These exist because `DATABASE_URL` defaulted to `sqlite:///./baito_new.db` when commands were executed without environment variables.
4. **Source Code Patch File:** `backend/app/s3_client.py.patch` is committed directly inside the Python package directory.

### 3.2 Script Duplication and Inconsistent Tooling
Three competing backup scripts exist with inconsistent configuration:
- `backup_db.sh` (Root, 2.4 KB): Shell script expecting `backend/.env`.
- `local_backup_sync.sh` (Root, 2.1 KB): Contains hardcoded credentials and endpoint IP.
- `scripts/backup.sh` (11 KB): Production-grade host backup script with PostgreSQL dump, MinIO media sync, and retention rotation.
- `scripts/backup_to_r2.py` (2.9 KB): Cloudflare R2 offsite backup uploader.

**Problem:** Multiple entry points for the same operational task lead to human error during emergency backups and disaster recovery.

### 3.3 Empty Directories & Abandoned Code
- `mobile/src/pages/auth/` (Empty)
- `mobile/src/pages/common/` (Empty)
- `mobile/src/pages/employer/` (Empty)
- `mobile/src/pages/worker/` (Empty)
- `mobile/src/types/` (Empty)
- `frontend/src/middleware/` (Empty)
- `mobile/src/middleware/` (Empty)
- `mobile/src/pages/Home.tsx` & `Home.css`: Untouched Ionic starter files referencing `ExploreContainer`.
- `mobile/src/components/ExploreContainer.tsx` & `ExploreContainer.css`: Unreferenced boilerplate.

---

## 4. Proposed Target Repository Layout (Monorepo Lite)

To eliminate code duplication, separate concerns, and maintain a clean production workspace, the repository should transition toward a lightweight npm/pnpm workspace monorepo:

```
baito-v3/
├── .github/                 # CI/CD Workflows
│   └── workflows/
│       ├── backend.yml      # Pytest, lint, Alembic verification
│       ├── frontend.yml     # React typecheck, Vitest, Playwright E2E
│       ├── mobile.yml       # Mobile build & Capacitor check
│       └── release.yml      # Production deploy pipeline
├── apps/
│   ├── api/                 # Current backend/ (FastAPI)
│   │   ├── app/
│   │   ├── alembic/
│   │   ├── tests/
│   │   └── Dockerfile
│   ├── web/                 # Current frontend/ (Vite + React 19)
│   │   ├── src/
│   │   ├── nginx.conf
│   │   └── Dockerfile
│   └── mobile/              # Current mobile/ (Capacitor + React)
│       ├── android/
│       └── src/
├── packages/
│   ├── shared-types/        # Shared TypeScript interfaces (Job, User, Chat, etc.)
│   ├── shared-ui/           # Shared Tailwind v4 React components (Header, Badges, Modals)
│   └── shared-i18n/         # Shared localization dictionaries (UZ, RU, EN)
├── docker/
│   ├── docker-compose.yml
│   └── docker-compose.prod.yml
├── docs/                    # Centralized system documentation
├── qa/                      # QA test suites & audit reports
├── scripts/                 # Centralized operational scripts (backup, restore, deploy)
├── AGENTS.md                # Single authoritative agent instruction file
├── .gitignore               # Unified git ignore rules
└── package.json             # Root npm / pnpm workspace definition
```

---

## 5. Safe, Incremental Migration Plan

A big-bang restructuring would disrupt active development, PR review, and branch merging. The following incremental plan achieves the target structure safely:

### Step 1: Immediate Workspace Hygeine (Zero Code Risk)
1. Add `*.patch`, `*.log`, `*.db`, and `backups/` to `.gitignore`.
2. Delete root `.patch` files and root `.log` files.
3. Remove `backend/baito_new.db` and empty `.db` files.
4. Remove `backend/app/s3_client.py.patch`.
5. Remove empty directories (`mobile/src/pages/*`, `frontend/src/middleware/`).
6. Remove dead boilerplate (`mobile/src/pages/Home.tsx`, `ExploreContainer.tsx`).
7. Delete empty directory `public-components/`.

### Step 2: Operational Script Consolidation
1. Delete outdated `backup_db.sh` and hardcoded `local_backup_sync.sh` from repository root.
2. Ensure `scripts/backup.sh` and `scripts/restore_backup.sh` are the sole, documented backup mechanisms in `docs/BACKUP_AND_DISASTER_RECOVERY.md`.
3. Move `backend/create_admin.py` into `backend/scripts/create_admin.py`.

### Step 3: Rule & Prompt Deduplication
1. Merge persona directives from `agents/` and `AI-rules/` into the primary `AGENTS.md`.
2. Delete redundant `AI-rules/` and `agents/` directories.

### Step 4: Shared Frontend/Mobile Extraction (Phase 2 Roadmap)
1. Configure root `package.json` workspaces: `workspaces: ["frontend", "mobile", "packages/*"]`.
2. Move `translations.ts` and `chatTranslations.ts` to `packages/shared-i18n`.
3. Move core UI components (`Header.tsx`, `BottomNav.tsx`, `LanguageSelector.tsx`) to `packages/shared-ui`.
4. Point both `frontend` and `mobile` to shared workspace packages, eliminating duplicate source trees.
