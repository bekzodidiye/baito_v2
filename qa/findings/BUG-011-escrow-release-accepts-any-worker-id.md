### [BUG-011] Manual escrow release pays out to any valid user id, regardless of the job

- **Severity:** S1      **Priority (proposed):** P0
- **Type:** authorization gap (broken object-level authorization)
- **Component:** `backend/app/api/v1/endpoints/admin/admin_finance.py` (`decide_escrow`),
  `backend/app/services/escrow_service.py` (`release_funds`)
- **Environment:** branch `claude/qa-protokol-2`, disposable local QA stack (`baito-qa2-net`), API
  called directly with an authenticated admin session cookie
- **Reproduction rate:** 2/2 (release to a bystander, then to the real hired worker)
- **Status:** **Fixed**, same PR as this report
- **Traces to:** critical journey "employer hires → escrow → worker completes → payout"; §8
  (security) — found while reading `decideEscrow` on the frontend to check why `window.prompt()`
  wasn't supported in the automated browser, which led to auditing the endpoint it calls

**Preconditions**
An authenticated admin session. An employer with an open job, held escrow from a hire.

**Steps to reproduce**
1. `employer` posts a job, `worker A` applies, `employer` hires `worker A` — escrow holds
   250,000 UZS for this job.
2. As admin, `POST /api/v1/admin/jobs/{job_id}/escrow` with
   `{"action": "release", "reason": "wrong id, by mistake", "workerId": "<worker B's id>"}`,
   where `worker B` has no application on this job at all.

**Expected result**
400 — this worker has no relationship to this job, nothing is paid out.

**Actual result (before fix)**
200. `release_funds` looks up the held escrow by `job_id` alone and credits whatever
`workerId` the request carries. Reproduced live: `worker B`'s balance moved from 0 to
225,000 UZS (250,000 minus the 10% platform fee) for a job they never applied to, were never
hired for, and never did any work on. `worker A`, who actually did the job, was left with
nothing — the hold was already consumed.

**Root cause**
`decide_escrow`'s release branch checked only that `workerId` was a non-empty, existing user id.
It never checked that user had any application on the job, let alone that they were the one
hired. The worker id itself is free-typed by the admin into a `window.prompt()` with no picker
or autocomplete (`frontend/src/features/admin/AdminPayouts.tsx`), so the only thing standing
between "correct payout" and "money to a stranger" was an admin typing the right UUID from
memory, or copy-pasting the right one from another browser tab.

**Impact**
Critical. This is the platform's actual money movement — an admin session (compromised,
mistaken, or a stale id copied from another tab) can redirect an employer's escrowed funds to
any registered user, with the API reporting success either way. The rightful worker gets nothing
and has no client-side signal that anything went wrong; the money is just gone from the hold.

**Suggested fix / mitigation**
Require an `Application` row for `(jobId, workerId)` with `status == "hired"` before calling
`release_funds`. `Job.hiredWorkerId` was considered and rejected as the sole check — it only
records the *first* hired worker on a multi-vacancy job, so it would have reintroduced the same
gap for job 2..N of any multi-hire posting.

**Regression risk if fixed**
Low. The normal path (release to the worker actually hired for the job) is unaffected; only the
out-of-band case (an id with no hired application on this job) now gets rejected before touching
the ledger.

**Fix applied**
`backend/app/api/v1/endpoints/admin/admin_finance.py`: before `EscrowService.release_funds` runs,
query for `Application.jobId == job.id AND Application.workerId == payload.workerId AND
Application.status == "hired"`. No match → `400 "Bu ishchi ushbu ish uchun yollanmagan — to'lov
chiqarib bo'lmaydi"`. `refund` was already scoped to the employer and needed no change.

**Verified**
`backend/tests/test_admin_finance.py::test_release_refuses_a_worker_who_was_never_hired_for_this_job`
— asserts the bystander is refused (400, both balances stay at 0), then that release to the
actually-hired worker on the same job still succeeds (200, balance becomes 225,000).

Full backend suite: **135 passed, 0 failed** (see `qa/evidence/` for this pass's run). `ruff check
app/`: all checks passed.
