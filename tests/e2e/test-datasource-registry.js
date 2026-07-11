const { chromium } = require('playwright');
const path = require('path');

const LAUNCH_OPTS = Object.assign({ args: ['--no-sandbox'] }, process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {});

function check(name, cond, results) {
  results.push({ name, pass: !!cond });
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name);
}

(async () => {
  const browser = await chromium.launch(LAUNCH_OPTS);
  const fileUrl = 'file://' + path.resolve(__dirname, '..', '..', 'index.html');
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  const results = [];

  await page.goto(fileUrl, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(500);
  await page.evaluate(() => { if (window.KK_APP_SHELL) window.KK_APP_SHELL.setActiveTab('marktmonitor'); });
  await page.waitForTimeout(1200);

  const api = await page.evaluate(() => {
    var list = window.KK_DATASOURCE_REGISTRY ? window.KK_DATASOURCE_REGISTRY.list() : [];
    return {
      version: window.KK_DATASOURCE_REGISTRY && window.KK_DATASOURCE_REGISTRY.version,
      count: list.length,
      ids: list.map(function (r) { return r.source_id }),
      allHaveRequiredFields: list.every(function (r) {
        return r.source_id && r.name && r.provider && r.category && r.endpoint && r.protocol && r.attribution != null;
      }),
      borisHasHonestNote: (list.find(function (r) { return r.source_id === 'boris_hessen' }) || {}).notes || ''
    };
  });
  console.log('Registry API:', JSON.stringify(api, null, 1));

  check('KK_DATASOURCE_REGISTRY is registered with 4 sources (Nominatim, OSM tiles, BORIS, ALKIS)', api.version === '1.0' && api.count === 4, results);
  check('every entry has the Anhang-A7-required core fields populated', api.allHaveRequiredFields, results);
  check('BORIS entry documents the actual live-verification status (confirmed by Kevin on the deploy preview, not a fake/assumed "live")', /live verifiziert|bestaetigt|bestätigt/i.test(api.borisHasHonestNote), results);

  const panelHtml = await page.evaluate(() => document.getElementById('kkdsr-body').innerHTML);
  check('panel renders a table with all 4 sources', (panelHtml.match(/<tr>/g) || []).length >= 4, results);
  check('panel shows "konfiguriert, nicht verbunden" for BORIS/ALKIS before activation', /konfiguriert, nicht verbunden/.test(panelHtml), results);
  check('panel shows "live" for Nominatim/OSM (always-on static sources)', panelHtml.includes('>live<'), results);

  check('no page errors', pageErrors.length === 0, results);

  const failed = results.filter(r => !r.pass);
  console.log('\n=== SUMMARY: ' + (results.length - failed.length) + '/' + results.length + ' checks passed ===');
  if (failed.length) console.log('FAILED:', failed.map(f => f.name));
  console.log('RESULT:', failed.length === 0 ? 'PASS' : 'FAIL');
  await browser.close();
})();
