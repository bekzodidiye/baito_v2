# BUG-027 — the Security screen's search field filters nothing

- **Severity:** S4
- **Component:** frontend / settings (`SecurityScreen.tsx`)
- **Found:** 2026-09-06, while fixing BUG-020
- **Status:** **Fixed** — control removed
- **Reproduction rate:** 1/1, measured

## What happens

The Security screen's header carries a magnifier. Pressing it reveals a search
field. Typing into it changes nothing — every section stays exactly where it
was.

## Evidence

Measured by rendering the real screen, opening the search, and typing a string
that matches nothing on the page:

```
FAIL  narrows the sections to what was typed
      expected <h3>Parolni o'zgartirish</h3> to be null
```

"Parolni o'zgartirish" is still on screen after searching for `zzzzz`.

## Root cause

`searchQuery` is written by the input and **never read** anywhere else in the
file:

```
19:  const [searchQuery, setSearchQuery] = useState('');
135:            value={searchQuery}
```

Two references, both in the field itself. Nothing filters.

The magnifier also has no `aria-label`, so a screen reader announces an
unnamed button. The a11y pass that labelled 26 other controls did not reach
this one — which is how the test had to find it by position rather than by
name.

## Same family as BUG-020, opposite resolution

BUG-020 was the same defect on the Payments screen: a search control that did
nothing. That one was **wired up**, because the transaction list it sits above
is unbounded — search earns its place there.

This screen has three settings rows, a session list and one card. A search box
over three visible items is theatre: filtering them helps nobody, and building
it would mean turning static markup into a data structure to justify a control
users did not need. Removed instead.

Two identical defects, two different answers, for the same reason in both
cases: the control should do what it says, and if it cannot usefully do that,
it should not be there.

## Fix

The magnifier and the field are gone; the header keeps its spacing. Guarded by
`SecurityScreen.test.tsx`, which fails if a search field returns.
