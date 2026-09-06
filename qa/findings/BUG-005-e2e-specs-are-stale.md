### [BUG-005] The five Playwright specs assert behaviour the app does not have, and never did in this codebase

- **Severity:** S3      **Priority (proposed):** P2
- **Type:** functional (test architecture)
- **Component:** `frontend/tests/*.spec.ts`
- **Environment:** branch `claude/qa-protokol`, full local stack — Postgres 15, Redis 7, API on :8000, `vite preview` on :5173, Chromium
- **Reproduction rate:** 5/5 (deterministic)
- **Traces to:** R-15 (test-suite trust, P1); found while fixing BUG-004
- **Found by:** running them for the first time, which is what BUG-004 asked for

**Steps to reproduce**
1. `cd frontend && npm run test:e2e -- --project=chromium`

**Expected result**
A suite that gates a deploy passes against the code it gates, or names a defect.

**Actual result**
5 failed, 0 passed — and **none of the five is a product defect.** They were
written against a route-based login flow the app does not use.

| Spec | Asserts | App actually does |
|---|---|---|
| `admin.spec.ts` | `/admin` → navigates to `/login` | → navigates to `/`, which is also secure, and which the spec's own comment allows ("login sahifasiga **yoki bosh sahifaga**") while its assertion does not |
| `worker.spec.ts` | searching → URL contains `/login` | opens a login **modal** (`fixed inset-0 z-[1000]`), no navigation — the click times out on the overlay it itself caused |
| `employer.spec.ts` | posting → URL contains `/login` | same modal |
| `auth.spec.ts` (invalid credentials) | stays on `/login` | the login screen is not at a `/login` URL in the state the spec reaches it |
| `auth.spec.ts` (employer login) | — | **asserts nothing at all**: it fills, clicks, waits 500 ms and ends. It cannot fail and cannot pass meaningfully. |

The security property the first three were reaching for **does hold** and was
verified separately this pass: 23/23 permission checks correct, an
unauthenticated client cannot reach any admin route or endpoint, and a forged
client-side role is rejected by the server (`qa/sessions/SES-02-permissions-and-interruption.md`).

**Impact**
BUG-004 asked for these to be wired into CI. They cannot be, as written: the job
would be red on every commit from the first one. So the E2E layer stays at zero
coverage until somebody decides what these five files are for.

**Suggested fix / mitigation**
This needs a decision, not a patch, and it is not the tester's to make:

1. **Update them** to the modal-based flow the app uses, and add the missing
   assertion to `employer login flow check`; then add the CI job. This is the
   only option that ends with an E2E layer.
2. **Delete them** and say in the repo that E2E is not covered. Honest, and
   cheaper than option 1.

What should not happen is a third option where they are wired in behind
`continue-on-error`, which is where `ruff check app/ || true` came from.

**What was done here instead**
`npm run test:e2e` now exists and starts the app itself (`webServer` in
`playwright.config.ts`), so the suite is runnable by one command instead of
requiring a server somebody remembered to start. The specs themselves were left
exactly as they are: QA.md §2 forbids rewriting a test to make it pass, and
these fail for reasons that need the owner's judgement rather than a tester's.
