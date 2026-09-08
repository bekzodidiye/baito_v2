### [BUG-015] "Chuqur Analitika" is an entirely fabricated dashboard — no real number on the screen

- **Severity:** S2      **Priority (proposed):** P1 (fix), P2 (immediate mitigation: label it)
- **Type:** functional (fabricated data presented as live business metrics)
- **Component:** `frontend/src/features/admin/AdminAnalytics.tsx`
- **Environment:** branch `claude/qa-protokol-2`, disposable local QA stack (5 users, 4 jobs)
- **Reproduction rate:** always (100% static markup)
- **Status:** **Partly fixed** — the screen now states that its figures are not real, and
  the two export buttons, which announced a download that never happened, are gone. The
  aggregations themselves remain unbuilt and still need the definitions named below.
- **Traces to:** §9.1 UI sweep — same family as BUG-013, found immediately after it while
  finishing the sweep of the remaining admin tabs

**Preconditions**
None.

**Steps to reproduce**
1. Open any admin account, any amount of real data, and click "Chuqur Analitika".

**Expected result**
GMV, DAU/MAU, completion rate, top categories and regional breakdown reflect the platform's
actual data.

**Actual result**
Every number on the screen is a literal constant in the JSX, confirmed by reading the source —
none of it references `stats`, `transactions`, `jobs`, or any other prop, state, or API call:

- "Jami Oborot (GMV)": **485,000,000 UZS**, "+18.4% o'tgan oyga nisbatan"
- "Platforma Sof Daromadi": **48,500,000 UZS** (same fabricated total used in BUG-013, before
  that fix)
- "DAU / MAU Nisbati": **64.2%**, "**2,840** kunlik faol user"
- "Bajarilgan E'lonlar %": **92.8%**, "O'rtacha bajarish: 3.5 soat"
- Top 5 professions by posting count: five specific job categories with specific counts
  (1,240 / 980 / 750 / 520 / 310 e'lon) and specific bar-chart percentages
- Regional activity breakdown: five specific regions with specific percentages (45% / 18% /
  15% / 12% / 10%)

This environment has 5 users and 4 jobs total. There are no 2,840 daily active users and no
485,000,000 UZS of GMV. The same numbers render identically regardless of what is actually in
the database.

**Root cause**
The screen was built with realistic-looking placeholder data and never wired to any real
aggregation — no backend endpoint for platform-level analytics exists at all yet
(`useAdminData.ts` fetches stats, users, jobs, transactions, support tickets, categories,
regions, promotions, disputes and settings; nothing that would back GMV, DAU/MAU, top-categories,
or regional-share).

**Impact**
High severity in principle — this is presented as the platform's executive analytics dashboard,
and every figure on it is fiction. An admin or stakeholder citing "45% of orders come from
Tashkent" or "GMV is up 18.4% month over month" from this screen would be citing numbers with no
relationship to the business. Scored P1/S2 rather than higher because, unlike BUG-011/012, no
money moves and no other system trusts this screen's output — the damage is entirely in
misinformed human decisions, not automated harm.

**Suggested fix / mitigation**
This is a real feature gap, not a one-line bug: computing GMV, DAU/MAU, completion rate/time,
top categories and regional share correctly all require new aggregation logic (GMV and platform
revenue can reuse the pattern in `admin_stats.py`'s `get_stats`; DAU/MAU needs a definition of
"active" the codebase doesn't have yet — likely `Session` or last-login timestamps; top
categories and regional share need grouped counts over `Job`). Given the scope (multiple new
queries, a decision on what "active user" and "on time" mean for this product, and a new or
extended endpoint), this was **not** fixed inline in this pass to avoid rushing a definition of
"active user" or "GMV" that the product owner hasn't actually specified — get those definitions
wrong and the dashboard becomes confidently wrong instead of honestly placeholder.

Immediate, cheap mitigation if the real implementation is not scheduled soon: label the screen
(or each card) as illustrative/preview data, the same way `AdminNotificationRules.tsx` already
does for notification types with "Hali ulanmagan" — so nobody currently mistakes it for live
data in the meantime.

**Regression risk if fixed properly**
Depends entirely on the implementation; not assessed here since no fix was written.

**Follow-up**
Flagged as a separate task (see accompanying `spawn_task`) rather than fixed in this pass, per
QA.md's smallest-patch principle — this does not fit "smallest patch" and deserves its own
scoped design (starting with: what counts as a daily/monthly active user, what "on time" means
for completion rate, and whether region is derived from job location or employer profile).


## What was done (2026-09-04)

The mitigation this finding proposed, plus one thing it had not separated out.

**1. The screen says it is placeholder.** A banner above the metric cards:

> **Bu sahifadagi raqamlar haqiqiy emas** — Ko'rsatkichlar hali hisoblanmagan; quyidagi
> qiymatlar namuna sifatida qo'yilgan va real ma'lumotni aks ettirmaydi. Qaror qabul qilish
> uchun «Boshqaruv paneli» va «Moliya» bo'limlaridagi ma'lumotlardan foydalaning.

**2. The export buttons are removed.** They were a defect in their own right, and of the
same family as BUG-017, BUG-018 and BUG-022 — success announced for work never done:

```js
const handleExport = (type) => {
  alert(`${type} ko'rinishidagi analitik hisobot muvaffaqiyatli yuklab olindi!`);
};
```

Nothing was generated and nothing downloaded. Had they been wired up instead, they would
have written these invented figures into a file that outlives the banner explaining them —
so they were removed rather than implemented.

Verified in the admin panel: the banner renders, both buttons are gone, and no dialog
fires (`{warningShown: true, exportButtonsGone: true, alertFired: false}`).

**Still open:** the aggregations. GMV and platform revenue can follow `admin_stats.py`'s
`get_stats`; DAU/MAU, completion rate and average completion time need the product owner to
define what "active" and "on time" mean here first.
