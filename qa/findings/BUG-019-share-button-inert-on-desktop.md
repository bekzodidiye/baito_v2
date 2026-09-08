# BUG-019 — the Share button on job cards does nothing on desktop

- **Severity:** S3
- **Component:** frontend / job cards (`features/worker/search/JobCardItem.tsx`, `components/map/JobCardItem.tsx`)
- **Found:** 2026-09-03, round-3 per-control click sweep
- **Status:** **Fixed** — see commit `1e08c82`; the fallback now lives in `utils/shareJob` and all three share buttons use it

## What happens

Every job card carries a share icon (`title="Share"`). On a desktop browser, pressing it
produces nothing at all — no share sheet, no copied link, no toast, no error. The button
has a hover state and `cursor-pointer`, so it reads as live.

## Reproduction

Worker `+998900003001`, `/jobs`, list opened via **"Ro'yxatni ochish uchun bosing"** so the
cards are fully interactive (this matters — the cards sit in a collapsed bottom sheet until
then).

```
share count: 4
SHARE -> {"htmlChanged":false,"nodesDelta":0,"api":[],"verdict":"DEAD"}
```

The click lands (no interception, no timeout). Nothing follows it.

## Root cause

Both card components guard on the Web Share API and stop there:

`frontend/src/features/worker/search/JobCardItem.tsx:85`
`frontend/src/components/map/JobCardItem.tsx:50`

```js
onClick={(e) => {
  e.stopPropagation();
  if (navigator.share) {
    navigator.share({ ... }).catch(...);
  }
}}                       // <- no else
```

`navigator.share` is a mobile-first API. Measured on this build:

```
chromium: navigator.share = false
firefox:  navigator.share = false
```

So on desktop the condition is false, the body is skipped, and the handler returns having
done nothing.

## The correct pattern already exists in this repo

`frontend/src/components/job-details/JobDetailsHeader.tsx:19`

```js
const handleShare = () => {
  if (navigator.share) {
    navigator.share({ ... }).catch(...);
  } else {
    handleCopyLink();      // <- desktop fallback
  }
};
```

The job-details header shares correctly on desktop. The two card components are the ones
missing the branch.

## Impact

Sharing a shift is how a worker passes a job to someone else — the growth path for a
listings product. On desktop it silently fails, and the user has no way to tell whether
the app is broken or their click missed.

## Fix direction

Give both card handlers the same `else { copyLink() }` branch `JobDetailsHeader` already
has, and confirm the copy with a toast so the outcome is visible either way.
