// Regression test for the map-related bugs found during Kevin's live mobile
// testing (Fehler B: Marktbeobachtung fehlt auf der Karte; geo data being
// silently wiped on every CRM-object edit; the map not distinguishing
// "no data" from "data without a position") PLUS the subsequent, binding
// "Zentrale Objekterfassung" master task (hard map policy: market/research
// NEVER on the map) PLUS the Korrekturauftrag that replaced the three
// separate type-specific forms with ONE central object editor dialog
// (#kkCentralObjectEditorDialog / #kkcrmproObjectForm). All form interactions
// below go through window.KK_CRM_PRO.openCentralObjectEditor() instead of the
// old, now-removed #kkv8MarketEntryForm/#kkv8ResearchEntryForm. BORIS
// (Fehler A) is covered separately in test-official-gis.js; the "exactly one
// form" UI requirement is covered in detail in
// test-central-object-editor-single-form.js. Runs against the local file://
// copy - no real network/Leaflet needed, since all assertions read the
// underlying data layer (window.KK_REALMAP/KK_OBJECTS/KK_GEO/localStorage),
// not rendered map pixels (Leaflet/CDN unavailable in this sandbox, see
// ADR-0002).
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
    await page.waitForFunction(() => !!(window.KK_APP_SHELL && window.KK_REALMAP && window.KK_GEO && window.KK_GEOCODE && window.KK_OBJECTS && window.KK_CRM_PRO), null, { timeout: 15000 });

    // --- Master-Auftrag Abschnitt 14 (harte Kartenregel): KEINE eigene Kartenebene mehr ---
    const hasLayer = await page.evaluate(() => window.KK_REALMAP.getLayerDefs().some((d) => d.key === 'market_observations'));
    check('Die Kartenebene "market_observations" aus PR #9 wurde vollständig entfernt (kein Toggle, kein versteckter Layer)', !hasLayer, results);

    // --- Marktbeobachtung ueber den EINEN zentralen Objekteditor erfassen ---
    // (Korrekturauftrag: kein eigenes #kkv8MarketEntryForm mehr - derselbe
    // Dialog wie fuer Bestand/Datensammlung, nur recordType='market' vorausgewaehlt.)
    await page.evaluate(() => { window.KK_CRM_PRO.openCentralObjectEditor({ recordType: 'market' }); });
    await page.waitForSelector('#kkCentralObjectEditorDialog[open]', { timeout: 8000 });
    await page.fill('#kkcrmproObjectAddress', 'Im kleinen Feld 15');
    await page.selectOption('#kkcrmproObjectArea', 'Bruchköbel');
    await page.click('#kkCentralSaveBtn');
    await page.waitForFunction(() => window.KK_OBJECTS.listObjects({ recordType: 'market' }).length >= 1, null, { timeout: 10000 });

    const entryAddr = await page.evaluate(() => window.KK_OBJECTS.listObjects({ recordType: 'market' })[0]);
    check('Marktbeobachtung wird in der ZENTRALEN Objektdatenbank gespeichert (recordType=market), kein separater Primärspeicher mehr', entryAddr && entryAddr.recordType === 'market', results);
    check('Marktbeobachtung bekommt automatisch addr.city aus dem Ort-Feld (ensureRecordGeo)', entryAddr.addr && entryAddr.addr.city === 'Bruchköbel', results);

    // Master-Auftrag Abschnitt 14: eine Marktbeobachtung darf NIE als Kartenmarker
    // erscheinen, selbst wenn sie (wie hier, ueber den Orts-Anker) eine gueltige
    // Position hat. mayAppearOnMap() muss das kategorisch verneinen.
    const mayAppear = await page.evaluate((id) => window.KK_OBJECTS.mayAppearOnMap(window.KK_OBJECTS.getObject(id)), entryAddr.id);
    check('KK_OBJECTS.mayAppearOnMap() verneint für recordType=market kategorisch, auch mit gültiger Position', mayAppear === false, results);

    const marketOnObjectsLayer = await page.evaluate(() => {
      var data = window.KK_REALMAP.buildRecordMarkers();
      return { objectsCount: data.counts.objects, allRecords: data.records.map(function (r) { return r.storageKey; }) };
    });
    console.log('marketOnObjectsLayer:', JSON.stringify(marketOnObjectsLayer));
    check('Die Ebene "Objekte / Immobilien" zählt die Marktbeobachtung NICHT mit (nur recordType=inventory)', marketOnObjectsLayer.objectsCount === 0, results);
    check('Kein einziger Kartendatensatz stammt aus einer Marktbeobachtung (keine versteckte/optionale Analyseebene)', !marketOnObjectsLayer.allRecords.some(function (k) { return k === 'kk_market_monitor_entries_v1'; }), results);

    // --- "Als Bestand übernehmen": kontrollierte Typumwandlung statt Kopie in einen zweiten Speicher ---
    const entryId = entryAddr.id;
    await page.evaluate((id) => { window.KK_REALMAP.adoptMarketObservation(id); }, entryId);
    const afterAdopt = await page.evaluate((id) => window.KK_OBJECTS.getObject(id), entryId);
    check('"Als Bestand übernehmen" wandelt den bestehenden Datensatz per changeRecordType() um (keine Kopie, keine neue ID)', afterAdopt && afterAdopt.recordType === 'inventory', results);
    check('Typumwandlung wird in typeHistory protokolliert (Abschnitt 17)', Array.isArray(afterAdopt.typeHistory) && afterAdopt.typeHistory.some(function (h) { return h.from === 'market' && h.to === 'inventory'; }), results);
    const objectsCountBefore = await page.evaluate(() => window.KK_OBJECTS.listObjects({ recordType: 'inventory' }).length);
    await page.evaluate((id) => { window.KK_REALMAP.adoptMarketObservation(id); }, entryId); // zweiter Klick
    const objectsCountAfter = await page.evaluate(() => window.KK_OBJECTS.listObjects({ recordType: 'inventory' }).length);
    check('Ein zweiter "Übernehmen"-Klick auf denselben Datensatz erzeugt KEIN Duplikat', objectsCountAfter === objectsCountBefore, results);
    const mayAppearAfterAdopt = await page.evaluate((id) => window.KK_OBJECTS.mayAppearOnMap(window.KK_OBJECTS.getObject(id)), entryId);
    check('Nach der Umwandlung zu inventory darf der Datensatz (mit gültiger Position) auf der Karte erscheinen', mayAppearAfterAdopt === true, results);

    // --- Geo-Preserve-on-Edit-Fix: Position darf beim Bearbeiten nicht verschwinden ---
    // (ueber denselben zentralen Editor, jetzt als Dialog statt Inline-Formular)
    await page.evaluate(() => { window.KK_CRM_PRO.openCentralObjectEditor({ recordType: 'inventory' }); });
    await page.waitForSelector('#kkCentralObjectEditorDialog[open]', { timeout: 8000 });
    await page.fill('#kkcrmproObjectAddress', 'Musterstraße 1, 63456 Hanau');
    await page.fill('#kkcrmproObjectStreet', 'Musterstraße');
    await page.fill('#kkcrmproObjectHouseNo', '1');
    await page.fill('#kkcrmproObjectPostal', '63456');
    await page.fill('#kkcrmproObjectOwner', 'Geo-Test-Eigentümer');
    await page.click('#kkCentralSaveBtn');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('kk_crm_objects') || '[]').some((o) => o.ownerName === 'Geo-Test-Eigentümer'), null, { timeout: 10000 });

    // Geocoding in dieser Sandbox nicht live erreichbar (kein Netlify-Function-
    // Backend fuer file://) - simuliert stattdessen exakt den Erfolgsfall, den
    // der echte Server nach einer erfolgreichen Nominatim-Antwort erzeugen
    // wuerde (KK_GEOCODE.applyResult ist die reale, ungeaenderte Produktionslogik).
    const objectId = await page.evaluate(() => JSON.parse(localStorage.getItem('kk_crm_objects')).find((o) => o.ownerName === 'Geo-Test-Eigentümer').id);
    await page.evaluate((id) => {
      var arr = JSON.parse(localStorage.getItem('kk_crm_objects'));
      var idx = arr.findIndex((o) => o.id === id);
      window.KK_GEOCODE.applyResult(arr[idx], { results: [{ lat: 50.1, lng: 8.9, precisionHint: 'street' }] });
      localStorage.setItem('kk_crm_objects', JSON.stringify(arr));
    }, objectId);
    const geoAfterGeocode = await page.evaluate((id) => JSON.parse(localStorage.getItem('kk_crm_objects')).find((o) => o.id === id).geo, objectId);
    check('Vorbereitung: simuliertes Geocoding-Ergebnis wurde übernommen (Status EXACT, Koordinaten gesetzt)', geoAfterGeocode.status === 'exact' && geoAfterGeocode.latitude === 50.1, results);

    // Jetzt NUR ein unabhaengiges Feld aendern (Notiz) und erneut speichern -
    // das ist Kevins Abschnitt 11 Kernfall: die Position darf NICHT verschwinden.
    // openCentralObjectEditor im edit-Modus oeffnet denselben Dialog und
    // befuellt ihn mit dem bestehenden Datensatz (populateCentralObjectFields).
    await page.evaluate((id) => { window.KK_CRM_PRO.openCentralObjectEditor({ objectId: id, mode: 'edit' }); }, objectId);
    await page.waitForSelector('#kkCentralObjectEditorDialog[open]', { timeout: 8000 });
    await page.fill('#kkcrmproObjectNotes', 'Nur eine Notiz geändert, Adresse unverändert.');
    await page.click('#kkCentralSaveBtn');
    await page.waitForFunction((id) => {
      var o = JSON.parse(localStorage.getItem('kk_crm_objects')).find((x) => x.id === id);
      return o && o.notes === 'Nur eine Notiz geändert, Adresse unverändert.';
    }, objectId, { timeout: 10000 });
    const geoAfterUnrelatedEdit = await page.evaluate((id) => JSON.parse(localStorage.getItem('kk_crm_objects')).find((o) => o.id === id).geo, objectId);
    console.log('geoAfterUnrelatedEdit:', JSON.stringify(geoAfterUnrelatedEdit));
    check('Geo-Preserve-Fix (Kevin Abschnitt 11A): Notiz-Änderung bei UNVERÄNDERTER Adresse löscht die Kartenposition NICHT (der reale Bug)', geoAfterUnrelatedEdit.status === 'exact' && geoAfterUnrelatedEdit.latitude === 50.1, results);

    // Jetzt die Adresse WIRKLICH aendern - Position MUSS invalidiert werden
    // (Kevin Abschnitt 11B: "bisherige automatische Koordinaten invalidieren").
    await page.evaluate((id) => { window.KK_CRM_PRO.openCentralObjectEditor({ objectId: id, mode: 'edit' }); }, objectId);
    await page.waitForSelector('#kkCentralObjectEditorDialog[open]', { timeout: 8000 });
    await page.fill('#kkcrmproObjectAddress', 'Ganz andere Straße 99, 63450 Hanau');
    await page.fill('#kkcrmproObjectStreet', 'Ganz andere Straße');
    await page.fill('#kkcrmproObjectHouseNo', '99');
    await page.fill('#kkcrmproObjectPostal', '63450');
    await page.click('#kkCentralSaveBtn');
    await page.waitForFunction((id) => {
      var o = JSON.parse(localStorage.getItem('kk_crm_objects')).find((x) => x.id === id);
      return o && o.address === 'Ganz andere Straße 99, 63450 Hanau';
    }, objectId, { timeout: 10000 });
    const geoAfterAddressChange = await page.evaluate((id) => JSON.parse(localStorage.getItem('kk_crm_objects')).find((o) => o.id === id).geo, objectId);
    console.log('geoAfterAddressChange:', JSON.stringify(geoAfterAddressChange));
    check('Geo-Preserve-Fix (Kevin Abschnitt 11B): eine TATSÄCHLICHE Adressänderung invalidiert die alte Position (status zurückgesetzt, kein stiller 50.1/8.9-Rest)', geoAfterAddressChange.status !== 'exact', results);

    // --- Zähler: "vorhanden/sichtbar/ohne Position" statt nur "0 sichtbar" ---
    await page.evaluate(() => { window.KK_APP_SHELL.openTab('marktmonitor'); });
    const layerGridHtml = await page.evaluate(() => document.getElementById('kkgeo-layer-grid') ? document.getElementById('kkgeo-layer-grid').innerHTML : '');
    check('Layer-Panel-HTML wurde gerendert (Grundlage für die Zähler-Prüfung)', layerGridHtml.length > 0, results);

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
