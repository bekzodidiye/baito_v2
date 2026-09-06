import { test, expect } from './fixtures';

const PHONE = process.env.E2E_PHONE;
const PASSWORD = process.env.E2E_PASSWORD;

test.describe('Authentication Flow', () => {
  test('login with the wrong password is refused, and says so', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder('+998 (90) 123-45-67').fill('+998901112233');
    await page.getByPlaceholder('Parolingizni kiriting').fill('definitely-not-the-password');
    await page.getByRole('button', { name: 'Kirish' }).click();

    // Staying on /login was the whole of the old assertion, which a blank page
    // would also satisfy. What the user must actually get is a reason.
    await expect(page.getByText('Telefon raqam yoki parol xato')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
    expect(await page.evaluate(() => localStorage.getItem('baito_is_logged_in'))).toBeNull();
  });

  test('a real account can sign in', async ({ page }) => {
    // Credentials come from the environment — CI seeds a throwaway account and
    // exports them. Nothing is hardcoded here, and the test says why it skipped
    // rather than passing silently, which is what the version of this test that
    // asserted nothing effectively did.
    test.skip(!PHONE || !PASSWORD, 'E2E_PHONE / E2E_PASSWORD not set — no seeded account');

    await page.goto('/login');
    await page.getByPlaceholder('+998 (90) 123-45-67').fill(PHONE!);
    await page.getByPlaceholder('Parolingizni kiriting').fill(PASSWORD!);
    await page.getByRole('button', { name: 'Kirish' }).click();

    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
    expect(await page.evaluate(() => localStorage.getItem('baito_is_logged_in'))).toBe('true');
  });
});
