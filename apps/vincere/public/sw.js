const CACHE_VERSION = 'vincere-static-v1';
const TEMP_CACHE_PREFIX = 'vincere-temp-';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/vincere-192.svg',
  '/icons/vincere-512.svg',
  '/icons/vincere-maskable.svg',
];

const PRIVATE_PATH_PREFIXES = [
  '/api/',
  '/auth/',
  '/auth/v1/',
  '/rest/v1/',
  '/realtime/v1/',
  '/functions/v1/',
  '/storage/v1/',
  '/.netlify/functions/',
];

function isPrivateRequest(request, url) {
  if (PRIVATE_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return true;
  return request.headers.has('authorization')
    || request.headers.has('apikey')
    || request.headers.has('x-client-info');
}

function isCacheableResponse(response) {
  if (!response || !response.ok || response.type === 'opaque') return false;
  const cacheControl = response.headers.get('cache-control') ?? '';
  const contentType = response.headers.get('content-type') ?? '';
  return !/private|no-store/i.test(cacheControl)
    && !contentType.includes('application/json');
}

async function cacheStaticResponse(request, response) {
  if (!isCacheableResponse(response)) return response;
  const cache = await caches.open(CACHE_VERSION);
  await cache.put(request, response.clone());
  return response;
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    return cacheStaticResponse(request, response);
  } catch {
    const cache = await caches.open(CACHE_VERSION);
    return (await cache.match('/index.html')) ?? Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => cacheStaticResponse(request, response))
    .catch(() => undefined);
  return cached ?? (await network) ?? Response.error();
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith('vincere-static-') && key !== CACHE_VERSION)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isPrivateRequest(request, url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (['script', 'style', 'image', 'font', 'manifest'].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (event.data?.type === 'CLEAR_TEMPORARY_STATE') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys
        .filter((key) => key.startsWith(TEMP_CACHE_PREFIX))
        .map((key) => caches.delete(key)))),
    );
  }
});
