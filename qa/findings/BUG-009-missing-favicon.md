### [BUG-009] No favicon anywhere in the codebase — every page load 404s

- **Severity:** S4      **Priority (proposed):** P3
- **Type:** cosmetic / console hygiene
- **Component:** `frontend/index.html`, `frontend/public/manifest.json`, `frontend/public/`
- **Environment:** branch `claude/qa-protokol-2`, disposable local QA stack, Chromium
- **Reproduction rate:** every navigation, every screen (100%)
- **Status:** **Fixed**, same PR as this report
- **Traces to:** §9.1 UI sweep — console cleanliness check, run on every screen this pass

**Preconditions**
None — any page load.

**Steps to reproduce**
1. Load any route.
2. Check the console, or `fetch('/favicon.ico')` directly.

**Expected result**
No console errors; the browser tab shows the app's icon.

**Actual result (before fix)**
`/favicon.ico` → 404, on every single page. `manifest.json` declared an icon at that same
nonexistent path, and `index.html` had no `<link rel="icon">` tag at all, so the browser fell
back to its default implicit `/favicon.ico` probe on every load. A second path checked during
triage, `/apple-touch-icon.png`, returns HTTP 200 but with `content-type: text/html` — that is
Vite's SPA catch-all serving `index.html`, not an actual icon file; it is not a working icon
despite the 200.

**Root cause**
No favicon file of any kind existed in `frontend/public/`, and nothing in the HTML told the
browser where to look, so it used the legacy default guess.

**Impact**
Low — cosmetic, no functional breakage. But it pollutes the console on literally every screen in
the app, which erodes the value of "check the console for errors" as a QA/debugging signal: a
real new error is easy to miss in a console that already has one baseline error on every load.
It also means the PWA manifest's icon declaration is broken, so "add to home screen" installs
with no icon.

**Suggested fix / mitigation**
Add a real favicon file to `frontend/public/` and point `index.html` at it with
`<link rel="icon">`, so the browser stops guessing.

**Regression risk if fixed**
None — purely additive.

**Fix applied**
Added `frontend/public/favicon.svg` — the app's own brand mark (a rounded square in
`--color-brand-primary` `#000666` with a white "B", matching `Logo.tsx`'s visual identity).
Added `<link rel="icon" type="image/svg+xml" href="/favicon.svg">` to `index.html`, and updated
`manifest.json`'s `icons` entry to point at the same file instead of the nonexistent
`/favicon.ico`.

**Verified**
Reloaded the app: `document.querySelector('link[rel="icon"]')` present and correct;
`fetch('/favicon.svg')` → 200, `content-type: image/svg+xml`. Modern browsers stop issuing the
implicit `/favicon.ico` probe once an explicit `<link rel="icon">` is present in the document
head, so this removes the 404 rather than just relocating it.

Frontend typecheck (`tsc --noEmit`): clean. `manifest.json` re-validated as well-formed JSON.
