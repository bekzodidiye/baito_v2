### [BUG-013] "Komissiya Hisoboti" tab shows fixed numbers, not real commission data

- **Severity:** S2      **Priority (proposed):** P1
- **Type:** functional (fabricated data presented as live)
- **Component:** `frontend/src/features/admin/AdminTransactions.tsx` (commission tab)
- **Environment:** branch `claude/qa-protokol-2`, disposable local QA stack
- **Reproduction rate:** always (static markup, not data-dependent)
- **Status:** **Fixed**, same PR as this report
- **Traces to:** §9.1 UI sweep — found immediately after BUG-012, on the third tab of the same
  screen

**Preconditions**
None.

**Steps to reproduce**
1. Open "Escrow va Tranzaksiyalar" → "Komissiya Hisoboti" tab, on any account, at any time, with
   any amount of real transaction data (including none at all).

**Expected result**
"Bugungi Komissiya", "Oylik Jami Komissiya" and "O'rtacha Komissiya Stavkasi" reflect the
platform's actual commission revenue.

**Actual result (before fix)**
Always exactly: `1,450,000 UZS`, `48,500,000 UZS`, `10.0%` — regardless of how many transactions
exist, what they're worth, or what day it is. Confirmed by reading the JSX directly: the three
figures are literal string constants inside the render, with no reference to `transactions`,
`stats`, or any other prop or state.

**Root cause**
The tab was built with placeholder numbers and never wired to the transaction data the rest of
the same component already receives as a prop.

**Impact**
Moderate-to-high. This is presented as a live financial report next to two tabs
(`Tranzaksiyalar`, `Chiqarish So'rovlari`) that *are* real, on a screen an admin would reasonably
trust for revenue reporting. There is nothing in the UI to distinguish "real number" from
"placeholder that was never finished" — an admin citing today's or this month's commission
revenue from this tab would be citing a number with no relationship to the ledger.

**Suggested fix / mitigation**
Derive all three figures from the `transactions` array already passed into this component, rather
than adding a new backend endpoint for numbers this data already supports computing client-side.

**Regression risk if fixed**
Low. Purely a display computation over data already being fetched and rendered elsewhere on the
same screen; no new API calls, no change to what data is fetched.

**Fix applied**
`AdminTransactions.tsx`: `todayCommission` and `monthCommission` sum `platformFee` over
transactions with `status` in `paid`/`released`, filtered by `createdAt` falling on today /
in the current calendar month respectively. `avgCommissionRate` is the real weighted rate —
total settled `platformFee` over total settled `amount`, ×100 — rather than an assumed constant,
so it stays correct if the configured platform fee percent ever changes.

**Verified**
Live repro reversed: with two released transactions in the test data (150,000 UZS job at 10% =
15,000 UZS fee; 200,000 UZS job at 10% = 20,000 UZS fee, both today), the tab now shows
"Bugungi Komissiya: 35,000 UZS", "Oylik Jami Komissiya: 35,000 UZS", "O'rtacha Komissiya
Stavkasi: 10.0%" — matching both the arithmetic (15,000 + 20,000 = 35,000; 35,000 / 350,000 =
10%) and the admin dashboard's independently-computed "Komissiya Daromadi: 35,000 UZS" stat on
the overview screen.

Frontend typecheck (`tsc --noEmit`): clean. Frontend unit tests: **49 passed, 0 failed**.
