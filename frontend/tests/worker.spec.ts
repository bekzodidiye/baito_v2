import { test, expect } from '@playwright/test';

test.describe('Worker Flow', () => {
  test('unauthenticated worker searching jobs redirects to login', async ({ page }) => {
    await page.goto('/');

    // Bosh sahifada qidiruvni amalga oshirish
    await page.getByPlaceholder('Kuryer, kassir, ofitsiant...').fill('Kuryer');
    await page.getByRole('button', { name: "Ishlarni ko'rish" }).click();

    // Faqat ro'yxatdan o'tganlarga ruxsat bo'lishi ehtimoli bor, agar shunday bo'lsa login pageda bo'lishini tekshiramiz
    // Kodda: handleSearch -> setCurrentScreen('login') chaqiriladi.
    await page.waitForURL('**/login*');
    expect(page.url()).toContain('/login');
  });
});
