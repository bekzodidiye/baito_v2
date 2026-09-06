# Metrics — Baito

One row per run. §24 requires a previous value beside every number; this is the
**first run under this protocol**, so the "previous" column reads `—` and the
trend is established from the next pass onward. Sample sizes are stated.

## Run history

| Run | Date | Commit | Backend tests | Coverage | Findings (S1/S2/S3/S4) | UI screens visited | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | 2026-09-02 | `00c34cc` | 104 passed / 104 | 69% | 0 / 1 / 3 / 1 | 52 of 59 | GO WITH CONDITIONS |
| 1b | 2026-09-02 | `1b45307` | 108 passed / 108 | 69% | 0 / 1 / 5 / 1 | 59 of 59 | GO WITH CONDITIONS (narrowed) |

Run **1b** is the same pass, after the owner asked for the three open findings
to be fixed, plus the follow-up that closed the UI sweep to 100%. Coverage
**was** re-measured at the end. Two findings are new and neither came from new
testing scope: BUG-005 because fixing BUG-004 meant running the E2E specs for
the first time, and BUG-006 because closing the sweep meant opening two screens
nobody had opened.

## This run in detail

| Metric | Previous | This run | Sample | Note |
|---|---|---|---|---|
| Backend suite | 103 passed | **108 passed, 0 failed** | 108 cases | +1 for BUG-001, +4 for BUG-002 |
| Line coverage (backend) | 69% (run 1) | **69%** | 4,116 statements, 1,274 missed | re-measured after the fixes; no threshold exists in CI |
| Coverage, `app/tasks.py` | 19% (run 1) | **28%** | 157 statements | the BUG-001 test reached 9 points of it; still the least-covered money path |
| Coverage, `app/schemas/job.py` | — | **93%** | 129 statements | after the BUG-002 validator and its four tests |
| Coverage, `app/services/escrow_service.py` | — | **93%** | — | |
| Coverage, `app/core/security.py` | — | **90%** | — | |
| Frontend unit tests | — | **0** | — | none exist |
| E2E specs that run in CI | 0 of 5 | **7 of 7** | own job, Postgres + Redis + API | gates `validate-docker` and `deploy` |
| E2E specs that pass when run | 0 of 5 | **7 of 7** | against the built bundle | was: 5 blocked by the onboarding tour, 2 of them also asserting a flow the app has never had |
| Lint findings, `app/` | — | **110** → **0** | 109 F401, 1 E712 | 83 ignored by name as re-exports, 26 deleted, 1 fixed; gate can now fail |
| Dependency advisories (prod) | — | **5 high** → **0** | frontend runtime deps | fixed; `--audit-level=high` now gates CI |
| Dependency advisories (backend) | — | **1** | `ecdsa` via `python-jose` | unreachable: JWTs are HS256 |
| Secrets in worktree / git history | — | **0 / 0** | full tree, all refs | regex sweep |
| Requirements coverage (P0/P1) | — | **22 of 22 traced** | see `rtm.csv` | 2 PARTIAL, 3 FAIL, rest PASS |
| UI screens visited | — | **59 of 59 (100%)** | inventory in `ui-inventory.md` | was 52; the last 7 swept in a follow-up pass |
| UI elements observed | — | **1,513** | across 59 screens | breadth crawl; not each individually clicked |
| Defects found by the last 7 screens | — | **1** | 90 elements | BUG-006 — the case for the 100% criterion |
| Unnamed interactive controls | 6 (earlier today) | **2** | 14 routes | |
| Undersized touch targets @375px | 60+ (earlier today) | **11** | 9 routes | remaining are wide filter chips |
| Flake rate | — | **0%** observed | 104 cases, 3 full runs today | one ordering flake was found and fixed earlier today |
| Test case effectiveness | — | **1.0%** | 1 of 104 cases found a defect this pass | the new case; the suite is regression cover, not discovery |
| p50 / p99 latency, job board | — | **630ms / 1,432ms** | 1,000 req, 200 concurrent | local stack, production worker count |
| Throughput, job board | — | **282 req/s** | as above | |
| Defect escape rate | — | **not computable** | — | requires production defect data; none available from this session |
| DDP / DRE | — | **not computable** | — | same reason |
| MTTR | — | **not computable** | — | first run; no prior report-to-fix history under this protocol |
| Change failure rate (DORA) | — | **not computable** | — | needs release/incident history |

## Metrics deliberately left uncomputed

Escape rate, DDP, MTTR and change failure rate all need production data or a
prior run. Reporting them from a single local pass would be inventing them.
They become available from run 2 onward, and escape rate needs production
defect reports to be recorded somewhere this process can read.

## AI eval scores

**N/A** — no model in the product. See `security/llm-top10.md`.
