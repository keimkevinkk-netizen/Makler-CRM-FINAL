// Node-level unit test for netlify/functions/wms-capabilities.js's extractLayers().
// No network access needed at all - this directly reproduces the bug Kevin found
// live (ALKIS "connects but finds no matching layer") using a realistic nested
// WMS Capabilities XML fixture, the way a real INSPIRE Cadastral Parcels service
// (Theme > Group > individual layers) actually structures its Capabilities tree.

const path = require('path');
const fn = require(path.resolve(__dirname, '..', '..', 'netlify/functions/wms-capabilities.js'));

function check(name, cond, results) {
  results.push({ name, pass: !!cond });
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name);
}

const results = [];

// A realistic 3-level-deep INSPIRE-style Capabilities fragment: root group layer,
// a "Cadastral Parcels" theme group, and three individual leaf layers underneath -
// exactly the shape that broke the old flat-regex parser.
const nestedXml = `<?xml version="1.0" encoding="UTF-8"?>
<WMT_MS_Capabilities version="1.1.1">
  <Service>
    <Name>OGC:WMS</Name>
    <Title>Hessen INSPIRE Kataster WMS</Title>
  </Service>
  <Capability>
    <Layer>
      <Title>Hessen INSPIRE Kataster</Title>
      <SRS>EPSG:25832</SRS>
      <SRS>EPSG:4326</SRS>
      <Layer queryable="0">
        <Name>cp</Name>
        <Title>Cadastral Parcels (INSPIRE CP)</Title>
        <Layer queryable="1">
          <Name>CP.CadastralParcel</Name>
          <Title>Flurstücke</Title>
          <Abstract>Amtliche Flurstuecksgeometrien Hessen</Abstract>
        </Layer>
        <Layer queryable="1">
          <Name>CP.CadastralBoundary</Name>
          <Title>Flurstuecksgrenzen</Title>
        </Layer>
        <Layer queryable="0">
          <Name>CP.CadastralZoning</Name>
          <Title>Gemarkungen und Fluren</Title>
        </Layer>
      </Layer>
      <Layer queryable="1">
        <Name>hausumringe</Name>
        <Title>Hausumringe</Title>
      </Layer>
    </Layer>
  </Capability>
</WMT_MS_Capabilities>`;

const layers = fn.extractLayers(nestedXml);
console.log('Extracted layers:', JSON.stringify(layers, null, 1));

check('extracts all 5 named layers despite 3 levels of nesting (old parser found 0)', layers.length === 5, results);
check('finds the actual leaf layer "CP.CadastralParcel" (the real Flurstueck layer)', layers.some(l => l.name === 'CP.CadastralParcel'), results);
check('also captures the GROUP layer "cp" even though it has children (WMS allows named non-leaf layers, old parser wrongly excluded these)', layers.some(l => l.name === 'cp' && l.hasChildren === true), results);
check('CP.CadastralParcel is correctly marked as a leaf (hasChildren=false)', layers.find(l => l.name === 'CP.CadastralParcel').hasChildren === false, results);
check('CP.CadastralParcel carries its own Title ("Flurstücke"), not the parent group\'s title', layers.find(l => l.name === 'CP.CadastralParcel').title === 'Flurstücke', results);
check('queryable=1/0 attributes correctly parsed per layer', layers.find(l => l.name === 'CP.CadastralParcel').queryable === true && layers.find(l => l.name === 'CP.CadastralZoning').queryable === false, results);
check('sibling layer "hausumringe" outside the cp group is still found (no state leakage between branches)', layers.some(l => l.name === 'hausumringe'), results);

// A flat (non-nested) fixture - e.g. BORIS, which Kevin confirmed already works -
// must keep working after the rewrite (regression check).
const flatXml = `<Capability><Layer>
  <Layer queryable="1"><Name>he_brw_zonen</Name><Title>Bodenrichtwertzonen</Title></Layer>
</Layer></Capability>`;
const flatLayers = fn.extractLayers(flatXml);
check('flat (non-nested) Capabilities still parses correctly (BORIS regression check)', flatLayers.length === 1 && flatLayers[0].name === 'he_brw_zonen', results);

// Empty / no-layers response should not throw and should return [].
check('empty XML does not throw, returns empty array', JSON.stringify(fn.extractLayers('<Capability></Capability>')) === '[]', results);

// FIX 2 regression fixture: XML-namespace-prefixed Capabilities (<wms:Layer>,
// <wms:Name>, ...) - a very plausible real cause for the live ALKIS bug report
// ("verbunden, kein passender Layer gefunden") since INSPIRE-conformant WMS
// services are commonly generated with strict namespace-qualified output,
// unlike the simpler legacy-style BORIS service which worked immediately.
const namespacedXml = `<?xml version="1.0"?>
<wms:WMT_MS_Capabilities xmlns:wms="http://www.opengis.net/wms">
  <wms:Capability>
    <wms:Layer>
      <wms:Title>INSPIRE Kataster</wms:Title>
      <wms:Layer queryable="1">
        <wms:Name>CP.CadastralParcel</wms:Name>
        <wms:Title>Flurstücke</wms:Title>
      </wms:Layer>
    </wms:Layer>
  </wms:Capability>
</wms:WMT_MS_Capabilities>`;
const nsLayers = fn.extractLayers(namespacedXml);
console.log('Namespaced-XML extracted layers:', JSON.stringify(nsLayers));
check('namespace-prefixed Capabilities (<wms:Layer>/<wms:Name>) are parsed correctly (old version found 0 for exactly this shape)', nsLayers.length === 1 && nsLayers[0].name === 'CP.CadastralParcel' && nsLayers[0].title === 'Flurstücke', results);

// Mixed: some tags namespaced, some not (real-world documents are sometimes inconsistent).
const mixedXml = `<Capability><wms:Layer xmlns:wms="x"><Name>plain_layer</Name><wms:Title>Gemischt</wms:Title></wms:Layer></Capability>`;
const mixedLayers = fn.extractLayers(mixedXml);
check('mixed namespaced/non-namespaced tags within the same layer still parse correctly', mixedLayers.length === 1 && mixedLayers[0].name === 'plain_layer' && mixedLayers[0].title === 'Gemischt', results);

const failed = results.filter(r => !r.pass);
console.log('\n=== SUMMARY: ' + (results.length - failed.length) + '/' + results.length + ' checks passed ===');
if (failed.length) console.log('FAILED:', failed.map(f => f.name));
console.log('RESULT:', failed.length === 0 ? 'PASS' : 'FAIL');
process.exit(failed.length ? 1 : 0);
