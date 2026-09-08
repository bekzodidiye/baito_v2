# BUG-017 — "Yechib olish" on the Payments screen reports success without withdrawing anything

- **Severity:** S1
- **Component:** frontend / payments (`PaymentModals.tsx`)
- **Found:** 2026-09-03, round-3 per-control click sweep
- **Status:** **Fixed** — see commit `0d53ae6`; verified live (request fires, balance moves, a rejected call no longer shows success)
- **Evidence:** `qa/evidence/BUG-017-withdraw-fake-success.png`

## What happens

A worker with money in their wallet opens **To'lovlar → Yechib olish**, types an amount,
picks their card and presses **Summani yechish**. After a 1.5-second spinner the modal
shows a green tick, **"Muvaffaqiyatli!"** and **"Amaliyot muvaffaqiyatli bajarildi."**

Nothing was withdrawn. No request reached the server, no withdrawal was recorded, and
the balance is unchanged — the same figure is still sitting on the card behind the modal
in the screenshot.

## Reproduction (live, on the disposable QA stack)

Worker `+998900003001`, balance 800 000 so'm, one saved card (needed — the submit button
stays disabled without one).

1. `/payments` → balance renders **800 000 so'm**
2. Click **Yechib olish** → modal opens
3. Enter `100000`, card preselected
4. Click **Summani yechish**
5. Modal shows **"Muvaffaqiyatli! / Amaliyot muvaffaqiyatli bajarildi."**

Instrumented in Playwright, counting only requests fired by the submit itself:

```
SUBMIT VISIBLE: 1 DISABLED: false
SUCCESS SHOWN: true
API CALLS DURING SUBMIT: []
```

Server state afterwards:

```
balance                       -> 800000     (unchanged)
transactions where type like '%withdraw%'  -> 0 rows
```

## Root cause

`frontend/src/features/payments/PaymentModals.tsx:88`

```js
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setTimeout(() => {
    setLoading(false);
    setSuccess(true);
  }, 1500);
};
```

The handler has no network call in it at all. It waits, then unconditionally declares
success. `PaymentsScreen.tsx:6` even imports `requestWithdrawalApi` — and never calls it.

## This is not a missing feature

The real endpoint exists and works. Called directly with the same worker and amount:

```
POST /api/v1/payments/withdraw {"amount": 100000}
-> 200 {"status":"ok","message":"Mablag' yechish so'rovi yuborildi",
        "transaction_id":"708cdd89-..."}

balance      800000 -> 700000
transactions withdraw|pending|10000000   (one row created)
```

The worker **Profil** screen already drives that endpoint correctly
(`frontend/src/hooks/useProfileScreen.ts:289`) — it awaits the call, catches failures and
toasts an error. So the product has one working withdrawal path and one fake one, and the
fake one is on the screen named "To'lovlar", reachable from two buttons
(`PaymentsScreen.tsx:134` and `:208`).

## Impact

A worker who withdraws from the Payments screen is told their money is on its way. It is
not. They will wait, then complain, and support has nothing to trace — no request, no
transaction, no log line. The failure is silent on both sides and the user is actively
misinformed by a success dialog.

## Scope of the same handler

`handleSubmit` also serves the `deposit` and `addCard` modal types, which would fake those
too — but `PaymentsScreen` only ever sets `modalType` to `'withdraw'`
(`setModalType` occurrences: lines 134, 208, 406-null), so withdraw is the only live path.
Card management is served by `/payments/my-cards` (`MyCardsScreen.tsx`), which is wired
properly.

## Fix direction

Call `requestWithdrawalApi` from the submit handler, `await` it, and only set `success` on
a resolved promise; surface the server's error message on rejection. The Profile screen's
`handleWithdrawSubmit` is the shape to copy. A regression test should assert that the
success state is never reached when the request fails.
