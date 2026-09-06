# Risk register — Baito

Impact × Likelihood, each 1–5. **≥15 = P0**, 8–14 = P1, below = P2.
Weighted upward per §1.3: money movement, authn/authz, deletion, PII, anything
unbounded. This product has no LLM, so the "model can act" weighting does not
apply.

## Critical user journeys (≤7)

| ID | Journey | Failure path also in scope |
|---|---|---|
| CUJ-1 | Worker signs up → verifies phone → completes profile | SMS never arrives; duplicate phone |
| CUJ-2 | Employer posts a shift → it appears in search and on the map | Rejected posting; unparseable wage |
| CUJ-3 | Worker finds a shift (search / filter / map) → applies | No results; applying twice; posting filled meanwhile |
| CUJ-4 | Employer hires → wage is held in escrow | Insufficient balance; two hires for one vacancy |
| CUJ-5 | Work starts → completes → worker is paid, platform takes its fee | Completed twice; cancelled after hire; dispute |
| CUJ-6 | Worker withdraws earnings | Over-balance, negative, zero; admin approval |
| CUJ-7 | Admin adjusts a balance / resolves a dispute | Adjustment without audit trail; wrong direction |

## Register

| ID | Area | Impact | Likelihood | Score | Band | Why |
|---|---|---|---|---|---|---|
| R-01 | Escrow: hold / release / refund | 5 | 4 | **20** | P0 | Real money. This session has already produced three defects here (charged on a negative wage, zero held on an unparseable wage, funds stranded on cancel). |
| R-02 | Balance mutation (admin + withdrawal) | 5 | 4 | **20** | P0 | Direct credit/debit. The admin path was silently broken for five days; withdrawal is user-triggered. |
| R-03 | Authentication & session | 5 | 3 | **15** | P0 | httpOnly cookies, refresh tokens, rate limiting keyed on a header the edge does not control. |
| R-04 | Authorisation / object ownership | 5 | 3 | **15** | P0 | 21 admin screens; job/chat/application ownership; deep links bypass hidden buttons. |
| R-05 | PII at rest and in transit | 5 | 3 | **15** | P0 | Passport series, JSHSHIR, passport scans, selfie-with-document, card references. |
| R-06 | Deploy reaching users | 4 | 3 | 12 | P1 | Just fixed: the service worker pinned every returning browser to its first build. Regression here silently disables every future fix. |
| R-07 | Job search & pagination correctness | 3 | 4 | 12 | P1 | Server-side search is new; ordering ties were unstable until this session. |
| R-08 | Concurrency on shared rows | 5 | 2 | 10 | P1 | `SELECT ... FOR UPDATE` + `populate_existing()`; CI only started exercising Postgres today. |
| R-09 | Input validation on postings | 3 | 3 | 9 | P1 | Wage strings are free text and feed the money path. |
| R-10 | Background jobs (Celery) | 3 | 3 | 9 | P1 | SMS delivery already failed once through a queue nobody consumed. |
| R-11 | Third-party outage (Uzum, TextUp, Yandex, Telegram) | 3 | 3 | 9 | P1 | No staging to rehearse against; Yandex Maps silently never loaded until today. |
| R-12 | i18n completeness | 2 | 4 | 8 | P1 | Three languages; hardcoded strings already found in settings. |
| R-13 | Mobile usability | 3 | 3 | 9 | P1 | Phone-first audience; touch targets were below guideline until today. |
| R-14 | Accessibility (WCAG 2.2 AA) | 2 | 4 | 8 | P1 | Unnamed controls found; contrast never measured. |
| R-15 | Test-suite trust | 4 | 2 | 8 | P1 | Frontend has no unit tests; an E2E suite exists that nothing runs; the lint gate is `|| true`. |
| R-16 | Data retention / deletion | 3 | 2 | 6 | P2 | No deletion path reviewed; obligation unknown (see project-facts open questions). |

## Risks to the testing itself

- **No staging.** Everything is validated locally against a disposable stack, or
  in production by deploying. Load and fuzzing must never run against production
  (§2 MUST NOT 1), so those results come from the local stack only.
- **Production not reachable from this session.** SSH to the deploy host is
  blocked here, so no finding in this report is confirmed against production.
- **Single browser engine.** Chromium only; no real devices.
