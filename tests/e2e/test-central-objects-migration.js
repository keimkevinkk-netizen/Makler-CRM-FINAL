// Regression/acceptance test for the "Zentrale Objekterfassung" master task:
// Phase 2 (Datenmodell/Policy), Phase 3 (zentrale API) and Phase 6 (Migration).
// Covers Kevin's verbindliche Testmatrix Punkt A (Datenmodell), F (harte
// Kartenregel, gemischte recordTypes) und H (Migration, insbesondere
// Idempotenz - ein zweiter Lauf erzeugt keine Duplikate, loescht keine
// Datensaetze, aendert keine IDs, ueberschreibt keine Koordinaten).
// Pre-seeds legacy storage (kk12_objects, kk_market_monitor_entries_v1) via
// page.addInitScript() BEFORE navigation, so the automatic boot-time
// migration (KK_BOOT priority 7) actually processes real legacy data.
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

    await page.addInitScript(() => {
      localStorage.setItem('kk12_objects', JSON.stringify([
        { id: 'legacy_kk12_1', owner: 'Legacy Eigentümer', address: 'Alte Gasse 3, Hanau', area: 'Hanau', type: 'Haus', value: 320000, status: 'offen', next: 'Termin vereinbaren', updatedAt: '2024-01-01T00:00:00.000Z' }
      ]));
      localStorage.setItem('kk_market_monitor_entries_v1', JSON.stringify([
        { id: 'legacy_market_1', town: 'Hanau', object: 'ETW Legacy', platform: 'ImmoScout24', type: 'Kauf', price: 250000, sqm: 80, status: 'Neu', createdAt: '2024-02-01T00:00:00.000Z', updatedAt: '2024-02-01T00:00:00.000Z' }
      ]));
      localStorage.setItem('kk_crm_objects', JSON.stringify([
        { id: 'legacy_crm_1', address: 'Bestandsobjekt ohne recordType 1, Maintal', status: 'offen', createdAt: '2023-01-01T00:00:00.000Z', updatedAt: '2023-01-01T00:00:00.000Z' }
      ]));
    });

    await page.goto(fileUrl, { waitUntil: 'load' });
    await page.waitForFunction(() => !!(window.KK_APP_SHELL && window.KK_OBJECTS), null, { timeout: 15000 });
    await page.waitForFunction(() => window.KK_OBJECTS.getMigrationStatus().completed === true, null, { timeout: 10000 });

    // --- Test A: Datenmodell ---
    const validSave = await page.evaluate(() => window.KK_OBJECTS.saveCentralObject({ recordType: 'research', title: 'Vergleichsobjekt', address: 'Teststraße 1' }));
    check('A: gültiger recordType (research) wird akzeptiert', validSave && !validSave.error && validSave.recordType === 'research', results);
    const invalidSave = await page.evaluate(() => window.KK_OBJECTS.saveCentralObject({ recordType: 'unbekannter_typ', title: 'Sollte abgelehnt werden' }));
    check('A: unbekannter/ungültiger recordType wird abgelehnt (kein stilles Fallback)', invalidSave && invalidSave.error === 'invalid_record_type', results);
    const defaultSave = await page.evaluate(() => window.KK_OBJECTS.saveCentralObject({ title: 'Ohne recordType' }));
    check('A: fehlender recordType bekommt sinnvollen Default (inventory, wie Altbestand)', defaultSave && defaultSave.recordType === 'inventory', results);
    const policy = await page.evaluate(() => window.KK_OBJECTS.getObjectPolicy('market'));
    check('A: getObjectPolicy(market) verbietet Karte/Pipeline/Tasks/Follow-ups/Eigentümerverknüpfung', !policy.showOnMap && !policy.showInPipeline && !policy.allowTasks && !policy.allowFollowUps && !policy.allowOwnerLink, results);
    check('A: getObjectPolicy(market) erlaubt Marktanalyse/Vergleich', policy.useForMarketAnalytics && policy.useForComparison, results);

    // --- Test F: harte Kartenregel mit gemischten recordTypes ---
    const mapMix = await page.evaluate(() => {
      var inv = window.KK_OBJECTS.saveCentralObject({ recordType: 'inventory', address: 'Kartentest Inventory', geo: { latitude: 50.1, longitude: 8.9, status: 'exact', visibility: 'exact' } });
      var mkt = window.KK_OBJECTS.saveCentralObject({ recordType: 'market', address: 'Kartentest Market', geo: { latitude: 50.2, longitude: 8.8, status: 'exact', visibility: 'exact' } });
      var res = window.KK_OBJECTS.saveCentralObject({ recordType: 'research', address: 'Kartentest Research', geo: { latitude: 50.3, longitude: 8.7, status: 'exact', visibility: 'exact' } });
      var data = window.KK_REALMAP.buildRecordMarkers();
      var objLayerIds = data.records.filter(function (r) { return r.layerKey === 'objects'; }).map(function (r) { return r.recordId; });
      return { invOnMap: window.KK_OBJECTS.mayAppearOnMap(inv), mktOnMap: window.KK_OBJECTS.mayAppearOnMap(mkt), resOnMap: window.KK_OBJECTS.mayAppearOnMap(res), objLayerIds: objLayerIds, invId: inv.id, mktId: mkt.id, resId: res.id };
    });
    console.log('mapMix:', JSON.stringify(mapMix));
    check('F: inventory mit gültiger Position darf auf die Karte', mapMix.invOnMap === true, results);
    check('F: market darf NIE auf die Karte, auch mit gültiger Position', mapMix.mktOnMap === false, results);
    check('F: research darf NIE auf die Karte, auch mit gültiger Position', mapMix.resOnMap === false, results);
    check('F: von 3 Datensätzen mit gültigen Koordinaten erscheint auf der Ebene "Objekte" GENAU der inventory-Datensatz', mapMix.objLayerIds.indexOf(mapMix.invId) > -1 && mapMix.objLayerIds.indexOf(mapMix.mktId) === -1 && mapMix.objLayerIds.indexOf(mapMix.resId) === -1, results);

    // --- Test H: Migration ---
    const afterFirstRun = await page.evaluate(() => ({
      status: window.KK_OBJECTS.getMigrationStatus(),
      central: window.KK_OBJECTS.readAll(),
      kk12: JSON.parse(localStorage.getItem('kk12_objects')),
      backupExists: !!localStorage.getItem('kk_object_migration_v1_backup')
    }));
    check('H: Migrationsflag ist nach dem automatischen Lauf gesetzt', afterFirstRun.status.completed === true, results);
    check('H: Backup wurde VOR der Migration geschrieben (kk_object_migration_v1_backup)', afterFirstRun.backupExists === true, results);
    const migratedKk12 = afterFirstRun.central.find((o) => o.migration && o.migration.legacySourceKey === 'kk12_objects' && o.migration.legacyId === 'legacy_kk12_1');
    check('H: kk12_objects-Datensatz wurde als inventory in die zentrale Datenbank migriert', !!migratedKk12 && migratedKk12.recordType === 'inventory', results);
    check('H: migrierter kk12-Datensatz behält Adresse/Owner aus dem Original', migratedKk12 && migratedKk12.address === 'Alte Gasse 3, Hanau' && migratedKk12.ownerName === 'Legacy Eigentümer', results);
    const originalKk12 = afterFirstRun.kk12.find((o) => o.id === 'legacy_kk12_1');
    check('H: Original-kk12_objects-Eintrag bleibt erhalten (keine Löschung bestehender Daten)', !!originalKk12, results);
    check('H: Original-kk12-Eintrag ist als migriert markiert (verhindert Doppelzählung in KPIs)', originalKk12.migratedToCentral === true && originalKk12.centralObjectId === migratedKk12.id, results);
    const migratedMarket = afterFirstRun.central.find((o) => o.migration && o.migration.legacySourceKey === 'kk_market_monitor_entries_v1' && o.migration.legacyId === 'legacy_market_1');
    check('H: kk_market_monitor_entries_v1-Datensatz wurde als market migriert', !!migratedMarket && migratedMarket.recordType === 'market', results);
    const taggedLegacyCrm = afterFirstRun.central.find((o) => o.id === 'legacy_crm_1');
    check('H: bereits vorhandener kk_crm_objects-Datensatz ohne recordType wurde explizit als inventory getaggt', taggedLegacyCrm && taggedLegacyCrm.recordType === 'inventory', results);

    // Zweiter, manueller Migrationslauf (simuliert Reload-Idempotenz-Check, ohne
    // echten Seitenreload - runMigration() selbst muss idempotent sein).
    const countBeforeSecondRun = afterFirstRun.central.length;
    const secondRun = await page.evaluate(() => window.KK_OBJECTS.runMigration());
    check('H: zweiter Migrationslauf erkennt "bereits abgeschlossen" (Flag-Guard) und tut nichts', secondRun.skipped === true, results);
    const countAfterSecondRun = await page.evaluate(() => window.KK_OBJECTS.readAll().length);
    check('H: zweiter Lauf erzeugt KEINE Duplikate (Anzahl zentrale Datensätze unverändert)', countAfterSecondRun === countBeforeSecondRun, results);

    // Direkter Idempotenz-Test der Kernlogik OHNE den Flag-Guard (simuliert den
    // Fall, dass runMigration trotz vorhandener migrierter Daten erneut
    // aufgerufen wird - z.B. nach einem manuellen rollbackMigration() ohne
    // zwischenzeitliche Datenänderung): alreadyMigratedFrom() muss über
    // migration.legacySourceKey/legacyId dedupen.
    const idempotencyCoreCheck = await page.evaluate(() => {
      localStorage.setItem('kk_object_migration_v1_completed', 'false');
      var before = window.KK_OBJECTS.readAll().length;
      var result = window.KK_OBJECTS.runMigration();
      var after = window.KK_OBJECTS.readAll().length;
      return { skipped: result.skipped, migratedKk12: result.migratedKk12, migratedMarketEntries: result.migratedMarketEntries, before: before, after: after };
    });
    console.log('idempotencyCoreCheck:', JSON.stringify(idempotencyCoreCheck));
    check('H: erneuter Lauf (Flag zurückgesetzt, Daten bereits migriert) migriert 0 kk12-Datensätze erneut (Dedup über migration.legacySourceKey/legacyId)', idempotencyCoreCheck.migratedKk12 === 0, results);
    check('H: erneuter Lauf migriert 0 Marktbeobachtungen erneut', idempotencyCoreCheck.migratedMarketEntries === 0, results);
    check('H: Gesamtzahl zentraler Datensätze bleibt bei erneutem Lauf unverändert (keine Duplikate)', idempotencyCoreCheck.before === idempotencyCoreCheck.after, results);

    // --- Aggregierte Keys werden NICHT als Einzelobjekte migriert (Abschnitt 18) ---
    const notMigrated = await page.evaluate(() => window.KK_OBJECTS.readAll().some((o) => o.migration && (o.migration.legacySourceKey === 'kk_market_analysis_v1' || o.migration.legacySourceKey === 'kk_region_market_cockpit_v10' || o.migration.legacySourceKey === 'kk_mkk_market_reference_v29_4')));
    check('Aggregierte Ortsdaten-Keys (kk_market_analysis_v1/kk_region_market_cockpit_v10/kk_mkk_market_reference_v29_4) wurden NICHT als Einzelobjekte migriert', notMigrated === false, results);

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
