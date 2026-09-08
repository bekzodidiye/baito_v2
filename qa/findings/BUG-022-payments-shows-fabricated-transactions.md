# BUG-022 — the Payments screen invents two transactions whenever the list is empty

- **Severity:** S2
- **Component:** frontend / payments (`PaymentsScreen.tsx:349`)
- **Found:** 2026-09-03, round-3 per-control click sweep
- **Status:** **Open** — fix identified (delete the block) but not applied; the owner has asked to leave the payment system untouched for now
- **Evidence:** `qa/evidence/BUG-022-fabricated-transactions.png`

## What happens

When the transaction list has nothing to show, the screen displays the empty state **and
two invented transactions underneath it, in the same card**:

> **Tranzaksiyalar yo'q** — Hozircha hech qanday to'lov amaliyoti bajarilmagan.
> *(No transactions — no payment operations have been carried out yet.)*
>
> | | | |
> |---|---|---|
> | **Lobia Machida — Smena** · 12 Oct, 2023 · 14:30 · Hamyon | **+45,000** | `Bajarildi` |
> | **Mablag' yechish** · 11 Oct, 2023 · 09:15 · Uzcard ****4521 | **-20,000** | `Kutilmoqda` |

Neither exists. "Lobia Machida" is not a user of this platform, the dates are from 2023,
and `Uzcard ****4521` is not this account's card — the account's real card ends 1234.
The rows carry status badges ("Bajarildi", "Kutilmoqda") and a chevron, so they read as
real, tappable history.

The screen simultaneously says there are no transactions and lists two.

## Reproduction

Worker `+998900003001`, who has withdrawals but no deposits, so filtering to income
empties the list:

1. `/payments`
2. Click the **Kirim** filter chip

```
Chiqim -> {"emptyState":false,"fabricatedRow":false}    (has real rows)
Kirim  -> {"emptyState":true, "fabricatedRow":true, "year2023":true}
```

A brand-new account with no transactions at all reaches the same state without touching a
filter.

## Root cause

`frontend/src/features/payments/PaymentsScreen.tsx:349`

```jsx
{filteredTransactions.length > 0 ? (
  filteredTransactions.map(...)          // the real rows
) : (
  <div>Tranzaksiyalar yo'q ...</div>     // the empty state
)}

{/* Dummy transactions to match design if there are none in db yet */}
{filteredTransactions.length === 0 && (
  <>
    ... two hardcoded rows ...
  </>
)}
```

The comment states the intent plainly — placeholder markup kept "to match design" — but it
ships, and it renders *in addition to* the empty state rather than instead of it.

## Impact

This is a financial screen. A user with no history is shown money they never received
(+45,000, marked completed) and a withdrawal they never made (-20,000, marked pending)
against a card number that is not theirs. The most likely reactions are a support ticket
about a payment that never arrived, or a fraud report about an unrecognised card — and
support will find nothing, because none of it is real.

It also fires on a filter with no matches, so an established user hits it too, not only
new accounts.

This is the fourth instance of the same family in three rounds: BUG-006 (a locale fallback
on a screen nobody had opened), BUG-013 (a fabricated commission report), BUG-015 (a
fabricated analytics dashboard), and now fabricated transactions. Each was placeholder
content that outlived the design phase on a surface nobody had reason to distrust.

## Fix direction

Delete the block. The real empty state directly above it is already correct, already
translated, and already says the right thing.
