import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  console.log("Navigating to http://localhost:5173");
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  
  console.log("Clicking Login button");
  // Assuming there's a login button somewhere. Actually, just use localStorage to fake login!
  await page.evaluate(() => {
    localStorage.setItem('baito_is_logged_in', 'true');
    localStorage.setItem('baito_user_profile', JSON.stringify({
      id: "usr_123",
      selectedRole: "employer",
      firstName: "Test",
      phone: "+998901234567"
    }));
  });
  
  console.log("Reloading as employer");
  await page.goto('http://localhost:5173/employer-profile', { waitUntil: 'networkidle0' });
  
  console.log("Looking for logout button");
  const logoutBtn = await page.waitForSelector('button:has-text("Tizimdan chiqish"), .text-red-600', { timeout: 5000 }).catch(e => console.log("Logout button not found"));
  
  if (logoutBtn) {
    console.log("Clicking logout button...");
    await logoutBtn.click();
    console.log("Clicked! Waiting 5 seconds to see what happens...");
    await new Promise(r => setTimeout(r, 5000));
  } else {
    // try to find by text
    const textBtns = await page.$$('button, div');
    for (const btn of textBtns) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('chiqish')) {
         console.log("Found button by text:", text);
         await btn.click();
         break;
      }
    }
    console.log("Clicked! Waiting 5 seconds...");
    await new Promise(r => setTimeout(r, 5000));
  }
  
  await browser.close();
})();
