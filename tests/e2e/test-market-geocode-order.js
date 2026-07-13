// Regression test for a real ordering bug found via Kevin's second live-test
// round (deploy preview, real device, full address with street/house number/
// postal code/town this time): addMarketEntry() called
// window.KK_GEOCODE.geocodeIfNeeded(MARKET_KEY, entry.id) BEFORE the new entry
// was actually written to kk_market_monitor_entries_v1 (arr.unshift/
// saveMarketEntries happened afterwards). geocodeIfNeeded() re-reads the
// storage array internally and looks up the id there - since the id did not
// exist in storage yet at call time, the geocoding call ALWAYS silently
// no-op'd ({skipped:true,reason:'not_found'}), so real Nominatim geocoding
// never fired even with a complete address - the marker was stuck on the
// crude ~650m-jittered town anchor fallback forever ("irgendwo im Feld").
//
// Uses a real local HTTP server + page.route() network mocking (same pattern
// as test-official-gis.js) instead of file:// - this sandbox's pinned
// Chromium build has known file://+fetch() CSP quirks documented there that
// this test would otherwise inherit for no reason, since it also needs to
// mock a real fetch() call.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const LAUNCH_OPTS = Object.assign({ args: ['--no-sandbox'] }, process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {});

function check(name, cond, results) {
  results.push({ name, pass: !!cond });
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name);
  if (!cond) console.log('::error::FAILED CHECK: ' + name);
}

function startStaticServer(filePath) {
  const html = fs.readFileSync(filePath);
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

(async () => {
  let staticServer;
  try {
    const browser = await chromium.launch(LAUNCH_OPTS);
    staticServer = await startStaticServer(path.resolve(__dirname, '..', '..', 'index.html'));
    const fileUrl = 'http://127.0.0.1:' + staticServer.address().port + '/';
    const results = [];
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const pageErrors = [];
    page.on('pageerror', (e) => { pageErrors.push(e.message); console.log('::error::PAGEERROR: ' + e.message); });
    page.on('dialog', async (dialog) => { await dialog.accept(); });

    let geocodeCallCount = 0;
    let geocodeSawTheRecordAsSaved = null;
    await page.route('**/.netlify/functions/geocode**', async (route) => {
      geocodeCallCount++;
      // At the moment this fires, the record MUST already exist in storage -
      // that's exactly the bug: verify it directly from inside the mocked
      // network handler, at the real point in time the call actually happens.
      geocodeSawTheRecordAsSaved = await page.evaluate(() => {
        var arr = JSON.parse(localStorage.getItem('kk_market_monitor_entries_v1') || '[]');
        return arr.length > 0;
      });
      route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          query: 'test', source: 'nominatim', fetchedAt: new Date().toISOString(),
          results: [{ lat: 50.21, lng: 8.92, displayName: 'Im kleinen Feld 15, 63486 Bruchköbel', precisionHint: 'street', osmType: 'way', osmClass: 'highway', osmType2: 'residential' }]
        })
      });
    });

    await page.goto(fileUrl, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => !!(window.KK_APP_SHELL && window.KK_GEOCODE && window.KK_REALMAP), null, { timeout: 15000 });
    await page.evaluate(() => { window.KK_APP_SHELL.setActiveTab('marktmonitor'); });
    await page.waitForSelector('#kkv8MarketEntryForm', { state: 'visible', timeout: 15000 });

    // Volle Adresse wie in Kevins zweitem Live-Test: Ort + Straße + Hausnummer + PLZ.
    await page.fill('#kkv8MarketObject', 'Haus');
    await page.selectOption('#kkv8MarketTown', 'Bruchköbel');
    await page.fill('#kkv8MarketStreet', 'Im kleinen Feld');
    await page.fill('#kkv8MarketHouseNo', '15');
    await page.fill('#kkv8MarketPostal', '63486');
    await page.click('#kkv8MarketEntryForm button[type="submit"]');

    await page.waitForFunction(() => {
      var arr = JSON.parse(localStorage.getItem('kk_market_monitor_entries_v1') || '[]');
      return arr.length > 0 && arr[0].geo && (arr[0].geo.status === 'exact' || arr[0].geo.status === 'street');
    }, null, { timeout: 10000 });

    check('geocode-Function wurde tatsächlich aufgerufen (Geocoding feuert bei vollständiger Adresse)', geocodeCallCount >= 1, results);
    check('DER BUG: zum Zeitpunkt des geocode-Aufrufs war der neue Eintrag bereits in kk_market_monitor_entries_v1 gespeichert (nicht mehr "not_found")', geocodeSawTheRecordAsSaved === true, results);

    const finalEntry = await page.evaluate(() => JSON.parse(localStorage.getItem('kk_market_monitor_entries_v1'))[0]);
    console.log('finalEntry.geo:', JSON.stringify(finalEntry.geo));
    check('Marktbeobachtung übernimmt die ECHTE geocodierte Position (50.21/8.92) statt beim groben Orts-Anker-Fallback zu bleiben', finalEntry.geo.latitude === 50.21 && finalEntry.geo.longitude === 8.92, results);
    check('Geo-Status ist "exact" oder "street" (echtes Geocoding-Ergebnis), nicht "city" (Orts-Anker-Fallback)', finalEntry.geo.status === 'exact' || finalEntry.geo.status === 'street', results);

    check('no page errors', pageErrors.length === 0, results);
    await browser.close();

    const failed = results.filter((r) => !r.pass);
    console.log('\n=== SUMMARY: ' + (results.length - failed.length) + '/' + results.length + ' checks passed ===');
    if (failed.length) console.log('FAILED:', failed.map((f) => f.name));
    console.log('RESULT:', failed.length === 0 ? 'PASS' : 'FAIL');
    if (staticServer) staticServer.close();
    process.exit(failed.length ? 1 : 0);
  } catch (err) {
    console.error('FATAL - test crashed:', err && err.stack || err);
    console.log('::error::FATAL: ' + String(err && err.message || err));
    if (staticServer) staticServer.close();
    process.exit(1);
  }
})();
