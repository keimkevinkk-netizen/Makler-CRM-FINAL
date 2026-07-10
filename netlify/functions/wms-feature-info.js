/**
 * Amtlicher-Geodienst-GetFeatureInfo-Proxy (Master-PRD Band 3 Punkt 2.3/3.3, Anhang C9).
 *
 * GetMap-Kacheln laufen bewusst OHNE diesen Proxy direkt vom Client zum Hessen-WMS
 * (Leaflet L.tileLayer.wms() laedt <img>-Tags, kein CORS-Problem). Nur GetFeatureInfo
 * ist ein fetch()-Aufruf und braucht deshalb diesen serverseitigen Proxy.
 *
 * SSRF-Schutz: der Client uebergibt NIE eine URL, nur "service" (fester Schluessel)
 * plus Layer-/Geometrieparameter. Die Ziel-URL wird ausschliesslich hier serverseitig
 * aus der Allowlist gebaut.
 */
'use strict';

var SERVICES = {
  boris: { baseUrl: 'https://www.gds-srv.hessen.de/cgi-bin/lika-services/ogc-free-maps.ows' },
  alkis: { baseUrl: 'https://www.geoportal.hessen.de/mapbender/php/wms.php?inspire=1&layer_id=55195&withChilds=1' }
};

var INFO_FORMATS_TO_TRY = ['application/json', 'text/plain', 'application/vnd.ogc.gml'];

function jsonResponse(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body)
  };
}

// Sehr einfache, abhaengigkeitsfreie Tag/Wert-Extraktion aus einer GML-Antwort.
// Kein vollstaendiger GML-Parser - bewusst als "bestmoegliche Rohextraktion"
// gekennzeichnet (parseMethod:'gml_best_effort'), keine Scheingenauigkeit.
function extractGmlFields(xml) {
  var out = {};
  var re = /<([a-zA-Z0-9_:.-]+)>([^<]+)<\/\1>/g;
  var m;
  while ((m = re.exec(xml)) !== null) {
    var key = m[1].replace(/^[a-zA-Z0-9]+:/, '');
    var val = m[2].trim();
    if (val && !/^\s*$/.test(val)) out[key] = val;
  }
  return out;
}

function num(v) { var n = Number(v); return isFinite(n) ? n : null; }

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') return jsonResponse(405, { error: 'method_not_allowed' });

  var qp = event.queryStringParameters || {};
  var service = String(qp.service || '').trim();
  var config = SERVICES[service];
  if (!config) return jsonResponse(400, { error: 'unknown_service', allowed: Object.keys(SERVICES) });

  var layer = String(qp.layer || '').trim();
  var bbox = String(qp.bbox || '').trim();
  var width = num(qp.width), height = num(qp.height), x = num(qp.x), y = num(qp.y);
  var srs = String(qp.srs || 'EPSG:4326').trim();

  if (!layer || !bbox || !width || !height || x == null || y == null) {
    return jsonResponse(400, { error: 'missing_params', required: ['service', 'layer', 'bbox', 'width', 'height', 'x', 'y'] });
  }

  var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  var timeoutId = controller ? setTimeout(function () { controller.abort(); }, 10000) : null;

  var baseParams = 'SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo' +
    '&LAYERS=' + encodeURIComponent(layer) + '&QUERY_LAYERS=' + encodeURIComponent(layer) +
    '&SRS=' + encodeURIComponent(srs) + '&BBOX=' + encodeURIComponent(bbox) +
    '&WIDTH=' + width + '&HEIGHT=' + height + '&X=' + Math.round(x) + '&Y=' + Math.round(y) +
    '&FEATURE_COUNT=5&STYLES=';

  for (var i = 0; i < INFO_FORMATS_TO_TRY.length; i++) {
    var infoFormat = INFO_FORMATS_TO_TRY[i];
    var url = config.baseUrl + (config.baseUrl.indexOf('?') > -1 ? '&' : '?') + baseParams +
      '&INFO_FORMAT=' + encodeURIComponent(infoFormat);
    try {
      var res = await fetch(url, {
        headers: { 'User-Agent': 'KeimCRMPro-GeoConnector/1.0 (' + (process.env.NOMINATIM_CONTACT || 'kontakt@example.invalid') + ')' },
        signal: controller ? controller.signal : undefined
      });
      if (!res.ok) continue;
      var text = await res.text();
      if (!text || !text.trim()) continue;

      if (infoFormat === 'application/json') {
        try {
          var data = JSON.parse(text);
          if (timeoutId) clearTimeout(timeoutId);
          return jsonResponse(200, {
            service: service, layer: layer, infoFormat: infoFormat, parseMethod: 'json',
            features: (data.features || []).map(function (f) { return f.properties || f; }),
            fetchedAt: new Date().toISOString()
          });
        } catch (e) { continue; }
      }
      if (infoFormat === 'application/vnd.ogc.gml' && /<[a-zA-Z]/.test(text)) {
        var fields = extractGmlFields(text);
        if (timeoutId) clearTimeout(timeoutId);
        return jsonResponse(200, {
          service: service, layer: layer, infoFormat: infoFormat, parseMethod: 'gml_best_effort',
          features: Object.keys(fields).length ? [fields] : [],
          rawLength: text.length, fetchedAt: new Date().toISOString()
        });
      }
      if (infoFormat === 'text/plain') {
        if (timeoutId) clearTimeout(timeoutId);
        return jsonResponse(200, {
          service: service, layer: layer, infoFormat: infoFormat, parseMethod: 'raw_text',
          rawText: text.slice(0, 4000), features: [], fetchedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      if (err && err.name === 'AbortError') {
        if (timeoutId) clearTimeout(timeoutId);
        return jsonResponse(502, { error: 'upstream_timeout', service: service, layer: layer });
      }
      // naechstes INFO_FORMAT versuchen
    }
  }

  if (timeoutId) clearTimeout(timeoutId);
  return jsonResponse(502, {
    error: 'no_feature_info_format_worked', service: service, layer: layer,
    message: 'Keines der versuchten INFO_FORMAT-Werte lieferte eine auswertbare Antwort.'
  });
};
