### [BUG-005] The five Playwright specs never ran, and when run, none of them reached the control it was aiming at

- **Severity:** S3      **Priority (proposed):** P2
- **Type:** functional (test architecture)
- **Component:** `frontend/tests/*.spec.ts`, `frontend/vite.config.ts`
- **Environment:** branch `claude/e2e-speclarni-tiklash`, full local stack — Postgres 15, Redis 7, API on :8000, `vite preview` on :5173, Chromium 1280×720
- **Reproduction rate:** 5/5 before the fix, 7/7 passing after
- **Traces to:** R-15 (test-suite trust, P1); found while fixing BUG-004
- **Status:** **Fixed** — 7 specs pass, and a CI job now runs them

---

## Correction to the first version of this finding

The first version of this write-up said two things that a closer look proved
wrong. Both are corrected below, and the wrong version is not preserved as if it
were a second opinion.

1. **It said the app "shows a login modal" where the specs expected a redirect.**
   It does not. The `fixed inset-0 z-[1000]` overlay that intercepted every
   click is the **onboarding tour**, which the landing page opens on a first
   visit and which covers the viewport until dismissed. It has nothing to do
   with authentication.
2. **It said all five specs assert a flow the app does not have.** Only two do.
   The other three were correct — or correct enough — and failed purely because
   the tour ate the click. `employer.spec.ts` in particular asserts a redirect
   to `/register`, and `/register` is exactly where the app goes.

The error came from reading one Playwright failure message and generalising it
across five files instead of probing each. The probe that settled it dismissed
the tour and recorded what each flow actually did.

## What each spec was really doing

| Spec | Asserted | App actually does | Verdict |
|---|---|---|---|
| `admin.spec.ts` | `/admin` → `/login` | → `/` (landing) | **stale assertion** |
| `worker.spec.ts` | search → `/login` | scrolls in place to the results section; search is open to guests | **stale assertion** |
| `employer.spec.ts` | post a shift → `/register` | → `/register` | **correct**, blocked by the tour |
| `auth.spec.ts` (bad password) | stays on `/login` | stays on `/login` and shows "Telefon raqam yoki parol xato" | **correct**, blocked by the tour |
| `auth.spec.ts` (employer login) | *nothing* | — | **asserted nothing**: filled, clicked, waited 500 ms, ended |

## Impact

Five specs, zero of them ever executed, gating nothing. Two carried a false
account of how the product behaves — the more expensive kind of dead test,
because a reader trusts it. And the whole suite had no way to start the app it
tested, so running it required knowing to start a server first.

## The fix

**The tour, once, in a fixture.** `frontend/tests/fixtures.ts` sets
`baito_has_seen_tour` before each page loads. A returning guest is the state
these specs are about; the tour stays testable by any spec that wants it.

**Two stale assertions rewritten against observed behaviour** — not against
whatever made them pass. `admin.spec.ts` now asserts that a guest lands on the
landing page *and* that no panel control came with them, plus a second test that
the admin API answers 401/403 directly, because a screen guard is cosmetic if
the endpoint behind it answers anyway. `worker.spec.ts` asserts the scroll and
the results region, and adds a guard check on a worker-only route.

**The empty test given something to assert.** It now signs in with credentials
from `E2E_PHONE` / `E2E_PASSWORD` and asserts the session is established, or
skips with a stated reason. Nothing is hardcoded; CI seeds a throwaway account,
masks the generated password and exports it.

**`vite preview` could not reach the API.** It does not inherit `server.proxy`,
so an E2E run against the built bundle would have hit 404 for every request —
and would have passed locally anyway, because `reuseExistingServer` quietly
reused a dev server that was already running. Added `preview.proxy`. Without
this the CI job would have been red on its first run for a reason that had
nothing to do with the app.

**A CI job that runs them**, on Postgres and Redis with a real API, against the
built bundle. `validate-docker` and `deploy` now depend on it.

## Result

7 passed, 0 failed, with `CI=true` and no dev server running — the same path CI
takes. Was 5 failed, 0 passed.

## Left alone

The onboarding tour itself has no spec. It is the first thing every new visitor
meets and the reason this suite was silently broken, so it is a reasonable next
one to write — but writing it is new coverage, not part of this fix.
