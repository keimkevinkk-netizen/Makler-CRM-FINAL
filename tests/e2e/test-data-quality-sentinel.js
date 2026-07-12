// Regression test for the Master-Prompt-Funktion #54 "Datenintegritaets-
// Sentinel" extension of the existing "Datenqualitaet"-Sektion (#datenqualitaet,
// scanData()/renderDataQuality() in index.html ~Zeile 11908). Extends the
// pre-existing contact-field scanner (missing name/phone/email/...) with two
// new, entity-crossing, READ-ONLY checks: orphaned follow-up->contact
// references, and a phone-number duplicate heuristic among contacts. No
// destructive auto-fixes - only a visible report, as required by the
// Master-Prompt (C1 "Sentinel ohne destruktive Auto-Fixes").
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
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const pageErrors = [];
    page.on('pageerror', (e) => { pageErrors.push(e.message); console.log('::error::PAGEERROR: ' + e.message); });

    await page.goto(fileUrl, { waitUntil: 'load' });
    await page.waitForFunction(() => !!(window.KK_APP_SHELL && window.KK_STORE), null, { timeout: 15000 });

    // Realistische, synthetische Datensaetze - nicht nur Leerzustand (Testregel).
    await page.evaluate(() => {
      window.KK_STORE.writeJSON('kk_crm_contacts', [
        { id: 'c1', name: 'Anna Musterfrau', phone: '06181 111111', email: 'anna@example.de', area: 'Hanau', category: 'Eigentümer', nextStep: 'Anrufen', followUpDate: '2026-08-01' },
        { id: 'c2', name: 'Bernd Beispiel', phone: '06181 222222', email: 'bernd@example.de', area: 'Hanau', category: 'Käufer', nextStep: 'Termin', followUpDate: '2026-08-01' },
        { id: 'c3', name: 'Clara Kopie', phone: '06181 111111', email: 'clara@example.de', area: 'Hanau', category: 'Eigentümer', nextStep: 'Angebot', followUpDate: '2026-08-01' }
      ]);
      window.KK_STORE.writeJSON('kk_followups', [
        { id: 'fu1', contactId: 'c1', name: 'Anna Musterfrau', status: 'offen', dueDate: '2026-08-01' },
        { id: 'fu2', contactId: 'geloeschter-kontakt-999', name: 'Verwaistes Follow-up', status: 'offen', dueDate: '2026-08-02' }
      ]);
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => !!(window.KK_APP_SHELL && window.KK_STORE), null, { timeout: 15000 });
    await page.evaluate(() => { window.KK_APP_SHELL.openTab('backup'); });
    await page.waitForSelector('#dataScanBtn', { state: 'visible', timeout: 15000 });
    await page.click('#dataScanBtn');
    await page.waitForFunction(() => {
      var q = JSON.parse(localStorage.getItem('kk_data_quality_queue') || '[]');
      return Array.isArray(q) && q.length > 0;
    }, null, { timeout: 15000 });

    const queue = await page.evaluate(() => JSON.parse(localStorage.getItem('kk_data_quality_queue') || '[]'));
    console.log('data quality queue:', JSON.stringify(queue));

    const orphanFindings = queue.filter((x) => x.source === 'follow-up');
    // Genau EIN Fund erwartet: fu2 (contactId zeigt ins Leere). fu1 (contactId
    // c1, existiert in kk_crm_contacts) darf NICHT mitgezaehlt werden - das
    // waere ein false positive. Die Laengenpruefung deckt beides ab.
    check('erkennt Follow-up mit verwaistem Kontaktbezug (contactId ohne passenden Kontakt), aber keinen False-Positive fuer die gueltige Referenz fu1/c1', orphanFindings.length === 1 && /geloeschter-kontakt-999/.test(orphanFindings[0].problem), results);

    const dupFindings = queue.filter((x) => x.source === 'duplikat');
    check('erkennt Telefonnummer-Duplikat zwischen zwei Kontakten (c1/c3, beide 06181 111111)', dupFindings.length === 2 && dupFindings.some((x) => x.contact === 'Anna Musterfrau') && dupFindings.some((x) => x.contact === 'Clara Kopie'), results);
    check('markiert Kontakt mit eindeutiger Telefonnummer NICHT als Duplikat (Bernd Beispiel)', !dupFindings.some((x) => x.contact === 'Bernd Beispiel'), results);

    const statsHtml = await page.evaluate(() => document.getElementById('dataStats').innerHTML);
    check('Statistik-Kacheln zeigen die Gesamtzahl der Befunde (kein leerer Report trotz echter Funde)', /\d/.test(statsHtml), results);

    // Nicht die Gesamtanzahl pruefen: ein unabhaengiges, bereits bestehendes
    // Master-OS-Migrationsfeature reichert kk_crm_contacts beim Laden mit
    // ~281 Referenzkontakten an (siehe "Kontakte einbinden" im Backup-Tab) -
    // das ist erwartetes, vom Sentinel unabhaengiges Verhalten. Stattdessen:
    // die eigenen Fixture-Datensaetze muessen unveraendert erhalten bleiben.
    check('Sentinel schreibt NICHT destruktiv in kk_crm_contacts oder kk_followups (eigene Fixture-Datensaetze unveraendert, nur Report, keine Auto-Fixes)', await page.evaluate(() => {
      var contacts = JSON.parse(localStorage.getItem('kk_crm_contacts') || '[]');
      var fus = JSON.parse(localStorage.getItem('kk_followups') || '[]');
      var c1 = contacts.find((c) => c.id === 'c1'), c3 = contacts.find((c) => c.id === 'c3');
      var fu1 = fus.find((f) => f.id === 'fu1'), fu2 = fus.find((f) => f.id === 'fu2');
      return !!c1 && c1.name === 'Anna Musterfrau' && !!c3 && c3.name === 'Clara Kopie' && !!fu1 && !!fu2 && fu2.contactId === 'geloeschter-kontakt-999';
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
