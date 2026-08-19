const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('console', msg => console.log('CONSOLE:', msg.text()));
  
  await page.goto('http://localhost:5173/');
  
  // Set localStorage items
  await page.evaluate(() => {
    localStorage.setItem('baito_is_logged_in', 'true');
    localStorage.setItem('baito_user_profile', JSON.stringify({id: 'test', name: 'Test'}));
  });
  
  await page.goto('http://localhost:5173/jobs', { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  
  const text = await page.evaluate(() => {
    const error = document.querySelector('vite-error-overlay');
    if (error) return "VITE ERROR OVERLAY PRESENT";
    return document.body.innerText;
  });
  console.log('DOM TEXT:', text.substring(0, 1000));
  
  await browser.close();
})();
