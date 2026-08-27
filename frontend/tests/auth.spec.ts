import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('login with invalid credentials shows error or prevents login', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder('+998 (90) 123-45-67').fill('+998901112233');
    await page.getByPlaceholder('Parolingizni kiriting').fill('wrongpassword123');

    await page.getByRole('button', { name: 'Kirish' }).click();

    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/login');
  });

  test('employer login flow check', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByPlaceholder('+998 (90) 123-45-67').fill('+998901234567');
    await page.getByPlaceholder('Parolingizni kiriting').fill('testpass123');
    await page.getByRole('button', { name: 'Kirish' }).click();
    
    await page.waitForTimeout(500);
  });
});
