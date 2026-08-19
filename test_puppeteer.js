import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('http://localhost:5173/jobs', { waitUntil: 'networkidle0', timeout: 10000 }).catch(e => console.log('Timeout'));
  
  await browser.close();
})();
