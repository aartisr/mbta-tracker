/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

declare const self: ServiceWorkerGlobalScope;

const CACHE_PREFIX = 'mbta-tracker';
const APP_SHELL_CACHE = `${CACHE_PREFIX}:app-shell:${version}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}:runtime:${version}`;
const OFFLINE_FALLBACK = '/offline.html';
const PRECACHE_URLS = [...build, ...files];

function isSameOrigin(request: Request): boolean {
  return new URL(request.url).origin === self.location.origin;
}

function isLiveDataRequest(url: URL): boolean {
  return url.pathname.startsWith('/api/') || url.hostname === 'api-v3.mbta.com';
}

async function cacheFirst(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && isSameOrigin(request)) {
    const cache = await caches.open(RUNTIME_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

async function navigationResponse(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await caches.match(request)) ?? (await caches.match(OFFLINE_FALLBACK)) ?? Response.error();
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(`${CACHE_PREFIX}:`) && key !== APP_SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (isLiveDataRequest(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigationResponse(request));
    return;
  }

  if (isSameOrigin(request)) {
    event.respondWith(cacheFirst(request));
  }
});
