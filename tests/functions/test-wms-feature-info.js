// Node-level unit test for netlify/functions/wms-feature-info.js's exports.handler().
// No real network access needed - global.fetch is monkey-patched per test case to
// simulate exactly the two real bugs found by an external live test (11.07.2026):
// 1. A WMS ServiceException delivered with HTTP 200 was previously treated as a
//    successful "raw_text" response instead of an error.
// 2. VERSION was hard-wired to 1.1.1; the real ALKIS service rejected that with
//    "Parameter REQUEST invalid" - the fix retries with VERSION=1.3.0/CRS/I/J and
//    swapped BBOX axis order before giving up.

const path = require('path');
const fnPath = path.resolve(__dirname, '..', '..', 'netlify/functions/wms-feature-info.js');

function check(name, cond, results) {
  results.push({ name, pass: !!cond });
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name);
}

function makeEvent(params) {
  return { httpMethod: 'GET', queryStringParameters: Object.assign({
    service: 'alkis', layer: 'CP.CadastralParcel', bbox: '8.9,50.1,9.0,50.2',
    width: '800', height: '600', x: '400', y: '300', srs: 'EPSG:4326'
  }, params) };
}

function textResponse(body, opts) {
  opts = opts || {};
  return {
    ok: opts.ok !== false,
    headers: { get: function (h) { return h.toLowerCase() === 'content-type' ? (opts.contentType || 'text/xml') : null; } },
    text: async () => body
  };
}

(async () => {
  const results = [];

  // --- Case 1: first attempt (1.1.1) returns a ServiceException with HTTP 200 -
  // must NOT be accepted as success; must fall through to VERSION=1.3.0, which
  // succeeds. Proves both fixes together (exception detection + version fallback).
  {
    delete require.cache[fnPath];
    const fn = require(fnPath);
    const calls = [];
    global.fetch = async (url) => {
      calls.push(url);
      const isV111 = /VERSION=1\.1\.1/.test(url);
      if (isV111) {
        return textResponse('<ServiceExceptionReport><ServiceException code="LayerNotDefined">Layer CP.CadastralParcel nicht abfragbar</ServiceException></ServiceExceptionReport>', { contentType: 'text/xml' });
      }
      if (/INFO_FORMAT=application%2Fjson/.test(url)) {
        return textResponse(JSON.stringify({ features: [{ properties: { gemarkung: 'Bruchköbel' } }] }), { contentType: 'application/json' });
      }
      return textResponse('', { ok: false });
    };
    const res = await fn.handler(makeEvent({}));
    const body = JSON.parse(res.body);
    console.log('Case 1 body:', JSON.stringify(body));
    check('Case 1: ServiceException on VERSION=1.1.1 is NOT returned as success (old bug)', res.statusCode === 200, results);
    check('Case 1: falls through to VERSION=1.3.0 and returns the real feature', body.wmsVersion === '1.3.0' && body.features && body.features[0] && body.features[0].gemarkung === 'Bruchköbel', results);
    check('Case 1: at least one 1.1.1 attempt and one 1.3.0 attempt were made', calls.some(u => /VERSION=1\.1\.1/.test(u)) && calls.some(u => /VERSION=1\.3\.0/.test(u)), results);
  }

  // --- Case 2: 1.1.1 succeeds immediately (this is the already-confirmed-live
  // BORIS path) - must NOT unnecessarily try 1.3.0, and must report wmsVersion. ---
  {
    delete require.cache[fnPath];
    const fn = require(fnPath);
    const calls = [];
    global.fetch = async (url) => {
      calls.push(url);
      return textResponse(JSON.stringify({ features: [{ properties: { bodenrichtwert: '285' } }] }), { contentType: 'application/json' });
    };
    const res = await fn.handler(makeEvent({ service: 'boris', layer: 'BORIS2026-Info' }));
    const body = JSON.parse(res.body);
    check('Case 2: VERSION=1.1.1 success path still works unchanged (BORIS regression check)', res.statusCode === 200 && body.wmsVersion === '1.1.1' && body.features[0].bodenrichtwert === '285', results);
    check('Case 2: does not try VERSION=1.3.0 when 1.1.1 already succeeded', !calls.some(u => /VERSION=1\.3\.0/.test(u)), results);
  }

  // --- Case 3: BOTH versions return ServiceExceptions - must report a clear,
  // honest error (not a fake success), including which versions were tried and
  // the actual exception message for diagnosis. ---
  {
    delete require.cache[fnPath];
    const fn = require(fnPath);
    global.fetch = async (url) => {
      return textResponse('<ServiceException>Parameter REQUEST invalid</ServiceException>', { contentType: 'text/xml' });
    };
    const res = await fn.handler(makeEvent({}));
    const body = JSON.parse(res.body);
    console.log('Case 3 body:', JSON.stringify(body));
    check('Case 3: both versions failing returns HTTP 502, not a fake success', res.statusCode === 502, results);
    check('Case 3: error message surfaces the actual ServiceException text (not a generic message)', /Parameter REQUEST invalid/.test(body.message), results);
    check('Case 3: triedVersions lists both 1.1.1 and 1.3.0', Array.isArray(body.triedVersions) && body.triedVersions.includes('1.1.1') && body.triedVersions.includes('1.3.0'), results);
  }

  // --- Case 4: BBOX axis order is correctly swapped for the 1.3.0/CRS attempt
  // (EPSG:4326 requires Lat/Lon order in 1.3.0 per OGC 06-042 Annex B.9), while
  // the 1.1.1 attempt keeps the original Lon/Lat order the client always sends. ---
  {
    delete require.cache[fnPath];
    const fn = require(fnPath);
    const seenBbox = {};
    global.fetch = async (url) => {
      const v = /VERSION=1\.1\.1/.test(url) ? '1.1.1' : '1.3.0';
      const m = /BBOX=([^&]+)/.exec(url);
      seenBbox[v] = decodeURIComponent(m[1]);
      return textResponse('<ServiceException>force next attempt</ServiceException>', { contentType: 'text/xml' });
    };
    await fn.handler(makeEvent({ bbox: '8.9,50.1,9.0,50.2' }));
    console.log('Case 4 seenBbox:', JSON.stringify(seenBbox));
    check('Case 4: VERSION=1.1.1 keeps original Lon/Lat BBOX order unchanged', seenBbox['1.1.1'] === '8.9,50.1,9.0,50.2', results);
    check('Case 4: VERSION=1.3.0 swaps to Lat/Lon BBOX order for EPSG:4326', seenBbox['1.3.0'] === '50.1,8.9,50.2,9', results);
  }

  delete global.fetch;
  const failed = results.filter(r => !r.pass);
  console.log('\n=== SUMMARY: ' + (results.length - failed.length) + '/' + results.length + ' checks passed ===');
  if (failed.length) console.log('FAILED:', failed.map(f => f.name));
  console.log('RESULT:', failed.length === 0 ? 'PASS' : 'FAIL');
  process.exit(failed.length ? 1 : 0);
})();
