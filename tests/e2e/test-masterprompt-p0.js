// Regression test for the Master-Prompt P0-Batch (Funktionen #16/#51 Zusagen-
// Ledger, #17 Transaktionswahrheits-Ledger, #36 Besichtigungs-Debrief, #39
// Finanzierungsstatus, #55 Qualitaets-Gatekeeper, #56 Feldsignal-Sofortfaenger,
// #59/#60 Einwand-Bibliothek + Interventionsgedaechtnis). Alle client-seitig,
// keine externen Dienste, echte synthetische Daten (nicht nur Leerzustand).
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
    const dialogQueue = [];
    page.on('dialog', async (dialog) => {
      const action = dialogQueue.shift();
      console.log('dialog (' + dialog.type() + '): ' + dialog.message().slice(0, 120) + ' -> ' + (action ? action.type : 'accept(default)'));
      if (action && action.type === 'dismiss') await dialog.dismiss();
      else if (action && action.type === 'text') await dialog.accept(action.value);
      else await dialog.accept();
    });

    await page.goto(fileUrl, { waitUntil: 'load' });
    await page.waitForFunction(() => !!(window.KK_APP_SHELL && window.KK_P0_FUNKTIONEN && window.KK_P0_FUNKTIONEN.version === '1.0'), null, { timeout: 15000 });
    await page.evaluate(() => { window.KK_APP_SHELL.openTab('backup'); });
    await page.waitForSelector('#p0funktionen', { state: 'visible', timeout: 15000 });

    // --- #16/#51 Zusagen-Ledger ---
    await page.click('#p0CommitmentAddBtn');
    await page.fill('#p0cContact', 'Testkontakt Zusage');
    await page.fill('#p0cText', 'Exposé bis Freitag zusenden');
    await page.fill('#p0cDue', '2026-08-01');
    await page.click('#p0CommitmentForm button[type="submit"]');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('kk_commitments_v1') || '[]').length === 1, null, { timeout: 10000 });
    check('#16/#51 Zusage wird gespeichert (offen)', await page.evaluate(() => {
      var c = JSON.parse(localStorage.getItem('kk_commitments_v1'))[0];
      return c.contact === 'Testkontakt Zusage' && c.status === 'offen' && c.text === 'Exposé bis Freitag zusenden';
    }), results);
    dialogQueue.push({ type: 'text', value: 'Exposé verschickt' });
    await page.click('[data-commit-done]');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('kk_commitments_v1'))[0].status === 'erfuellt', null, { timeout: 10000 });
    check('#16/#51 Zusage-Erfuellung setzt Status + Ergebnis, Originaltext bleibt unveraendert', await page.evaluate(() => {
      var c = JSON.parse(localStorage.getItem('kk_commitments_v1'))[0];
      return c.status === 'erfuellt' && c.fulfillmentNote === 'Exposé verschickt' && c.text === 'Exposé bis Freitag zusenden';
    }), results);

    // --- #17 Transaktionswahrheits-Ledger (automatisch aus Sales-Pipeline) ---
    await page.evaluate(() => {
      window.KK_STORE.writeJSON('kk_sales_pipeline', [
        { id: 'deal1', name: 'Verkaufter Kontakt', area: 'Hanau', objectLabel: 'Musterstraße 1', stage: 'Verkauft', objectValue: 350000, commission: 12000 }
      ]);
    });
    await page.evaluate(() => window.KK_P0_FUNKTIONEN.renderAll());
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('kk_transactions_v1') || '[]').length === 1, null, { timeout: 10000 });
    check('#17 Verkaufte Pipeline-Chance erzeugt automatisch einen Transaktions-Ledger-Eintrag', await page.evaluate(() => {
      var t = JSON.parse(localStorage.getItem('kk_transactions_v1'))[0];
      return t.dealId === 'deal1' && t.contact === 'Verkaufter Kontakt' && t.source === 'eigener Abschluss (Sales-Pipeline)';
    }), results);
    await page.evaluate(() => window.KK_P0_FUNKTIONEN.renderAll());
    check('#17 Erneutes Rendern erzeugt KEINEN doppelten Transaktions-Eintrag (kein Duplikat)', await page.evaluate(() => JSON.parse(localStorage.getItem('kk_transactions_v1')).length === 1), results);

    // --- #36 Besichtigungs-Debrief ---
    await page.click('#p0ViewingAddBtn');
    await page.fill('#p0vContact', 'Besichtigungskontakt');
    await page.fill('#p0vObject', 'Musterstraße 2');
    await page.selectOption('#p0vInterest', 'hoch');
    await page.fill('#p0vObjection', 'Preis');
    await page.fill('#p0vNext', 'Finanzierungsbestätigung anfordern');
    await page.click('#p0ViewingForm button[type="submit"]');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('kk_viewing_debriefs_v1') || '[]').length === 1, null, { timeout: 10000 });
    check('#36 Besichtigungs-Debrief wird strukturiert gespeichert', await page.evaluate(() => {
      var v = JSON.parse(localStorage.getItem('kk_viewing_debriefs_v1'))[0];
      return v.contact === 'Besichtigungskontakt' && v.interest === 'hoch' && v.objection === 'Preis';
    }), results);

    // --- #39 Finanzierungs-Reibungsradar (Upsert je Kontakt, keine Finanzdetails) ---
    await page.click('#p0FinancingAddBtn');
    await page.fill('#p0fContact', 'Finanzierungskontakt');
    await page.selectOption('#p0fStatus', 'in_pruefung');
    await page.fill('#p0fBlocker', 'Eigenkapitalnachweis fehlt');
    await page.click('#p0FinancingForm button[type="submit"]');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('kk_financing_status_v1') || '[]').length === 1, null, { timeout: 10000 });
    await page.click('#p0FinancingAddBtn');
    await page.fill('#p0fContact', 'Finanzierungskontakt');
    await page.selectOption('#p0fStatus', 'zusage');
    await page.fill('#p0fBlocker', '');
    await page.click('#p0FinancingForm button[type="submit"]');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('kk_financing_status_v1'))[0].status === 'zusage', null, { timeout: 10000 });
    check('#39 Finanzierungsstatus je Kontakt wird aktualisiert statt dupliziert', await page.evaluate(() => JSON.parse(localStorage.getItem('kk_financing_status_v1')).length === 1), results);
    check('#39 Kein Bank-/Kreditdetailfeld im Datenmodell (nur status/blocker)', await page.evaluate(() => {
      var f = JSON.parse(localStorage.getItem('kk_financing_status_v1'))[0];
      var keys = Object.keys(f).sort();
      return keys.join(',') === 'blocker,contact,id,status,updatedAt';
    }), results);

    // --- #56 Feldsignal-Sofortfaenger ---
    await page.fill('#p0qcText', 'Nachbar von Musterstraße 5 verkaufsinteressiert');
    await page.click('#p0QuickCaptureForm button[type="submit"]');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('kk_quick_capture_inbox_v1') || '[]').length === 1, null, { timeout: 10000 });
    check('#56 Schnellnotiz landet unzugeordnet im Eingang', await page.evaluate(() => JSON.parse(localStorage.getItem('kk_quick_capture_inbox_v1'))[0].text === 'Nachbar von Musterstraße 5 verkaufsinteressiert'), results);
    await page.click('[data-qc-done]');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('kk_quick_capture_inbox_v1') || '[]').length === 0, null, { timeout: 10000 });
    check('#56 Eingang laesst sich leeren (erledigt/entfernen)', true, results);

    // --- #59/#60 Einwand-Bibliothek + Interventionsgedaechtnis ---
    const libraryCount = await page.evaluate(() => document.querySelectorAll('#p0ObjectionLibrary [data-obj-use]').length);
    check('#59 Einwand-Bibliothek zeigt kuratierte Einwaende mit Antwortvorschlag', libraryCount >= 6, results);
    dialogQueue.push({ type: 'text', value: 'Preistestkontakt' });
    dialogQueue.push({ type: 'accept' }); // confirm() "hat gewirkt" -> OK = wirkte
    await page.click('#p0ObjectionLibrary [data-obj-use="preis"]');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('kk_objection_outcomes_v1') || '[]').length === 1, null, { timeout: 10000 });
    check('#60 Einwand-Anwendung koppelt sich mit einem Ergebnis (wirkte/wirkte nicht)', await page.evaluate(() => {
      var o = JSON.parse(localStorage.getItem('kk_objection_outcomes_v1'))[0];
      return o.contact === 'Preistestkontakt' && o.outcome === 'wirkte' && o.objectionId === 'preis';
    }), results);

    // --- #55 Qualitaets-Gatekeeper (Pipeline-Tab, echtes bestehendes Sales-Formular) ---
    await page.evaluate(() => { window.KK_APP_SHELL.openTab('pipeline'); });
    await page.waitForSelector('#salesForm', { state: 'visible', timeout: 15000 });
    await page.fill('#salesName', 'Gate-Testkontakt');
    await page.selectOption('#salesStage', 'Verkaufsauftrag angeboten');
    await page.fill('#salesNext', ''); // bewusst leer -> Gate muss greifen
    dialogQueue.push({ type: 'dismiss' });
    await page.click('#salesForm button[type="submit"]');
    await page.waitForTimeout(300);
    check('#55 Gate verhindert Speichern bei Abbruch (kritische Stufe ohne naechsten Schritt)', await page.evaluate(() => {
      var s = JSON.parse(localStorage.getItem('kk_sales_pipeline') || '[]');
      return !s.some(function (x) { return x.name === 'Gate-Testkontakt'; });
    }), results);
    await page.fill('#salesName', 'Gate-Testkontakt');
    await page.selectOption('#salesStage', 'Verkaufsauftrag angeboten');
    dialogQueue.push({ type: 'accept' });
    await page.click('#salesForm button[type="submit"]');
    await page.waitForFunction(() => {
      var s = JSON.parse(localStorage.getItem('kk_sales_pipeline') || '[]');
      return s.some(function (x) { return x.name === 'Gate-Testkontakt'; });
    }, null, { timeout: 10000 });
    check('#55 Gate speichert trotzdem nach bewusster Bestätigung', true, results);
    check('#55 Bewusste Uebersteuerung wird protokolliert (kk_crm_activities)', await page.evaluate(() => {
      var acts = JSON.parse(localStorage.getItem('kk_crm_activities') || '[]');
      return acts.some(function (a) { return a.type === 'Qualitaets-Gate uebersteuert' && a.contact === 'Gate-Testkontakt'; });
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
