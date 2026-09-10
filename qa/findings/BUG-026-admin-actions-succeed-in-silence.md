# BUG-026 — six admin actions succeed and say nothing

- **Severity:** S3
- **Component:** frontend / admin (`features/admin/useAdminData.ts`)
- **Found:** 2026-09-06, while fixing BUG-024
- **Status:** fixed in this branch
- **Reproduction rate:** 6/6

## What happens

Ban, unban, change a job's status, delete a job, save system settings, and send
a broadcast to every user all complete successfully — and the admin panel shows
no confirmation of any kind. The request goes out, the server answers `200`, the
screen says nothing.

## Evidence

Measured the way round 4 measured toasts in the browser: by collecting the
`global-toast` window events the app's own `ToastContainer` listens for.

```
FAIL  confirms a ban            AssertionError: expected [] to include 'Foydalanuvchi bloklandi'
FAIL  confirms an unban         AssertionError: expected [] to include 'Foydalanuvchi blokdan chiqarildi'
FAIL  confirms a job status change   expected [] to include "E'lon holati o'zgardi"
FAIL  confirms a job deletion        expected [] to include "E'lon o'chirib tashlandi"
FAIL  confirms saved settings        expected [] to include 'Tizim sozlamalari saqlandi'
FAIL  confirms a broadcast           expected [] to include 'Ommaviy xabarnoma muvaffaqiyatli yuborildi'
```

The collected list is empty in all six cases — not a wrong message, no message.

## Root cause

Each call site builds the message and discards it. The call to `showToast` is
missing, leaving a bare expression statement that JavaScript evaluates and
throws away:

```js
if (res !== undefined) {
  (!currentBannedState ? "Foydalanuvchi bloklandi" : "Foydalanuvchi blokdan chiqarildi");
  fetchAllData();
}
```

```js
("E'lon holati o'zgardi");
("E'lon o'chirib tashlandi");
("Tizim sozlamalari saqlandi");
("Ommaviy xabarnoma muvaffaqiyatli yuborildi");
```

## This is a half-finished repair, not a new break

The same pattern was already found and fixed once — in the `showToast` helper
itself, which still carries the note:

> This was `(msg);` — the message was built and thrown away, so every
> confirmation and every failure in the admin panel was silent.

That fix repaired the helper. It did not repair the six callers that never
reach the helper at all. Three other callers in the same file (`addBalance`,
its failure path, `changeRole`) do call it and work correctly, which is why the
panel looks like it announces things.

## Impact

Broadcast is the one that matters. An admin writes a message to **every user on
the platform**, presses send, and gets nothing back — no confirmation, no error.
The natural response to a button that appears to do nothing is to press it
again, and every press sends the notification again.

Deleting a job and banning a user have the same shape: the row does update on
the next refetch, so the action is not invisible, but nothing tells the admin
the action was theirs and succeeded.

## Fix

Call `showToast` at each of the six sites. Guarded by
`src/features/admin/useAdminData.test.tsx`, which fails if any of them goes
silent again.
