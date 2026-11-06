import { test, expect } from './fixtures';

test.describe('Admin Flow', () => {
  test('unauthenticated user cannot reach the admin panel', async ({ page }) => {
    await page.goto('/admin');

    // The guard redirects unauthenticated guests away from protected routes.
    // The application sends guests to /login (or / if deliberately supported).
    await expect(page).toHaveURL(/\/(login)?$/);
    const url = page.url();
    if (url.endsWith('/login')) {
      await expect(page.getByRole('button', { name: 'Kirish' })).toBeVisible();
    } else {
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Bugun ishlang');
    }

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
