# API checklist — Baito

94 endpoints enumerated from `@router.*` decorators across
`backend/app/api/v1/endpoints/`. This file records what was exercised in this
pass and what was not, per §6.2.

## Systematic checks run across the surface

| Check | Scope | Result |
|---|---|---|
| Authentication required | 27 parameterless GET endpoints, called with no session | 25 → 401/403 · 1 public (`/jobs`, intentional) · 1 → 422 (`/jobs/nearby`, missing required query params) |
| Authorisation — worker | 15 admin endpoints | 15/15 → 401/403 |
| Authorisation — employer | 8 admin endpoints | 8/8 → 401/403 |
| Ownership | foreign job PUT / DELETE | 403 / 403 |
| Missing resource | job, chat, application by absent UUID | 404 / 404 / 403 |
| Malformed id | non-UUID job id | 404, no 500 |
| Payload validation | empty body, wrong types, over-length, out-of-range | 422 |
| Control characters | NUL in any string field | **500 — BUG-002** |
| PII exposure | anonymous `/jobs` body | no phone numbers, no PII fields |
| PII masking | employer's applications list before/after hire | masked / unmasked on commitment |
| Idempotency | duplicate apply | 1 application stored |
| Rate limiting | login, SMS, job creation | 429 observed on login and SMS |

## Endpoints by module

| Module | Count | Endpoints |
|---|---|---|
| `admin_categories` | 3 | GET /categories; POST /categories; DELETE /categories/{cat_id} |
| `admin_disputes` | 2 | GET /disputes; PATCH /disputes/{dispute_id} |
| `admin_finance` | 4 | GET /withdrawals; PATCH /withdrawals/{tx_id}; GET /escrow; POST /jobs/{job_id}/escrow |
| `admin_jobs` | 5 | GET /jobs; GET /jobs/{job_id}/detail; PATCH /jobs/{job_id}/status; PATCH /jobs/{job_id}/worker; DELETE /jobs/{job_id} |
| `admin_promotions` | 4 | GET /promotions; POST /promotions; DELETE /promotions/{promo_id}; PATCH /promotions/{promo_id} |
| `admin_regions` | 4 | GET /regions; POST /regions; DELETE /regions/{region_id}; PATCH /regions/{region_id} |
| `admin_settings` | 4 | GET /settings; POST /settings; PUT /settings; POST /reports/digest |
| `admin_stats` | 4 | GET /stats; GET /transactions; GET /support-tickets; POST /broadcast |
| `admin_support` | 3 | GET /support-tickets/{ticket_id}; POST /support-tickets/{ticket_id}/messages; PATCH /support-tickets/{ticket_id} |
| `admin_users` | 7 | GET /users; PATCH /users/{user_id}/ban; PATCH /users/{user_id}/role; POST /users/{user_id}/balance; GET /users/{user_id}/detail; POST /users/{user_id}/notes; GET /audit-logs |
| `applications` | 4 | GET /worker; GET /employer; POST /{id}/hire; POST /{id}/reject |
| `auth` | 5 | POST /send-sms; POST /verify-sms; POST /login; POST /refresh; POST /logout |
| `chats` | 6 | GET /; POST /; GET /{chat_id}/messages; POST /{chat_id}/read; POST /{chat_id}/messages; WEBSOCKET /ws/{chat_id} |
| `job_actions` | 6 | POST /{id}/apply; POST /{id}/request-start; POST /{id}/confirm-start; POST /{id}/start; POST /{id}/complete; POST /{id}/bookmark |
| `jobs` | 9 | GET /bookmarked; GET /recommended; GET /nearby; GET /; POST /; GET /{job_id}; PUT /{job_id}; POST /{job_id}/view; DELETE /{id} |
| `media` | 1 | GET /{object_key} |
| `notifications` | 5 | GET /; GET /unread-count; POST /read-all; POST /{notification_id}/read; POST / |
| `payments` | 8 | POST /generate-link; POST /webhook/uzum; GET /cards; POST /cards; DELETE /cards/{card_id}; PUT /cards/{card_id}; GET /transactions; POST /withdraw |
| `support` | 2 | GET /conversation; POST /messages |
| `upload` | 1 | POST / |
| `users` | 7 | GET /me; POST /; PUT /me; PUT /me/password; GET /me/sessions; DELETE /me/sessions/{session_id}; DELETE /me/sessions |

**Total: 94**

## Not exercised in this pass

- Per-endpoint happy-path assertions for every one of the 94: the money,
  auth, ownership and posting paths were exercised end to end; the remaining
  admin CRUD endpoints were exercised for reachability and authorisation only.
- Payment provider callbacks (`/payments/webhook/uzum`, `/generate-link`):
  no sandbox credentials in this environment.
- `POST /upload` beyond type/size rejection, and the WebSocket `/chats/ws/{id}`
  handshake under load.
