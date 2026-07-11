const { chromium } = require('playwright');
const path = require('path');

const LAUNCH_OPTS = Object.assign({ args: ['--no-sandbox'] }, process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {});

function check(name, cond, results) {
  results.push({ name, pass: !!cond });
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name);
  // GitHub Actions renders ::error:: lines as always-visible job annotations,
  // readable without opening the raw log viewer - the only way this failure
  // could be diagnosed without direct CI log access (see ADR/commit history).
  if (!cond) console.log('::error::FAILED CHECK: ' + name);
}

(async () => {
  try {
    const browser = await chromium.launch(LAUNCH_OPTS);
    const fileUrl = 'file://' + path.resolve(__dirname, '..', '..', 'index.html');
    const results = [];

    for (const vp of [{ w: 1440, h: 1000, label: 'desktop' }, { w: 390, h: 844, label: 'mobile' }]) {
      const context = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(e.message));

      // Mock the wms-capabilities/wms-feature-info Netlify Functions (unreachable
      // from this sandbox for real) so we can test the CLIENT-SIDE logic (panel
      // render, layer toggle, status badges, disambiguation picker, GetFeatureInfo
      // popup wiring) in isolation from the real network blocker (ADR-0002).
      //
      // BORIS mock reproduces the EXACT real-world shape from Kevin's live test
      // screenshots: 4 reference years (2020/2022/2024/2026) x 3 roles each
      // (Zonen/Label/Info) = 12 layers, none of which literally contain the word
      // "bodenrichtwert"/"brw"/"brz" - this is what made the old hint-matching
      // flag everything as ambiguous and default to "BORIS2020-Label" instead of
      // the current "BORIS2026-Zonen". Proves the zonen-role-hint + year-tie-
      // breaker fix picks the correct, current layer.
      //
      // ALKIS mock deliberately returns THREE plausible layers (CadastralParcel /
      // CadastralBoundary / CadastralZoning), exactly the real-world shape that
      // caused Kevin's live bug report ("verbindet sich, findet aber keinen
      // passenden Layer") - proves the client-side scoring picks the correct one
      // (or offers a picker) instead of the old "first match wins" behaviour.
      await page.route('**/.netlify/functions/wms-capabilities**', (route) => {
        const url = new URL(route.request().url());
        const service = url.searchParams.get('service');
        if (service === 'boris') {
          // Reproduces the REAL live-test finding (external technical review, 11.07.2026):
          // the "-Zonen" role (the visualization layer we pick for the overlay) is NOT
          // queryable on the real BORIS service; only "-Info" is queryable. Before the
          // overlay/query-layer separation fix, the client sent GetFeatureInfo requests
          // against the non-queryable "-Zonen" layer, which the real server rejects with
          // "LayerNotDefined". queryable is false for Zonen/Label, true only for Info.
          const years = ['2020', '2022', '2024', '2026'];
          const roles = ['Zonen', 'Label', 'Info'];
          const layers = [];
          years.forEach((y) => roles.forEach((r) => layers.push({ name: `BORIS${y}-${r}`, title: `BORIS${y}-${r}`, abstract: '', queryable: r === 'Info', hasChildren: false })));
          route.fulfill({
            status: 200, contentType: 'application/json',
            body: JSON.stringify({
              service: 'boris', label: 'BORIS Hessen 2026 (Bodenrichtwerte)',
              baseUrl: 'https://www.gds-srv.hessen.de/cgi-bin/lika-services/ogc-free-maps.ows',
              licenseHint: 'Datenlizenz Deutschland - Zero - Version 2.0',
              layers, layerCount: layers.length, fetchedAt: new Date().toISOString(), status: 'live'
            })
          });
        } else {
          route.fulfill({
            status: 200, contentType: 'application/json',
            body: JSON.stringify({
              service: 'alkis', label: 'Flurstuecke / ALKIS (INSPIRE-WMS Hessen)',
              baseUrl: 'https://www.geoportal.hessen.de/mapbender/php/wms.php?inspire=1&layer_id=55195',
              licenseHint: 'Kostenfrei laut Paragraph 24 HVGG',
              layers: [
                { name: 'CP.CadastralParcel', title: 'Flurstücke', abstract: 'Amtliche Flurstuecksgeometrien', queryable: true, hasChildren: false },
                { name: 'CP.CadastralBoundary', title: 'Flurstücksgrenzen', abstract: '', queryable: true, hasChildren: false },
                { name: 'CP.CadastralZoning', title: 'Gemarkungen und Fluren', abstract: '', queryable: false, hasChildren: false }
              ],
              layerCount: 3, fetchedAt: new Date().toISOString(), status: 'live'
            })
          });
        }
      });
      // Deliberately strict: only returns real features if the client sent the
      // ACTUAL queryable layer, not just any layer name. This is what proves the
      // overlay/query-layer separation fix works end-to-end - before the fix, the
      // client sent "BORIS2026-Zonen" (non-queryable) here and would have gotten
      // this mock's "wrong layer" branch (simulating the real "LayerNotDefined").
      await page.route('**/.netlify/functions/wms-feature-info**', (route) => {
        const url = new URL(route.request().url());
        const service = url.searchParams.get('service');
        const layer = url.searchParams.get('layer');
        if (service === 'alkis' && (layer === 'CP.CadastralParcel' || layer === 'flurstuecke_neu')) {
          route.fulfill({
            status: 200, contentType: 'application/json',
            body: JSON.stringify({
              service: 'alkis', layer, infoFormat: 'application/json', parseMethod: 'json',
              features: [{ gemarkung: 'Bruchköbel', flur: '12', flurstuecksnummer: '345/2', amtliche_flaeche: '842', eigentuemer_name: 'SOLLTE NIE ANGEZEIGT WERDEN' }],
              fetchedAt: new Date().toISOString()
            })
          });
        } else if (service === 'boris' && layer === 'BORIS2026-Info') {
          route.fulfill({
            status: 200, contentType: 'application/json',
            body: JSON.stringify({
              service: 'boris', layer, infoFormat: 'application/json', parseMethod: 'json',
              features: [{ bodenrichtwert: '285', stichtag: '01.01.2026', nutzung: 'Wohnbaufläche', entwicklungszustand: 'Baureifes Land' }],
              fetchedAt: new Date().toISOString()
            })
          });
        } else {
          // Simulates the real "LayerNotDefined" ServiceException a non-queryable
          // layer produces - proves the popup would have shown this instead of data
          // if the overlay/query-layer separation fix were not in place.
          route.fulfill({
            status: 502, contentType: 'application/json',
            body: JSON.stringify({ error: 'no_feature_info_format_worked', service, layer, message: 'Der Dienst meldete einen Fehler: Layer "' + layer + '" is not queryable (LayerNotDefined)' })
          });
        }
      });

      await page.goto(fileUrl, { waitUntil: 'load', timeout: 60000 });
      await page.waitForTimeout(500);
      await page.evaluate(() => { try { localStorage.removeItem('kk_official_gis_capabilities_cache_v2'); } catch (e) {} });
      await page.evaluate(() => { if (window.KK_APP_SHELL) window.KK_APP_SHELL.setActiveTab('marktmonitor'); });
      await page.waitForTimeout(1200);

      const panelExists = await page.evaluate(() => ({
        panel: !!document.getElementById('kkofficial-panel'),
        grid: !!document.getElementById('kkofficial-layer-grid'),
        rows: document.querySelectorAll('#kkofficial-layer-grid [data-kkofficial-layer]').length,
        status: !!document.getElementById('kkofficial-status')
      }));
      check(vp.label + ': "Amtliche Layer" panel exists with 2 toggle rows (BORIS + ALKIS)', panelExists.panel && panelExists.grid && panelExists.rows === 2 && panelExists.status, results);

      const apiExists = await page.evaluate(() => !!(window.KK_OFFICIAL_GIS && window.KK_OFFICIAL_GIS.version === '1.0'));
      check(vp.label + ': window.KK_OFFICIAL_GIS is registered', apiExists, results);

      const leafletAvailable = await page.evaluate(() => typeof window.L !== 'undefined');
      console.log(vp.label + ': Leaflet loaded in this sandbox:', leafletAvailable);
      if (leafletAvailable) {
        const adapterShared = await page.evaluate(() => {
          var a = window.KK_REALMAP && window.KK_REALMAP.getAdapter ? window.KK_REALMAP.getAdapter() : null;
          return !!(a && typeof a.setOfficialOverlay === 'function' && typeof a.getFeatureInfoParams === 'function');
        });
        check(vp.label + ': MapAdapter exposes setOfficialOverlay/getFeatureInfoParams (single shared map, no second engine)', adapterShared, results);
      } else {
        console.log(vp.label + ': SKIP adapter-dependent checks (Leaflet CDN blocked in this sandbox, see ADR-0002)');
      }

      // --- BORIS: single unambiguous layer, should auto-select as before ---
      await page.click('[data-kkofficial-layer="boris"]');
      await page.waitForTimeout(600);
      const borisState = await page.evaluate(() => window.KK_OFFICIAL_GIS.getState().boris);
      console.log(vp.label + ' boris state after toggle:', JSON.stringify(borisState));
      check(vp.label + ': BORIS discovery picks "BORIS2026-Zonen" specifically out of 12 year/role combinations (the exact bug Kevin hit live - it previously defaulted to "BORIS2020-Label")', borisState.layerName === 'BORIS2026-Zonen', results);
      check(vp.label + ': BORIS status becomes "live" after successful discovery', borisState.status === 'live', results);
      check(vp.label + ': BORIS is NOT flagged ambiguous despite 12 similarly-named layers (zonen-role-hint + year-tie-breaker resolve it confidently)', borisState.ambiguous === false, results);
      check(vp.label + ': BORIS overlay layer ("-Zonen") is non-queryable, so a SEPARATE queryLayerName ("BORIS2026-Info") is picked for GetFeatureInfo (real live-test bug fix)', borisState.queryLayerName === 'BORIS2026-Info' && borisState.queryLayerName !== borisState.layerName, results);

      if (leafletAvailable) {
        const borisOverlayAdded = await page.evaluate(() => window.KK_REALMAP.getAdapter().hasOfficialOverlay('boris'));
        check(vp.label + ': BORIS WMS overlay actually added to the shared Leaflet map', borisOverlayAdded, results);
      }

      const statusHtml = await page.evaluate(() => document.getElementById('kkofficial-status').innerHTML);
      check(vp.label + ': status line shows license hint text', /Datenlizenz Deutschland/.test(statusHtml), results);
      check(vp.label + ': status line shows "Live verbunden" badge', /Live verbunden/.test(statusHtml), results);

      // --- ALKIS: THREE plausible layers -> must pick CP.CadastralParcel (the real
      // Flurstueck layer), not CadastralBoundary/CadastralZoning, and must NOT be
      // stuck at "kein passender Layer gefunden" (Kevin's exact bug report). ---
      await page.click('[data-kkofficial-layer="alkis"]');
      await page.waitForTimeout(600);
      const alkisState = await page.evaluate(() => window.KK_OFFICIAL_GIS.getState().alkis);
      console.log(vp.label + ' alkis state after toggle (3 candidate layers):', JSON.stringify(alkisState));
      check(vp.label + ': ALKIS status is "live" (bug fixed - no longer "kein passender Layer gefunden")', alkisState.status === 'live', results);
      check(vp.label + ': ALKIS auto-selects CP.CadastralParcel specifically (not Boundary/Zoning)', alkisState.layerName === 'CP.CadastralParcel', results);
      check(vp.label + ': ALKIS overlay layer is itself queryable, so queryLayerName equals layerName (no separate query layer needed)', alkisState.queryLayerName === 'CP.CadastralParcel', results);

      if (leafletAvailable) {
        const alkisOverlayAdded = await page.evaluate(() => window.KK_REALMAP.getAdapter().hasOfficialOverlay('alkis'));
        check(vp.label + ': ALKIS WMS overlay actually added to the shared Leaflet map', alkisOverlayAdded, results);
      }

      // --- Disambiguation UI: force an intentionally ambiguous scenario (two
      // equally-scored parcel-ish layers) and verify the picker appears and a
      // manual selection is honoured, per "Nutzer soll keine Layernamen kennen
      // muessen" (picker must show human Titles, not raw Name codes). ---
      // Simulate ambiguity by re-routing ALKIS capabilities to two near-tied "parcel"-ish layers.
      // Must also clear the discovery cache first, otherwise the previous (unambiguous)
      // CP.CadastralParcel result from moments ago would just be replayed from cache.
      await page.evaluate(() => { try { localStorage.removeItem('kk_official_gis_capabilities_cache_v2'); } catch (e) {} });
      await page.unroute('**/.netlify/functions/wms-capabilities**');
      await page.route('**/.netlify/functions/wms-capabilities**', (route) => {
        const url = new URL(route.request().url());
        const service = url.searchParams.get('service');
        if (service === 'alkis') {
          route.fulfill({
            status: 200, contentType: 'application/json',
            body: JSON.stringify({
              service: 'alkis', label: 'Flurstuecke / ALKIS (INSPIRE-WMS Hessen)',
              baseUrl: 'https://www.geoportal.hessen.de/mapbender/php/wms.php?inspire=1&layer_id=55195',
              licenseHint: 'Kostenfrei laut Paragraph 24 HVGG',
              layers: [
                { name: 'flurstuecke_alt', title: 'Flurstücke (Bestand alt)', abstract: '', queryable: true, hasChildren: false },
                { name: 'flurstuecke_neu', title: 'Flurstücke (Bestand aktuell)', abstract: '', queryable: true, hasChildren: false }
              ],
              layerCount: 2, fetchedAt: new Date().toISOString(), status: 'live'
            })
          });
        } else {
          route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ service: 'boris', layers: [{ name: 'he_boris_brwzonen', title: 'Bodenrichtwertzonen', queryable: true, hasChildren: false }], layerCount: 1, fetchedAt: new Date().toISOString(), status: 'live', baseUrl: 'x', licenseHint: 'x' }) });
        }
      });
      await page.click('[data-kkofficial-layer="alkis"]'); // off
      await page.waitForTimeout(200);
      await page.click('[data-kkofficial-layer="alkis"]'); // on again -> cache was cleared above, forces a real (mocked) re-fetch
      await page.waitForTimeout(700);
      const ambiguousState = await page.evaluate(() => window.KK_OFFICIAL_GIS.getState().alkis);
      console.log(vp.label + ' alkis state with two near-tied candidates:', JSON.stringify(ambiguousState));
      check(vp.label + ': two near-tied plausible layers are flagged ambiguous instead of silently guessing', ambiguousState.ambiguous === true && ambiguousState.candidates.length === 2, results);
      const pickerHtml = await page.evaluate(() => document.getElementById('kkofficial-status').innerHTML);
      check(vp.label + ': ambiguity picker shows human-readable Titles ("Flurstücke (Bestand...)"), not raw layer codes', /Flurstücke \(Bestand/.test(pickerHtml) && !/flurstuecke_alt</.test(pickerHtml), results);
      check(vp.label + ': picker offers a select + confirm control', await page.evaluate(() => !!document.querySelector('[data-kkofficial-picker="alkis"]') && !!document.querySelector('[data-kkofficial-confirm="alkis"]')), results);

      // Manually confirm the picker -> ambiguity resolves, layer applied.
      await page.selectOption('[data-kkofficial-picker="alkis"]', 'flurstuecke_neu');
      await page.click('[data-kkofficial-confirm="alkis"]');
      await page.waitForTimeout(300);
      const resolvedState = await page.evaluate(() => window.KK_OFFICIAL_GIS.getState().alkis);
      check(vp.label + ': manual picker confirmation resolves ambiguity and sets the chosen layer', resolvedState.ambiguous === false && resolvedState.layerName === 'flurstuecke_neu', results);
      check(vp.label + ': manual picker confirmation also derives the correct queryLayerName (queryable itself, so equals layerName)', resolvedState.queryLayerName === 'flurstuecke_neu', results);

      // --- GetFeatureInfo popup: friendly field labels + owner-field exclusion ---
      if (leafletAvailable) {
        const mapBox = await page.locator('#kkgeo-map').boundingBox();
        if (mapBox) {
          await page.mouse.click(mapBox.x + mapBox.width / 2, mapBox.y + mapBox.height / 2);
          await page.waitForTimeout(700);
          const detailHtml = await page.evaluate(() => document.getElementById('kkgeo-detail-panel').innerHTML);
          console.log(vp.label + ' detail panel after map click (BORIS+ALKIS both active):', detailHtml.replace(/\s+/g, ' ').slice(0, 800));
          check(vp.label + ': ALKIS popup shows friendly "Gemarkung" label (not raw "gemarkung" key)', /Gemarkung/.test(detailHtml), results);
          check(vp.label + ': ALKIS popup shows friendly "Flurstücksnummer" label', /Flurstücksnummer/.test(detailHtml), results);
          check(vp.label + ': ALKIS popup shows friendly "Amtliche Fläche" label', /Amtliche Fläche/.test(detailHtml), results);
          check(vp.label + ': ALKIS popup NEVER shows owner/Eigentümer data even if a service returned it', !/SOLLTE NIE ANGEZEIGT WERDEN/.test(detailHtml) && !/eigentuemer_name/i.test(detailHtml), results);
          check(vp.label + ': BORIS popup shows friendly "Bodenrichtwert (€/m²)" and "Entwicklungszustand" labels', /Bodenrichtwert/.test(detailHtml) && /Entwicklungszustand/.test(detailHtml), results);
        } else {
          check(vp.label + ': map bounding box found for click test', false, results);
        }
      } else {
        const manualFetch = await page.evaluate(async () => {
          var qs = new URLSearchParams({ service: 'alkis', layer: 'flurstuecke_neu', bbox: '8.9,50.1,9.0,50.2', width: '800', height: '600', x: '400', y: '300', srs: 'EPSG:4326' });
          var res = await fetch('/.netlify/functions/wms-feature-info?' + qs.toString());
          return await res.json();
        });
        check(vp.label + ': ALKIS GetFeatureInfo proxy call (mocked) returns Gemarkung/Flur/Flurstücksnummer/Fläche attributes (popup rendering itself untestable, Leaflet unavailable in sandbox)', manualFetch.features && manualFetch.features[0] && manualFetch.features[0].gemarkung === 'Bruchköbel' && manualFetch.features[0].flurstuecksnummer === '345/2', results);
      }

      check(vp.label + ': no page errors so far', pageErrors.length === 0, results);
      await context.close();
    }

    const failed = results.filter(r => !r.pass);
    console.log('\n=== SUMMARY: ' + (results.length - failed.length) + '/' + results.length + ' checks passed ===');
    if (failed.length) console.log('FAILED:', failed.map(f => f.name));
    console.log('RESULT:', failed.length === 0 ? 'PASS' : 'FAIL');
    await browser.close();
  } catch (err) {
    console.error('FATAL - test crashed:', err && err.stack || err);
    console.log('::error::FATAL: ' + String(err && err.message || err));
    process.exit(1);
  }
})();
