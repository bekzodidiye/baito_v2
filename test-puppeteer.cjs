const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/employer-post', { waitUntil: 'networkidle2' });
  
  // click Continue (Step 1)
  await page.waitForSelector('button.bg-brand-primary');
  await page.click('button.bg-brand-primary');
  
  // Wait a bit
  await new Promise(r => setTimeout(r, 1000));
  
  // See if error appeared
  const html = await page.content();
  if (html.includes('ish nomi')) {
    console.log('Validation error appeared properly for Step 1');
  } else {
    console.log('No validation error for Step 1');
  }

  await browser.close();
})();
