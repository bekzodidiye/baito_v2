# BUG-025 — "Asosiy qilish" says the card was set as default and does nothing

- **Severity:** S3
- **Component:** frontend / payments (`MyCardsScreen.tsx:205`)
- **Found:** 2026-09-05, round-4 sweep
- **Status:** **Fixed** 2026-09-06 — button removed; the owner lifted the hold on the payment screens
- **Reproduction rate:** 3/3, plus a fourth run watching for the toast

## What happens

On **To'lovlar → Kartalarim**, pressing **Asosiy qilish** on a card shows a
green confirmation:

> **Asosiy karta qilib belgilandi**

Nothing is sent to the server and no card becomes the default.

## Evidence

Measured with a toast watcher polling `[role="alert"]` and every non-GET request
recorded:

```json
{ "toasts": ["Asosiy karta qilib belgilandi"], "requests": [] }
```

Card state read from `/payments/cards` either side of the click is unchanged:

```
before: [{"last4":"1234","isDefault":null}]
after:  [{"last4":"1234","isDefault":null}]
```

Three earlier runs, pressing the button after scrolling it into view, each
recorded `clicked` with an empty request list.

## Root cause

`frontend/src/features/payments/MyCardsScreen.tsx:205`

```jsx
<button
  onClick={() => {
    window.dispatchEvent(new CustomEvent('global-toast', {
      detail: { message: "Asosiy karta qilib belgilandi", type: 'success' }
    }));
  }}
>
```

The handler's entire body is the success message. There is no call behind it.

## Correction to the original fix direction

This finding first said the endpoint was "there and unused". That was wrong.
`PUT /payments/cards/{cardId}` exists, but it updates **`isActive` and nothing
else**, and `PaymentCard` has no default-card column at all:

```python
id, userId, type, last4, bank, token, isActive
```

So there was no endpoint to call. A default card is not a feature the backend
has.

## Impact

Low on its own — a default card only decides which card is preselected. What
makes it worth fixing is the shape: **the UI states that something happened when
it did not.** That is the same defect as BUG-017 (withdrawal reported success
without withdrawing) and BUG-018 (support chat answered itself), both found in
round 3. A user who sets a default, sees it confirmed, and later finds the wrong
card preselected has no reason to suspect the button.

## Fix direction

Call `PUT /payments/cards/{cardId}` with the default flag, `await` it, and only
toast on success — the same shape the withdrawal fix used. If a default card is
not a concept the backend supports yet, remove the button rather than leave it
announcing a state change it cannot make.

## Fix (2026-09-06)

The button is removed.

Making it work would mean a new column, a migration, an endpoint change and a
frontend change — a feature, in the data model of a payment system the owner
has said is being rewritten. The wrong week to add a column. Removing the
control costs users nothing they had: it never did anything.

Worth knowing for whoever does that rewrite: **`isDefault` is already read in
two places** and never supplied by the server —

- `MyCardsScreen.tsx:107` — picks which card shows as primary
- `PaymentModals.tsx:32` — preselects the card for a withdrawal

Both fall back to `savedCards[0]`, so they work; they just do not do what the
name suggests. If a default card is built later, those two reads are where it
lands.

Guarded by `MyCardsScreen.test.tsx`, which presses every control on the screen
and fails if any of them reports that a default was set. Against the old code
it caught the toast verbatim.
