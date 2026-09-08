### [BUG-012] Admin "Escrow va Tranzaksiyalar" tab shows every amount 100x too large

- **Severity:** S2      **Priority (proposed):** P1
- **Type:** functional (unit conversion / data display integrity)
- **Component:** `backend/app/api/v1/endpoints/admin/admin_stats.py` (`get_transactions`)
- **Environment:** branch `claude/qa-protokol-2`, disposable local QA stack
- **Reproduction rate:** 4/4 (every row in the table, both `escrow_hold` and `withdraw` types)
- **Status:** **Fixed**, same PR as this report
- **Traces to:** §9.1 UI sweep — admin "Escrow va Tranzaksiyalar" screen, "Tranzaksiyalar" tab;
  found immediately after fixing BUG-010 on the neighboring "To'lovlar va Escrow" screen, by
  comparing the same underlying hold across the two screens

**Preconditions**
Any transaction exists (an escrow hold from a hire, or a worker withdrawal).

**Steps to reproduce**
1. Hire a worker for a job with salary 180,000 UZS (real escrow hold created).
2. As admin, open "Escrow va Tranzaksiyalar" → "Tranzaksiyalar" tab, or
   `GET /api/v1/admin/transactions` directly.

**Expected result**
The row for that hold shows 180,000 UZS.

**Actual result (before fix)**
The row shows **18,000,000 UZS** — exactly 100x the real amount. Confirmed against the same
underlying transaction row via a second admin endpoint: `GET /api/v1/admin/escrow` (used by the
"To'lovlar va Escrow" screen) reported the correct `"amountUzs": 180000` for id `6ef79881...`,
while `GET /api/v1/admin/transactions` reported `"amount": 18000000` for the identical id in the
same request window. Released transactions showed the same 100x gap on `platformFee`: a real
10% fee of 15,000 UZS on a 150,000 UZS job displayed as 1,500,000 UZS.

**Root cause**
`Transaction.amount` and `Transaction.platformFee` are stored in tiyin (UZS × 100) throughout
this codebase — `payments.py`'s withdrawal handler writes `amount=req.amount * 100  # UZS ->
tiyin`, and every other reader converts back before returning it: `get_stats`'s
`totalRevenue`/`totalEscrowHeld` (`// 100`, commented `tiyin -> UZS`), and `admin_finance.py`'s
escrow list, release and refund responses (`r.amount // 100` in three places). `get_transactions`
in `admin_stats.py` was the one place in the admin API that returned `t.amount` and
`t.platformFee` raw, with no conversion.

**Impact**
Moderate-to-high for a read-only display bug: this is the platform's transaction ledger and
commission-reporting surface. An admin or finance reviewer relying on this screen for
reconciliation, fraud review, or revenue reporting would see figures inflated by two orders of
magnitude, on every row, with no visual indicator anything was wrong (both the wrong number and
the right number look like plausible currency amounts on their own).

**Suggested fix / mitigation**
Apply the same `// 100` conversion already used by every sibling endpoint on this table.

**Regression risk if fixed**
None found — this is the only reader of `/admin/transactions`, and no existing test asserted the
old (wrong) scale, so nothing depends on the bug.

**Fix applied**
`admin_stats.py`: `"amount": t.amount // 100` and `"platformFee": t.platformFee // 100`, with the
same `# tiyin -> UZS` comment convention already used in `get_stats` just above it. Both columns
are `nullable=False` on the model, so the division is always defined.

**Verified**
`backend/tests/test_admin_finance.py::test_admin_transactions_list_reports_uzs_not_tiyin` — hires
a worker for a 250,000 UZS job, asserts the transaction list reports `amount == 250_000` (not
25,000,000). Live repro reversed in the browser and via direct API call: the same hold that
previously showed 18,000,000 UZS now shows 180,000 UZS, matching the escrow screen exactly.

Full backend suite: **137 passed, 0 failed** (was 136 before this test). `ruff check`: all checks
passed. Frontend typecheck and unit tests unaffected (backend-only change).
