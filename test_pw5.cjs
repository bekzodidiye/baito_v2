const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  await page.goto('http://localhost:5173/jobs', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const viteError = await page.evaluate(() => {
    const overlay = document.querySelector('vite-error-overlay');
    if (overlay) return overlay.shadowRoot.innerHTML;
    return 'No vite error overlay';
  });
  console.log('VITE ERROR:', viteError.substring(0, 500));
  await browser.close();
})();
