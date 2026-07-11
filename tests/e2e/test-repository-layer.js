const { chromium } = require('playwright');
const path = require('path');

const LAUNCH_OPTS = process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {};

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

  const out = await page.evaluate(() => {
    var R = window.KK_REPO;
    window.KK_STORE.setRaw('kk_crm_objects', JSON.stringify([]));
    window.KK_STORE.setRaw('kk_crm_contacts', JSON.stringify([]));
    window.KK_STORE.setRaw('kk_referral_network_v1', JSON.stringify([]));
    window.KK_STORE.setRaw('kk_market_observations_v1', JSON.stringify([]));

    // 1) Save via repository -> must land in the SAME real storage key the rest of the app reads.
    var savedObj = R.objects.save({ address: 'Teststr. 9, Hanau', ownerName: 'Frau Test', area: 'Hanau', objectType: 'Haus' });
    var rawObjects = window.KK_UTIL.readJSON('kk_crm_objects', []);

    // 2) Save an existing CRM-object via the LEGACY path (not through KK_REPO) and confirm
    //    KK_REPO.objects.list() sees it too - proves it's the SAME underlying source of truth,
    //    not a second parallel store.
    var legacyObj = { id: 'legacy_1', address: 'Altweg 2, Maintal', area: 'Maintal', objectType: 'Wohnung', createdAt: new Date().toISOString() };
    rawObjects.push(legacyObj);
    window.KK_STORE.setRaw('kk_crm_objects', JSON.stringify(rawObjects));
    var listAfterLegacyWrite = R.objects.list();

    // 3) get()/remove()
    var fetched = R.objects.get(savedObj.id);
    R.objects.remove(savedObj.id);
    var listAfterRemove = R.objects.list();

    // 4) Referrals repository delegates to KK_REFERRAL_NETWORK_V1 (real dedup/normalize logic),
    //    not a second write path.
    var savedRef = R.referrals.save({ name: 'Repo-Test Handwerker', category: 'Handwerker', ort: 'Hanau' });
    var refStore = window.KK_UTIL.readJSON('kk_referral_network_v1', { items: [] });
    var refItems = Array.isArray(refStore) ? refStore : refStore.items;

    // 5) MarketObservations repository delegates to KK_MARKET_OBS.
    var savedObs = R.marketObservations.save(Object.assign(window.KK_MARKET_OBS.emptyObservation(), {
      propertyType: 'EFH', price: 300000, livingArea: 120, location: { city: 'Hanau', district: 'Kesselstadt' }
    }));
    var obsCount = R.marketObservations.count();

    // 6) Valuations sub-repo is explicitly "computed", not persisted.
    var valInfo = R.valuations.backend;
    var valResult = R.valuations.computeForObject({ objectType: 'Haus', livingArea: 120, district: 'Kesselstadt', area: 'Hanau' });

    var info = R.info();

    return {
      version: R.version,
      savedObjId: savedObj.id, savedObjInRaw: rawObjects.some(function (o) { return o.id === savedObj.id }),
      listAfterLegacyWriteHasLegacy: listAfterLegacyWrite.some(function (o) { return o.id === 'legacy_1' }),
      fetchedMatches: fetched && fetched.id === savedObj.id,
      listAfterRemoveExcludesRemoved: !listAfterRemove.some(function (o) { return o.id === savedObj.id }),
      savedRefName: savedRef && savedRef.name, refItemsHasIt: refItems.some(function (r) { return r.name === 'Repo-Test Handwerker' }),
      savedObsId: savedObs && savedObs.id, obsCount: obsCount,
      valuationsBackend: valInfo, valuationsStatus: valResult.status,
      objectsBackend: R.objects.backend, referralsBackend: R.referrals.backend,
      info: info
    };
  });
  console.log('Repo test output:', JSON.stringify(out, null, 1));

  check('KK_REPO registered version 1.0', out.version === '1.0', results);
  check('objects.save() writes into the real kk_crm_objects storage (same source of truth)', out.savedObjInRaw, results);
  check('objects.list() sees records written by the LEGACY direct-storage path too (no second store)', out.listAfterLegacyWriteHasLegacy, results);
  check('objects.get() returns the saved entity', out.fetchedMatches, results);
  check('objects.remove() actually removes from the real storage', out.listAfterRemoveExcludesRemoved, results);
  check('referrals.save() delegates to KK_REFERRAL_NETWORK_V1 (real normalize/dedupe logic ran)', out.savedRefName === 'Repo-Test Handwerker' && out.refItemsHasIt, results);
  check('marketObservations.save() delegates to KK_MARKET_OBS', !!out.savedObsId && out.obsCount === 1, results);
  check('valuations sub-repo is explicitly "computed" (never persisted/cached)', out.valuationsBackend === 'computed' && out.valuationsStatus === 'estimated' || out.valuationsStatus === 'insufficient_data', results);
  check('objects/referrals report backend:"localStorage" honestly (not fake "api")', out.objectsBackend === 'localStorage' && out.referralsBackend === 'localStorage', results);
  check('info() names the real target backend (PostgreSQL/PostGIS via ADR-0001) and honest migration status', /PostgreSQL/.test(out.info.targetBackend) && /noch NICHT/.test(out.info.migrationStatus), results);

  check('no page errors', pageErrors.length === 0, results);

  const failed = results.filter(r => !r.pass);
  console.log('\n=== SUMMARY: ' + (results.length - failed.length) + '/' + results.length + ' checks passed ===');
  if (failed.length) console.log('FAILED:', failed.map(f => f.name));
  console.log('RESULT:', failed.length === 0 ? 'PASS' : 'FAIL');
  await browser.close();
})();
