// NS Fitness - Service Worker for PWA
// This enables offline functionality and "Add to Home Screen"

const CACHE_NAME = 'ns-fitness-v2'; // Updated version to clear old cache
const urlsToCache = [
  '/logo.png',
  '/logo192.png',
  '/logo512.png',
  '/manifest.json'
];

// Install service worker and cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache).catch(err => {
          console.error('Service Worker: Cache addAll failed', err);
        });
      })
  );
  self.skipWaiting();
});

// Fetch event - NETWORK FIRST strategy (fetch fresh, fallback to cache)
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    // Try network first
    fetch(event.request)
      .then((response) => {
        // Clone the response
        const responseToCache = response.clone();
        
        // Cache the new response for static assets only
        if (event.request.url.match(/\.(png|jpg|jpeg|svg|gif|webp|css|js)$/)) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request)
          .then((response) => {
            if (response) {
              console.log('Service Worker: Serving from cache (offline)', event.request.url);
              return response;
            }
            // No cache, return offline page or error
            return new Response('Offline - Please check your connection', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

