### [BUG-006] `/payments/success` and `/payments/error` render Russian to an English interface

- **Severity:** S3      **Priority (proposed):** P2
- **Type:** functional (i18n)
- **Component:** `frontend/src/features/worker/profile/PaymentResult.tsx`
- **Environment:** branch `claude/qa-protokol` at `1b45307`, local stack, Chromium 1280×720, worker session
- **Reproduction rate:** 2/2 screens, 3/3 strings on each
- **Traces to:** R-13 (localisation); §9.1 screen inventory
- **Found by:** closing the UI sweep gap — these two screens were among the seven
  never visited, which is why the earlier locale fix (`c06aa95`) did not reach them.

**Preconditions**
1. Authenticated as a worker.
2. Interface language set to English.

**Steps to reproduce**
1. Set the interface language to English (`baito_language = "en"`).
2. Open `/payments/success`, then `/payments/error`.

**Expected result**
English, like the rest of the interface in the same viewport — the surrounding
chrome correctly reads `MENU`, `ACCOUNT & SETTINGS`, `Messages`, and
`<html lang>` is `en`.

**Actual result**
Every string on both screens is Russian.

| Screen | Rendered |
|---|---|
| `/payments/success` heading | `Оплата прошла успешно!` |
| `/payments/success` body | `Ваш счет успешно пополнен.` |
| `/payments/error` heading | `Ошибка при оплате` |
| `/payments/error` body | `Оплата не удалась. Пожалуйста, попробуйте еще раз.` |
| both, back button | `Вернуться назад` |

**Root cause**
The component does not use the translations table at all. Each string is an
inline two-way conditional — `language === 'uz' ? '…' : '…'` — so anything that
is not `uz` falls through to the Russian branch. There is no `en` branch to
reach. The file imports `translations` and `t`, and then never uses `t`.

**Impact**
An English-speaking user is told, in a language they did not choose, that their
account was topped up. This is the screen where being understood matters most:
it is the one that reports whether money arrived.

**Suggested fix / mitigation**
Move the six strings into `translations/{uz,ru,en}.ts` and read them through
the `t` the component already has in scope. That is the pattern the rest of the
app uses and the one `c06aa95` applied to the settings screen.

**Fixed** — `PaymentResult.tsx` now reads five keys through the `t` it already
had. Verified in the browser, both screens, all three languages, with no console
errors:

| | uz | ru | en |
|---|---|---|---|
| success heading | To'lov muvaffaqiyatli! | Оплата прошла успешно! | Payment successful |
| error heading | To'lovda xatolik | Ошибка при оплате | Payment failed |
| back button | Orqaga qaytish | Вернуться назад | Go back |

Uzbek and Russian are byte-identical to what they rendered before, which is the
regression this change could have caused. `uz.ts`, `ru.ts` and `en.ts` are each
at 192 keys, so the three stay in step. `tsc --noEmit` clean.

**Two things found while fixing it, recorded rather than acted on**

1. `frontend/src/features/payments/PaymentSuccessScreen.tsx` and
   `PaymentFailedScreen.tsx` exist and **nothing imports them**. They are dead
   code that looks exactly like the screens a person would go fix. Deleting
   them is a decision for the owner; the risk of leaving them is that the next
   locale fix lands in the wrong file.
2. **74 accessible names are hardcoded string literals**, against 55 that are
   read from the translations table. `"Orqaga"` alone appears 7 times. So a
   screen reader in English or Russian still announces Uzbek across much of the
   app — the same defect class as this one, at a scale that needs its own pass
   rather than a patch. Not filed as a defect here because it was measured, not
   exercised: no screen reader was run.

**Related, not a defect**
The same component decides success purely from `location.pathname.includes('success')`
— it verifies nothing. It is display-only and **no money is at stake**: the
balance is credited only by `POST /payments/webhook/uzum`, which checks an HMAC
signature and the reported amount against the order. So a user who reaches
`/payments/success` by typing it sees a claim that is not backed by a check,
but their balance is untouched. Recorded here rather than filed separately;
whether the screen should confirm against the server before asserting success
is a product decision, not a defect.
