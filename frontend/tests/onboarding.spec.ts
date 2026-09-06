import { test, expect, Page } from '@playwright/test';

/**
 * The onboarding tour, which every other spec in this directory dismisses.
 *
 * It is worth its own file for two reasons. It is the first thing a new visitor
 * meets, so it is the first thing that can be broken for all of them at once.
 * And it is why the rest of this suite silently failed for as long as it
 * existed: it covers the viewport and takes every click, so a spec that does
 * not dismiss it never reaches the control it is aiming at. A regression that
 * left it permanently open would look, to the other specs, exactly like the bug
 * that was just fixed.
 *
 * These specs deliberately do NOT use ./fixtures — a first visit is the state
 * under test.
 */

const LABELS = {
  uz: { next: 'Keyingisi', start: 'Boshlash', skip: "O'tkazib yuborish", close: 'Yopish', first: 'Xarita orqali ish qidiring' },
  ru: { next: 'Далее', start: 'Начать', skip: 'Пропустить', close: 'Закрыть', first: 'Ищите работу на карте' },
  en: { next: 'Next', start: 'Start', skip: 'Skip', close: 'Close', first: 'Find jobs on the map' },
} as const;

/** The dialog, found by something only it contains rather than by its classes. */
const tourOf = (page: Page, lang: keyof typeof LABELS = 'uz') =>
  page
    .locator('div.fixed.inset-0')
    .filter({ has: page.getByRole('button', { name: LABELS[lang].skip, exact: true }) });

const withLanguage = async (page: Page, lang: keyof typeof LABELS) => {
  await page.addInitScript((l) => {
    try {
      localStorage.setItem('baito_language', l as string);
      localStorage.removeItem('baito_has_seen_tour');
    } catch { /* private mode */ }
  }, lang);
};

test.describe('Onboarding tour', () => {
  test('opens on a first visit, at the first of four steps', async ({ page }) => {
    await page.goto('/');

    const tour = tourOf(page);
    await expect(tour).toBeVisible();
    await expect(tour.getByRole('heading', { level: 2 })).toHaveText('Xarita orqali ish qidiring');
    await expect(tour.locator('div.h-2.rounded-full')).toHaveCount(4);

    // Nothing is remembered until the visitor finishes or skips.
    expect(await page.evaluate(() => localStorage.getItem('baito_has_seen_tour'))).toBeNull();
  });

  test('advances through all four steps and offers to start on the last', async ({ page }) => {
    await page.goto('/');
    const tour = tourOf(page);

    const titles = [
      'Xarita orqali ish qidiring',
      'Filtrlash imkoniyati',
      'Kalendar orqali boshqaring',
      'Shaxsiy profil va chat',
    ];

    for (const [i, title] of titles.entries()) {
      await expect(tour.getByRole('heading', { level: 2 })).toHaveText(title);
      // The wide dot marks the step; it should track, not sit still.
      await expect(tour.locator('div.h-2.w-8')).toHaveCount(1);
      if (i < titles.length - 1) {
        await tour.getByRole('button', { name: 'Keyingisi', exact: true }).click();
      }
    }

    // The last step swaps "next" for "start"; there is nothing after it.
    await expect(tour.getByRole('button', { name: 'Boshlash', exact: true })).toBeVisible();
    await expect(tour.getByRole('button', { name: 'Keyingisi', exact: true })).toHaveCount(0);
  });

  test('finishing it closes it for good', async ({ page }) => {
    await page.goto('/');
    const tour = tourOf(page);

    for (let i = 0; i < 3; i++) {
      await tour.getByRole('button', { name: 'Keyingisi', exact: true }).click();
    }
    await tour.getByRole('button', { name: 'Boshlash', exact: true }).click();

    await expect(tour).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('baito_has_seen_tour'))).toBe('true');

    // The point of remembering: it must not come back on the next visit.
    await page.reload();
    await expect(tourOf(page)).toHaveCount(0);
  });

  test('skipping it closes it for good, from the first step', async ({ page }) => {
    await page.goto('/');
    const tour = tourOf(page);

    await tour.getByRole('button', { name: "O'tkazib yuborish", exact: true }).click();

    await expect(tour).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('baito_has_seen_tour'))).toBe('true');
    await page.reload();
    await expect(tourOf(page)).toHaveCount(0);
  });

  // BUG-007. This was `test.fixme` when it was written: the ✕ was painted but
  // never reachable, because it and the content block shared z-index 10 and the
  // content comes later in the DOM. Now it is found by its accessible name,
  // which it also did not have, and clicked like any other control.
  test('the close control in the corner also dismisses it', async ({ page }) => {
    await page.goto('/');
    const tour = tourOf(page);

    await tour.getByRole('button', { name: 'Yopish', exact: true }).click();

    await expect(tour).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('baito_has_seen_tour'))).toBe('true');
  });

  test('it takes every click meant for the page beneath it', async ({ page }) => {
    // This is the property that broke the rest of this suite. Asserting it means
    // a change that leaves the tour open, or removes the barrier, is visible
    // here rather than as four unrelated specs going red.
    await page.goto('/');
    await expect(tourOf(page)).toBeVisible();

    // The landing page renders behind the tour; wait for the control we are
    // about to reach for, or the check reports "not found" as "blocked".
    await page.waitForFunction(() =>
      [...document.querySelectorAll('button')].some((b) => b.textContent?.trim() === "Ishlarni ko'rish"));

    const searchIsReachable = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')]
        .find((b) => b.textContent?.trim() === "Ishlarni ko'rish");
      if (!btn) return null;
      const r = btn.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return btn === top || btn.contains(top as Node);
    });
    expect(searchIsReachable).toBe(false);
  });

  for (const lang of ['ru', 'en'] as const) {
    test(`speaks the interface language: ${lang}`, async ({ page }) => {
      await withLanguage(page, lang);
      await page.goto('/');

      const tour = tourOf(page, lang);
      await expect(tour).toBeVisible();
      await expect(tour.getByRole('heading', { level: 2 })).toHaveText(LABELS[lang].first);
      await expect(tour.getByRole('button', { name: LABELS[lang].next, exact: true })).toBeVisible();
      // The close control is named too, and named in the same language.
      await expect(tour.getByRole('button', { name: LABELS[lang].close, exact: true })).toBeVisible();
    });
  }
});
