# Test plan — Baito QA pass

Protocol: `QA.md` v1.0, all six phases.
Commit under test: recorded in `REPORT.md` header.

## Scope

**In scope**
- Backend API: every endpoint reachable under `/api/v1` (§6.2 checklist).
- Data layer: escrow, balances, applications, jobs, chats, bookmarks.
- Frontend: the full UI inventory (§9.1) — every route and every interactive
  element, as every role that can reach it.
- Security: §8.2 classic application security.
- Performance: read paths under concurrency, on the local stack only.
- i18n across all three languages; mobile, tablet and desktop widths;
  keyboard and accessible-name checks.

**Out of scope, with reason**
- §7 (AI/LLM quality) and §8.1 (OWASP LLM Top 10): **not applicable** — the
  product contains no model. `ai_matcher.py` is deterministic scoring and
  `spam_detector.py` is keyword rules; there are no provider SDKs, no
  embeddings and no vector store. Reported as N/A, not as passed.
- Production environment: unreachable from this session (SSH blocked). No
  destructive test may run against it in any case (§2 MUST NOT 1).
- `mobile/` package: a separate Cypress project, not part of the deployed web
  app.
- Real payment and SMS providers: sandbox credentials are not present; those
  integrations are covered by contract-shape checks only, and the gap is named.

## Levels

| Level | What | Where it runs |
|---|---|---|
| Unit / integration | `backend/tests` (103 cases) | disposable Postgres 15 + Redis 7 |
| API | direct HTTP against the local stack, per-endpoint checklist | local |
| UI | agent-driven browser sweep, element by element | local Vite + local API |
| E2E | `frontend/tests/*.spec.ts` (5 cases, currently run by nothing) | reported as a gap |
| Performance | concurrent read load | local only |

## Environments

- **Local (this pass):** Docker Postgres 15, Redis 7, MinIO; API as four
  uvicorn workers — the same worker count as production; Vite dev server.
- **Production:** remote host inside a Tailscale tailnet. Not reachable here.
- **Staging:** does not exist.

## Data strategy

Seeded per run and torn down after: four accounts (admin, employer, two
workers) created through `scripts/create_accounts.py`, plus job postings
created through the API. Generated passwords are shown once by that script and
are never written into any artefact. No production data is copied.

## Entry criteria

- [x] App builds and runs locally.
- [x] Credentials exist for every role.
- [x] Browser tooling can screenshot and read console + network.
- [x] Baseline suite runs unchanged and its result is recorded.

## Exit criteria

§15 of `QA.md`, verbatim. Verdict stated in `REPORT.md` §1.

## Schedule

Single pass, phases 0–5 in order.
