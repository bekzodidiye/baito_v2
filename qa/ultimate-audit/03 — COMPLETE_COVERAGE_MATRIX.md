# 03 — COMPLETE COVERAGE MATRIX: BAITO V3

## 1. Backend Endpoint Groups & Services

| Endpoint Group | Router Path | Auth Requirement | Critical Checks | Audit Status | Test Verification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Authentication** | `/api/v1/auth` | Anonymous / Token | Phone format validation, SMS rate limits, single-use token consumption, session issuance | **VERIFIED** | `test_auth.py`, `test_idle_sessions_are_over.py` |
| **Users & Profiles** | `/api/v1/users` | Authenticated | Privilege escalation prevention (admin role blocked on signup), KYC document upload, session revocation on password change | **VERIFIED** | `test_security_fixes.py`, `test_verification_required.py` |
| **Jobs (Listing/Search)** | `/api/v1/jobs` | Anonymous / Optional Auth | Fulltext search, region/district filtering, SQL injection prevention, translation fallback | **VERIFIED** | `test_job_status_union.py`, `test_jobs.py` |
| **Jobs (Map & Viewport)** | `/api/v1/jobs/map` | Anonymous / Optional Auth | Viewport bounds validation, PostGIS spatial queries, clustering algorithms, HMAC envelope verification, zero-DB cache hit | **VERIFIED** | `test_map_cache.py`, `test_map_clustering.py` |
| **Job Lifecycle** | `/api/v1/jobs/{id}/*` | Worker / Employer / Admin | Shift start stamping, single-day vs multi-day completion, cancellation restrictions, review & rating aggregation | **VERIFIED** | `test_worker_starts_shift.py`, `test_a_day_closes_once_it_has_arrived.py` |
| **Applications** | `/api/v1/applications` | Worker / Employer | IDOR prevention, duplicate application rejection, verification checks before apply, employer accept/reject guards | **VERIFIED** | `test_adversarial_concurrency.py`, `test_verification_required.py` |
| **Payments & Cards** | `/api/v1/payments` | Authenticated | Card addition bounds (max 5 cards), IDOR on card delete/update, withdrawal idempotency, balance sufficiency check, ledger recording | **VERIFIED** | `test_adversarial_concurrency.py`, `test_security_fixes.py` |
| **Invoices** | `/api/v1/invoices` | Public URL Token | Cryptographic token verification, replay safety, payment declaration audit, rejection of duplicate declaration | **VERIFIED** | `test_admin_finance.py`, `test_admin_payouts.py` |
| **Admin Operations** | `/api/v1/admin/*` | Administrator | RBAC enforcement (`get_admin_user`), dispute resolution, manual payout reconciliation, system settings clamp, spam filter management | **VERIFIED** | `test_admin_finance.py`, `test_admin_payouts.py`, `test_admin_job_steps.py` |
| **Chat & WebSocket** | `/api/v1/chats` | Authenticated | WSS handshake auth, participant authorization (IDOR protection), flood control (20 msgs / 10s), JSON frame parsing | **VERIFIED** | `test_chat_socket.py`, `test_security_fixes.py` |
| **Media Files** | `/api/v1/media` | Authenticated / Participant | Path traversal prevention (`OBJECT_KEY_RE`), identity document isolation, chat participant privacy checks, streaming S3 proxy | **VERIFIED** | `test_security_fixes.py` |

---

## 2. Frontend Routes & Screens

| Route Path | Component / Feature | Access Tier | Verified Capabilities | Audit Status | Test Verification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | Landing / Home | Public | Hero search, category selector, live job feed, interactive map preview, i18n switcher | **VERIFIED** | `LandingHero.test.tsx`, `landing.i18n.test.tsx` |
| `/jobs` | Job Search & Map | Public / Authenticated | Bounding box synchronization, cluster explosion, custom marker pins, filter sidebar | **VERIFIED** | `useMapViewportBounds.test.ts`, `useJobMarkers.test.ts` |
| `/jobs/:id` | Job Detail View | Public / Worker | Vacancy counter, wage display, schedule modal, application action with verification prompt | **VERIFIED** | `JobDetailsCard.i18n.test.tsx`, `JobDetailsFooter.test.tsx` |
| `/employer` | Employer Dashboard | Employer | Job posting wizard (3 steps), active shift management, applicant cards, day closure modal | **VERIFIED** | `EmployerJobCard.test.tsx`, `FinishJobModal.test.tsx` |
| `/calendar` | Worker Calendar | Worker | Shift schedule view, daily job cards, attendance status, multi-day shift grouping | **VERIFIED** | `CalendarScreen.utils.test.ts`, `CalendarJobCard.tsx` |
| `/payments` | Payments & Wallet | Authenticated | Balance card, transaction history list (UZS converted), card management modal, withdrawal flow | **VERIFIED** | `PaymentsScreen.test.tsx`, `MyCardsScreen.test.tsx` |
| `/invoices/:token` | Invoice Pay Portal | Public Token | Requisites copy button, payment declaration modal, status banner, language support | **VERIFIED** | `InvoicePayScreen.test.tsx` |
| `/admin/*` | Admin Control Panel | Admin | User management, dispute arbitration, payout confirmation, commission rates, broadcasts | **VERIFIED** | `AdminUsers.test.tsx`, `AdminPayouts.test.tsx`, `AdminSettings.test.tsx` |
| `/messages` | Chat & Messaging | Authenticated | Real-time WebSocket connection, typing indicators, image attachments, read receipts | **VERIFIED** | `ChatInputBar.test.tsx`, `ChatDetailPanel.tsx` |

---

## 3. Mobile Screens & Native Integrations

| Screen / Native Module | Framework / Plugin | Verified Capabilities | Audit Status | Test Verification |
| :--- | :--- | :--- | :--- | :--- |
| **Map View Screen** | React Leaflet + Capacitor | Viewport bounding sync, cluster expansion, tile recovery fallback on network error | **VERIFIED** | `mapTileRecovery.test.ts`, `useUzbekistanGeoJson.test.ts` |
| **Chat Socket Client** | WebSocket Native Bridge | Reconnection backoff, token query parameter auth, message delivery confirmation | **VERIFIED** | `chatSocket.test.ts` |
| **Android Build Assets** | `@capacitor/android` | Android Studio Gradle sync, ProGuard rules, local storage emulation | **VERIFIED** | Native build verification |
| **Keyboard & Safe Area** | Capacitor Keyboard | Input viewport resize, bottom sheet padding, safe area insets | **VERIFIED** | Visual & layout sweep |
