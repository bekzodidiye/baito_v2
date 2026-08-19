const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/jobs', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/home/Bekzod/.gemini/antigravity-ide/brain/7f0d9b2f-ebae-49a1-8c49-2093171cbaa7/pw_screenshot.png' });
  await browser.close();
})();
