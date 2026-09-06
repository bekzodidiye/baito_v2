# QA Report — Baito — 2026-09-02 — `00c34cc6693d`

Run under `QA.md` v1.0, all six phases. Branch `claude/qa-protokol`.

## 1. Verdict

**GO WITH CONDITIONS.**

One S2 was found and fixed during the pass: the hourly `auto_release_escrow`
task — the safety net that pays a worker whose finished job was never released
by hand — had never released anything, because the column it reads to decide
who to pay is written by nothing. Reproduced 3/3, root-caused, fixed, and
covered by a new regression test; the suite is green at 104/104.

The conditions were that three of the checks this project appears to run did
not run. Two of those are now closed on the owner's instruction: the lint gate
can fail, and a dependency audit runs before the build with the five advisories
already gone. The third is closed differently than expected — the E2E suite is
now runnable by one command, and running it for the first time showed that all
five specs assert a login flow this app does not use (**BUG-005**). Wiring
them into CI as they stand would make main red on every commit, so that
condition stays open pending a decision that belongs to the owner, not the
tester.

What remains: no E2E coverage, no frontend unit tests, and four unanswered
questions in `project-facts.md`, two of which decide what "done" means for the
passport scans and card references this system stores. A release can ship.

## 2. Scope

**Tested.** 94 API endpoints enumerated and swept for authentication,
authorisation, ownership, deep links and payload validation; 52 of 59 screens
visited across worker, employer and admin; the seven critical user journeys;
escrow, balance and withdrawal paths; three languages; mobile/desktop widths;
accessible names and focus order; concurrency and load on read paths.

**Not tested, and why.**
- **§7 AI/LLM quality and §8.1 OWASP LLM Top 10 — N/A.** The product has no
  model. Recorded as not applicable, not as passed (`security/llm-top10.md`).
- **Production.** Unreachable from this session (SSH blocked), and destructive
  testing against it is forbidden by §2 regardless. Nothing here is confirmed
  against production.
- **Payment and SMS providers.** No sandbox credentials; contract shape only.
- **Colour contrast** and a real screen reader — see below.
- **Cross-browser and real devices.** Chromium only.
- **Colour contrast, and a real screen reader.** Accessible names and tab order
  were checked programmatically; that is roughly a third of what an audit needs.
  One control is still unnamed: the password-visibility toggle on `/login`. And
  74 accessible names are hardcoded Uzbek literals against 55 read from the
  translations table, so a screen reader in another language still hears Uzbek
  across much of the app — measured, not exercised, and it needs its own pass.

**Blocked.** Nothing. Every §19 precondition was met: the app runs, credentials
exist for all three roles, the browser tooling reads console and network.

## 3. Findings

| ID | Sev | Pri | Type | Component | Summary | Status |
|---|---|---|---|---|---|---|
| BUG-001 | S2 | P1 | functional | `tasks.py::auto_release_escrow` | Releases nothing, ever — `jobs.hiredWorkerId` is never written | **Fixed + test** |
| BUG-002 | S3 | P2 | functional | `schemas/job.py` | NUL byte in any text field answers 500, not 422 | **Fixed + tests** |
| BUG-003 | S3 | P2 | security | frontend deps | 5 high-severity advisories in the production bundle | **Fixed + CI gate** |
| BUG-004 | S3 | P2 | process | `ci.yml` | Lint gate cannot fail; E2E suite never runs; no frontend unit tests | **Partly fixed** — gates real; E2E blocked on BUG-005 |
| BUG-005 | S3 | P2 | process | `frontend/tests/` | All 5 Playwright specs assert a login flow the app does not use | Open — needs an owner decision |
| BUG-006 | S3 | P2 | functional | `PaymentResult.tsx` | Payment result screens render Russian to an English interface | **Fixed** |
| OBS-01 | S4 | P4 | data | `transportRate` | Accepts `-50000`; traced — free-text display field, never parsed into money | Observation |
| OBS-02 | — | — | design | `POST /jobs` | Duplicate submits create two postings; an `Idempotency-Key` mechanism exists but only payments use it | Observation |

## 4. Results by area

| Area | Cases | Pass | Fail | Blocked | Coverage / score |
|---|---|---|---|---|---|
| Functional (backend suite) | 108 | 108 | 0 | 0 | 69% line coverage |
| API | 94 endpoints enumerated | see below | 1 | 0 | auth/authz swept across all; per-endpoint happy paths partial |
| Data | escrow, balances, applications | pass | 0 | 0 | escrow_service 93% |
| **UI sweep** | 59 screens · 1,513 elements | 59 | 0 | 0 | **100% of screens**; BUG-006 found here and fixed |
| AI eval | — | — | — | — | **N/A — no model** |
| Security | 12 systematic checks | 12 | 0 | 0 | BUG-003 closed |
| Performance | 3 load profiles | 3 | 0 | 0 | 1,000 req @200 concurrent, all 200 OK |
| E2E | 5 specs exist | 0 | **5** | 0 | runnable now; all 5 stale (BUG-005) |
| A11y | names + focus order, 14 routes | partial | — | — | 2 unnamed controls remain; contrast unmeasured |

## 4b. UI sweep coverage

Screens in inventory: **59** · visited: **59 (100%)**
Interactive elements observed: **1,513** · crashes 0 · console errors 0 ·
failed requests 0 · horizontal overflow 0
Roles swept: worker · employer · admin · guest (via login/register)
Mode: **automated crawl at 100% of reachable routes + targeted deep pass** on
money, permission, deep-link and destructive paths. A hand-click of all 1,423
controls was **not** performed and is not claimed.

The seven that stood open — `/jobs/:id`, `/chats/:id`, `/payments/success`,
`/payments/error`, `*`, `/login`, `/register` — were swept in a follow-up pass
and are now accounted for, which closes the §15 UI criterion. Two of them
failed: **BUG-006**. That is the argument for the criterion. The earlier locale
fix could not reach a screen nobody had opened, and the defect sat on the one
screen whose whole job is telling a user whether their money arrived.

What remains is depth, not reach: 1,513 controls were enumerated and their
screens verified; each was not individually clicked. Money, permission,
deep-link and destructive paths were deep-passed.

## 5. AI quality scorecard

**N/A.** No LLM, no embeddings, no vector store, no model provider. The two
modules named "AI" are deterministic scoring and keyword rules. Basis recorded
in `security/llm-top10.md`.

## 6. Risk register (open)

| Risk | Impact | Likelihood | Mitigation | Owner |
|---|---|---|---|---|
| R-15 test-suite trust | 4 | 2 | BUG-004 — fix the gates | owner |
| R-05 PII at rest | 5 | 3 | passport scans and card refs stored; retention obligation still `UNKNOWN` | owner |
| R-03 rate limiting trusts `X-Forwarded-For` | 5 | 3 | cannot be fixed at nginx; depends on the Funnel rewriting the header | owner |
| R-10 background jobs | 3 | 3 | `tasks.py` at 19%; `expire_stale_jobs`, `send_telegram_digest` untested | owner |
| R-16 data retention/deletion | 3 | 2 | no deletion path reviewed; obligation unknown | owner |

Full register: `risk-register.md`.

## 7. Coverage & traceability

22 requirements traced in `rtm.csv`. Every P0/P1 has at least one test.
Not passing: CUJ-1 (PARTIAL — SMS code path needs a provider sandbox),
input validation (FAIL — BUG-002), dependency hygiene (FAIL — BUG-003),
CI gates (FAIL — BUG-004), a11y (PARTIAL).
Backend line coverage **69%**, re-measured after the fixes (4,116 statements,
1,274 missed). `app/tasks.py` moved 19% → 28% — the BUG-001 test is the whole of
that gain, and it remains the least-covered money path in the product. No
threshold is configured in CI.

## 8. Conditions for GO

Four of the five were closed after the verdict was written, on the owner's
instruction. What follows is their state as of this revision.

1. ~~Remove `|| true` from the lint step.~~ **Done.** 83 findings were
   re-exports and are ignored by name in a new `backend/ruff.toml`; 26 were dead
   imports and are deleted; 1 needed the SQLAlchemy idiom rather than ruff's
   suggestion. Ruff is pinned. The gate can now fail.
2. ~~Close the five advisories and add a CI audit.~~ **Done.** All five are
   patch bumps inside the declared ranges. `npm audit --omit=dev
   --audit-level=high` now runs before the build.
3. **Wire the Playwright specs to CI — still open, and now understood.** The
   `test:e2e` script and a `webServer` exist, so one command runs them. Running
   them surfaced **BUG-005**: all five fail, none for a product reason. Wiring
   them in as they stand would make main red on every commit. Needs an owner
   decision: update them to the modal-based flow, or delete them and record
   that E2E is uncovered. — *owner*
4. ~~Fix BUG-002 with a test.~~ **Done.** Control characters are refused at the
   schema layer with a 422; four tests, one of which asserts that emoji, Arabic,
   Cyrillic and accented Latin stay accepted.
5. **Answer the four open questions in `project-facts.md`** — compliance regime,
   the critical-failure definition, release sign-off, and whether an age gate is
   intended. Two of them gate what "done" means for PII. — *owner*

## 9. Recommendations (beyond this release)

- **Treat `app/tasks.py` as a P0 coverage area.** It is 28% covered — up from
  19%, and all of that gain is the one test written for BUG-001 — and it holds
  the only money movement that happens without a human. `expire_stale_jobs` and
  `send_telegram_digest` are still untested.
- **Add a frontend test layer.** There are zero unit tests. Every frontend
  defect in this session was found by hand, which does not scale and does not
  survive this session ending.
- **Stand up a staging environment.** `RUNBOOK.md` states every change is proven
  in production. That is the single largest structural risk to quality here.
- **Decide on idempotency for writes** (OBS-02). The mechanism exists and is
  used by one endpoint.
- **Record production defects somewhere this process can read**, so escape rate
  and DDP become computable from run 2.

## 10. Artefacts

- `project-facts.md` — §0, filled, with four open questions
- `test-plan.md` · `risk-register.md` · `rtm.csv`
- `ui-inventory.md` (59 screens) · `ui-sweep.md` (52 visited, 1,423 elements)
- `api-checklist.md` (94 endpoints)
- `findings/BUG-001…BUG-006`
- `sessions/SES-01-ugly-data.md` · `sessions/SES-02-permissions-and-interruption.md`
- `perf/results.md`
- `security/llm-top10.md` (N/A, with basis) · `security/scans/` (ruff, pip-audit,
  npm-audit, secret sweeps — raw output)
- `evidence/baseline-pytest.txt` · `evidence/coverage.txt` ·
  `evidence/regression-after-fix.txt` ·
  `evidence/regression-after-open-findings.txt` · `evidence/coverage-after-fixes.txt`
- `rca.md` · `metrics.md`
- `history/` — empty; this is run 1.

## 11. Reproduction appendix

```
# Dependencies
docker network create baito-qa-net
docker run -d --name baito-qa-db    --network baito-qa-net \
  -e POSTGRES_USER=user -e POSTGRES_PASSWORD=testpw -e POSTGRES_DB=baito postgres:15
docker run -d --name baito-qa-redis --network baito-qa-net redis:7-alpine
docker run -d --name baito-qa-minio --network baito-qa-net \
  -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin minio/minio:latest server /data

# API (four uvicorn workers, as production)
docker run -d --name baito-qa-api --network baito-qa-net -p 18190:8000 \
  -e DATABASE_URL="postgresql://user:testpw@baito-qa-db:5432/baito" \
  -e REDIS_URL="redis://baito-qa-redis:6379/0" \
  -e SECRET_KEY=... -e ENVIRONMENT=development \
  -v "$PWD/backend:/app" baito-backend-upgraded
docker exec baito-qa-api sh -c "cd /app && alembic upgrade head"
docker exec baito-qa-api sh -c "cd /app && python scripts/create_accounts.py \
  'admin:+998900001004:QA Admin' 'employer:+998900001001:QA Ish beruvchi' \
  'worker:+998900001002:QA Ishchi' 'worker:+998900001003:QA Ishchi 2'"
# generated passwords are printed once and are deliberately not recorded here

# Backend suite with coverage
docker exec baito-qa-db psql -U user -d baito -c "CREATE DATABASE baito_test"
docker run --rm --network baito-qa-net -v <snapshot>:/snap -w /snap/backend \
  -e DATABASE_URL="postgresql://user:testpw@baito-qa-db:5432/baito_test" \
  -e REDIS_URL="redis://baito-qa-redis:6379/9" -e COVERAGE_FILE=/tmp/.coverage \
  --entrypoint sh baito-backend-upgraded -c \
  "pip install -q pytest pytest-timeout httpx pytest-cov; \
   python -m pytest tests/ -q -p no:cacheprovider --no-header --cov=app --cov-report=term"

# Frontend
socat TCP-LISTEN:8000,reuseaddr,fork TCP:127.0.0.1:18190   # dev server proxies /api to :8000
npm run dev:frontend                                        # Vite :5173

# Static analysis
docker run --rm -v "$PWD/backend:/src:ro" -w /work python:3.11-slim sh -c \
  "pip install -q ruff==0.5.0; cp -r /src /work/backend; cd /work/backend; ruff check ."
docker run --rm -v "$PWD/backend:/src:ro" python:3.11-slim sh -c \
  "pip install -q pip-audit; pip-audit -r /src/requirements.txt"
npm audit --prefix frontend --omit=dev
```

Browser: Chromium via the in-app pane, viewport 1440×900 (and 375×812 for the
mobile pass earlier today). No seeds or model versions apply — the system is
deterministic and contains no model.
