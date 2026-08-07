const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Go to employer post page
  await page.goto('http://localhost:5173/employer-post', { waitUntil: 'networkidle2' });
  
  // Wait for ymaps
  await page.waitForFunction('window.ymaps !== undefined && window.ymaps.geocode !== undefined');

  // Inject script to get the top 5 results for the coordinate
  const results = await page.evaluate(async () => {
    return new Promise((resolve) => {
      window.ymaps.ready(async () => {
        try {
          const r = await window.ymaps.geocode([39.674163, 66.973788], { results: 10 });
          const res = [];
          for (let i = 0; i < r.geoObjects.getLength(); i++) {
            const currentObj = r.geoObjects.get(i);
            res.push({
              name: currentObj.properties.get('name'),
              description: currentObj.properties.get('description'),
              kind: currentObj.properties.get('metaDataProperty.GeocoderMetaData.kind'),
              address: currentObj.getAddressLine()
            });
          }
          resolve(res);
        } catch (err) {
          resolve({ error: err.toString() });
        }
      });
    });
  });

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
