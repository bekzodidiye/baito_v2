# QA Report — Round 2 — Baito — 2026-09-03 — `91f9ad0e3f6e`

Run under `QA.md` v1.0. Branch `claude/qa-protokol-2`, branched from `main` at `d0b361b`
(13 commits ahead as of this report). Second full pass — the first ran 2026-09-02 at `00c34cc6`
(`REPORT.md`). Between the two runs: the Uzum Bank Merchant API was built from a Postman
collection and integrated end to end, three rounds of authorized penetration testing ran against
the deployed app (all held except one rate-limiting gap, closed), and several infrastructure
fixes shipped (an int4/BigInteger overflow blocking balance credits, a fresh-DB migration
failure, docker-compose env passthrough, and a self-inflicted production outage from an empty
required env var). This pass re-verifies the whole product against that new baseline rather than
assuming round 1's findings are the only ones left.

## 1. Verdict

**GO WITH CONDITIONS.**

One S1 was found and fixed: manual escrow release (the admin "pay this worker" action) accepted
any valid user id with no check that the id belonged to someone actually hired for the job —
reproduced live with real balance movement to an uninvolved account, then fixed and covered by a
regression test (BUG-011). Two S2s were found and fixed on financial reporting screens: the admin
transactions list displayed every amount 100x too large (BUG-012), and the commission report tab
next to it was showing fixed, fabricated numbers regardless of real data (BUG-013). A third S2,
the "Chuqur Analitika" dashboard being entirely fabricated end to end, was found, documented, and
deliberately **not** fixed in this pass — see §8 for why — and is tracked as a follow-up task.

Four more findings (BUG-008, 009, 010, 014) were S3/S4 — stale UI state after a mutation, a
missing favicon, a dead refresh button on one screen, and a handful of mixed-script typos plus
missing empty states — all found, fixed and tested in this pass.

The condition for GO is the same shape as round 1's: one class of defect (fabricated/placeholder
data presented as live) has now been found twice (BUG-006 in round 1 was a locale fallback;
BUG-013 and BUG-015 in this round are fabricated numbers) on screens nobody had reason to
distrust. BUG-015 in particular needs a product decision — what counts as a daily/monthly active
user — that this pass is not positioned to make silently.

## 2. Scope

**Tested.** All 21 admin sub-screens (100%, up from 7 already covered earlier in this pass) —
every tab under "Avtomatlashtirish & AI", "Moliya va Xavfsizlik", and "Marketing & Tizim" was
opened and its content and controls checked, not just the ones touched by this pass's own fixes.
The full hire → escrow → complete → payout lifecycle, both via direct API and the admin UI. The
admin manual balance top-up path that was the origin of this whole multi-session engagement,
end to end. Every automated gate: backend suite, backend coverage, ruff, frontend typecheck,
frontend unit tests, frontend dependency audit, Playwright E2E.

**Re-verified rather than re-clicked.** The 38 non-admin routes (worker, employer, guest, public)
were not manually re-clicked screen by screen a second time — round 1 already swept 100% of them,
and nothing touched in this pass's fixes reaches that surface except two files that touch every
page uniformly (`index.html`, `manifest.json`, for BUG-009) and were verified directly. Regression
across the seven critical journeys covering that surface was confirmed by the Playwright suite
(chromium + firefox, 28 passed, 2 skipped, 0 failed) and a manual spot-check of the specific
screens tied to this pass's own findings (employer balance top-up, applicants tabs, worker
jobs/map/calendar/profile).

**Not tested, and why.**
- Same four items as round 1: AI/LLM quality (N/A, no model), production (SSH available but
  destructive testing is forbidden by §2; no code path in this pass required production access),
  payment/SMS provider sandboxes (none available), colour contrast and a real screen reader.
- **webkit** in the E2E suite. 14/45 specs fail under webkit specifically, with an explicit
  Playwright error naming three missing system libraries (`libicu74`, `libxml2`, `libflite1`).
  This is an environment gap, not a regression — confirmed by isolating chromium and firefox,
  both 100% green, and by the failure message itself naming a missing system dependency rather
  than an assertion failure.

**Blocked.** Nothing.

## 3. Findings

| ID | Sev | Pri | Type | Component | Summary | Status |
|---|---|---|---|---|---|---|
| BUG-011 | **S1** | P0 | security (authz) | `admin_finance.py::decide_escrow` | Escrow release paid out to any valid user id, no check they were hired for the job | **Fixed + test** |
| BUG-012 | S2 | P1 | functional | `admin_stats.py::get_transactions` | Every amount/fee on the admin transactions tab 100x too large (raw tiyin, not converted to UZS) | **Fixed + test** |
| BUG-013 | S2 | P1 | functional | `AdminTransactions.tsx` | Commission report tab showed fixed, fabricated numbers regardless of real data | **Fixed** |
| BUG-015 | S2 | P1 | functional | `AdminAnalytics.tsx` | Entire "Chuqur Analitika" dashboard (GMV, DAU/MAU, completion rate, top categories, regional share) is hardcoded fake data | **Open — documented, flagged as follow-up task** |
| BUG-008 | S3 | P2 | functional | `UserDetailModal.tsx` | User detail modal kept showing pre-change balance/role/ban after a successful mutation | **Fixed** |
| BUG-010 | S3 | P2 | functional | `useAdminData.ts` | Header's visible "Yangilash" button did nothing on React-Query-backed screens (Payouts, Audit Logs) | **Fixed** |
| BUG-009 | S4 | P3 | cosmetic | `index.html`, `manifest.json` | No favicon anywhere; every page load 404'd on the implicit `/favicon.ico` probe | **Fixed** |
| BUG-014 | S4 | P3 | content/cosmetic | 4 admin screens | Mixed-script typos (Cyrillic/Turkish characters in Uzbek labels) + 2 screens with no empty-state message | **Fixed** |

Round 1's seven findings (BUG-001…007) all remain fixed and covered; not re-litigated here.

## 4. Results by area

| Area | Cases | Pass | Fail | Blocked | Coverage / score |
|---|---|---|---|---|---|
| Functional (backend suite) | 137 | 137 | 0 | 0 | 72% line coverage (was 69% at round 1's close) |
| Functional (frontend units) | 49 | 49 | 0 | 0 | unchanged from round 1 |
| Frontend typecheck | `tsc --noEmit` | clean | — | — | across every commit in this pass |
| Dependency audit | `npm audit --omit=dev` | 0 vulns | — | — | unchanged from round 1's fix |
| **Admin UI sweep** | 21 admin sub-screens | 21 | — | 0 | **100%**; 8 of this round's findings came from here |
| E2E | 45 specs (15 × 3 browsers) | 28 (chromium+firefox) | 0 | 14 (webkit, env gap) | chromium/firefox both 100% green |
| Security (this pass) | manual escrow release path | — | 1 (S1) | — | BUG-011, fixed same pass |

## 5. AI quality scorecard

**N/A**, unchanged from round 1 — no model in this product.

## 6. Risk register — deltas from round 1

Round 1's five open risks (`risk-register.md`) are unreassessed here; none of this pass's fixes
touch `X-Forwarded-For` handling, PII retention, or `tasks.py` coverage. One addition:

| Risk | Impact | Likelihood | Mitigation | Owner |
|---|---|---|---|---|
| Fabricated data on trusted-looking dashboards | 4 | 3 | Two instances found in two rounds (BUG-006 round 1, BUG-013/BUG-015 round 2). Worth a systematic sweep for "does this number come from data or from the JSX" across every admin card, not just the ones clicked this round. | owner |

## 7. Coverage & traceability

Backend line coverage **72%** (4,415 statements, 1,244 missed), up from 69% at round 1's close —
the gain is the Uzum Merchant API module (94% covered on its own) plus this round's two new
regression tests. `app/tasks.py` is unchanged at the coverage level (still the least-covered
money-adjacent path); not touched by this pass's fixes.

## 8. Why BUG-015 was left open

QA.md's own rule for a defect this pass fixes is "smallest patch, in its own commit." BUG-015 —
the entire deep-analytics dashboard being fake — does not have a smallest patch. Implementing it
correctly requires: a real GMV/revenue query (the pattern already exists in `get_stats`), a
definition of "daily/monthly active user" this codebase has never needed before (there's no
session-activity or last-login-based signal wired up for this purpose), a definition of "on time"
for the completion-rate metric, and grouped aggregations over `Job` for both top-categories and
regional share. Guessing at any of those definitions and shipping a "real" dashboard built on a
guessed definition would trade an honestly-fake number for a confidently-wrong one — arguably
worse, since a stakeholder trusting the number has no way to tell the difference. This is
recorded as an open P1 finding with a scoped follow-up task rather than rushed.

## 9. Recommendations (beyond this release)

- **Everything from round 1's §9 still stands** — `app/tasks.py` coverage, a staging environment,
  idempotency policy, production-defect recording.
- **A "no literal currency/percentage/count in admin JSX" sweep.** Three of this round's eight
  findings (BUG-012, BUG-013, BUG-015) were financial or business-metric numbers that were either
  miscalculated or entirely fabricated, all on admin-only screens that look identical to real,
  trustworthy reporting. A grep for suspiciously round or suspiciously specific numeric literals
  in `frontend/src/features/admin/*.tsx` would likely surface more before the next pentest or
  audit finds them the hard way.
- **Resolve BUG-015 before it reaches a real stakeholder.** It is currently indistinguishable
  from a working dashboard to anyone who hasn't read this report.
- **Install webkit's system dependencies** (`libicu74`, `libxml2`, `libflite1`) in whatever
  environment runs the E2E suite, so all three configured browsers actually run instead of
  silently degrading to two.

## 10. Artefacts

- `findings/BUG-008…BUG-015` (this round)
- `evidence/backend-round2-final.txt`, `evidence/e2e-round2-final.txt` — mid-pass gate run
- This report

## 11. Reproduction appendix

Same disposable stack shape as round 1's §11 (`baito-qa2-net`, 4 containers, socat bridge,
`npm run dev:frontend`), stood up fresh for this pass and torn down at its close. Test accounts
were created with `scripts/create_accounts.py`, generated passwords not recorded here per the
same convention as round 1.

```
# Backend suite + coverage, run directly on host against the sqlite test DB
# conftest.py already defaults to (no docker/postgres dependency for this gate)
cd backend && python -m pytest --cov=app --cov-report=term-missing -q

# E2E, against the running Vite dev server on :5173
cd frontend && npx playwright test --project=chromium --project=firefox
```

Browser: the in-app Chromium pane, viewport 1440×900, plus direct API calls via `curl` for
reproduction steps that needed exact before/after balance verification (BUG-011, BUG-012).
