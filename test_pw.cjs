const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/jobs', { waitUntil: 'networkidle' });
  const text = await page.evaluate(() => {
    const el = document.querySelector('div[style*="background: red"]');
    return el ? el.innerText : 'Not found';
  });
  console.log('OUTPUT:', text);
  await browser.close();
})();
