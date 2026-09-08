# BUG-020 — the search button on the Payments screen has no handler

- **Severity:** S4
- **Component:** frontend / payments (`PaymentsScreen.tsx:109`)
- **Found:** 2026-09-03, round-3 per-control click sweep
- **Status:** **Open** — not fixed; the button sits on the Payments screen, which the owner has asked to leave untouched for now

## What happens

The Payments header shows a magnifier button on the right. Pressing it does nothing — no
search field appears, nothing filters, nothing is announced.

Both roles reach it: `/payments` is shared by `worker` and `employer`.

## Reproduction

```
worker   /payments #12 "Qidirish" -> DEAD (no url / html / network change)
employer /payments #13 "Qidirish" -> DEAD (no url / html / network change)
```

## Root cause

`frontend/src/features/payments/PaymentsScreen.tsx:109`

```jsx
<button
  aria-label={language === 'uz' ? 'Qidirish' : 'Поиск'}
  className="active:scale-95 duration-200 p-2 hover:bg-slate-200 transition-colors rounded-full cursor-pointer"
>
  <Search className="text-brand-primary w-6 h-6" />
</button>
```

No `onClick`, no `type="submit"`, no enclosing form. The element is decoration wearing a
button's clothes — and it is worse than a plain icon, because `aria-label="Qidirish"`
makes a screen reader announce it as a working search control.

## Impact

Low on its own: no data is lost and no money moves. It costs the user a moment of doubt
and it lies to assistive technology. It is listed because the sweep clicked it and it is
genuinely inert, not because it is urgent.

## Fix direction

Either wire it to filter the transaction list below (the list is already client-side, so a
local filter is enough), or delete the button and its `aria-label`. A control that
announces itself as search must do something when pressed.
