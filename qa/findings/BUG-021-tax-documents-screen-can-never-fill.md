# BUG-021 — "Soliq hujjatlari" can never show a document, but promises it will

- **Severity:** S3
- **Component:** frontend / worker profile (`TaxesScreen.tsx`), backend (`soliq_service.py`)
- **Found:** 2026-09-03, round-3 per-control click sweep
- **Status:** **Partly fixed** — the false promise is removed (commit below); building fiscalisation remains open as a feature

## What happens

**Profil → Soliq hujjatlari** (`/taxes`) always shows its empty state:

> "Hujjatlar hali tayyor emas — Soliq hujjatlari birinchi yakunlangan ishlaringizdan keyin
> shu yerda paydo bo'ladi."
> *(No documents yet — tax documents will appear here after your first completed jobs.)*

They will not. The worker used for this sweep has completed jobs; the screen is still
empty, and it is empty by construction.

## Root cause

`frontend/src/features/worker/profile/TaxesScreen.tsx:24`

```ts
const currentDocs: { id: number; title: string; status: string; date: string; size: string }[] = [];
```

The list is a hardcoded empty array. The screen makes **no API call at all** — there is no
fetch, no query, no endpoint behind it. The row's Download button
(`TaxesScreen.tsx:85`, rendered only when `doc.status === 'ready'`) is therefore never
rendered either, which is why the sweep found only 2 controls on this route.

The backend half is dead too: `backend/app/services/soliq_service.py` defines
`SoliqFiscalService` and nothing anywhere references it —

```
grep -rn "SoliqFiscalService|soliq_service" backend/app  (excluding its own file) -> no matches
```

There is no route that serves tax documents to a worker.

## Impact

The empty-state copy makes a specific promise tied to a specific trigger ("after your first
completed jobs"). A worker who completes jobs and comes back sees the same screen and
concludes the app is broken or their work was not recorded. For self-employed workers in
Uzbekistan the fiscal receipt is not cosmetic — it is what they file with.

This is the same family as BUG-015 (fabricated analytics) and BUG-016 (a completion bonus
promised but never paid): a surface that presents itself as live and is not.

## Fix direction

Two honest options, and a product decision between them:

1. **Build it** — expose `SoliqFiscalService` behind a worker endpoint that lists receipts
   for completed jobs, have the screen fetch it, and wire the Download button.
2. **Stop promising it** — if fiscalisation is not in scope for this release, change the
   empty-state copy so it does not name a trigger it cannot honour, and hide the entry
   point from the profile until it works.

What must not stay is the current state: a screen that tells the worker to expect documents
that no code path can ever produce.
