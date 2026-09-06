import { test as base, expect } from '@playwright/test';

/**
 * The landing page opens an onboarding tour on a first visit: a
 * `fixed inset-0 z-[1000]` overlay with `pointer-events: auto` that covers the
 * whole viewport until it is dismissed. It is intended behaviour, and it is the
 * reason every spec in this directory failed the first time they were run —
 * each click landed on the tour instead of the control underneath.
 *
 * A guest arriving for the second time does not see it, and that is the state
 * these specs are about. Dismissing it in a fixture keeps that out of the tests
 * themselves, and keeps the tour itself testable in a spec that wants it.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('baito_has_seen_tour', 'true'); } catch { /* private mode */ }
    });
    await use(page);
  },
});

export { expect };
