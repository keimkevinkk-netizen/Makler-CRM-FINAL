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
 *
 * FIX (nach echtem Live-Test gegen die Hessen-Dienste): zwei reale Bugs behoben.
 * 1. Der vorige Code erkannte eine WMS-ServiceException (XML-Fehlerdokument, das
 *    der Server trotzdem mit HTTP 200 liefert - das ist WMS-Standardverhalten,
 *    kein Netzwerkfehler) NICHT als Fehler, sondern gab sie als scheinbar
 *    erfolgreiches "raw_text"-Ergebnis zurueck. Jetzt wird jede Antwort zuerst
 *    auf <ServiceException> geprueft, bevor sie als Erfolg gewertet wird.
 * 2. VERSION war fest auf 1.1.1 verdrahtet. Der Live-Test zeigte, dass der
 *    ALKIS-Dienst darauf mit "Parameter REQUEST invalid" antwortet. Da ohne
 *    Live-Zugriff aus dieser Sandbox nicht ermittelbar ist, welche Version/
 *    Achsenkonvention der jeweilige Dienst tatsaechlich erwartet, probiert der
 *    Proxy jetzt beide WMS-Hauptversionen mit ihrer je EIGENEN, spezifikations-
 *    konformen Parametrisierung durch (1.1.1: SRS/X/Y, Lon/Lat-Reihenfolge;
 *    1.3.0: CRS/I/J, fuer EPSG:4326 mit vertauschter Lat/Lon-Achsenreihenfolge
 *    laut OGC-06-042-Anhang B.9), statt eine einzige geratene Kombination zu
 *    erzwingen.
 */
'use strict';

var SERVICES = {
  boris: { baseUrl: 'https://www.gds-srv.hessen.de/cgi-bin/lika-services/ogc-free-maps.ows' },
  alkis: { baseUrl: 'https://www.geoportal.hessen.de/mapbender/php/wms.php?inspire=1&layer_id=55195&withChilds=1' }
};

var INFO_FORMATS_TO_TRY = ['application/json', 'text/plain', 'application/vnd.ogc.gml'];

// Reihenfolge: 1.1.1 zuerst, weil bereits fuer BORIS live bestaetigt (siehe ADR-0002-Folgebericht).
var VERSION_PROFILES = [
  { version: '1.1.1', crsParam: 'SRS', xParam: 'X', yParam: 'Y', swapAxis: false },
  { version: '1.3.0', crsParam: 'CRS', xParam: 'I', yParam: 'J', swapAxis: true }
];

function isServiceException(text, contentType) {
  if (!text) return false;
  if (/<(?:ogc:)?ServiceException/i.test(text)) return true;
  if (contentType && /xml/i.test(contentType) && /Exception/i.test(text)) return true;
  return false;
}

function extractServiceExceptionMessage(text) {
  var m = /<(?:ogc:)?ServiceException[^>]*>([\s\S]*?)<\/(?:ogc:)?ServiceException>/i.exec(text || '');
  return (m ? m[1] : String(text || '')).trim().slice(0, 300);
}

// BBOX kommt vom Client immer als "west,south,east,north" (Lon/Lat-Reihenfolge).
// Fuer WMS 1.3.0 + EPSG:4326 verlangt die Spezifikation die vertauschte
// Achsenreihenfolge (Lat/Lon) in BBOX; 1.1.1 verlangt in jedem Fall Lon/Lat.
function bboxForProfile(bbox, swapAxis) {
  var parts = bbox.split(',').map(Number);
  if (parts.length !== 4 || parts.some(function (n) { return !isFinite(n); })) return bbox;
  if (!swapAxis) return bbox;
  var west = parts[0], south = parts[1], east = parts[2], north = parts[3];
  return [south, west, north, east].join(',');
}

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
  var timeoutId = controller ? setTimeout(function () { controller.abort(); }, 12000) : null;

  var lastServiceException = '';
  var triedVersions = [];

  for (var p = 0; p < VERSION_PROFILES.length; p++) {
    var profile = VERSION_PROFILES[p];
    var profileBbox = bboxForProfile(bbox, profile.swapAxis);
    var profileSrs = srs; // EPSG:4326 gilt fuer beide Versionen unveraendert als Code, nur die Achsreihenfolge in BBOX unterscheidet sich
    triedVersions.push(profile.version);

    var baseParams = 'SERVICE=WMS&VERSION=' + profile.version + '&REQUEST=GetFeatureInfo' +
      '&LAYERS=' + encodeURIComponent(layer) + '&QUERY_LAYERS=' + encodeURIComponent(layer) +
      '&' + profile.crsParam + '=' + encodeURIComponent(profileSrs) + '&BBOX=' + encodeURIComponent(profileBbox) +
      '&WIDTH=' + width + '&HEIGHT=' + height + '&' + profile.xParam + '=' + Math.round(x) + '&' + profile.yParam + '=' + Math.round(y) +
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

        var contentType = res.headers && typeof res.headers.get === 'function' ? res.headers.get('content-type') : '';
        if (isServiceException(text, contentType)) {
          lastServiceException = extractServiceExceptionMessage(text);
          continue; // naechstes INFO_FORMAT/Version versuchen statt eine Fehlerseite als Erfolg zu werten
        }

        if (infoFormat === 'application/json') {
          try {
            var data = JSON.parse(text);
            if (timeoutId) clearTimeout(timeoutId);
            return jsonResponse(200, {
              service: service, layer: layer, infoFormat: infoFormat, parseMethod: 'json', wmsVersion: profile.version,
              features: (data.features || []).map(function (f) { return f.properties || f; }),
              fetchedAt: new Date().toISOString()
            });
          } catch (e) { continue; }
        }
        if (infoFormat === 'application/vnd.ogc.gml' && /<[a-zA-Z]/.test(text)) {
          var fields = extractGmlFields(text);
          if (timeoutId) clearTimeout(timeoutId);
          return jsonResponse(200, {
            service: service, layer: layer, infoFormat: infoFormat, parseMethod: 'gml_best_effort', wmsVersion: profile.version,
            features: Object.keys(fields).length ? [fields] : [],
            rawLength: text.length, fetchedAt: new Date().toISOString()
          });
        }
        if (infoFormat === 'text/plain') {
          if (timeoutId) clearTimeout(timeoutId);
          return jsonResponse(200, {
            service: service, layer: layer, infoFormat: infoFormat, parseMethod: 'raw_text', wmsVersion: profile.version,
            rawText: text.slice(0, 4000), features: [], fetchedAt: new Date().toISOString()
          });
        }
      } catch (err) {
        if (err && err.name === 'AbortError') {
          if (timeoutId) clearTimeout(timeoutId);
          return jsonResponse(502, { error: 'upstream_timeout', service: service, layer: layer });
        }
        // naechstes INFO_FORMAT/Version versuchen
      }
    }
  }

  if (timeoutId) clearTimeout(timeoutId);
  return jsonResponse(502, {
    error: 'no_feature_info_format_worked', service: service, layer: layer,
    triedVersions: triedVersions,
    serviceExceptionMessage: lastServiceException || undefined,
    message: lastServiceException
      ? ('Der Dienst meldete einen Fehler: ' + lastServiceException)
      : 'Keines der versuchten INFO_FORMAT-/VERSION-Werte lieferte eine auswertbare Antwort.'
  });
};
