# Baito V3 — System Design & High-Level Architecture

**Document:** `02_SYSTEM_ARCHITECTURE.md`  
**Scope:** Architecture reconstruction, communication topologies, 8 Mermaid sequence/flow diagrams, boundary analysis, single points of failure, and scalability limits.

---

## 1. Architectural Classification

Baito V3 is structured as a **Containerized Modular Monolith** with an asynchronous backend, decoupled Single Page Application (SPA) web frontend, hybrid mobile client, and distributed background workers.

```
[Clients]
Web SPA (React 19) / Mobile (Capacitor)
       │
       ▼
[Edge / Ingress]
Nginx Reverse Proxy (:80 / :443)
       │
       ├─────────────────────────┬──────────────────────┐
       ▼                         ▼                      ▼
Static Assets / SPA       FastAPI Backend        MinIO Media
(Local / Nginx Cache)     (:8000 / Uvicorn)      (:9000 / S3 API)
                                 │
           ┌─────────────────────┼──────────────────────┐
           ▼                     ▼                      ▼
    PostgreSQL 15          Redis 7 (Standalone)    Celery Workers & Beat
    (Relational OLTP)     (Cache, Pub/Sub, Queues) (Scheduled / Async Tasks)
```

### Monolith vs. Distributed Trade-off Evaluation
- **Current Choice:** A unified modular monolith sharing a single relational database (`baito`) and Redis broker.
- **Verdict: CORRECT ARCHITECTURAL CHOICE.**
  A microservice architecture would introduce severe operational overhead, distributed transaction failures, network latency, and data consistency headaches for an on-demand marketplace of this scale. The modular monolith pattern allows atomic transactions across jobs, applications, payments, and audit ledgers while maintaining high engineering velocity.
- **Deficiencies:** The backend suffers from leaky boundaries where HTTP controllers (`jobs/read.py`, `admin_payouts.py`) directly invoke complex SQL and spatial calculations rather than isolating logic inside domain services.

---

## 2. Comprehensive System Architecture Diagrams

### Diagram 1: System Context Diagram
Shows external actors, systems, and platform boundaries.

```mermaid
flowchart TD
    subgraph Users ["Actors & User Personas"]
        Worker["👷 Worker / Job Seeker\n(Browser / Android Mobile)"]
        Employer["🏢 Employer / Business\n(Browser / Web App)"]
        Admin["🛡️ System Administrator\n(Back-office Web UI)"]
        BotUser["🤖 Telegram Admin\n(Backup / Alerts Bot)"]
    end

    subgraph Platform ["Baito V3 Platform Boundary"]
        Nginx["🌐 Nginx Edge Gateway\n(SSL Termination, Rate Limits, Static Assets)"]
        API["⚡ FastAPI Application\n(REST API, Auth, Job Engine, Chat WS)"]
        DB[(🐘 PostgreSQL 15\nRelational Core & Ledgers)]
        Cache[(⚡ Redis 7\nPub/Sub, Ticket Cache, Rate Limits)]
        WorkerProc["⚙️ Celery Worker & Beat\n(Async Jobs, Job Expiration, Digest)"]
        MediaStore[("📦 MinIO / S3\nEncrypted Document & Media Storage")]
        BackupBot["🤖 Backup Bot Daemon\n(Telegram Host Automation)"]
    end

    subgraph External ["External Third-Party Services"]
        SMS["📱 TextUp SMS Gateway\n(Phone Verification Codes)"]
        Sentry["📊 Sentry Monitoring\n(Error Reporting & Profiling)"]
        R2["☁️ Cloudflare R2 / Remote S3\n(Off-site Disaster Recovery)"]
        GeminiAI["🧠 Google Gemini AI\n(Job Translation & Structuring)"]
    end

    Worker -->|HTTPS / WSS| Nginx
    Employer -->|HTTPS / WSS| Nginx
    Admin -->|HTTPS| Nginx
    BotUser -->|Telegram Bot API| BackupBot

    Nginx -->|Reverse Proxy /api/| API
    Nginx -->|Reverse Proxy /ws/| API
    Nginx -->|Media Access /media/| API
    API --> DB
    API --> Cache
    API --> MediaStore
    WorkerProc --> DB
    WorkerProc --> Cache
    BackupBot --> DB
    BackupBot --> MediaStore
    BackupBot --> R2

    WorkerProc -->|REST API| SMS
    API -->|Async Exceptions| Sentry
    WorkerProc -->|REST API| GeminiAI
```

---

### Diagram 2: Container & Service Architecture
Illustrates Docker Compose runtime boundaries, network topologies, and volume mounts.

```mermaid
flowchart LR
    subgraph Host ["Physical / Cloud Host (Ubuntu Linux)"]
        subgraph Ports ["Host Exposed Ports"]
            P3000["127.0.0.1:3000 -> Nginx Web"]
            P8000["127.0.0.1:8000 -> FastAPI"]
            P5433["127.0.0.1:5433 -> Postgres (Admin)"]
            P9000["127.0.0.1:9000 -> MinIO S3 API"]
            P9001["127.0.0.1:9001 -> MinIO Console"]
        end

        subgraph DockerNet ["Docker Network: baito-network (bridge)"]
            cFrontend["frontend\n(Nginx 1.25-alpine)"]
            cBackend["backend\n(FastAPI / Uvicorn)"]
            cDb["db\n(PostgreSQL 15-alpine)"]
            cRedis["redis\n(Redis 7-alpine)"]
            cMinio["minio\n(MinIO Server)"]
            cCelery["celery_worker\n(Async Tasks)"]
            cBeat["celery_beat\n(Cron Scheduler)"]
            cMigrate["migrate (One-off)\n(Alembic Upgrade)"]
            cBot["backup_bot\n(Telegram Daemon)"]
        end

        subgraph Volumes ["Persistent Storage Volumes"]
            vPgData[(postgres_data)]
            vRedisData[(redis_data)]
            vMinioData[(minio_data)]
            vUploads[(uploads_shared)]
        end
    end

    P3000 -.-> cFrontend
    P8000 -.-> cBackend
    P5433 -.-> cDb
    P9000 -.-> cMinio

    cFrontend -->|proxy /api/ -> :8000| cBackend
    cFrontend -->|proxy /baito-bucket/ -> :9000| cMinio
    cMigrate -->|Apply Schema| cDb
    cBackend --> cDb
    cBackend --> cRedis
    cBackend --> cMinio
    cCelery --> cDb
    cCelery --> cRedis
    cCelery --> cMinio
    cBeat --> cRedis
    cBot --> cDb
    cBot --> cMinio

    cDb --- vPgData
    cRedis --- vRedisData
    cMinio --- vMinioData
    cBackend --- vUploads
```

---

### Diagram 3: Backend Module Dependencies
Maps coupling and import hierarchies inside `backend/app/`.

```mermaid
flowchart TD
    subgraph Entrypoint ["HTTP & Ingress"]
        Main["main.py\n(FastAPI, Lifespan, Middleware, Log Sanitizer)"]
        Router["api/v1/api.py\n(Route Registration)"]
    end

    subgraph Controllers ["API Routers (api/v1/endpoints/)"]
        AuthEp["auth.py"]
        JobsEp["jobs/ (read.py, main.py, bookmarks.py)"]
        JobActionsEp["job_actions.py"]
        AppsEp["applications/ (main.py, actions.py)"]
        ChatsEp["chats/ (websocket.py, messages.py, manager.py)"]
        AdminEp["admin/ (admin_payouts.py, admin_finance.py, admin_jobs.py)"]
        PaymentsEp["payments.py & invoices.py"]
        UploadEp["upload.py & media.py"]
    end

    subgraph Core ["Cross-Cutting Foundation (core/)"]
        Config["config.py\n(Settings, Secrets, Envs)"]
        Security["security.py\n(JWT, Bcrypt)"]
        Limiter["limiter.py\n(SlowAPI Rate Limits)"]
        MapCache["map_cache.py\n(GeoJSON Envelopes & Signatures)"]
        Deps["api/deps.py\n(get_db, get_current_user, RBAC)"]
    end

    subgraph Domain ["Services & Domain Logic (services/)"]
        GeoSvc["geo_service.py"]
        JobSvc["job_service.py"]
        EarningsSvc["earnings_service.py"]
        GrowthSvc["growth_engine.py"]
        SessionWin["session_window.py"]
        Translator["ai_translator/"]
    end

    subgraph Data ["Data Access & Storage"]
        Models["models/ (Job, User, Application, Transaction, etc.)"]
        Schemas["schemas/ (Pydantic v2 Models)"]
        Session["db/session.py (SessionLocal, Engine)"]
        RedisClient["redis_client.py"]
        S3Client["s3_client.py"]
    end

    Main --> Router
    Router --> Controllers
    Controllers --> Deps
    Controllers --> Schemas
    Controllers --> Domain
    Controllers --> Models
    Controllers --> Session

    Domain --> Models
    Domain --> Session
    Domain --> RedisClient
    Domain --> S3Client

    Deps --> Config
    Deps --> Security
    Deps --> Models
    Deps --> Session

    JobsEp --> MapCache
    ChatsEp --> RedisClient
```

---

### Diagram 4: Authentication & Session Lifecycle
Sequence showing SMS login, JWT token generation, active session tracking, and revocation.

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Client App)
    participant Nginx as Nginx Proxy
    participant Auth as backend/auth.py
    participant Redis as Redis Cache
    participant DB as PostgreSQL (active_sessions, users)

    User->>Nginx: POST /api/v1/auth/send-sms {phone}
    Nginx->>Auth: Forward Request
    Auth->>Redis: Rate Limit Check (5 attempts / 300s)
    Auth->>Redis: SETEX sms:code:{phone} 300 {code}
    Auth-->>User: 200 OK "SMS yuborildi"

    User->>Nginx: POST /api/v1/auth/verify-sms {phone, code}
    Nginx->>Auth: Forward Request
    Auth->>Redis: GET sms:code:{phone}
    Auth->>Redis: SETEX phone:verified:{phone} 1800 "true"
    Auth-->>User: 200 OK {verified: true}

    User->>Nginx: POST /api/v1/auth/login-phone {phone, password}
    Nginx->>Auth: Forward Request
    Auth->>DB: SELECT * FROM users WHERE phone = {phone}
    Auth->>Auth: verify_password(password, hashed_password)
    Auth->>DB: INSERT INTO active_sessions (id, user_uid, device, is_active, last_seen)
    Auth->>Auth: create_access_token(sub=uid, sid=session_id)
    Auth->>Auth: create_refresh_token(sub=uid, sid=session_id)
    Auth-->>User: 200 OK + Set-Cookie (baito_access, baito_refresh)

    Note over User, DB: Subsequent Authenticated Request
    User->>Nginx: GET /api/v1/users/me (Cookie: baito_access)
    Nginx->>Auth: Forward Request
    Auth->>Auth: jwt.decode(token) -> verify signature, exp, sid
    Auth->>DB: SELECT * FROM active_sessions WHERE id = sid (Sync Query!)
    Auth->>DB: SELECT * FROM users WHERE uid = sub (Sync Query!)
    Auth-->>User: 200 OK {user_profile}

    Note over User, DB: Session Revocation / Logout
    User->>Nginx: POST /api/v1/auth/logout
    Nginx->>Auth: Forward Request
    Auth->>DB: UPDATE active_sessions SET is_active=false WHERE id = sid
    Auth-->>User: 200 OK (Clear Cookies)
```

---

### Diagram 5: Job Listing → Application → Completion & Payout Lifecycle
Visualizes the primary business state machine and financial escrow logic.

```mermaid
stateDiagram-v2
    [*] --> Draft: Employer drafts job
    Draft --> Published: POST /jobs (Deduct posting fee if applicable)
    Published --> Applied: Worker POST /applications/apply
    
    state Applied {
        [*] --> PendingReview
        PendingReview --> Rejected: Employer rejects
        PendingReview --> Accepted: Employer accepts
    }

    Accepted --> Confirmed: Worker confirms availability
    Confirmed --> InProgress: Start time arrives / Worker checks in
    
    state InProgress {
        [*] --> WorkActive
        WorkActive --> DisputeRaised: Dispute submitted (Dispute Model created)
        WorkActive --> WorkFinished: Worker submits completion
    }

    WorkFinished --> Approved: Employer approves work
    Approved --> Settled: Admin / Auto-payout (JobPayout created)
    DisputeRaised --> Resolved: Admin arbitrates dispute
    Resolved --> Settled: Payout according to ruling
    Settled --> [*]: Transaction committed & funds released
```

---

### Diagram 6: Chat / WebSocket Message Flow (Multi-Worker Pub/Sub)
Shows real-time connection establishment, ticket validation, and cross-worker broadcast via Redis.

```mermaid
sequenceDiagram
    autonumber
    actor ClientA as Worker (Client A)
    actor ClientB as Employer (Client B)
    participant Nginx as Nginx Proxy
    participant Worker1 as Uvicorn Worker 1 (WS Handler)
    participant Worker2 as Uvicorn Worker 2 (WS Handler)
    participant Redis as Redis (Pub/Sub & Keys)
    participant DB as PostgreSQL

    ClientA->>Nginx: POST /api/v1/chats/token (Get WS Ticket)
    Nginx->>Worker1: Forward Request
    Worker1->>Redis: SETEX ws:ticket:{ticket_id} 60 {user_uid:session_id}
    Worker1-->>ClientA: 200 OK {ticket: ticket_id}

    ClientA->>Nginx: GET /api/v1/chats/ws/{chat_id} (Sec-WebSocket-Protocol: baito-ticket.{ticket_id})
    Nginx->>Nginx: Strip Query, Check Frame Limits
    Nginx->>Worker1: Upgrade: websocket
    Worker1->>Redis: GETDEL ws:ticket:{ticket_id} (Atomic Consumption)
    Worker1->>DB: Verify Chat Participant
    Worker1->>Worker1: Accept Socket Connection (Store in Memory)

    ClientA->>Worker1: WS Frame: {"text": "Kelishdik, soat 9 da"}
    Worker1->>Worker1: Sliding Window Rate Limit Check (<20 msg/10s)
    Worker1->>DB: INSERT INTO messages (chatId, senderId, text)
    Worker1->>Worker1: Deliver to local sockets connected to {chat_id}
    Worker1->>Redis: PUBLISH chat:{chat_id} {"_origin": Worker1_ID, text: "..."}

    Redis-->>Worker2: Fanout message via psubscribe("chat:*")
    Worker2->>Worker2: Filter out if _origin == Worker2_ID
    Worker2->>DB: is_session_revoked(user_uid, session_id)
    Worker2->>ClientB: WS Frame: {"id": "msg_123", "text": "Kelishdik..."}
```

---

### Diagram 7: PostgreSQL, Redis & Background Worker Interactions
Depicts data persistence, caching invalidations, and Celery scheduled processing.

```mermaid
flowchart TD
    subgraph FastAPI ["FastAPI Application"]
        JobWrite["Job Create / Update\n(jobs/main.py)"]
        JobRead["Job Map / Viewport Read\n(jobs/read.py)"]
        AuthDep["Auth Dependency\n(deps.py)"]
    end

    subgraph RedisStore ["Redis Data Structures"]
        MapVer["map:version (Global Counter)"]
        UserMapVer["map:version:{user_id}"]
        MapCacheKeys["map:v4:z{z}:bb:{bbox} (GeoJSON Cache)"]
        CeleryQueue["Queue: celery (Task Broker)"]
    end

    subgraph CeleryTasks ["Celery Background Tasks"]
        ExpireJobs["app.tasks.expire_stale_jobs\n(Runs 03:00 Daily)"]
        PurgeIdemp["app.tasks.purge_expired_idempotency_keys\n(Runs 04:00 Daily)"]
        TelegramDigest["app.tasks.send_telegram_digest\n(Runs 09:00 Daily)"]
        AsyncTranslate["app.tasks.translate_job_task\n(Triggered on Job Create)"]
    end

    subgraph DBStore ["PostgreSQL Database"]
        tJobs[(jobs)]
        tApp[(applications)]
        tLedger[(audit_ledgers)]
        tIdemp[(idempotency_keys)]
    end

    JobWrite -->|1. Write Transaction| tJobs
    JobWrite -->|2. INCR map:version| MapVer
    JobWrite -->|3. Enqueue Translate| CeleryQueue

    JobRead -->|1. Check Version & Cache| MapCacheKeys
    JobRead -.->|2. Cache Miss: Execute SQL| tJobs
    JobRead -->|3. Store Envelope| MapCacheKeys

    CeleryQueue --> ExpireJobs
    CeleryQueue --> PurgeIdemp
    CeleryQueue --> TelegramDigest
    CeleryQueue --> AsyncTranslate

    ExpireJobs -->|UPDATE jobs SET status='cancelled'| tJobs
    PurgeIdemp -->|DELETE FROM idempotency_keys WHERE created_at < NOW() - 24h| tIdemp
    AsyncTranslate -->|UPDATE jobs SET title_ru=..., desc_ru=...| tJobs
```

---

### Diagram 8: CI/CD & Production Deployment Topology
Traces code commit to production container swap and database migration.

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer / Engineer
    participant GH as GitHub Repository (bekzodidiye/baito-v3-)
    participant GHA as GitHub Actions Runner (ci.yml)
    participant Host as Production Host (Docker Daemon)

    Dev->>GH: git push origin fix/map-performance-safe
    GH->>GHA: Trigger CI Workflow (ci.yml)
    
    par Quality Checks
        GHA->>GHA: 1. Backend Tests (Pytest, DB Migrations Apply Cleanly, Lint)
        GHA->>GHA: 2. Frontend Tests (React 19 Typecheck, Vitest, Build)
        GHA->>GHA: 3. End-to-End Tests (Playwright Chromium)
        GHA->>GHA: 4. Docker Compose Validation (Compose parse, Secret Assertions)
        GHA->>GHA: 5. Nginx Regression Test (Upstream-down Log Redaction)
    end

    GHA-->>GH: All Checks Succeeded (Green Checkmark)

    Note over GH, Host: Merge to Main (Production Deployment Trigger)
    Dev->>GH: Merge PR #259 into main
    GH->>GHA: Trigger Deploy Job (deploy)
    GHA->>Host: SSH Remote Command Execution
    Host->>Host: 1. Checkout Code / Sync Workspace
    Host->>Host: 2. Record Running Build ID (Rollback Anchor)
    Host->>Host: 3. docker compose build (baito-backend, baito-frontend)
    Host->>Host: 4. docker compose run --rm migrate (alembic upgrade head)
    Host->>Host: 5. docker compose up -d (Zero-downtime Container Swap)
    Host->>Host: 6. Health Check Probe (/api/health -> 200 OK)
    Host->>Host: 7. docker image prune -f
    GHA-->>Dev: Deployment Successful Notification
```

---

## 3. Failure Domain & Single Point of Failure (SPOF) Analysis

| Component | Failure Impact | Current Mitigation | Vulnerability / Residual Risk |
|---|---|---|---|
| **Nginx Ingress** | Total platform outage (HTTP/WS unreachable). | Nginx error pages (`50x.html`), log redaction filters. | **SPOF:** Single Nginx process on a single host. No DNS-level multi-region or keepalived failover. |
| **PostgreSQL 15** | Platform enters read-only or HTTP 503 degraded state. | Automatic reconnect attempts; health probe reports degraded. | **SPOF:** Single primary database instance without streaming replication or automated read-replica failover. |
| **Redis 7** | Real-time chat cross-node fanout stops; WebSocket tickets fail; map cache degraded. | `redis_is_mock()` fallback allows local in-memory fallback during isolated test runs. | In production, Redis failure stops WebSocket upgrades and invalidates rate limiting. |
| **MinIO S3** | Image/document uploads fail; media viewing blocked. | Authentication route falls back gracefully if S3 client errors. | Single MinIO volume on local disk; backup bot synchronizes to Telegram and offsite R2. |
| **Celery Worker** | Background SMS delivery delayed; job auto-expiration halts. | Late ack (`task_acks_late=True`), worker soft time limits (90s). | In-flight tasks lost if container crashes abruptly without Redis persistence. |
