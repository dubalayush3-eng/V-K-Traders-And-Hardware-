const CACHE_NAME = 'vk-billing-v2.0';
const ASSETS_TO_CACHE = [
  '/',
  '/billing-pro-5-2-enhanced.html',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/manifest.webmanifest'
];

// Install event - cache essential files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.log('Cache add error (non-critical):', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if(cacheName !== CACHE_NAME){
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - cache first, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if(request.method !== 'GET') return;

  // Skip cross-origin requests
  if(url.origin !== location.origin) return;

  event.respondWith(
    caches.match(request).then(response => {
      // Return cached response if available
      if(response){
        return response;
      }

      // Try network
      return fetch(request).then(response => {
        // Don't cache if not successful
        if(!response || response.status !== 200){
          return response;
        }

        // Clone response before caching
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, responseToCache);
        });

        return response;
      }).catch(() => {
        // Network failed, try cached fallback or return offline page
        return caches.match(request).then(response => {
          if(response) return response;
          // Return main page if asset not found
          return caches.match('/');
        });
      });
    })
  );
});

// Background sync for data sync
self.addEventListener('sync', event => {
  if(event.tag === 'sync-bills'){
    event.waitUntil(syncBills());
  }
});

async function syncBills(){
  try {
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return response;
  } catch(err){
    console.log('Sync failed:', err);
  }
}

// Push notification handler
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'VK Billing Update',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'vk-billing-notification',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification('VK Billing', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for(let i = 0; i < clientList.length; i++){
        const client = clientList[i];
        if(client.url === '/' && 'focus' in client){
          return client.focus();
        }
      }
      if(clients.openWindow){
        return clients.openWindow('/');
      }
    })
  );
});

// Message handler for client communication
self.addEventListener('message', event => {
  if(event.data && event.data.type === 'SKIP_WAITING'){
    self.skipWaiting();
  }
});

console.log('Service Worker registered for VK Billing');
