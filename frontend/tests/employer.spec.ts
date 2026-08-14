import { test, expect } from '@playwright/test';

test.describe('Employer Flow', () => {
  test('unauthenticated employer clicking post job redirects to login', async ({ page }) => {
    await page.goto('/');

    // Bosh sahifada "Ish beruvchi" rejimiga o'tish
    await page.getByRole('button', { name: 'Ish beruvchi' }).click();

    // "Smena e'lon qilish" tugmasini bosish
    await page.getByRole('button', { name: "Smena e'lon qilish (Yangi xodim yollash)" }).click();

    // Tizim login yoki ro'yxatdan o'tish sahifasiga yo'naltirishi kerak
    await page.waitForURL('**/register*');
    expect(page.url()).toContain('/register');
  });
});
