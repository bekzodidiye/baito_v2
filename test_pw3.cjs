const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/jobs', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const debug = await page.evaluate(() => window.__debugInfo);
  console.log('DEBUG:', debug);
  await browser.close();
})();
