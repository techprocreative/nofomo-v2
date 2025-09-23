// Service Worker for ForexAI Pro - Phase 1 Implementation
// Basic offline caching for critical resources and data

const CACHE_NAME = 'forex-ai-v1';
const STATIC_CACHE = 'forex-ai-static-v1';
const DYNAMIC_CACHE = 'forex-ai-dynamic-v1';

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/placeholder-logo.png',
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/market/prices',
  '/api/trading/positions',
  '/api/market/symbols',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.error('Failed to cache static assets:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (API_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint))) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          return response || fetch(request);
        })
    );
    return;
  }

  // Default strategy: Network first, fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE)
            .then((cache) => {
              cache.put(request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(request)
          .then((response) => {
            return response || new Response('Offline content not available', {
              status: 503,
              statusText: 'Service Unavailable',
            });
          });
      })
  );
});

// Handle API requests with offline fallback
async function handleApiRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache successful API responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());

      // Send update to clients
      notifyClients('api-update', {
        url: request.url,
        success: true,
        timestamp: Date.now(),
      });

      return networkResponse;
    }
  } catch (error) {
    console.log('Network request failed, trying cache:', error);
  }

  // Fallback to cache
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    // Send offline notification
    notifyClients('offline-data', {
      url: request.url,
      cached: true,
      timestamp: Date.now(),
    });

    return cachedResponse;
  }

  // Return offline response
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Offline - no cached data available',
      offline: true,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// Notify all clients of updates
function notifyClients(type, data) {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'sw-message',
        subtype: type,
        data,
      });
    });
  });
}

// Handle messages from main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'skipWaiting':
      self.skipWaiting();
      break;

    case 'clear-cache':
      clearAllCaches();
      break;

    case 'get-cache-stats':
      getCacheStats().then((stats) => {
        event.ports[0].postMessage(stats);
      });
      break;

    default:
      console.log('Unknown message type:', type);
  }
});

// Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map((cacheName) => caches.delete(cacheName))
  );
  console.log('All caches cleared');
}

// Get cache statistics
async function getCacheStats() {
  const cacheNames = await caches.keys();
  const stats = {
    caches: cacheNames.length,
    staticCache: await getCacheSize(STATIC_CACHE),
    dynamicCache: await getCacheSize(DYNAMIC_CACHE),
    timestamp: Date.now(),
  };

  return stats;
}

// Get approximate cache size
async function getCacheSize(cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    return keys.length;
  } catch (error) {
    return 0;
  }
}

// Periodic cleanup (every 30 minutes)
setInterval(async () => {
  try {
    const dynamicCache = await caches.open(DYNAMIC_CACHE);
    const keys = await dynamicCache.keys();

    // Remove entries older than 1 hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    for (const request of keys) {
      const response = await dynamicCache.match(request);
      if (response) {
        const date = response.headers.get('date');
        if (date && new Date(date).getTime() < oneHourAgo) {
          await dynamicCache.delete(request);
        }
      }
    }

    console.log('Cache cleanup completed');
  } catch (error) {
    console.warn('Cache cleanup failed:', error);
  }
}, 30 * 60 * 1000);