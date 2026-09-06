### [BUG-007] The onboarding tour's close button cannot be clicked, and has no accessible name

- **Severity:** S3      **Priority (proposed):** P2
- **Type:** functional (dead control) + accessibility
- **Component:** `frontend/src/components/OnboardingTour.tsx`
- **Environment:** branch `claude/onboarding-turi-speci`, local stack, Chromium 1280×720, `vite preview` on the built bundle
- **Reproduction rate:** 3/3
- **Status:** **Fixed**, in the same PR as the spec that found it
- **Traces to:** R-14 (accessibility); §9.1 — found while writing the tour's first spec

**Preconditions**
A visitor who has not seen the tour (`baito_has_seen_tour` unset).

**Steps to reproduce**
1. Open `/`. The tour opens.
2. Click the ✕ in the top-right corner of the dialog.

**Expected result**
The tour closes, as it does from "O'tkazib yuborish" — both call the same
`handleSkip`.

**Actual result**
Nothing happens. The dialog stays open and `baito_has_seen_tour` stays unset.
Verified with a real mouse click at the button's own centre, not a synthetic
dispatch:

```
button:            32×32 at (796, 136), position: absolute, z-index: 10
element on top:    DIV.p-8 pt-12 pb-6 …,  position: relative, z-index: 10
click at centre:   baito_has_seen_tour  null → null,  overlay still open
```

**Root cause**
The close button is `absolute … z-10`. The content block that follows it in the
DOM is `relative z-10` and its box starts at the top of the card, so it covers
the corner the button sits in. Equal stacking level, later in document order —
the content wins the hit test. The button is painted and never reachable.

**Impact**
Low, because "O'tkazib yuborish" sits right below and does the same thing. But
it is a visible control on the first screen every new visitor sees, and it does
nothing when clicked. Someone who reaches for the ✕ concludes the page is stuck.

**Also on the same control: no accessible name.** It contains only an `<X>` icon
with no `aria-label`, so a screen reader announces "button". Its own spec has to
find it as "the button in this dialog with no text", which is the shape of the
problem. This is one instance of the 74 unnamed or hardcoded accessible names
recorded under BUG-006.

**Suggested fix / mitigation**
Raise the button above the content — `z-20` on the button, or `pointer-events:
none` on the decorative content wrapper — and give it an `aria-label` from the
translations table alongside `skip`, `next` and `start`, which the component
already localises correctly in all three languages.

**Regression risk if fixed**
Low. Re-check that the dialog's other two buttons still take their clicks, and
that the close still records `baito_has_seen_tour`.

**Fix applied**
`z-20` on the button, so it sits above the `relative z-10` content block that was
winning the hit test, and an `aria-label` from the component's own `t` object —
the same place `skip`, `next` and `start` live, in all three languages. Nothing
else changed; the decorative wrapper was left alone rather than given
`pointer-events: none`, because raising the button is the smaller change and
does not alter what else in that corner can be reached.

**Verified**
`frontend/tests/onboarding.spec.ts` carried the assertion as `test.fixme` when
the finding was written. It is now a real test: the close control is found by
its accessible name — which it did not have — and clicked like any other button.
The two language specs additionally assert the name is localised, so a repeat of
BUG-006 on this control would fail here.

Full suite: **15 passed, 0 skipped.** Was 14 passed, 1 fixme.
