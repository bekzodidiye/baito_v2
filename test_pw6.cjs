const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('CONSOLE:', msg.text()));
  
  page.on('response', async (res) => {
    if (res.url().includes('/api/v1/jobs')) {
      console.log('API JOBS RESPONSE STATUS:', res.status());
      try {
        console.log('API JOBS RESPONSE BODY:', await res.text());
      } catch (e) {
        console.log('API JOBS RESPONSE BODY ERROR:', e.message);
      }
    }
  });

  await page.goto('http://localhost:5173/jobs', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  await browser.close();
})();
