import { test, expect } from './fixtures';

test.describe('Worker Flow', () => {
  test('searching from the landing page shows results in place', async ({ page }) => {
    await page.goto('/');

    // This used to assert a redirect to /login. It does not redirect: search is
    // open to guests, and the button scrolls the page down to the results
    // section. Asserting the redirect meant asserting a flow the app has never
    // had in this codebase.
    await page.getByPlaceholder('Kuryer, kassir, ofitsiant...').fill('Kuryer');
    await page.getByRole('button', { name: "Ishlarni ko'rish" }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 10_000 })
      .toBeGreaterThan(500);

    // The results region is on screen — either listings or the empty state.
    await expect(
      page.getByRole('heading', { name: /smena/i }).first()
    ).toBeVisible();
  });

  test('a worker-only route is closed to a guest', async ({ page }) => {
    await page.goto('/applications');
    await expect(page).toHaveURL(/\/$/);
  });
});
