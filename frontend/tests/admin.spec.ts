import { test, expect } from '@playwright/test';

test.describe('Admin Flow', () => {
  test('unauthenticated user cannot access admin dashboard', async ({ page }) => {
    await page.goto('/admin');
    
    // AuthGuard sababli tizim uni login sahifasiga yoki bosh sahifaga qaytarishi kerak
    // Hozirgi kodda <Navigate to="/login" replace /> ishlaydi
    await page.waitForURL('**/login*');
    expect(page.url()).toContain('/login');
  });
});
