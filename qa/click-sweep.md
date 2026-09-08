# Per-control click sweep — every user-facing route — 2026-09-03

Round 1 and round 2 both **enumerated** controls and verified the screens around them, but
neither pressed each control individually — round 2's report says so explicitly ("1,423
controls were enumerated and their screens verified; each control was **not** individually
clicked in this pass"). This pass closes that gap for every user-facing route.

## Method

A Playwright harness clicked **every visible control, one at a time, each from a freshly
loaded page**, so no click inherited state from the one before it. For each click it
recorded: URL before/after, a hash of `document.body.outerHTML`, node count, every
`/api/` request fired, native dialogs, file choosers, and console errors.

Logout controls were skipped by name (32 of them) — clicking one ends the session and the
remaining controls on that route would report a false "dead".

Selector: `button, a[href], [role=button], [role=tab], [role=switch], input[type=submit],
input[type=checkbox], input[type=radio], summary`.

Accounts were created through the real signup flow (`send-sms` → `verify-sms` →
`POST /users`) on the disposable QA stack, then seeded with jobs, applications, a bookmark,
a saved card and a balance so the screens had content worth pressing.

## Coverage

| Role | Routes | Controls clicked |
|---|---|---|
| worker | 21 | 356 |
| employer | 17 | 286 |
| guest + deep links | 9 | 167 |
| **total** | **47** | **809** |

The nine in the last row are the ones the first two passes did not reach: `/`, `/login`,
`/register`, the 404 catch-all, `/jobs/:id`, `/chats/:id`, `/payments/success`,
`/payments/error` and `/verification`. The two parameterised routes needed real data, so a
chat and two messages were created through the API first — otherwise `/chats/:id` would
have resolved to an empty screen and proved nothing.

| Outcome | Count |
|---|---|
| navigated (URL changed) | 358 |
| acted (DOM / network / dialog changed) | 184 |
| no observable effect | 117 |
| click timed out | 114 |
| skipped (logout) | 32 |
| not present on reload | 4 |

## Triage of the 117 "no effect" results

A first-pass detector that compares only visible text misses controls that change nothing
but CSS classes — a selected day, an active filter. Every candidate was therefore
**re-clicked with a strict detector** that hashes full markup and watches for file
choosers, and the survivors were then read in source. That resolved all 117:

| Cause | Count | Verdict |
|---|---|---|
| the current page's own nav item | 24 | correct — clicking "Kalendar" while on `/calendar` should do nothing |
| already-active filter or tab | 31 | correct — verified by clicking a sibling first, then back (`/employer-jobs`: sibling click changed the DOM, target click then changed it again) |
| pre-selected option | 14 | correct — `/employer-post`'s first category is selected on load; picking another deselects it and clicking it back reselects it |
| class-only change the loose detector missed | 22 | correct — calendar days, notification and application filters |
| opens a native file chooser | 5 | correct — attach file, change photo, image upload |
| guarded no-op on empty input | 8 | correct — Send with an empty box (including on `/chats/:id`), "Qo'shish" with an empty tag field |
| `tel:` / `mailto:` links | 4 | correct — nothing for a headless browser to do |
| opens an external link in a new tab | 1 | correct — `/verification`'s "Admin bilan bog'lanish" is an `<a href="https://t.me/baito_admin" target="_blank">`; the harness only watched the original tab |
| non-interactive `div` caught by the selector | 3 | not a control |
| **genuinely dead** | **6** | **BUG-019 (×5 share buttons), BUG-020 (×1 search)** |

## Triage of the 114 timeouts

| Cause | Count | Verdict |
|---|---|---|
| the `sr-only` "Asosiy kontentga o'tish" skip link, off-screen until focused | 47 | correct |
| Leaflet region labels (`ANDIJON`, `SAMARQAND`, …) — `div`s in a map overlay, not controls | 26 | correct; the selector caught them, the map handles its own hit-testing |
| controls inside the collapsed bottom sheet on `/jobs`, `/jobs/:id` and `/` — the map view opens with the list closed | 33 | correct; re-tested after opening the list via "Ro'yxatni ochish uchun bosing" and **`Arizani topshirish` fired `POST /jobs/{id}/apply`** |
| disabled by design | 8 | correct — `Ariza yuborilgan`; `Kartani bog'lash` before the form is valid; and `/register`'s **`Davom etish`**, which is disabled until a role is chosen. Verified: after picking "Ish qidirish" it enables, and clicking it advances into the three-step PROFIL / HUJJATLAR / YAKUNLASH wizard |

No click anywhere in the sweep was blocked by an overlay intercepting pointer events — the
failure mode behind round 1's BUG-007 did not recur.

## What the sweep found

Pressing controls one at a time surfaced three defects that no amount of enumeration could
have: a button can fire, look right, and still not do its job — and a screen can fill an
empty list with content that was never real.

| ID | Severity | Summary |
|---|---|---|
| BUG-017 | S1 | Payments-screen withdrawal shows "Muvaffaqiyatli!" and never calls the server |
| BUG-018 | S2 | "Jonli chat" answers the user itself; the message never leaves the browser |
| BUG-019 | S3 | Share on job cards is inert on desktop — `navigator.share` guard with no fallback |
| BUG-020 | S4 | The Payments search button has no handler, but is labelled for screen readers |
| BUG-021 | S3 | "Soliq hujjatlari" promises documents that no code path can produce |
| BUG-022 | S2 | The Payments screen renders two invented transactions whenever the list is empty |
| BUG-023 | S3 | Keyboard focus is invisible wherever a control carries its own `shadow-[…]` |

BUG-017 and BUG-018 are the same shape: **the UI reports success for work it never did.**
Both have a correct implementation of the very same action elsewhere in the codebase
(`useProfileScreen.ts` for withdrawal, `useChatsData.ts` for support), so neither is a
missing feature — both are a screen wired to nothing while a working path sits beside it.

## Coverage against the router

All 47 user-facing routes in `AppRoutes.tsx` were swept. The only route not clicked
control-by-control is `/admin`.

## The guest and deep-link routes found nothing new

167 controls across those nine routes produced **zero** new defects. Every non-acting
result triaged to one of the causes above. `/payments/success` and `/payments/error` —
the two screens round 1's BUG-006 was found on — are clean now apart from the skip link.

## Mobile pass — Pixel 7, real touch

The desktop sweep ran at 1400×900 with a mouse. This pass re-ran the worker routes as a
phone (Playwright's `Pixel 7` device: 393×852, touch enabled, mobile user agent) and used
`tap()` rather than `click()`, so the app received real touch events.

**16 routes, 171 controls. No new defects.**

| Outcome | Count |
|---|---|
| acted | 90 |
| navigated | 35 |
| click timed out | 37 |
| no observable effect | 6 |
| skipped (logout) | 2 |
| not present on reload | 1 |

All six no-effect results are the familiar correct ones: the current page's own nav item
(`Ish qidirish` on `/jobs`, `Kalendar` on `/calendar`, `Xabarlar` on `/messages`), an
already-active filter, and the two `tel:` / `mailto:` links on `/help`. The 37 timeouts are
the skip link (16) and the same Leaflet labels and collapsed-sheet controls as on desktop.

Two layout checks a phone actually suffers from:

- **Horizontal scroll: none.** `scrollWidth <= clientWidth` on all 16 routes.
- **Touch targets under 44×44 CSS px: 20**, and every one of them misses on a single axis
  only — the back and menu buttons are 36–40 px wide by a full 44 px tall. Worth tidying,
  not worth a finding on its own. The one genuine outlier is Leaflet's own attribution
  link (51×14), which is third-party chrome.

## Keyboard pass

Tabbing each route and comparing every control's painted style unfocused vs focused.
Reachability is good — on nine of eleven routes Tab reaches every visible control; `/jobs`
reaches 25 of 41, the shortfall being the controls inside the collapsed bottom sheet, which
are not operable until the list is opened either.

What it did find is **BUG-023**: on controls that set their own `shadow-[…]`, the
Tailwind v4 focus ring never composes into `box-shadow`, and `focus:outline-none` has
already removed the browser outline — so focus is invisible. `/settings`, `/security` and
`/help` are unaffected because their controls change `outline` instead.

## Not covered by this sweep

- **Admin** (`/admin`, 21 sub-screens). Round 2 swept all of them at screen level; they
  were not re-clicked control-by-control here. The sweep was scoped to the user-facing
  roles the request named.
- **Keyboard *activation*.** Focus reachability and focus visibility were measured;
  pressing Enter/Space on each control to confirm it fires was not. The Leaflet map markers
  (`role="button"` `tabindex="0"` on a `divIcon`) are the place that most warrants it — the
  probe could not find a marker in the DOM within its wait, so their keyboard behaviour
  remains unmeasured rather than confirmed either way.
- **Employer and guest routes on mobile.** The mobile pass covered the 16 worker routes.
