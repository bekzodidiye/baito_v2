# Baito V3 — Security & Privacy Architecture Audit

**Document:** `07_SECURITY_PRIVACY_AUDIT.md`  
**Scope:** Threat modeling, vulnerability assessment, authentication/authorization, secret hygiene, PII protection, and CWE compliance.

---

## 1. Executive Security Verdict

Baito V3 features **state-of-the-art defenses against several common web attack vectors** (such as WebSocket token leakage in logs, rate-limit flooding, and SQL injection), but suffers from **critical operational security lapses in secret storage and credential hygiene**.

```
[Security Area]                 [Rating]     [Key Finding]
Network & Edge Security          A-          Nginx log redaction, TLS termination, CSP, HSTS, secure cookies.
Authentication & Passwords       A-          Bcrypt (rounds=12), HS256 JWT, sid-bound sessions, phone OTP limits.
Authorization & RBAC             B+          Role-gated endpoints; mandatory document verification (_require_verified).
Secret & Credential Hygiene      F (P0)      Live Google cookies in repo; plaintext MinIO credentials in script.
Data Protection & Privacy (PII)  B+          Coordinate jittering on public map; phone numbers masked.
Dependency Vulnerabilities       A-          Dependabot active; npm production audit runs in CI.
```

---

## 2. P0 Critical Vulnerability Disclosures

### 2.1 SEC-001: Active Google Session Tokens Committed to Repository
- **Severity:** **P0 — CRITICAL**
- **Location:** [`backend/app/services/ai_translator/cookie.txt`](file:///home/Bekzod/Desktop/baito-v3-/backend/app/services/ai_translator/cookie.txt#L1-L10)
- **Commit Added:** `6bc66d4` ("fix(agents,a11y,security): enforce AGENTS.md rules...")
- **Evidence:**
  The file contains live, production Google Account session cookies used by `gemini_client.py` for automated job translation:
  ```
  SSID=Aa3PZBBP6YwNmgqGH; SAPISID=3x0xKd2CWco2aDdf/A8qqAdugy2-pRXYsM;
  __Secure-1PSID=g.a000BwmTtfVeb2Azc5zsWqcSLmVL-BPvq2wkwO0Vam...
  __Secure-3PSID=g.a000BwmTtfVeb2Azc5zsWqcSLmVL-BPvq2wkwO0Vam...
  COMPASS=gemini-pd=...
  ```
- **Root Cause:**
  A developer attempted to authenticate Google Gemini via reverse-engineered browser cookies instead of the official Gemini API key (`GEMINI_API_KEY`), and inadvertently committed the real cookie file despite the adjacent `cookie.txt.example` instructing to ignore it.
- **Impact:**
  Anyone with read access to the git repository can impersonate the Google account, access private emails, Google Drive, and API services.
- **Remediation:**
  1. **Immediate Revocation:** Log into the affected Google Account and click "Sign out of all sessions" immediately.
  2. **File Removal & Purge:** Delete `cookie.txt` and add `**/cookie.txt` to `.gitignore`.
  3. **Git History Rewrite:** Run `git-filter-repo --invert-paths --path backend/app/services/ai_translator/cookie.txt` across all branches.
  4. **Adopt Official API:** Replace the scraping-based cookie client with the official Google GenAI SDK (`google-genai`).

---

### 2.2 SEC-002: Hardcoded Production IP and MinIO Root Credentials
- **Severity:** **P0 — CRITICAL**
- **Location:** [`local_backup_sync.sh`](file:///home/Bekzod/Desktop/baito-v3-/local_backup_sync.sh#L9-L13)
- **Evidence:**
  ```bash
  AWS_ENDPOINT_URL="http://100.109.46.108:9000"
  AWS_ACCESS_KEY_ID="minioadmin"
  AWS_SECRET_ACCESS_KEY="minioadmin"
  AWS_DEFAULT_REGION="us-east-1"
  S3_BUCKET_PATH="s3://baito-bucket/backups/"
  ```
- **Impact:**
  Exposes the internal host IP (`100.109.46.108`) and default root administrator credentials (`minioadmin:minioadmin`) for the object storage cluster.
- **Remediation:**
  1. Delete `local_backup_sync.sh` from the repository.
  2. Change the default root credentials in the MinIO deployment immediately.

---

## 3. Authentication & Session Management

- **Password Hashing:** Passwords are hashed using `bcrypt` ([`backend/app/core/security.py`](file:///home/Bekzod/Desktop/baito-v3-/backend/app/core/security.py#L32)). Inputs are truncated at 72 bytes to conform to bcrypt specifications. Work factor defaults to `BCRYPT_ROUNDS=12` in production.
- **Token Design:** Access tokens expire in 60 minutes; refresh tokens expire in 7 days. Tokens include a unique session identifier (`sid`).
- **Session Revocation (`ActiveSession`):**
  When a user logs out or is banned, their session record in `active_sessions` is marked `is_active = False`. Every authenticated request validates `is_live(session_record)`, ensuring immediate cross-device logout without waiting for JWT expiration.
- **SMS OTP Verification:**
  - Phone numbers are validated using the Uzbekistan national regex (`+998[0-9]{9}`).
  - OTP codes are 6-digit integers stored in Redis with 300s TTL.
  - Brute force protection: Maximum 5 attempts per phone number.

---

## 4. Authorization & RBAC Boundaries

- **Role Hierarchy:** Three distinct roles: `worker`, `employer`, and `admin`.
- **Enforcement Mechanisms ([`backend/app/api/deps.py`](file:///home/Bekzod/Desktop/baito-v3-/backend/app/api/deps.py#L115-L148)):
  - `get_current_admin`: Strictly requires `user.role == 'admin'`.
  - `get_verified_worker`: Requires `user.role in ('worker', 'admin')` AND `_require_verified(user)`.
  - `get_verified_employer`: Requires `user.role in ('employer', 'admin')` AND `_require_verified(user)`.
- **Document Tamper Resistance:**
  In [`users.py`](file:///home/Bekzod/Desktop/baito-v3-/backend/app/api/v1/endpoints/users.py), if an employer or worker edits their uploaded passport/license documents, `isVerified` is **automatically reset to False**. This prevents users from passing document verification and subsequently replacing verified documents with malicious content.

---

## 5. CWE Mitigation & Log Leakage Hardening

### 5.1 CWE-598: Sensitive Data in Query Strings & Headers
Historically, WebSocket connections and API requests passed credentials in query strings (`?token=...` or `?ticket=...`), which were leaked to Nginx access/error logs when upstreams failed (HTTP 502).

**Current Hardened Defenses (Verified in PR #259):**
1. **Subprotocol Authentication:** WebSockets exclusively use `Sec-WebSocket-Protocol: baito-ticket.{ticket}`. Query-string parameters on WebSocket URLs are rejected with HTTP 400.
2. **Referer Header Leakage:**
   - Web application sets `Referrer-Policy: strict-origin-when-cross-origin` and `Cache-Control: no-store`.
   - Nginx logs use customized log formats stripping query parameters.
3. **Uvicorn Log Sanitizer:**
   [`main.py`](file:///home/Bekzod/Desktop/baito-v3-/backend/app/main.py#L31-L60) implements `RedactQueryFilter`, which regex-strips query strings from all `uvicorn.access` and `uvicorn.error` records.
4. **CI Regression Verification:**
   [`qa/test_nginx_upstream_down_regression.py`](file:///home/Bekzod/Desktop/baito-v3-/qa/test_nginx_upstream_down_regression.py) runs an automated mock upstream-down test in CI, verifying that neither `access.log` nor `error.log` records sensitive query strings during 502 Bad Gateway outages.

---

## 6. Data Privacy & PII Protection

1. **Spatial Privacy & Coordinate Jittering:**
   Job locations displayed on public map viewports ([`jobs/read.py:1259`](file:///home/Bekzod/Desktop/baito-v3-/backend/app/api/v1/endpoints/jobs/read.py#L1259)) apply slight deterministic coordinate jittering to prevent attackers from reverse-geocoding the exact home addresses of private individuals.
2. **Phone Number Masking:**
   Unverified workers and public viewers cannot see an employer's direct phone number until an application has been officially accepted.
3. **Media Storage Isolation:**
   Uploaded documents (ID cards, licenses) in MinIO are stored in private buckets and served only via authenticated streaming endpoints ([`backend/app/api/v1/endpoints/media.py`](file:///home/Bekzod/Desktop/baito-v3-/backend/app/api/v1/endpoints/media.py)) checking user ownership or admin privileges.
