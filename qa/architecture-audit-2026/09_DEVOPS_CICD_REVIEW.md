# Baito V3 — DevOps, CI/CD & Production Architecture Audit

**Document:** `09_DEVOPS_CICD_REVIEW.md`  
**Scope:** Container definitions, Docker Compose orchestrations, Nginx reverse proxy, GitHub Actions CI/CD workflows, deployment automation, and disaster recovery.

---

## 1. Executive DevOps Evaluation

The DevOps infrastructure for Baito V3 is **remarkably well-automated for a growing startup**, featuring zero-downtime container swaps, automated pre-deploy database migrations, comprehensive health probes, and an automated Telegram backup bot.

However, a **critical CI/CD quality blind spot exists regarding mobile builds**, and container images run as the root user.

```
[Area]                          [Rating]     [Key Finding]
Docker Containerization          B+          Multi-stage builds for frontend; backend lacks non-root user.
Compose Orchestration            A-          Clean bridge network, well-defined dependencies & health checks.
Nginx Gateway Configuration      A-          Hardened headers, rate limiting, and log query-stripping.
GitHub Actions CI Pipeline       B           Thorough backend & E2E tests; complete omission of mobile app.
Production Deployment Strategy   A-          Zero-downtime container swap with pre-flight migration container.
Backup & Disaster Recovery       A           Automated atomic PG dumps, MinIO sync, Telegram bot management, offsite R2.
```

---

## 2. Docker & Containerization Assessment

### 2.1 Backend Dockerfile (`backend/Dockerfile`)
- **Base Image:** `python:3.11-slim`
- **Strengths:**
  - Installs runtime dependencies with `--no-install-recommends` and cleans `/var/lib/apt/lists/*`.
  - Compiles Python bytecode into wheels or virtualenv.
- **Weaknesses / Security Finding:**
  - **Runs as `root`:** The container does not create or switch to a non-privileged user (`USER appuser`). If an attacker achieves Remote Code Execution (RCE) via an upload vulnerability or dependency flaw, they execute with root privileges inside the container.
  - **Recommendation:** Add `RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app` and `USER appuser`.

### 2.2 Frontend Dockerfile (`frontend/Dockerfile`)
- **Base Image:** Multi-stage build (`node:20-alpine` builder -> `nginx:1.25-alpine` runtime).
- **Strengths:**
  - Production image contains zero Node.js dependencies, source files, or build tooling.
  - Minimal attack surface (~40 MB total image size).
  - Copies pre-tested `nginx.conf` directly into `/etc/nginx/conf.d/default.conf`.

### 2.3 Docker Compose Services (`docker-compose.yml`)
The orchestration declares 9 unified services:
1. `db`: `postgres:15-alpine` (mapped to `127.0.0.1:5433` for host admin access)
2. `redis`: `redis:7-alpine`
3. `minio`: `minio/minio:latest` (mapped to `127.0.0.1:9000` and `:9001`)
4. `migrate`: One-off container running `alembic upgrade head` before backend boots.
5. `backend`: FastAPI Uvicorn service with `depends_on: {db: service_healthy, redis: service_healthy, migrate: service_completed_successfully}`.
6. `celery_worker`: Background task worker.
7. `celery_beat`: Cron scheduler.
8. `backup_bot`: Telegram daemon for backup notifications and remote administrative triggers.
9. `frontend`: Static Nginx server reverse-proxying API traffic to backend.

---

## 3. GitHub Actions CI/CD Pipeline (`ci.yml`)

The primary CI workflow [`.github/workflows/ci.yml`](file:///home/Bekzod/Desktop/baito-v3-/.github/workflows/ci.yml) (43 KB) is triggered on every push and PR to `main` and `fix/*`.

### 3.1 Pipeline Structure
```
[Push / PR]
    │
    ├── 1. test-backend (Pytest, DB migration verification, Ruff lint)
    ├── 2. test-frontend (Node 20, typecheck, Vitest unit tests, npm audit, Vite build)
    ├── 3. test-e2e (Playwright Chromium end-to-end integration flows)
    ├── 4. validate-docker (Compose validate, secret assertions, Nginx log regression)
    └── 5. build-images (Docker Buildx verification)
            │
            ▼ (On merge to 'main')
        deploy (SSH deploy to production host, alembic upgrade, container swap, health check)
```

### 3.2 Critical CI/CD Defects

#### Defect 1: Mobile Application Omission (`CICD-001`)
- **Evidence:** Searching `.github/workflows/ci.yml` for `mobile` yields **0 matches**.
- **Impact:**
  The `mobile/` application (Capacitor/Ionic) is never validated by CI. Syntax errors, broken TypeScript types, failed builds, or invalid dependencies can be committed and merged to `main` without failing the pipeline.
- **Fix:** Add a parallel CI job:
  ```yaml
  test-mobile:
    name: 📱 Mobile Build & Typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd mobile && npm ci && npm run build
  ```

#### Defect 2: Inadequate Secret Scanning in CI
- **Evidence:** In `ci.yml`, the `Assert No Secrets Are Committed` step only checks `docker-compose.yml` for default values and regex-checks for Telegram tokens.
- **Impact:** Allowed `backend/app/services/ai_translator/cookie.txt` and plaintext MinIO credentials in `local_backup_sync.sh` to bypass CI unnoticed.
- **Fix:** Integrate Trufflehog or Gitleaks into the CI pipeline.

---

## 4. Production Deployment & Zero-Downtime Rollout

- **Deployment Mechanism:** SSH-driven remote command execution.
- **Pre-Flight Migration Container:**
  The deploy script runs `docker compose run --rm migrate` before updating the application container. If database migrations fail, the deployment immediately halts without modifying the running backend or frontend containers.
- **Rollback Mechanism:**
  [`scripts/rollback.sh`](file:///home/Bekzod/Desktop/baito-v3-/scripts/rollback.sh) saves the previous container image tag (`CURRENT_TAG`) prior to swapping. If the post-deployment health check (`/api/health`) does not return HTTP 200 within 60 seconds, `rollback.sh` re-tags the previous image and rolls back the containers automatically.

---

## 5. Backup & Disaster Recovery Architecture

- **Primary Script:** [`scripts/backup.sh`](file:///home/Bekzod/Desktop/baito-v3-/scripts/backup.sh)
  - Executes `pg_dump` via `docker compose exec -T db pg_dump -U user -Fc baito`.
  - Synchronizes MinIO media volumes to a staging folder.
  - Compresses database dump and media into an encrypted, timestamped ZIP archive.
  - Rotates backups retaining 14 days of history (minimum 10 backups).
- **Off-Site Replication:**
  [`scripts/backup_to_r2.py`](file:///home/Bekzod/Desktop/baito-v3-/scripts/backup_to_r2.py) synchronizes local backup archives to Cloudflare R2 bucket (`baito-backups`) for geographic disaster recovery.
- **Interactive Telegram Backup Bot (`backup_bot.py`):**
  A dedicated Python service (`Dockerfile.bot`) monitors disk usage, notifies admins of scheduled backup completions, and allows authorized admins to list or trigger emergency backups via Telegram commands.
