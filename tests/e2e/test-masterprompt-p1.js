// Regression test for the Master-Prompt P1-Batch (22 Funktionen). 17 davon
// teilen ein generisches Formular/Listen-Muster (KK_P1_FUNKTIONEN.CARDS) -
// dieser Test prueft die generische Engine stellvertretend an 3 Karten voll
// durch, verifiziert dass ALLE 17 Karten korrekt aus der Config gerendert
// werden, und prueft die 3 aus echten Daten berechneten Spezialansichten
// (#42 Kadenz, #53 Kapazitaet, #62 Lifecycle) sowie das #30-Gate mit echten
// synthetischen Daten.
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
    page.on('dialog', async (dialog) => { await dialog.accept(); });

    await page.goto(fileUrl, { waitUntil: 'load' });
    await page.waitForFunction(() => !!(window.KK_APP_SHELL && window.KK_P1_FUNKTIONEN && window.KK_P1_FUNKTIONEN.version === '1.0'), null, { timeout: 15000 });
    await page.evaluate(() => { window.KK_APP_SHELL.openTab('backup'); });
    await page.waitForSelector('#p1funktionen', { state: 'visible', timeout: 15000 });
    await page.waitForFunction(() => document.querySelectorAll('#p1CardsContainer [data-p1-form]').length === 17, null, { timeout: 10000 });

    check('Alle 17 generischen P1-Karten werden aus der Config gerendert', await page.evaluate(() => document.querySelectorAll('#p1CardsContainer [data-p1-form]').length === 17), results);

    // --- Stellvertretend 3 Karten voll durchtesten (generische Engine) ---
    // #4 Portfolio
    await page.fill('#p1_portfolio_contact', 'Portfolio-Kontakt');
    await page.fill('#p1_portfolio_property', 'Musterstraße 10');
    await page.click('[data-p1-form="portfolio"] button[type="submit"]');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('kk_owner_portfolios_v1') || '[]').length === 1, null, { timeout: 10000 });
    check('#4 Portfolio-Eintrag wird gespeichert', await page.evaluate(() => {
      var x = JSON.parse(localStorage.getItem('kk_owner_portfolios_v1'))[0];
      return x.contact === 'Portfolio-Kontakt' && x.property === 'Musterstraße 10';
    }), results);

    // #33 Käufer-Reife (Select-Feld)
    await page.fill('#p1_readiness_contact', 'Reife-Kontakt');
    await page.selectOption('#p1_readiness_financing', 'schriftliche Zusage');
    await page.fill('#p1_readiness_timeframe', 'sofort');
    await page.click('[data-p1-form="readiness"] button[type="submit"]');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('kk_buyer_readiness_v1') || '[]').length === 1, null, { timeout: 10000 });
    check('#33 Käufer-Reife mit Select-Feld wird korrekt gespeichert', await page.evaluate(() => {
      var x = JSON.parse(localStorage.getItem('kk_buyer_readiness_v1'))[0];
      return x.contact === 'Reife-Kontakt' && x.financing === 'schriftliche Zusage';
    }), results);

    // #64 Service-Recovery (Pflichtfeld-Validierung: leer darf nicht speichern)
    await page.click('[data-p1-form="complaint"] button[type="submit"]');
    await page.waitForTimeout(200);
    check('#64 Pflichtfeld-Validierung verhindert leeren Eintrag', await page.evaluate(() => JSON.parse(localStorage.getItem('kk_service_complaints_v1') || '[]').length === 0), results);
    await page.fill('#p1_complaint_contact', 'Beschwerde-Kontakt');
    await page.fill('#p1_complaint_issue', 'Rückruf nicht erhalten');
    await page.click('[data-p1-form="complaint"] button[type="submit"]');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('kk_service_complaints_v1') || '[]').length === 1, null, { timeout: 10000 });
    check('#64 Service-Beschwerde wird nach Pflichtfeld-Ausfüllen gespeichert', true, results);

    // --- #42 Beziehungs-Abkühlungsalarm (echte Aktivitätsdaten) ---
    await page.evaluate(() => {
      var acts = JSON.parse(localStorage.getItem('kk_crm_activities') || '[]');
      var old = new Date(); old.setDate(old.getDate() - 90);
      acts.unshift({ id: 'act_cadence_test', contact: 'Kadenz-Kontakt', createdAt: old.toISOString() });
      window.KK_STORE.writeJSON('kk_crm_activities', acts);
    });
    await page.fill('#p1_cadence_contact', 'Kadenz-Kontakt');
    await page.fill('#p1_cadence_desiredDays', '30');
    await page.click('[data-p1-form="cadence"] button[type="submit"]');
    await page.waitForFunction(() => /Kadenz-Kontakt/.test(document.getElementById('p1CadenceAlerts').innerHTML), null, { timeout: 10000 });
    check('#42 Kadenz-Alarm erkennt überfälligen Kontakt anhand echter Aktivitätsdaten (90 Tage seit letztem Kontakt, Soll 30)', await page.evaluate(() => /90 Tage seit letztem Kontakt/.test(document.getElementById('p1CadenceAlerts').innerText) && /red/.test(document.getElementById('p1CadenceAlerts').innerHTML)), results);

    // --- #53 Tageskapazitäts-Constraint-Engine (echte Follow-up-/Zeitbudgetdaten) ---
    await page.evaluate(() => {
      var todayKey = new Date().toISOString().slice(0, 10);
      var budget = {}; budget[todayKey] = { acq: 30, appointments: 0, system: 0, network: 0, admin: 0, learning: 0 };
      window.KK_STORE.writeJSON('kk_time_budget', budget);
      window.KK_STORE.writeJSON('kk_followups', [
        { id: 'fu_cap1', status: 'offen', dueDate: todayKey, name: 'A' },
        { id: 'fu_cap2', status: 'offen', dueDate: todayKey, name: 'B' },
        { id: 'fu_cap3', status: 'offen', dueDate: '2020-01-01', name: 'C (überfällig)' }
      ]);
      window.KK_P1_FUNKTIONEN.renderAll();
    });
    await page.waitForFunction(() => /Tageskapazität/.test(document.getElementById('p1CapacityView').innerText), null, { timeout: 10000 });
    check('#53 Kapazitätsansicht berechnet Bedarf aus echten fälligen Follow-ups (3 fällig × 20min = 60min Bedarf gegen 30min geplant -> eng)', await page.evaluate(() => /eng/.test(document.getElementById('p1CapacityView').innerText)), results);

    // --- #62 Post-Closing-Lebenszyklus-Orbit (echte Transaktionsdaten aus #17) ---
    await page.evaluate(() => {
      var oneYearAgo = new Date(); oneYearAgo.setDate(oneYearAgo.getDate() - 370);
      window.KK_STORE.writeJSON('kk_transactions_v1', [
        { id: 'tx_lifecycle_test', dealId: 'deal_lc', contact: 'Jubiläums-Kontakt', closedAt: oneYearAgo.toISOString(), source: 'eigener Abschluss (Sales-Pipeline)' }
      ]);
      window.KK_P1_FUNKTIONEN.renderAll();
    });
    await page.waitForFunction(() => /Jubiläums-Kontakt/.test(document.getElementById('p1LifecycleAlerts').innerText), null, { timeout: 10000 });
    check('#62 Lifecycle-Alarm erkennt bevorstehenden 1-Jahres-Jahrestag aus echten Transaktionsdaten', await page.evaluate(() => /1\. Jahrestag/.test(document.getElementById('p1LifecycleAlerts').innerText)), results);

    // --- #30 Preisaktions-Guardrail (Gate wie #55) ---
    await page.fill('#p1paObject', 'Gate-Objekt');
    await page.fill('#p1paOld', '400000');
    await page.fill('#p1paNew', '350000'); // -12.5%, keine Begründung -> muss Gate ausloesen
    await page.click('#p1PriceActionForm button[type="submit"]');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('kk_price_actions_v1') || '[]').length === 1, null, { timeout: 10000 });
    check('#30 Preissenkung >5% ohne Begründung wird nach Bestätigung gespeichert und als "gated" markiert', await page.evaluate(() => {
      var x = JSON.parse(localStorage.getItem('kk_price_actions_v1'))[0];
      return x.object === 'Gate-Objekt' && x.gated === true;
    }), results);
    await page.fill('#p1paObject', 'Normalobjekt');
    await page.fill('#p1paOld', '400000');
    await page.fill('#p1paNew', '395000'); // -1.25%, unter Schwelle -> kein Gate
    await page.click('#p1PriceActionForm button[type="submit"]');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('kk_price_actions_v1') || '[]').length === 2, null, { timeout: 10000 });
    check('#30 Geringfügige Preisänderung unter der Schwelle löst KEIN Gate aus (gated:false)', await page.evaluate(() => {
      var items = JSON.parse(localStorage.getItem('kk_price_actions_v1'));
      var x = items.filter(function (i) { return i.object === 'Normalobjekt'; })[0];
      return x.gated === false;
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
