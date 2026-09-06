# §0 Project facts — Baito

Filled in Phase 0 from the repository. Every row is either observed in a file
named here, or marked `UNKNOWN` with the reason. Nothing is guessed.

| Key | Value | Source |
|---|---|---|
| Product / one-line purpose | Marketplace for daily/shift work in Uzbekistan: employers post shifts, workers apply, wages move through escrow | `README.md`, `frontend/index.html` meta |
| Primary users & their stakes | Workers (a day's pay), employers (money held in escrow, hiring), administrators (dispute and balance authority) | route roles in `AppRoutes.tsx`, `role` column |
| Repo layout | Monorepo. npm workspace = `frontend` only; `backend/` is a separate Python tree; `mobile/` present but not in the workspace | `package.json`, tree |
| Backend stack | Python 3.11, FastAPI, SQLAlchemy 2.x, Alembic, Celery (worker + beat), uvicorn ×4 workers | `backend/requirements.txt`, `docker-compose.yml` |
| Frontend stack | React 19, TypeScript (strict), Vite, TanStack Query, Zustand, Leaflet, Tailwind | `frontend/package.json` |
| Datastores | PostgreSQL 15, Redis 7, MinIO (S3-compatible object store) | `docker-compose.yml` |
| AI components | **None.** `services/ai_matcher.py` is a deterministic scoring function; `services/spam_detector.py` is keyword/regex rules. Zero model calls, zero LLM/vector dependencies | grep for provider SDKs returned nothing; both files read |
| Model provider(s) + pinned IDs | **N/A** — no models | as above |
| Vector store + embedding model | **N/A** | as above |
| External services | Uzum (payments), TextUp (SMS), Telegram (ops bot + backups), Sentry, Yandex Maps (client-side), Google map tiles, OpenStreetMap/Nominatim (geocoding fallback) | `.env.example`, `index.html`, `nginx.conf` CSP |
| Environments | local + production. **No staging** — RUNBOOK states "Every change is proven in production." Production is a remote host reachable only inside a Tailscale tailnet | `RUNBOOK.md`, `ci.yml` (`runs-on: self-hosted`) |
| Install command | `npm install` (root, workspaces) · `pip install -r backend/requirements-dev.txt` | `package.json`, `requirements-dev.txt` |
| Run command (app) | `npm run dev:frontend` (Vite :5173) · `cd backend && uvicorn app.main:app --reload --port 8000` · full stack: `docker compose up` | `package.json` scripts |
| Test command | Backend: `pytest tests/ -q` (needs a disposable Postgres + Redis). Frontend: **none exists.** E2E: `frontend/tests/*.spec.ts` exist but no script and no CI step invokes them | observed; `package.json` has no test script |
| Lint / type-check / format | Backend: `ruff check app/`. Frontend: `npm run lint` is `tsc --noEmit` — **a type check, not a linter; no ESLint is configured.** No formatter, no mypy | `package.json`, `ci.yml` |
| Existing coverage % | Measured this pass — see `REPORT.md` §4. Not previously measured: no coverage tool in `requirements-dev.txt`, no threshold in CI | `requirements-dev.txt`, `ci.yml` |
| Eval / golden dataset | **N/A** — no AI component to evaluate | as above |
| Critical user journeys | See `risk-register.md` (7 listed) | derived Phase 1 |
| Data sensitivity | PII (name, phone, passport series, JSHSHIR/PINFL, passport scans, selfie-with-document), payment card references, wage and balance records. No health data. Minors: signup collects a birth date; no age gate observed | `models/user.py`, registration flow |
| Compliance obligations | **UNKNOWN** — nothing in the repo states a regime (no privacy/DPA/PCI documentation beyond the in-app policy text). Must be answered by the owner |  |
| Languages | Uzbek (default), Russian, English | `src/translations/{uz,ru,en}.ts` |
| Definition of critical failure | Money moving wrongly (charged, not charged, stranded, paid twice), a worker unable to be paid, cross-account data exposure, or the platform unreachable | derived from product purpose; **to be confirmed by the owner** |
| Release cadence + sign-off | Push to `main` deploys to production automatically via a self-hosted runner. Sign-off: **UNKNOWN** — no CODEOWNERS, no required reviews observed | `ci.yml`, repo settings |

## Open questions for the owner

1. What compliance regime applies (personal data law, payment rules)? Passport
   scans and card references are stored; the obligations change the retention
   and access answers.
2. Is the "critical failure" definition above the right one to gate releases on?
3. Who signs off a release? Today a merge to `main` deploys itself.
4. Is there an intended age gate? Signup takes a birth date but nothing uses it.
