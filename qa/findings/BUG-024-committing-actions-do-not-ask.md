# BUG-024 — actions that commit money or cut off a user go through on one press

- **Severity:** S2
- **Component:** frontend — `JobDetailsFooter.tsx`, `EmployerApplicants.tsx` / `ApplicantCard.tsx`, `AdminUsers.tsx`, `SecurityScreen.tsx`
- **Found:** 2026-09-05, round-4 confirmation sweep
- **Status:** open
- **Reproduction rate:** 3/3 on each of the four actions below

## What happens

Four controls commit on a single click. No dialog, no modal, no undo:

| Action | Who | What it does | Asked first? |
|---|---|---|---|
| **Arizani topshirish** | worker | binds the worker to a shift | **no** |
| **Qabul qilish** | employer | hires an applicant and **freezes the wage in escrow** | **no** |
| **Ban** | admin | cuts a user off the platform | **no** |
| **Barcha qurilmalardan chiqish** | worker | ends every session on every device | **no** |

## Evidence

Each was pressed through the real UI, three times, in a fresh browser context,
recording whether a native dialog or a modal appeared between the click and the
request.

**Worker — apply.** Opened the posting's card, pressed apply once:

```
clicked: true, askedFirst: false, nativeConfirm: null
POST /api/v1/jobs/ac6f2521-…/apply -> 200
```

Database afterwards — a binding application exists:

```
QA tasdiq sinovi 5 | applied
```

**Employer — hire.** Balance read from `/users/me` either side of the click:

```
run 1  askedFirst: false  POST /applications/…/hire 200  balance 4 150 000 -> 3 750 000
run 2  askedFirst: false  POST /applications/…/hire 200  balance 3 750 000 -> 3 550 000
run 3  askedFirst: false  POST /applications/…/hire 200  balance 3 550 000 -> 3 350 000
```

Three presses, 800 000 so'm moved into escrow, nothing asked.

**Admin — ban.**

```
run 1  askedFirst: false  PATCH /admin/users/f73538df-…/ban -> 200
run 2  askedFirst: false  PATCH /admin/users/b1ccc9bb-…/ban -> 200
run 3  askedFirst: false  PATCH /admin/users/f73538df-…/ban -> 200
```

Database: `isBanned = t` on both accounts. (Both were restored afterwards.)

**Worker — log out of every device.** Scrolled into view first, so a refused
click would mean the page refused it rather than the harness never reaching it:

```
run 1  clicked  DELETE /users/me/sessions -> 200   dialog: null
run 2  clicked  DELETE /users/me/sessions -> 200   dialog: null
run 3  clicked  DELETE /users/me/sessions -> 200   dialog: null
```

Every session on every device ends, with nothing asked. This is the one a user
is most likely to press by accident while reading a security screen.

## Why the ban case is the sharpest

**A confirmation modal for exactly this already exists.** `BanUserModal.tsx` is
imported and used by `UserDetailModal.tsx:211` — so banning from a user's detail
view asks properly. The quick **Ban** button in the list bypasses it.

So this is not a missing component or an unconsidered risk. The safer path was
built, and one entry point does not use it.

## What is *not* a defect — checked, and working

Reported here so the next reader does not re-open them:

| Control | Behaviour |
|---|---|
| **Kartani o'chirish** (delete card) | opens a confirmation modal |
| Yechishni **tasdiqlash** (withdrawal approve) | `prompt()` shows the amount and worker name and asks for a reason before anything is sent |
| Yechishni **rad etish** | same |
| Job / category / region **delete** (admin) | `confirm()` naming the item |
| **Barchasini tasdiqlash** (bulk approve applicants) | `confirm()` |
| Apply past the daily limit | server answers `400 "Bir kunda ko'pi bilan 2 ta ishga ariza topshirishingiz mumkin!"` and **the message is shown on screen** |

The pattern in the codebase is therefore already "ask before something
irreversible" — these four are the places it was not applied.

## Impact

- **Employer:** a mis-click on a crowded applicant list freezes real money against
  the wrong person, with no step that says whose shift and how much.
- **Worker:** a mis-tap commits them to turning up somewhere. The apply is
  visible in their applications list, but nothing warned them.
- **Admin:** a mis-click cuts a user off. Reversible by an administrator, but
  the user is locked out in the meantime and nothing recorded an intent.

## Fix direction

Reuse what is already there rather than inventing a fourth pattern:

- **Ban** — point the list button at `BanUserModal`, which already exists and
  already collects a reason.
- **Hire** — a confirmation naming the worker and the amount about to be frozen.
  The withdrawal `prompt()` is the closest precedent: it states the amount and
  the person before it acts.
- **Log out everywhere** — a `confirm()` is enough; it is one line and matches
  what the admin deletes already do.
- **Apply** — the lightest of the four. A confirm naming the shift and its date
  is enough; this one is arguably a product call rather than a bug, and is
  listed because the owner raised it.
