const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  await page.goto('http://localhost:5173/jobs', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const text = await page.evaluate(() => {
    return document.body.innerText;
  });
  console.log('DOM TEXT:', text.substring(0, 1000));
  await browser.close();
})();
