// Regression test for the Master-Prompt P2-Batch (25 Funktionen). 20 davon
// teilen die gleiche generische Karten-Engine wie P1 (window.KK_P2_FUNKTIONEN.
// CARDS) - stellvertretend 2 Karten voll durchgetestet, alle 20 auf korrektes
// Rendering geprueft, plus die aus echten Aktivitaetsdaten berechnete
// #5/#40-Reaktivierungsansicht.
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
    await page.waitForFunction(() => !!(window.KK_APP_SHELL && window.KK_P2_FUNKTIONEN && window.KK_P2_FUNKTIONEN.version === '1.0'), null, { timeout: 15000 });
    await page.evaluate(() => { window.KK_APP_SHELL.openTab('backup'); });
    await page.waitForSelector('#p2funktionen', { state: 'visible', timeout: 15000 });
    await page.waitForFunction(() => document.querySelectorAll('#p2CardsContainer [data-p2-form]').length === 20, null, { timeout: 10000 });

    check('Alle 20 generischen P2-Karten werden aus der Config gerendert', await page.evaluate(() => document.querySelectorAll('#p2CardsContainer [data-p2-form]').length === 20), results);

    // #1 Eigentümer-Intent-Radar (Select-Feld)
    await page.fill('#p2_intentradar_contact', 'Intent-Kontakt');
    await page.fill('#p2_intentradar_signal', 'Fragt nach Nachbarschaftsverkäufen');
    await page.selectOption('#p2_intentradar_confidence', 'hoch');
    await page.click('[data-p2-form="intentradar"] button[type="submit"]');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('kk_intent_signals_v1') || '[]').length === 1, null, { timeout: 10000 });
    check('#1 Eigentümer-Intent-Signal wird gespeichert', await page.evaluate(() => {
      var x = JSON.parse(localStorage.getItem('kk_intent_signals_v1'))[0];
      return x.contact === 'Intent-Kontakt' && x.confidence === 'hoch';
    }), results);

    // #49 Umsatzwirkungs-Navigator (Pflichtfeld-Validierung)
    await page.click('[data-p2-form="revenuenav"] button[type="submit"]');
    await page.waitForTimeout(200);
    check('#49 Pflichtfeld-Validierung verhindert leeren Eintrag', await page.evaluate(() => JSON.parse(localStorage.getItem('kk_revenue_priorities_v1') || '[]').length === 0), results);
    await page.fill('#p2_revenuenav_task', 'Hochprovisionierten Deal anrufen');
    await page.fill('#p2_revenuenav_priorityReason', 'Höchster gewichteter Wert in der Pipeline');
    await page.click('[data-p2-form="revenuenav"] button[type="submit"]');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('kk_revenue_priorities_v1') || '[]').length === 1, null, { timeout: 10000 });
    check('#49 Umsatzpriorität wird nach Pflichtfeld-Ausfüllen gespeichert', true, results);

    // --- #5/#40 Reaktivierungsradar (echte Kontakt-/Aktivitätsdaten) ---
    await page.evaluate(() => {
      var old = new Date(); old.setDate(old.getDate() - 60);
      window.KK_STORE.writeJSON('kk_crm_contacts', [
        { id: 'react1', name: 'Reaktivierungs-Kontakt', category: 'Eigentümer' },
        { id: 'react2', name: 'Aktueller Kontakt', category: 'Käufer' }
      ]);
      window.KK_STORE.writeJSON('kk_crm_activities', [
        { id: 'act_react1', contact: 'Reaktivierungs-Kontakt', createdAt: old.toISOString() },
        { id: 'act_react2', contact: 'Aktueller Kontakt', createdAt: new Date().toISOString() }
      ]);
      window.KK_P2_FUNKTIONEN.renderAll();
    });
    await page.waitForFunction(() => /Reaktivierungs-Kontakt/.test(document.getElementById('p2ReactivationAlerts').innerText), null, { timeout: 10000 });
    check('#5/#40 Reaktivierungsradar erkennt Kontakt über dem 45-Tage-Schwellwert aus echten Aktivitätsdaten', await page.evaluate(() => /60 Tage ohne Aktivität/.test(document.getElementById('p2ReactivationAlerts').innerText)), results);
    check('#5/#40 Kontakt mit aktueller Aktivität wird NICHT als reaktivierungsbedürftig gelistet (kein False Positive)', await page.evaluate(() => !/Aktueller Kontakt/.test(document.getElementById('p2ReactivationAlerts').innerText)), results);

    // --- #37 Raum-Feedback (Erweiterung der bestehenden #36-Besichtigungsform aus P0) ---
    await page.click('#p0ViewingAddBtn');
    await page.fill('#p0vContact', 'Raumfeedback-Kontakt');
    await page.selectOption('#p0vRoomFeedback', 'Bad negativ');
    await page.click('#p0ViewingForm button[type="submit"]');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('kk_viewing_debriefs_v1') || '[]').some(function (x) { return x.contact === 'Raumfeedback-Kontakt'; }), null, { timeout: 10000 });
    check('#37 Vordefiniertes Raum-Feedback wird am bestehenden Besichtigungs-Debrief (#36) mitgespeichert, kein separates Modul', await page.evaluate(() => {
      var x = JSON.parse(localStorage.getItem('kk_viewing_debriefs_v1')).filter(function (i) { return i.contact === 'Raumfeedback-Kontakt'; })[0];
      return x.roomFeedback === 'Bad negativ';
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
