/**
 * Amtlicher-Geodienst-Capabilities-Proxy (Master-PRD Band 3/5, Anhang A1/A8).
 *
 * Warum ein Proxy statt direktem Client-Aufruf:
 * - GetCapabilities ist ein XML-fetch() aus dem Browser heraus und unterliegt CORS;
 *   die Hessischen WMS-Dienste senden keine CORS-Freigabe fuer beliebige Origins.
 * - SSRF-Schutz (Band 5 Punkt 8): NUR die unten explizit gelisteten, offiziellen
 *   Hessen-Endpunkte sind erreichbar. Der Client kann KEINE beliebige URL uebergeben,
 *   nur einen der festen "service"-Schluessel.
 *
 * Warum Layernamen hier NICHT hartcodiert werden (Master-PRD: "keine erfundenen
 * Layernamen"): Diese Function liest die ECHTE, live vom Hessen-Server gelieferte
 * GetCapabilities-Antwort aus und gibt die dort tatsaechlich enthaltenen Layer
 * (Name/Titel/queryable) zurueck. Der Client waehlt daraus selbst den passenden
 * Bodenrichtwert-/Flurstuecks-Layer, statt dass hier ein moeglicherweise falscher
 * oder veralteter Layername geraten wird.
 *
 * Status dieser Function zum Zeitpunkt der Implementierung: Der Code wurde in einer
 * Sandbox ohne jeglichen ausgehenden Internetzugriff geschrieben (verifiziert per
 * curl/WebFetch-Kontrolltest gegen mehrere unabhaengige Hosts, siehe ADR-0002).
 * Ob die unten genannten URLs/Layer tatsaechlich wie erwartet antworten, konnte
 * daher NICHT von hier aus live verifiziert werden - das kann erst nach einem
 * echten Netlify-Deploy geschehen (Netlify-Server haben normalen Internetzugriff).
 */
'use strict';

// Nur ueber WebSearch recherchierte, aber NICHT live verifizierte offizielle
// Endpunkte (Stand: siehe ADR-0002). Vor Produktivnutzung durch den echten
// GetCapabilities-Aufruf (diese Function selbst) bestaetigen.
var SERVICES = {
  boris: {
    baseUrl: 'https://www.gds-srv.hessen.de/cgi-bin/lika-services/ogc-free-maps.ows',
    label: 'BORIS Hessen 2026 (Bodenrichtwerte)',
    licenseHint: 'Laut Metadaten des Auftraggebers: Datenlizenz Deutschland - Zero - Version 2.0. Muss am Dienst selbst (GetCapabilities-Antwort) bestaetigt werden.'
  },
  alkis: {
    baseUrl: 'https://www.geoportal.hessen.de/mapbender/php/wms.php?inspire=1&layer_id=55195&withChilds=1',
    label: 'Flurstuecke/Grundstuecke ALKIS (INSPIRE-WMS Hessen)',
    licenseHint: 'Laut Fundstelle kostenfrei nutzbar gemaess Paragraph 24 HVGG. Muss am Dienst selbst bestaetigt werden.'
  }
};

function jsonResponse(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
    body: JSON.stringify(body)
  };
}

// Sehr einfacher, abhaengigkeitsfreier XML-Layer-Extraktor. Kein vollstaendiger
// XML-Parser (bewusst keine neue npm-Abhaengigkeit fuer eine einzelne Function) -
// deckt aber die WMS-Capabilities-Grundstruktur <Layer><Name>/<Title>/queryable ab.
function extractLayers(xml) {
  var layers = [];
  var layerBlockRe = /<Layer\b([^>]*)>([\s\S]*?)<\/Layer>/gi;
  var match;
  while ((match = layerBlockRe.exec(xml)) !== null) {
    var attrs = match[1] || '';
    var body = match[2] || '';
    // Nur Blaetter (kein verschachteltes <Layer> direkt darin) zaehlen als konkrete Layer,
    // um Gruppen-/Container-Layer nicht als eigenstaendige waehlbare Ebene zu listen.
    if (/<Layer\b/i.test(body)) continue;
    var nameMatch = body.match(/<Name>([^<]*)<\/Name>/i);
    var titleMatch = body.match(/<Title>([^<]*)<\/Title>/i);
    var abstractMatch = body.match(/<Abstract>([^<]*)<\/Abstract>/i);
    var queryable = /queryable\s*=\s*"1"/i.test(attrs);
    if (nameMatch) {
      layers.push({
        name: nameMatch[1].trim(),
        title: titleMatch ? titleMatch[1].trim() : '',
        abstract: abstractMatch ? abstractMatch[1].trim() : '',
        queryable: queryable
      });
    }
  }
  return layers;
}

function extractCrs(xml) {
  var set = {};
  var re = /<(?:SRS|CRS)>([^<]*)<\/(?:SRS|CRS)>/gi;
  var m;
  while ((m = re.exec(xml)) !== null) set[m[1].trim()] = true;
  return Object.keys(set).slice(0, 30);
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') return jsonResponse(405, { error: 'method_not_allowed' });

  var service = String((event.queryStringParameters || {}).service || '').trim();
  var config = SERVICES[service];
  if (!config) {
    return jsonResponse(400, { error: 'unknown_service', allowed: Object.keys(SERVICES) });
  }

  var url = config.baseUrl + (config.baseUrl.indexOf('?') > -1 ? '&' : '?') +
    'SERVICE=WMS&VERSION=1.1.1&REQUEST=GetCapabilities';

  var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  var timeoutId = controller ? setTimeout(function () { controller.abort(); }, 12000) : null;

  try {
    var res = await fetch(url, {
      headers: { 'User-Agent': 'KeimCRMPro-GeoConnector/1.0 (' + (process.env.NOMINATIM_CONTACT || 'kontakt@example.invalid') + ')' },
      signal: controller ? controller.signal : undefined
    });
    if (timeoutId) clearTimeout(timeoutId);

    if (!res.ok) {
      return jsonResponse(502, {
        error: 'upstream_error', status: res.status, service: service, url: url,
        message: 'Amtlicher Dienst antwortete mit Status ' + res.status + '.'
      });
    }
    var xml = await res.text();
    var layers = extractLayers(xml);
    var crs = extractCrs(xml);

    return jsonResponse(200, {
      service: service, label: config.label, licenseHint: config.licenseHint,
      baseUrl: config.baseUrl, capabilitiesUrl: url,
      layers: layers, crsAvailable: crs,
      layerCount: layers.length, fetchedAt: new Date().toISOString(),
      status: layers.length ? 'live' : 'live_no_layers_found'
    });
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    var isAbort = err && err.name === 'AbortError';
    return jsonResponse(502, {
      error: isAbort ? 'upstream_timeout' : 'upstream_unreachable',
      service: service, url: url,
      message: String(err && err.message || err),
      status: 'blocked_or_unreachable'
    });
  }
};
