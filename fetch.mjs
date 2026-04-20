import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const PILOTS = ['osmera','lupinekm','Zdenek.Moudry','mnovak','AfroFlyer','Cibulka_J'];

async function fetchPilot(browser, username) {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  let captured = null;

  // Zachyť všechny API odpovědi
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/data/') || url.includes('/api/')) {
      try {
        const text = await response.text();
        console.log(`  [${username}] API: ${url}`);
        console.log(`  [${username}] resp: ${text.substring(0, 400)}`);
        if (text.includes('points') || text.includes('pts') || text.includes('flights')) {
          captured = JSON.parse(text);
        }
      } catch(e) {}
    }
  });

  try {
    await page.goto(`https://www.xcontest.org/cesko/piloti/detail:${username}`, {
      waitUntil: 'networkidle', timeout: 30000
    });
    await page.waitForTimeout(3000);
  } catch(e) {
    console.log(`  [${username}] timeout/err: ${e.message}`);
  }

  await context.close();

  if (!captured) return { username, error: 'Data nezachycena' };

  console.log(`  [${username}] CAPTURED:`, JSON.stringify(captured).substring(0, 500));
  return { username, raw: captured };
}

const browser = await chromium.launch({ headless: true });
const results = [];
for (const username of PILOTS) {
  const r = await fetchPilot(browser, username);
  results.push(r);
}
await browser.close();

writeFileSync('data.json', JSON.stringify({ updated: new Date().toISOString(), pilots: results }, null, 2));
console.log('Hotovo');
