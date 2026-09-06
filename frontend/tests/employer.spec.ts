import { test, expect } from './fixtures';

test.describe('Employer Flow', () => {
  test('unauthenticated employer clicking post job is sent to register', async ({ page }) => {
    await page.goto('/');

    // This spec's assertion was right all along — it failed because the click
    // landed on the onboarding tour, which the fixture now dismisses.
    await page.getByRole('button', { name: 'Ish beruvchi', exact: true }).click();
    await page.getByRole('button', { name: "Smena e'lon qilish (Yangi xodim yollash)" }).click();

    await expect(page).toHaveURL(/\/register/);
    await expect(page.getByText('Kim sifatida davom etasiz?')).toBeVisible();
  });
});
