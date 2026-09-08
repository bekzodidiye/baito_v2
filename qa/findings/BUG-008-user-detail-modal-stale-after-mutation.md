### [BUG-008] User detail modal shows stale balance/role/ban state after a successful change

- **Severity:** S3      **Priority (proposed):** P2
- **Type:** functional (stale UI state, no data loss)
- **Component:** `frontend/src/features/admin/UserDetailModal.tsx`
- **Environment:** branch `claude/qa-protokol-2`, disposable local QA stack, Chromium
- **Reproduction rate:** 3/3 (balance, role, ban toggle — all three checked)
- **Status:** **Fixed**, same PR as this report
- **Traces to:** the original complaint that started this whole QA cycle — admin manual balance
  top-up; §9.1 UI sweep — admin user detail modal, "Moliya" tab

**Preconditions**
Admin has opened a user's detail modal (`Batafsil`) from "Foydalanuvchilar va Rollar".

**Steps to reproduce**
1. Open a user with 0 UZS balance, go to the "Moliya" tab.
2. Fill in an amount and reason under "Balans To'ldirish (Admin)", submit.
3. Watch the "Joriy Balans" figure inside the still-open modal.

**Expected result**
The success toast fires and "Joriy Balans" updates to reflect the new total, in place.

**Actual result (before fix)**
The toast confirms success and the *background* user list (behind the modal) updates correctly,
but the modal's own "Joriy Balans" keeps showing the pre-top-up figure until it is closed and
reopened. The same staleness applies to changing a user's role or toggling their ban state from
inside the modal — the footer's role dropdown and ban button fire the mutation, but the modal
body (which reads from its own `detail.user`, not the parent's list) never reflects it.

**Root cause**
`UserDetailModal` fetches its own copy of the user via `GET /admin/users/{id}/detail` exactly
once, in a `useEffect` keyed on `[initialUser.id]`. `onAddBalance` / `onChangeRole` / `onToggleBan`
(from `useAdminData.ts`) do call `fetchAllData()` internally on success, but that only refetches
the *parent's* plain user list — a completely separate piece of state from this modal's own
`detail`. Nothing ever told the modal its copy was now stale.

**Impact**
Low severity (no money or state is actually wrong — the mutation itself succeeds and the
backend is correct), but directly undermines admin trust in the one screen used to verify money
movement: an admin doing a top-up sees a success toast next to a balance figure that still says
the old number, with no way to tell "did this actually work" without closing the modal.

**Suggested fix / mitigation**
After each of the three mutations resolves, have the modal re-fetch its own detail endpoint
rather than relying on the parent's unrelated refresh.

**Regression risk if fixed**
Low. The re-fetch is additive — on the failure path (mutation prop swallows its own errors and
never throws), the modal simply re-fetches unchanged data, which is a harmless no-op fetch.

**Fix applied**
`UserDetailModal.tsx`: extracted the detail fetch into a reusable `loadDetail()`, added
`refreshDetail()`, and wrapped `onAddBalance` / `onChangeRole` / `onToggleBan` in local handlers
that `await` the original prop then call `refreshDetail()`. The wrappers are passed to
`UserTabsExtra` and used at the role-select and ban-button call sites in place of the raw props.
No change was needed in `useAdminData.ts`, `AdminUsers.tsx`, or `UserTabsExtra.tsx` — the
underlying mutation functions were already `async` at runtime, the prop *types* just didn't say
so; `await`ing a `void`-typed-but-actually-`Promise`-returning call is valid JS and compiles
cleanly under this project's `tsc --noEmit` gate.

**Verified**
Live repro reversed: opened "QA2 Ishchi 2" (balance 0), submitted a 75,000 UZS top-up from the
"Moliya" tab. "Joriy Balans" inside the still-open modal updated to 75,000 UZS immediately,
matching the background list and the server (`GET /admin/users` confirmed balance = 75000,
exactly one top-up applied — no double submission).

Frontend typecheck (`tsc --noEmit`): clean. Frontend unit tests: **49 passed, 0 failed**.
