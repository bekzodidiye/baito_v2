# BUG-023 — keyboard focus is invisible on controls that carry their own shadow

- **Severity:** S3 (WCAG 2.4.7 Focus Visible, Level AA)
- **Component:** frontend / Tailwind v4 ring utilities (`LanguageSelector.tsx`, `ProfileWidgets`, chat input bar, and every control combining `shadow-[…]` with `focus-visible:ring-*`)
- **Found:** 2026-09-04, keyboard pass of the round-3 sweep
- **Status:** **Fixed** — a single unlayered `:focus-visible` rule in `frontend/src/index.css`; verified across all 11 swept routes (see below)

## What happens

Tabbing through the app, focus lands on a control and **nothing changes on screen**. The
markup asks for a focus ring and `:focus-visible` matches — the ring simply never paints.

A keyboard user cannot tell which control they are on, including on
`/profile`'s **"Yechib olish →"** (withdraw) and **"Ish beruvchi rejimiga o'tish"**
(switch to employer mode).

## Measured, with real keyboard focus

Tabbing until the control actually holds focus, then reading computed style:

```
O'zb                  -> {tabReached:true, focusVisible:true, changed:false,
                          outline:"none 3px rgb(0, 6, 102)"}
Yechib olish          -> {tabReached:true, focusVisible:true, changed:false, …}
Ish beruvchi rejimiga -> {tabReached:true, focusVisible:true, changed:false, …}
```

`changed:false` compares the element's painted style unfocused vs focused: outline,
box-shadow, border and background are all identical.

## Root cause

The ring variables resolve correctly; they are just never composed into `box-shadow`:

```
--tw-ring-shadow        : 0 0 0 calc(2px + 2px) #000666     ← correct
--tw-ring-color         : #000666                            ← correct
--tw-ring-offset-shadow : 0 0 0 2px #fff                     ← correct

box-shadow  : rgba(0,0,0,0) 0px 0px 0px 0px,  ×4 transparent placeholders,
              rgba(0,0,0,0.01) 0px 1px 3px 0px   ← only the element's own shadow
outline-style: none                              ← from `focus:outline-none`
```

The affected controls set their own shadow with an arbitrary value, e.g. the language
selector (`LanguageSelector.tsx:37`):

```
… shadow-[0_1px_3px_rgba(0,0,0,0.01)] … focus:outline-none
  focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 …
```

Under Tailwind v4 (`tailwindcss@^4.1.14` in `frontend/package.json`) that arbitrary
`shadow-[…]` writes `box-shadow` directly and wins over the ring composition. The ring
variables stay defined and unused. Because `focus:outline-none` has already removed the
browser's own outline, the result is no focus indicator at all.

## Where it bites, and where it does not

Measured by comparing each control's painted style unfocused vs focused, across 11 routes:

| Route | Controls with no focus indicator |
|---|---|
| `/jobs` | 17 of 41 — the language selector plus the Leaflet region labels (see below) |
| `/messages` | 3 of 17 — language selector, the message input, one icon button |
| `/profile` | 3 of 23 — language selector, **Yechib olish →**, **Ish beruvchi rejimiga o'tish** |
| `/calendar`, `/notifications`, `/applications`, `/reviews`, `/support-chat` | 1 each |
| `/settings`, `/security`, `/help` | **0** |

The three clean routes are the contrast that proves the mechanism: their controls change
`outline` on focus rather than relying on a ring, so they are unaffected.

The `/jobs` count is inflated by Leaflet's region labels (`ANDIJON`, `SAMARQAND`, …), which
are `div`s in a map overlay rather than controls; they are a separate concern, not this bug.

## Note on measurement

A first pass reported far more failures by testing `/ring|shadow/.test(getComputedStyle(el).boxShadow)`.
Computed `box-shadow` never contains the literal word "ring", so that check failed for every
control that *does* have a working ring. The numbers above come from the corrected method —
comparing painted style before and after focus — and the three controls quoted at the top
were then re-verified individually with real `Tab` presses rather than programmatic
`.focus()`, since `:focus-visible` treats the two differently.

## Fix direction

Give the affected controls an outline-based focus style, which composes independently of
`box-shadow`:

```
focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary
```

Applying it once in a shared layer (or a small `focusRing` class) would cover the set,
rather than editing each call site. Whatever the shape, the check is the one this finding
used: the element's painted style must differ between focused and unfocused.

## What was done

One unlayered rule at the end of `frontend/src/index.css`. Unlayered CSS outranks
Tailwind's layered utilities, so it beats `focus:outline-none` without `!important`:

```css
:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}
```

`currentColor` is the part that makes one rule safe everywhere: a light button draws the
outline in its own dark text colour, a dark one in white — which is what the computed
styles showed those controls already intending (`rgb(0, 6, 102)` on the language selector,
`rgb(255, 255, 255)` on "Ish beruvchi rejimiga o'tish").

**Verified** — controls with no focus indicator, before → after:

| Route | Before | After |
|---|---|---|
| `/jobs` | 17 of 41 | 16 — all inside the Leaflet map |
| `/messages` | 3 of 17 | **0** |
| `/profile` | 3 of 23 | **0** |
| `/calendar`, `/notifications`, `/applications`, `/reviews`, `/support-chat` | 1 each | **0** |
| `/settings`, `/security`, `/help` | 0 | 0 |

The three controls verified by hand with real `Tab` presses now change
`outline-style: none` → `solid`, each in the colour its background calls for.

The 16 that remain on `/jobs` are all inside `.leaflet-container`, where `index.css`
deliberately suppresses the outline to stop a black rectangle appearing on click. That is
pre-existing and intentional; making map elements keyboard-visible is a separate piece of
work, and is noted in `qa/click-sweep.md` as unmeasured rather than fixed.
