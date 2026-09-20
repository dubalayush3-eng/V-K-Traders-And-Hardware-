/* Service worker: keeps the billing page and its scripts available offline.
   Host this file next to billing-pro.html (same folder) on https or localhost. */
const CACHE = "billing-pro-v1";
self.addEventListener("install", e => { self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.includes("firestore.googleapis.com") || url.hostname.includes("googleapis.com") && !url.hostname.includes("fonts")) return;
  if (url.hostname.includes("api.qrserver.com")) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || (req.mode === "navigate" ? caches.match(self.registration.scope) : undefined)))
  );
});
