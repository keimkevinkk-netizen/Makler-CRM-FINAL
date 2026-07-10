/**
 * Geocoding-Proxy fuer Keim CRM Pro (V31 Marktmonitor-Rebuild).
 *
 * Warum eine eigene Function statt eines direkten Client-Aufrufs:
 * - Nominatims Nutzungsrichtlinie (https://operations.osmfoundation.org/policies/nominatim/)
 *   verlangt einen aussagekraeftigen User-Agent/Referer und max. 1 Anfrage/Sekunde fuer die
 *   GESAMTE Anwendung - das laesst sich aus verteilten Client-Tabs heraus nicht zuverlaessig
 *   einhalten, serverseitig schon (throttleGuard unten).
 * - Der Client geocodiert jede Adresse nur EIN EINZIGES MAL (siehe KK_GEO_MAP.geocodeIfNeeded
 *   im Frontend) und speichert das Ergebnis dauerhaft im Datensatz - diese Function wird also
 *   pro Adresse in der Praxis hoechstens einmal aufgerufen, nicht bei jedem Kartenaufruf.
 *
 * WICHTIG fuer den Betreiber: Nominatims Richtlinie verlangt eine ECHTE Kontaktmoeglichkeit
 * im User-Agent (E-Mail oder Projekt-URL). Bitte NOMINATIM_CONTACT als Netlify-Environment-
 * Variable setzen (z.B. eine Kontakt-E-Mail), sonst wird ein Platzhalter verwendet, der bei
 * hoeherem Anfragevolumen zu einer Sperrung durch OpenStreetMap fuehren kann.
 */
'use strict';

var NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
var MIN_INTERVAL_MS = 1100; // Nominatim: max. 1 Anfrage/Sekunde fuer die gesamte App
var lastRequestAt = 0;

function buildUserAgent() {
  var contact = process.env.NOMINATIM_CONTACT || 'bitte-NOMINATIM_CONTACT-env-var-setzen@example.invalid';
  return 'KeimCRMPro-Geocoder/1.0 (' + contact + ')';
}

function throttleGuard() {
  var now = Date.now();
  var wait = Math.max(0, MIN_INTERVAL_MS - (now - lastRequestAt));
  lastRequestAt = now + wait;
  return new Promise(function (resolve) { setTimeout(resolve, wait); });
}

function buildQuery(params) {
  var parts = [];
  if (params.street) parts.push(params.street + (params.houseNumber ? ' ' + params.houseNumber : ''));
  if (params.postalCode) parts.push(params.postalCode);
  if (params.city) parts.push(params.city);
  parts.push(params.country || 'Deutschland');
  return parts.filter(Boolean).join(', ');
}

function jsonResponse(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body)
  };
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'method_not_allowed' });
  }

  var qp = event.queryStringParameters || {};
  var street = String(qp.street || '').trim();
  var houseNumber = String(qp.houseNumber || '').trim();
  var postalCode = String(qp.postalCode || '').trim();
  var city = String(qp.city || '').trim();
  var country = String(qp.country || 'Deutschland').trim();

  // Mindestangabe: entweder Strasse+Ort oder PLZ+Ort - sonst kein sinnvoller Geocoding-Versuch.
  if (!city || (!street && !postalCode)) {
    return jsonResponse(400, { error: 'insufficient_address', message: 'Mindestens Ort und (Straße oder PLZ) erforderlich.' });
  }

  var query = buildQuery({ street: street, houseNumber: houseNumber, postalCode: postalCode, city: city, country: country });
  var url = NOMINATIM_URL + '?format=jsonv2&addressdetails=1&limit=3&countrycodes=de&q=' + encodeURIComponent(query);

  await throttleGuard();

  var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  var timeoutId = controller ? setTimeout(function () { controller.abort(); }, 8000) : null;

  try {
    var res = await fetch(url, {
      headers: { 'User-Agent': buildUserAgent(), 'Accept-Language': 'de' },
      signal: controller ? controller.signal : undefined
    });
    if (timeoutId) clearTimeout(timeoutId);

    if (!res.ok) {
      return jsonResponse(502, { error: 'upstream_error', status: res.status, message: 'Nominatim antwortete mit Status ' + res.status + '.' });
    }
    var data = await res.json();
    if (!Array.isArray(data)) {
      return jsonResponse(502, { error: 'upstream_unexpected_shape' });
    }

    var results = data.slice(0, 3).map(function (r) {
      return {
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        displayName: r.display_name || '',
        // Nominatim liefert selbst keine standardisierte Genauigkeitsangabe -
        // grobe Ableitung ueber den zurueckgegebenen OSM-Typ, ehrlich als
        // Schaetzung gekennzeichnet, keine amtliche Vermessung.
        precisionHint: (r.addresstype === 'house' || r.class === 'building') ? 'street' : 'city',
        osmType: r.osm_type || '', osmClass: r.class || '', osmType2: r.type || ''
      };
    });

    return jsonResponse(200, {
      query: query, results: results, source: 'nominatim', fetchedAt: new Date().toISOString()
    });
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    var isAbort = err && (err.name === 'AbortError');
    return jsonResponse(502, { error: isAbort ? 'upstream_timeout' : 'upstream_unreachable', message: String(err && err.message || err) });
  }
};
