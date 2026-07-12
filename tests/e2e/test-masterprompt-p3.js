// Regression test for the Master-Prompt P3-Batch (letzte 5 Funktionen). #3/
// #31 ueber die generische Karten-Engine, #26/#58/#61 als aus echten Daten
// (aus P1/P2) berechnete Ansichten - kein Mock, echte Cross-Modul-Ableitung.
const { chromium } = require('playwright');
const path = require('path');

const LAUNCH_OPTS = Object.assign({ args: ['--no-sandbox'] }, process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {});

function check(name, cond, results) {
  results.push({ name, pass: !!cond });
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name);
  if (!cond) console.log('::error::FAILED CHECK: ' + name);
}

(async () => {
  try {
    const browser = await chromium.launch(LAUNCH_OPTS);
    const fileUrl = 'file://' + path.resolve(__dirname, '..', '..', 'index.html');
    const results = [];
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const pageErrors = [];
    page.on('pageerror', (e) => { pageErrors.push(e.message); console.log('::error::PAGEERROR: ' + e.message); });

    await page.goto(fileUrl, { waitUntil: 'load' });
    await page.waitForFunction(() => !!(window.KK_APP_SHELL && window.KK_P3_FUNKTIONEN && window.KK_P3_FUNKTIONEN.version === '1.0'), null, { timeout: 15000 });
    await page.evaluate(() => { window.KK_APP_SHELL.openTab('backup'); });
    await page.waitForSelector('#p3funktionen', { state: 'visible', timeout: 15000 });
    await page.waitForFunction(() => document.querySelectorAll('#p3CardsContainer [data-p3-form]').length === 2, null, { timeout: 10000 });

    check('Beide generischen P3-Karten (#3, #31) werden gerendert', await page.evaluate(() => document.querySelectorAll('#p3CardsContainer [data-p3-form]').length === 2), results);

    // #3 Fremdvermarktungs-Watchtower
    await page.fill('#p3_watchtower_object', 'Musterstraße 1');
    await page.fill('#p3_watchtower_foundUrl', 'immobilienportal-x.de/inserat/12345');
    await page.click('[data-p3-form="watchtower"] button[type="submit"]');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('kk_watchtower_findings_v1') || '[]').length === 1, null, { timeout: 10000 });
    check('#3 Watchtower-Fund (manueller Import) wird gespeichert', await page.evaluate(() => {
      var x = JSON.parse(localStorage.getItem('kk_watchtower_findings_v1'))[0];
      return x.object === 'Musterstraße 1' && /immobilienportal-x/.test(x.foundUrl);
    }), results);

    // #31 Kanal-Grenznutzen-Analyst
    await page.fill('#p3_channelcost_channel', 'Facebook Ads');
    await page.fill('#p3_channelcost_cost', '250');
    await page.click('[data-p3-form="channelcost"] button[type="submit"]');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('kk_channel_costs_v1') || '[]').length === 1, null, { timeout: 10000 });
    check('#31 Kanal-/Kostenbuchung wird gespeichert', await page.evaluate(() => {
      var x = JSON.parse(localStorage.getItem('kk_channel_costs_v1'))[0];
      return x.channel === 'Facebook Ads' && x.cost === '250';
    }), results);

    // #26 72-Stunden-Launch-Puls (echte Marketing-Aktivitätsdaten aus P2 #25)
    await page.evaluate(() => {
      var fourDaysAgo = new Date(); fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
      window.KK_STORE.writeJSON('kk_marketing_activities_v1', [
        { id: 'mkt1', object: 'Launch-Test-Objekt', activity: 'Inserat online gestellt', createdAt: fourDaysAgo.toISOString() }
      ]);
      window.KK_P3_FUNKTIONEN.renderAll();
    });
    await page.waitForFunction(() => /Launch-Test-Objekt/.test(document.getElementById('p3LaunchPulseAlerts').innerText), null, { timeout: 10000 });
    check('#26 Launch-Puls erkennt fälligen 72h-Check-in aus echten Vermarktungsaktivitäten (#25)', await page.evaluate(() => /72h-Check-in fällig/.test(document.getElementById('p3LaunchPulseAlerts').innerText)), results);

    // #58 Kontrafaktischer Vertriebscoach (echte Lost-Deal-Daten aus P1 #57)
    await page.evaluate(() => {
      window.KK_STORE.writeJSON('kk_lost_deal_interviews_v1', [
        { id: 'ld1', contact: 'A', reason: 'Preis', wouldReconsider: 'ja' },
        { id: 'ld2', contact: 'B', reason: 'Preis', wouldReconsider: 'nein' },
        { id: 'ld3', contact: 'C', reason: 'Wettbewerber', wouldReconsider: 'vielleicht' }
      ]);
      window.KK_P3_FUNKTIONEN.renderAll();
    });
    await page.waitForFunction(() => /Preis/.test(document.getElementById('p3LostDealRetro').innerText), null, { timeout: 10000 });
    check('#58 Retrospektive zeigt "Preis" als häufigsten Verlustgrund aus echten #57-Daten (2 von 3)', await page.evaluate(() => {
      var html = document.getElementById('p3LostDealRetro').innerHTML;
      var m = html.match(/<b>(\d+)<\/b><span>Preis<\/span>/);
      return !!m && m[1] === '2';
    }), results);

    // #61 Persönlicher Conversion-Zwilling (echte kk_conversion_metrics)
    await page.evaluate(() => {
      window.KK_STORE.writeJSON('kk_conversion_metrics', { contacts: 100, talks: 20, appointments: 10, won: 5 });
      window.KK_P3_FUNKTIONEN.renderAll();
    });
    await page.waitForFunction(() => /Conversion-Zwilling/.test(document.getElementById('p3ConversionTwin').innerText), null, { timeout: 10000 });
    check('#61 Szenario-Rechner berechnet einen plausiblen verbesserten Wert aus echten Konversionsdaten (6 Aufträge im Szenario statt 5 im Ist)', await page.evaluate(() => {
      var html = document.getElementById('p3ConversionTwin').innerHTML;
      return /<b>5<\/b><span>Aufträge aktuell<\/span>/.test(html) && /<b>6<\/b><span>Aufträge im Szenario/.test(html);
    }), results);

    check('no page errors', pageErrors.length === 0, results);
    await browser.close();

    const failed = results.filter((r) => !r.pass);
    console.log('\n=== SUMMARY: ' + (results.length - failed.length) + '/' + results.length + ' checks passed ===');
    if (failed.length) console.log('FAILED:', failed.map((f) => f.name));
    console.log('RESULT:', failed.length === 0 ? 'PASS' : 'FAIL');
    process.exit(failed.length ? 1 : 0);
  } catch (err) {
    console.error('FATAL - test crashed:', err && err.stack || err);
    console.log('::error::FATAL: ' + String(err && err.message || err));
    process.exit(1);
  }
})();
