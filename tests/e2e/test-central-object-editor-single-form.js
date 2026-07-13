// Acceptance test for Kevin's Korrekturauftrag ("VERBINDLICHER KORREKTUR- UND
// FERTIGSTELLUNGSAUFTRAG FÜR PR #10"): the previous implementation satisfied
// the data-layer requirements (central storage, policy, migration) but still
// routed users to three DIFFERENT forms depending on type. This is no longer
// true - there is now exactly ONE visible object editor
// (#kkCentralObjectEditorDialog wrapping the single #kkcrmproObjectForm),
// used for inventory/market/research create+edit, reached from every entry
// point (CRM launcher, Marktmonitor "Marktbeobachtung erfassen"/"Datensammlung
// erfassen" buttons, kk12-legacy "Objekt erfassen" button, map popup
// "Übernehmen"). This file proves that literally, following Kevin's own
// lettered test list (A-I) from the Korrekturauftrag.
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
    await page.waitForFunction(() => !!(window.KK_APP_SHELL && window.KK_OBJECTS && window.KK_CRM_PRO), null, { timeout: 15000 });

    // --- Test A: Nur EIN Formular ---
    const oldFormsGone = await page.evaluate(() => ({
      kkv8MarketEntryForm: !!document.getElementById('kkv8MarketEntryForm'),
      kkv8MarketImportForm: !!document.getElementById('kkv8MarketImportForm'),
      kkv8ResearchEntryForm: !!document.getElementById('kkv8ResearchEntryForm'),
      kk12ObjectFormAsForm: document.getElementById('kk12ObjectForm') ? document.getElementById('kk12ObjectForm').tagName : null,
      centralDialogExists: !!document.getElementById('kkCentralObjectEditorDialog'),
      centralFormExists: !!document.getElementById('kkcrmproObjectForm'),
      allObjectFormsInDom: document.querySelectorAll('form#kkcrmproObjectForm').length
    }));
    console.log('oldFormsGone:', JSON.stringify(oldFormsGone));
    check('A: die alte Marktbeobachtungs-Schnellerfassung (#kkv8MarketEntryForm) existiert nicht mehr im DOM', !oldFormsGone.kkv8MarketEntryForm, results);
    check('A: das alte Import-Formular (#kkv8MarketImportForm) existiert nicht mehr im DOM', !oldFormsGone.kkv8MarketImportForm, results);
    check('A: die alte Datensammlung-Schnellerfassung (#kkv8ResearchEntryForm) existiert nicht mehr im DOM', !oldFormsGone.kkv8ResearchEntryForm, results);
    check('A: das alte kk12-Legacy-Objektformular ist kein <form> mehr (nur noch ein Button, kein eigenes Formularelement)', oldFormsGone.kk12ObjectFormAsForm !== 'FORM', results);
    check('A: es existiert genau EIN #kkcrmproObjectForm im gesamten DOM (kein zweites/drittes Formular)', oldFormsGone.allObjectFormsInDom === 1, results);
    check('A: der zentrale Objekteditor-Dialog existiert', oldFormsGone.centralDialogExists && oldFormsGone.centralFormExists, results);

    // --- Test B: Gleiche DOM-Struktur fuer alle drei Typen ---
    const domIdentity = {};
    for (const type of ['inventory', 'market', 'research']) {
      await page.evaluate((t) => { window.KK_CRM_PRO.openCentralObjectEditor({ recordType: t }); }, type);
      await page.waitForSelector('#kkCentralObjectEditorDialog[open]', { timeout: 8000 });
      domIdentity[type] = await page.evaluate(() => ({
        dialogId: document.getElementById('kkCentralObjectEditorDialog').id,
        formId: document.getElementById('kkcrmproObjectForm').id,
        saveBtnId: document.getElementById('kkCentralSaveBtn').id,
        visibleSection: ['kkCentralSectionInventory', 'kkCentralSectionMarket', 'kkCentralSectionResearch'].filter((id) => {
          var el = document.getElementById(id); return el && !el.hidden;
        })
      }));
      await page.evaluate(() => { document.getElementById('kkCentralEditorClose').click(); });
    }
    console.log('domIdentity:', JSON.stringify(domIdentity));
    check('B: inventory/market/research öffnen denselben Dialog-Container (#kkCentralObjectEditorDialog)', domIdentity.inventory.dialogId === domIdentity.market.dialogId && domIdentity.market.dialogId === domIdentity.research.dialogId, results);
    check('B: inventory/market/research öffnen dieselbe Formular-ID (#kkcrmproObjectForm)', domIdentity.inventory.formId === domIdentity.market.formId && domIdentity.market.formId === domIdentity.research.formId, results);
    check('B: inventory/market/research haben denselben Speichern-Button (#kkCentralSaveBtn)', domIdentity.inventory.saveBtnId === domIdentity.market.saveBtnId && domIdentity.market.saveBtnId === domIdentity.research.saveBtnId, results);
    check('B: nur die jeweils passende Sektion ist sichtbar (inventory zeigt nur Inventory-Sektion)', domIdentity.inventory.visibleSection.length === 1 && domIdentity.inventory.visibleSection[0] === 'kkCentralSectionInventory', results);
    check('B: nur die jeweils passende Sektion ist sichtbar (market zeigt nur Market-Sektion)', domIdentity.market.visibleSection.length === 1 && domIdentity.market.visibleSection[0] === 'kkCentralSectionMarket', results);
    check('B: nur die jeweils passende Sektion ist sichtbar (research zeigt nur Research-Sektion)', domIdentity.research.visibleSection.length === 1 && domIdentity.research.visibleSection[0] === 'kkCentralSectionResearch', results);

    // --- Test C: Keine Weiterleitung bei Typwahl ---
    const beforeTab = await page.evaluate(() => window.KK_APP_SHELL.getActiveTab ? window.KK_APP_SHELL.getActiveTab() : null);
    await page.evaluate(() => { window.KK_CRM_PRO.openCentralObjectEditor({}); });
    await page.waitForSelector('#kkCentralObjectEditorDialog[open]', { timeout: 8000 });
    await page.click('#kkCentralTypeStep [data-kk-central-type="market"]');
    const afterTypeClickTab = await page.evaluate(() => window.KK_APP_SHELL.getActiveTab ? window.KK_APP_SHELL.getActiveTab() : null);
    const stillSameDialog = await page.evaluate(() => document.getElementById('kkCentralObjectEditorDialog').open);
    check('C: Klick auf eine Typ-Karte wechselt NICHT den aktiven Tab', beforeTab === afterTypeClickTab, results);
    check('C: Klick auf eine Typ-Karte lässt denselben Dialog offen (keine Weiterleitung zu einem anderen Formular)', stillSameDialog === true, results);
    await page.evaluate(() => { document.getElementById('kkCentralEditorClose').click(); });

    // --- Test D: Gemeinsame Felder bleiben beim Typwechsel erhalten ---
    await page.evaluate(() => { window.KK_CRM_PRO.openCentralObjectEditor({ recordType: 'inventory' }); });
    await page.waitForSelector('#kkCentralObjectEditorDialog[open]', { timeout: 8000 });
    await page.fill('#kkcrmproObjectAddress', 'Gemeinsames Feld Teststraße 5');
    await page.click('#kkCentralTypeSwitch [data-kk-central-type="market"]');
    const addressAfterSwitch = await page.evaluate(() => document.getElementById('kkcrmproObjectAddress').value);
    check('D: Adresse (gemeinsames Feld) bleibt nach Typwechsel inventory->market erhalten', addressAfterSwitch === 'Gemeinsames Feld Teststraße 5', results);
    await page.evaluate(() => { document.getElementById('kkCentralEditorClose').click(); });

    // --- Test E: Dynamische Felder ---
    const sectionVisibility = {};
    for (const type of ['inventory', 'market', 'research']) {
      await page.evaluate((t) => { window.KK_CRM_PRO.openCentralObjectEditor({ recordType: t }); }, type);
      await page.waitForSelector('#kkCentralObjectEditorDialog[open]', { timeout: 8000 });
      sectionVisibility[type] = await page.evaluate(() => ({
        inv: !document.getElementById('kkCentralSectionInventory').hidden,
        mkt: !document.getElementById('kkCentralSectionMarket').hidden,
        res: !document.getElementById('kkCentralSectionResearch').hidden
      }));
      await page.evaluate(() => { document.getElementById('kkCentralEditorClose').click(); });
    }
    console.log('sectionVisibility:', JSON.stringify(sectionVisibility));
    check('E: inventory zeigt die Inventory-Sektion, nicht Market/Research', sectionVisibility.inventory.inv && !sectionVisibility.inventory.mkt && !sectionVisibility.inventory.res, results);
    check('E: market zeigt die Market-Sektion, nicht Inventory/Research', !sectionVisibility.market.inv && sectionVisibility.market.mkt && !sectionVisibility.market.res, results);
    check('E: research zeigt die Research-Sektion, nicht Inventory/Market', !sectionVisibility.research.inv && !sectionVisibility.research.mkt && sectionVisibility.research.res, results);

    // --- Test F: EIN Speicherweg fuer alle drei Typen ---
    const savedIds = {};
    for (const type of ['inventory', 'market', 'research']) {
      await page.evaluate((t) => { window.KK_CRM_PRO.openCentralObjectEditor({ recordType: t }); }, type);
      await page.waitForSelector('#kkCentralObjectEditorDialog[open]', { timeout: 8000 });
      await page.fill('#kkcrmproObjectAddress', 'EinFormularTest ' + type);
      if (type === 'market') await page.fill('#kkCentralPlatform', 'ImmoScout24');
      if (type === 'research') await page.fill('#kkCentralDataSource', 'Notar');
      await page.click('#kkCentralSaveBtn');
      await page.waitForFunction((t) => window.KK_OBJECTS.listObjects({ recordType: t }).some((o) => o.address === 'EinFormularTest ' + t), type, { timeout: 8000 });
      savedIds[type] = await page.evaluate((t) => window.KK_OBJECTS.listObjects({ recordType: t }).find((o) => o.address === 'EinFormularTest ' + t).id, type);
    }
    check('F: inventory wurde über saveCentralObject() in der zentralen Datenbank gespeichert', !!savedIds.inventory, results);
    check('F: market wurde über saveCentralObject() in der zentralen Datenbank gespeichert', !!savedIds.market, results);
    check('F: research wurde über saveCentralObject() in der zentralen Datenbank gespeichert', !!savedIds.research, results);
    const noLegacyKeyWrites = await page.evaluate(() => ({
      legacyMarket: JSON.parse(localStorage.getItem('kk_market_monitor_entries_v1') || '[]').length,
      legacyKk12: JSON.parse(localStorage.getItem('kk12_objects') || '[]').length
    }));
    check('F: kein alter Storage-Key wurde durch die Test-Speicherungen neu beschrieben (kk_market_monitor_entries_v1 bleibt bei 0, da keine Legacy-Migration hier lief)', noLegacyKeyWrites.legacyMarket === 0, results);

    // --- Test G: Bearbeiten nutzt denselben Editor fuer alle drei Typen ---
    for (const type of ['inventory', 'market', 'research']) {
      await page.evaluate((id) => { window.KK_CRM_PRO.openCentralObjectEditor({ objectId: id, mode: 'edit' }); }, savedIds[type]);
      await page.waitForSelector('#kkCentralObjectEditorDialog[open]', { timeout: 8000 });
      const editState = await page.evaluate(() => ({
        formId: document.getElementById('kkcrmproObjectForm').id,
        addressValue: document.getElementById('kkcrmproObjectAddress').value,
        recordType: document.getElementById('kkCentralRecordType').value
      }));
      check('G: Bearbeiten von ' + type + ' öffnet denselben Editor (#kkcrmproObjectForm) mit korrekt geladenem Datensatz', editState.formId === 'kkcrmproObjectForm' && editState.addressValue === 'EinFormularTest ' + type && editState.recordType === type, results);
      await page.evaluate(() => { document.getElementById('kkCentralEditorClose').click(); });
    }

    // --- Test H: Mobile ---
    await page.setViewportSize({ width: 390, height: 844 });
    for (const type of ['inventory', 'market', 'research']) {
      await page.evaluate((t) => { window.KK_CRM_PRO.openCentralObjectEditor({ recordType: t }); }, type);
      await page.waitForSelector('#kkCentralObjectEditorDialog[open]', { timeout: 8000 });
      const mobileState = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 3,
        saveBtnVisible: (function () { var r = document.getElementById('kkCentralSaveBtn').getBoundingClientRect(); return r.width > 0 && r.height > 0; })()
      }));
      check('H (' + type + '): kein horizontaler Overflow bei 390px', mobileState.overflow, results);
      check('H (' + type + '): Speichern-Button ist sichtbar/erreichbar bei 390px', mobileState.saveBtnVisible, results);
      await page.evaluate(() => { document.getElementById('kkCentralEditorClose').click(); });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });

    // --- Test I: Regression (Kartenpolicy bleibt korrekt) ---
    const mapPolicy = await page.evaluate((ids) => ({
      inv: window.KK_OBJECTS.getObjectPolicy('inventory').showOnMap,
      mkt: window.KK_OBJECTS.getObjectPolicy('market').showOnMap,
      res: window.KK_OBJECTS.getObjectPolicy('research').showOnMap
    }), savedIds);
    check('I (Regression): showOnMap-Policy unverändert korrekt (nur inventory=true)', mapPolicy.inv === true && mapPolicy.mkt === false && mapPolicy.res === false, results);

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
