// Stone Expert Offline & Instant-Navigation Service Worker (v4)
const CACHE_VERSION = 'v4';
const SHELL_CACHE = `stone-expert-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `stone-expert-static-${CACHE_VERSION}`;
const IMAGE_CACHE = `stone-expert-images-${CACHE_VERSION}`;
const PAGE_CACHE = `stone-expert-pages-${CACHE_VERSION}`;

const APP_SHELL_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/logo.svg',
];

const BYPASS_PREFIXES = [
  '/api/live-ws',
  '/api/admin-live-ws',
  '/api/admin-ai',
  '/dashboard',
  '/admin',
  '/representative',
  '/supplier',
  '/_next/webpack-hmr',
  '/_aistudio',
];

const BYPASS_HOSTS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebase.googleapis.com',
  'firebaseinstallations.googleapis.com',
  'generativelanguage.googleapis.com',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) =>
        Promise.allSettled(
          APP_SHELL_ASSETS.map((url) =>
            cache.add(new Request(url, { cache: 'reload' })).catch(() => null)
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const validCaches = new Set([SHELL_CACHE, STATIC_CACHE, IMAGE_CACHE, PAGE_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !validCaches.has(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (data.type === 'WARM_URLS' && Array.isArray(data.urls)) {
    const urls = data.urls.slice(0, 24).filter((u) => typeof u === 'string');
    event.waitUntil(
      caches.open(IMAGE_CACHE).then((cache) =>
        Promise.allSettled(
          urls.map(async (url) => {
            try {
              const existing = await cache.match(url);
              if (!existing) {
                const res = await fetch(url);
                if (res && res.ok) {
                  await cache.put(url, res);
                }
              }
            } catch {
              // Ignore single asset failure during background warmup
            }
          })
        )
      )
    );
  }
});

function isDevEnvironmentHost(url) {
  const host = (url.hostname || '').toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host.startsWith('ais-dev-');
}

function shouldBypass(request, url) {
  if (request.method !== 'GET') return true;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return true;
  if (BYPASS_HOSTS.some((host) => url.hostname.endsWith(host))) return true;
  if (url.origin === self.location.origin) {
    if (BYPASS_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return true;
    // Never cache admin/dashboard mutations or auth API calls
    if (url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/stone-image/')) {
      return true;
    }
  }
  return false;
}

function isImageRequest(request, url) {
  if (request.destination === 'image') return true;
  if (url.pathname.startsWith('/api/stone-image/')) return true;
  if (url.hostname === 'images.unsplash.com' || url.hostname === 'picsum.photos') return true;
  return /\.(png|jpe?g|webp|avif|svg|ico)(\?.*)?$/i.test(url.pathname);
}

function isStaticAssetRequest(request, url) {
  if (url.origin === self.location.origin && url.pathname.startsWith('/_next/static/')) {
    return true;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    return true;
  }
  if (request.destination === 'script' || request.destination === 'style' || request.destination === 'font') {
    return true;
  }
  return false;
}

function isUnexpectedHtmlForAsset(request, url, response) {
  if (!response) return false;
  const contentType = (response.headers?.get('content-type') || '').toLowerCase();
  if (!contentType.includes('text/html')) return false;
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    /\.(js|mjs|css)(\?.*)?$/i.test(url.pathname) ||
    url.pathname.startsWith('/_next/static/')
  ) {
    return true;
  }
  return false;
}

async function cacheFirstWithBackgroundRefresh(request, url, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached && isUnexpectedHtmlForAsset(request, url, cached)) {
    await cache.delete(request).catch(() => {});
  }

  const networkPromise = fetch(request)
    .then((response) => {
      if (
        response &&
        (response.ok || response.type === 'opaque') &&
        !isUnexpectedHtmlForAsset(request, url, response)
      ) {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => null);

  if (cached && !isUnexpectedHtmlForAsset(request, url, cached)) {
    return cached;
  }
  const networkResponse = await networkPromise;
  if (networkResponse) return networkResponse;
  return Response.error();
}

async function networkFirstWithCacheFallback(request, cacheName, allowRootFallback) {
  const cache = await caches.open(cacheName);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      cache.put(request, networkResponse.clone()).catch(() => {});
    }
    return networkResponse;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (allowRootFallback) {
      const shellCache = await caches.open(SHELL_CACHE);
      const shellFallback = await shellCache.match('/');
      if (shellFallback) return shellFallback;
    }
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (shouldBypass(request, url)) return;

  // In dev/preview environments, never intercept same-origin chunks, RSC payloads, or pages
  // so fresh compilations never collide with stale SW caches (prevents Unexpected token '<').
  if (isDevEnvironmentHost(url) && url.origin === self.location.origin) {
    return;
  }

  const isRsc =
    url.searchParams.has('_rsc') ||
    request.headers.get('accept')?.includes('text/x-component') ||
    request.headers.get('rsc') === '1';

  // 1. Stone & product images, icons -> instant Cache-First with silent background refresh
  if (isImageRequest(request, url)) {
    event.respondWith(cacheFirstWithBackgroundRefresh(request, url, IMAGE_CACHE));
    return;
  }

  // 2. Production JS chunks, CSS, Fonts -> instant Cache-First (rejecting unexpected HTML)
  if (isStaticAssetRequest(request, url)) {
    event.respondWith(cacheFirstWithBackgroundRefresh(request, url, STATIC_CACHE));
    return;
  }

  // 3. Production public storefront navigations & RSC payloads -> Network-first with cached fallback
  //    Never fall back non-storefront or failed RSC requests to '/' HTML.
  if (request.mode === 'navigate' || isRsc) {
    const isPublicHtmlNav = request.mode === 'navigate' && !isRsc;
    event.respondWith(
      networkFirstWithCacheFallback(request, PAGE_CACHE, isPublicHtmlNav)
    );
  }
});
