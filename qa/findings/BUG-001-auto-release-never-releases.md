### [BUG-001] Celery `auto_release_escrow` — releases nothing, ever — because `jobs.hiredWorkerId` is never written

- **Severity:** S2      **Priority (proposed):** P1
- **Type:** functional (money safety net)
- **Component:** `backend/app/tasks.py::auto_release_escrow`, hire flow in `backend/app/api/v1/endpoints/applications.py`
- **Environment:** branch `claude/qa-protokol` at `00c34cc`, local stack — Postgres 15, Redis 7, API image `baito-backend-upgraded` (4 uvicorn workers), Linux
- **Reproduction rate:** 3/3 runs with the precondition met; 1/1 releases once the field is populated
- **Traces to:** R-01 (escrow, P0), CUJ-5

**Preconditions**
1. `system_settings.escrowAutoReleaseEnabled = true`, `escrowAutoReleaseHours = 24`.
2. A job with status `completed`, `completedAt` older than the cutoff.
3. An `escrow_hold` transaction for that job still in status `held`.

**Steps to reproduce**
1. Employer posts a job, worker applies, employer hires (escrow is held), job is started and completed through the API.
2. Put the job back into the state the task exists for — a completed job whose escrow was not released:
   ```sql
   UPDATE transactions SET status='held' WHERE "jobId"=<job> AND type='escrow_hold';
   UPDATE jobs SET "completedAt" = now() - interval '48 hours' WHERE id=<job>;
   INSERT INTO system_settings (id,"escrowAutoReleaseEnabled","escrowAutoReleaseHours")
     VALUES ('singleton', true, 24) ON CONFLICT (id) DO UPDATE SET "escrowAutoReleaseEnabled"=true;
   ```
3. Run the task: `python -c "from app.tasks import auto_release_escrow; print(auto_release_escrow())"`.

**Expected result**
The task releases the held escrow to the hired worker and returns `1`. The task's own
docstring states its purpose: *"Pay out work that was finished and never disputed …
Money stayed frozen until somebody released it by hand, which for a completed job
nobody had objected to is just a delay to the worker."* The admin panel exposes an
"auto-release after N hours" control, which implies the mechanism runs.

**Actual result**
Returns `0` on every run. The transaction stays `held`, the worker's balance does not move.

**Evidence**
```
precondition (observed):
  status | past_cutoff | hiredWorkerId IS NULL | tx.status
  completed |     t     |          t            |   held

worker balance before: 180000
  run 1: auto_release_escrow() = 0
  run 2: auto_release_escrow() = 0
  run 3: auto_release_escrow() = 0
worker balance after:  180000
transaction status:    held

then, changing ONE thing — populating the field the task reads:
  UPDATE jobs SET "hiredWorkerId" = <worker id> WHERE id=<job>;
  auto_release_escrow() = 1
  worker balance: 180000 -> 360000
  transaction status: released
```

**Impact**
The safety net that exists so a completed, undisputed job does not leave a worker's
wage frozen has never operated. It runs hourly and does nothing. Money is released
only when the normal completion path releases it; any job that reaches `completed`
with escrow still held stays held until a human intervenes — and nobody is alerted,
because the task reports success with a count of zero. The admin panel presents a
working control for this, so an operator has no reason to suspect otherwise.

Not "workers are never paid": the ordinary completion path does release. This is the
recovery mechanism, and it is inert.

**Suspected root cause** *(inference, then verified)*
`auto_release_escrow` reads `job.hiredWorkerId` to decide who to pay, and falls
through `if not worker_id: continue`. Grep across `backend/app/api/v1/endpoints/`
finds **no assignment to `hiredWorkerId` anywhere** — the column exists on the model
with a relationship, but the hire flow records the hire on the `applications` table
only. Verified by populating the column by hand and re-running: the task then
released correctly, with no other change.

**Suggested fix / mitigation**
Set `job.hiredWorkerId` when an application is hired, in the same transaction as the
escrow hold, in `applications.py::hire_applicant`. For jobs with several vacancies
the column can only hold one worker, so the durable fix is for the task to resolve
the hired worker from the `applications` table instead; setting the column is the
smaller change and matches how the rest of the code already reads it.
Either way, add a test that the task releases when it should — the only existing test
asserts `auto_release_escrow() == 0`, which passes precisely because the feature is
broken.

**Regression risk if fixed**
Re-test: hire (escrow held), multi-vacancy hire, complete (normal release still
single), cancel-after-hire refund, and the admin escrow screens. Confirm auto-release
does not double-pay a job the completion path already released — it filters on
`status == 'held'`, so a released row is out of scope, but that is the case to prove.
