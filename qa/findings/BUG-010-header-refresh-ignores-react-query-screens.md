### [BUG-010] The admin header's "Yangilash" button does nothing on Payments & Escrow

- **Severity:** S3      **Priority (proposed):** P2
- **Type:** functional (stale data, no error surfaced)
- **Component:** `frontend/src/features/admin/useAdminData.ts`, `AdminHeader.tsx`,
  `AdminPayouts.tsx`
- **Environment:** branch `claude/qa-protokol-2`, disposable local QA stack, Chromium
- **Reproduction rate:** 2/2
- **Status:** **Fixed**, same PR as this report
- **Traces to:** §9.1 UI sweep — admin "To'lovlar va Escrow" screen

**Preconditions**
Admin on the "To'lovlar va Escrow" screen, having been there before new escrow/withdrawal
activity occurred elsewhere.

**Steps to reproduce**
1. Open "To'lovlar va Escrow". Note the escrow count and frozen total.
2. Via another session, create a new hire (new escrow hold) for a different job.
3. Click the header's visible "Yangilash" button (top right, has a text label).

**Expected result**
The escrow count and frozen total update to include the new hold.

**Actual result (before fix)**
Nothing changes. Only a second, unlabeled icon-only refresh button inside the panel itself
(easy to miss — no visible text, no `aria-label` beyond "Yangilash" duplicated on two unrelated
controls) actually pulls the new data.

Verified live: created a real held escrow via the API while the screen was open, clicked the
header button — escrow stayed at "Escrow (1)" / 180,000 so'm. Clicked the small icon button —
immediately became "Escrow (2)" / 270,000 so'm with the correct new total.

**Root cause**
The admin panel has two independent data-fetching systems that never synchronized: a plain
`fetch` + `useState` hook (`useAdminData.ts`, driving the header's `onRefresh` prop) and
`@tanstack/react-query` (`AdminPayouts.tsx`'s `adminEscrow` / `adminWithdrawals` query keys).
The header button only ever called the former's `fetchAllData`, which has no idea the latter's
cache keys exist.

**Impact**
Low-to-moderate. No data is lost or corrupted, but the one button an admin would naturally press
to confirm "am I looking at current numbers" silently does nothing on the two screens
(`AdminPayouts`, `AdminAuditLogs`) that show real money movement — exactly where staleness is
most likely to be mistaken for "nothing has happened yet."

**Suggested fix / mitigation**
Have the header's refresh also invalidate the React Query cache — either the specific keys or,
more robustly, all of them with no filter, so any current or future screen on React Query
benefits from the one button admins will actually press.

**Regression risk if fixed**
Low. `queryClient.invalidateQueries()` with no key filter re-triggers every currently mounted
query, including the hook's own `adminData` key; this only adds requests on an explicit manual
refresh, it does not change any other code path.

**Fix applied**
`useAdminData.ts` now exposes a `refreshAll` function (`queryClient.invalidateQueries()`, no key
filter) as the hook's `refresh`, in place of the raw `fetchAllData` refetch. `queryClient` was
already instantiated in the file for other purposes, so no new dependency was introduced.

**Verified**
Live repro reversed: with the fix applied, created a second real escrow hold while already on
the Payments & Escrow screen, clicked the same header button — count updated "Escrow (1)" →
"Escrow (2)", frozen total 180,000 → 270,000 so'm, matching the new hold exactly.

Frontend typecheck (`tsc --noEmit`): clean. Frontend unit tests: **49 passed, 0 failed**.
