// AETHRA service worker. Cache name is versioned; old caches (including the pre-rebrand "astra-med-v1") are deleted on activate.
const CACHE = 'aethra-v6';
const ROUTES = ['/', '/dashboard', '/check', '/assess', '/body', '/emergency', '/wellness', '/relax', '/studio', '/history', '/hazards', '/crew', '/reports', '/resources', '/settings'];
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE); const assets = new Set(['/icon.svg', '/manifest.webmanifest']);
    await Promise.all(ROUTES.map(async (r) => { try { const res = await fetch(r, { cache: 'reload' }); if (!res.ok) return; const html = await res.clone().text(); await c.put(r, res); (html.match(/\/_next\/static\/[^"'\\ )]+\.(?:js|css)/g) || []).forEach((a) => assets.add(a)); } catch (_) {} }));
    await Promise.all([...assets].map((a) => c.add(a).catch(() => {})));
    // The same normalized NASA OSD backend payload used by the application is cached for offline access.
    try { const osd = await fetch('/data/osd/records.json'); if (osd.ok) await c.put('/data/osd/records.json', osd); } catch (_) {}
    try { const refs = await fetch('/data/osd/reference-ranges.json'); if (refs.ok) await c.put('/data/osd/reference-ranges.json', refs); } catch (_) {}
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request; const u = new URL(r.url); if (r.method !== 'GET' || u.origin !== self.location.origin) return;
  if (u.pathname.startsWith('/_next/static/')) { e.respondWith(caches.match(r).then((m) => m || fetch(r).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(r, cp)); } return res; }))); return; }
  e.respondWith(fetch(r).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(r, cp)); } return res; }).catch(() => caches.match(r).then((m) => m || caches.match(u.pathname) || (r.mode === 'navigate' ? caches.match('/') : Response.error()))));
});
