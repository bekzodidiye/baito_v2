# Root cause analysis — Baito QA pass

Run per §23 on every S1/S2. This pass produced one S2 (BUG-001) and three S3s.
The S3s get a short cause note; the S2 gets the full 5 Whys.

## BUG-001 — auto-release escrow released nothing, ever (S2)

**5 Whys, down to a process cause**

1. *Why did a completed, undisputed job keep its wage frozen?*
   `auto_release_escrow` returned 0 on every run.
2. *Why did it return 0?*
   It reads `job.hiredWorkerId` to decide who to pay, found `None`, and took the
   `continue` branch.
3. *Why was `hiredWorkerId` None?*
   Nothing ever wrote it. The column and its relationship exist on the model,
   but the hire flow records the hire on the `applications` table only.
4. *Why did nobody notice a column with no writer?*
   The feature's only test asserts `auto_release_escrow() == 0` — the switched-off
   case. It passed for the wrong reason, and passing tests were taken as cover.
5. *Why was the only test the negative case?*
   The task was written together with the admin control that configures it, and
   the acceptance criterion checked was "the setting persists and the task is
   scheduled", not "money actually moves". **Process cause: a scheduled job that
   mutates money was accepted without a test that exercises the mutation.**

**Preventive change.** For any scheduled task that writes to a balance or a
transaction, the Definition of Done requires a test that drives it to the state
it exists for and asserts the write — not only that it no-ops when disabled.
Added this pass: `test_auto_release_actually_releases_a_completed_job`.

**What other test would have caught this?** A test asserting the hire flow's
post-conditions on the `jobs` row, not just on `applications`. Worth adding.

**Cause class:** test gap (primary) · design (secondary — hire state is written
in one place and read from another).

## S3 cause notes

| ID | Cause class | Note |
|---|---|---|
| BUG-002 NUL byte → 500 | code | Validation covers length, range and shape but not character class; the datastore is the first thing that objects. |
| BUG-003 vulnerable deps | process | No dependency audit in CI, so advisories accumulate with nothing surfacing them. |
| BUG-004 CI gates do not gate | process | `\|\| true` on the lint step; a scaffolded E2E suite never wired to a runner. |

## Cause distribution (this pass, n=4)

| Cause | Count | Share |
|---|---|---|
| process | 2 | 50% |
| test gap | 1 | 25% |
| code | 1 | 25% |

## Pareto — where prevention pays

1. **Process / CI gates (2 of 4).** Two of four findings exist because a check
   that looks like a gate is not one, or does not run. Fixing `|| true`, adding
   `npm audit` and wiring the Playwright suite converts three of this pass's
   manual findings into automated ones. **Highest-value change on this list.**
2. **Money-path test debt (1 of 4, but the most severe).** `app/tasks.py` sits
   at 19% coverage and contains the only unattended money movement in the
   product. `expire_stale_jobs` and `send_telegram_digest` still have no test at
   all. **Recommendation:** treat `tasks.py` as a P0 area for coverage, not a
   background detail.

## Escaped-defect rule

BUG-001 is now a permanent regression test. BUG-002 has a fix suggestion but no
test yet — it must not be closed without one. BUG-003 and BUG-004 are prevented
by CI configuration rather than by a test case.
