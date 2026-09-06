import { test, expect } from './fixtures';

test.describe('Admin Flow', () => {
  test('unauthenticated user cannot reach the admin panel', async ({ page }) => {
    await page.goto('/admin');

    // The guard sends a guest to the landing page, not to /login. The spec used
    // to demand /login and its own comment allowed either ("login sahifasiga
    // yoki bosh sahifaga"); the assertion was narrower than the intent and
    // narrower than the app. What matters is that no admin surface is reached.
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Bugun ishlang');

    // The part worth guarding: none of the panel came with them.
    await expect(page.getByRole('button', { name: 'Foydalanuvchilar' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Tranzaksiyalar' })).toHaveCount(0);
  });

  test('the admin API refuses a guest outright', async ({ request }) => {
    // The screen guard is cosmetic if the endpoint behind it answers anyway.
    for (const path of ['/api/v1/admin/users', '/api/v1/admin/stats']) {
      const res = await request.get(path);
      expect([401, 403], `${path} answered ${res.status()}`).toContain(res.status());
    }
  });
});
