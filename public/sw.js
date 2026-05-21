// NominaAPP Service Worker
// Estrategias:
// - Precache de assets críticos (index.html, manifest.json, favicon.svg, robots.txt)
// - CSS/JS bundles: network-first con fallback a cache
// - Imágenes: cache-first con expiración
// - API GET: stale-while-revalidate con TTL de 5 minutos
// - Fallback offline: /offline.html
// - Push notifications (Web Push API)
// - Listener "sync" para flush de cola offline en el cliente

const VERSION = 'v3'
const PRECACHE = `nominaapp-precache-${VERSION}`
const RUNTIME_STATIC = `nominaapp-static-${VERSION}` // CSS/JS bundles
const RUNTIME_IMAGES = `nominaapp-images-${VERSION}`
const RUNTIME_API = `nominaapp-api-${VERSION}`

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/robots.txt',
  '/offline.html',
]

const ALL_CACHES = [PRECACHE, RUNTIME_STATIC, RUNTIME_IMAGES, RUNTIME_API]

// TTLs y límites
const API_TTL_MS = 5 * 60 * 1000 // 5 minutos
const IMAGE_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 días
const IMAGE_MAX_ENTRIES = 60

// --- Install: precache crítico ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE).then((cache) =>
      // addAll falla atómicamente si uno falla; usamos add individual para tolerar
      // que algún recurso opcional (ej. robots.txt) no exista en el deploy.
      Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined),
        ),
      ),
    ),
  )
  self.skipWaiting()
})

// --- Activate: limpiar caches viejos ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !ALL_CACHES.includes(k)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

// --- Helpers ---
function isApiRequest(url) {
  // Supabase REST/RPC y endpoints propios /api/*
  return (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/rest/v1/') ||
    url.pathname.startsWith('/functions/v1/') ||
    /\.supabase\.co$/.test(url.hostname)
  )
}

function isImageRequest(request, url) {
  if (request.destination === 'image') return true
  return /\.(?:png|jpg|jpeg|gif|webp|svg|avif|ico)$/i.test(url.pathname)
}

function isStaticAssetRequest(request, url) {
  if (request.destination === 'script' || request.destination === 'style') return true
  return /\.(?:js|mjs|css)$/i.test(url.pathname)
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' || request.destination === 'document'
}

function timestamped(response) {
  // Clona la respuesta y le añade un header con el timestamp para expiración.
  const headers = new Headers(response.headers)
  headers.set('x-sw-cached-at', String(Date.now()))
  return response
    .clone()
    .blob()
    .then(
      (body) =>
        new Response(body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        }),
    )
}

function isExpired(response, ttlMs) {
  const cachedAt = Number(response.headers.get('x-sw-cached-at') || 0)
  if (!cachedAt) return false
  return Date.now() - cachedAt > ttlMs
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length <= maxEntries) return
  const excess = keys.length - maxEntries
  for (let i = 0; i < excess; i += 1) {
    await cache.delete(keys[i])
  }
}

async function offlineFallback(request) {
  if (isNavigationRequest(request)) {
    const cache = await caches.open(PRECACHE)
    const offline = await cache.match('/offline.html')
    if (offline) return offline
  }
  return new Response('', { status: 504, statusText: 'Offline' })
}

// --- Estrategias ---

// Network-first con fallback a cache (CSS/JS bundles)
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  try {
    const fresh = await fetch(request)
    if (fresh && fresh.ok) {
      cache.put(request, fresh.clone()).catch(() => undefined)
    }
    return fresh
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached
    return offlineFallback(request)
  }
}

// Cache-first con expiración (imágenes)
async function cacheFirstWithExpiry(request, cacheName, ttlMs, maxEntries) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached && !isExpired(cached, ttlMs)) {
    return cached
  }
  try {
    const fresh = await fetch(request)
    if (fresh && fresh.ok) {
      const stamped = await timestamped(fresh)
      cache.put(request, stamped.clone()).catch(() => undefined)
      trimCache(cacheName, maxEntries).catch(() => undefined)
      return stamped
    }
    return cached || fresh
  } catch {
    if (cached) return cached
    return offlineFallback(request)
  }
}

// Stale-while-revalidate con TTL (API GET)
async function staleWhileRevalidate(request, cacheName, ttlMs) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  const networkPromise = fetch(request)
    .then(async (response) => {
      if (response && response.ok) {
        const stamped = await timestamped(response)
        cache.put(request, stamped.clone()).catch(() => undefined)
        return stamped
      }
      return response
    })
    .catch(() => undefined)

  if (cached) {
    if (isExpired(cached, ttlMs)) {
      // Cache expirado: prioriza red, pero usa cache si la red falla.
      const fresh = await networkPromise
      return fresh || cached
    }
    // Fresco: devuelve cache y revalida en background.
    networkPromise.catch(() => undefined)
    return cached
  }

  const fresh = await networkPromise
  if (fresh) return fresh
  return offlineFallback(request)
}

// Navegación: network-first contra index.html con fallback offline
async function navigationStrategy(request) {
  try {
    const fresh = await fetch(request)
    if (fresh && fresh.ok) {
      const cache = await caches.open(PRECACHE)
      cache.put('/index.html', fresh.clone()).catch(() => undefined)
    }
    return fresh
  } catch {
    const cache = await caches.open(PRECACHE)
    const cachedIndex = (await cache.match('/index.html')) || (await cache.match('/'))
    if (cachedIndex) return cachedIndex
    const offline = await cache.match('/offline.html')
    if (offline) return offline
    return new Response('Offline', { status: 504, statusText: 'Offline' })
  }
}

// --- Fetch dispatcher ---
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  let url
  try {
    url = new URL(request.url)
  } catch {
    return
  }

  // Esquemas no soportados (chrome-extension, etc.)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return

  const sameOrigin = url.origin === self.location.origin

  // API (puede ser cross-origin a Supabase)
  if (isApiRequest(url)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_API, API_TTL_MS))
    return
  }

  // Solo gestionamos el resto si es same-origin
  if (!sameOrigin) return

  if (isNavigationRequest(request)) {
    event.respondWith(navigationStrategy(request))
    return
  }

  if (isImageRequest(request, url)) {
    event.respondWith(
      cacheFirstWithExpiry(request, RUNTIME_IMAGES, IMAGE_TTL_MS, IMAGE_MAX_ENTRIES),
    )
    return
  }

  if (isStaticAssetRequest(request, url)) {
    event.respondWith(networkFirst(request, RUNTIME_STATIC))
    return
  }

  // Resto: intenta cache, luego red, luego offline.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).catch(() => offlineFallback(request))
    }),
  )
})

// --- Web Push ---
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'NominApp', body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'NominApp'
  const options = {
    body: data.body || '',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: { url: data.url || '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    }),
  )
})

// --- Background sync (señal a clientes para que hagan flush) ---
self.addEventListener('sync', (event) => {
  if (event.tag === 'nominapp-flush') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        for (const client of clients) {
          client.postMessage({ type: 'OFFLINE_QUEUE_FLUSH' })
        }
      }),
    )
  }
})

// Permite al cliente forzar un skipWaiting tras detectar nueva versión.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
