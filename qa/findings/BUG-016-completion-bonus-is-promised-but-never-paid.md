### [BUG-016] The completion bonus is promised, recorded, reported as earned — and never paid

- **Severity:** S1      **Priority (proposed):** P0
- **Type:** functional (money) — the app reports a payment that did not happen
- **Component:** `backend/app/api/v1/endpoints/job_actions.py` (`complete_job`),
  `backend/app/services/escrow_service.py` (`release_funds`),
  `backend/app/api/v1/endpoints/applications.py` (`earnedAmount`),
  `frontend/src/features/employer/components/FinishJobModal.tsx`
- **Environment:** branch `claude/qa-protokol-2`, disposable local QA stack (`baito-qa3-net`)
- **Reproduction rate:** 1/1, walked end to end through the real UI (post → apply → hire →
  request-start → confirm-start → complete-with-bonus)
- **Status:** **Open** — documented, deliberately not fixed in this pass (see below)
- **Traces to:** the critical journey "employer hires → escrow → worker completes → payout";
  found by clicking the whole worker/employer lifecycle rather than only the admin panel

**Preconditions**
An employer with a funded balance and a worker hired for one of their jobs, with the job
in progress.

**Steps to reproduce**
1. Employer opens the job on the dashboard and presses **Yakunlash**.
2. In "Ishni yakunlash", rate the worker, write a review, and enter **25 000** into
   "Qo'shimcha bonus (Ixtiyoriy)". The field's own helper text reads:
   *"Kiritilgan summa ishchining balansiga qo'shiladi"* — the amount will be added to the
   worker's balance.
3. Press **Yakunlash va Tasdiqlash**.
4. Compare what the worker is told against what the worker has.

**Expected result**
The worker receives the bonus on top of their wage, since that is what the employer was told
would happen.

**Actual result**
Measured directly against the database and the API for a 275,000 UZS job with a 25,000 bonus:

| | value |
|---|---|
| Worker balance before | 0 |
| Worker balance after | **247,500** (275,000 wage − 27,500 platform fee) |
| Employer balance before / after | 2,405,000 / **2,405,000** — unchanged |
| `applications.bonus` stored | **25,000** |
| `earnedAmount` the API reports to the worker | **300,000** |

The bonus is validated, stored on the application, and included in what the worker is told they
earned — but no balance anywhere moves by 25,000. The employer is not debited, the worker is not
credited, and no ledger entry is written. `EscrowService.release_funds` credits
`total_amount - platform_fee` from the escrow hold and has no knowledge of the bonus at all;
`app.bonus = req.bonus or 0` in `complete_job` is the only thing that ever touches it. A repo-wide
search for `bonus` in `backend/app/` confirms the sole balance-moving bonus code is the unrelated
*referral* bonus in `growth_engine.py`.

**A second, compounding error in the same numbers.** `applications.py:88-89` computes
`earnedAmount = base_salary + bonus` with **no platform fee deducted**. So even with the bonus set
to zero, the worker is told they earned 275,000 for a job that put 247,500 in their account. The
worker's Reviews screen (`ReviewsScreen.tsx:32`) sums this same field into a lifetime
"total earned" figure, so the overstatement accumulates across every completed job.

**Impact**
Critical, and it lands on both sides of the transaction:
- An employer who wants to reward a good worker enters an amount, is told it will be added to the
  worker's balance, and is shown a successful completion. The worker never receives it. Nothing
  in either interface says otherwise.
- The worker is shown an "earned" figure that is higher than what they were actually paid — by
  the unpaid bonus *and* by the undisclosed platform fee. A worker reconciling their earnings
  against their balance finds money missing and has no explanation for it.

This is the same class as BUG-011 (money the system claims to have moved correctly but did not),
and it is reachable through the ordinary UI with no admin access.

**Why this was not fixed in this pass**
Paying the bonus is not a one-line change; it needs decisions that belong to the product owner,
not the tester, and getting them wrong moves real money:
- **Who funds it?** The wage is escrowed at hire. The bonus is decided at completion, so nothing
  is reserved for it — the employer must be debited at that moment, which introduces a path where
  the employer has insufficient balance *after* the work is already done.
- **Does the platform fee apply to the bonus?** Treating it as wage takes 10% of a tip; treating
  it as a pass-through does not. Both are defensible; they are different products.
- **Is it atomic with the release?** If the bonus debit fails, does the whole completion roll back
  (worker unpaid for work already done) or does it complete without the bonus (silent again)?

`earnedAmount` is more clearly wrong on its own — it should reflect what the worker actually
receives — but changing it while the bonus question is open would just move the discrepancy
rather than close it, so both are being reported together.

**Suggested fix**
Decide the three questions above, then either (a) debit the employer and credit the worker for
the bonus inside the same transaction as the escrow release, writing an `AuditLedger` entry for
each side as `release_funds` already does for the wage, or (b) if the bonus is not meant to be a
real payment, remove the field and the promise from the completion modal entirely. Whichever is
chosen, `earnedAmount` must be made to equal what the worker was actually paid.

**Regression risk**
Not assessed — no fix was written.

**Follow-up**
Flagged as its own task, like BUG-015, rather than patched blind.
