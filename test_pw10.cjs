const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('http://localhost:5173/');
  
  await page.evaluate(() => {
    localStorage.setItem('baito_is_logged_in', 'true');
    localStorage.setItem('baito_user_profile', JSON.stringify({id: 'test', name: 'Test'}));
  });
  
  await page.goto('http://localhost:5173/jobs', { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  
  await page.screenshot({ path: '/home/Bekzod/.gemini/antigravity-ide/brain/7f0d9b2f-ebae-49a1-8c49-2093171cbaa7/screenshot2.png' });
  
  const text = await page.evaluate(() => {
    const error = document.querySelector('vite-error-overlay');
    if (error) return "VITE ERROR OVERLAY PRESENT";
    return document.body.innerText;
  });
  console.log('DOM TEXT:', text.substring(0, 1000));
  
  await browser.close();
})();
