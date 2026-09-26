const VERSIUNE = 'terenuri-vlad-IVrpMkoOlijn';
const BAZA = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon.svg'];
const CDN = ['https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css', 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js'];
const HARTI = 'terenuri-vlad-harti', MAX_HARTI = 1500;
self.addEventListener('install', e => e.waitUntil((async () => {
  const c = await caches.open(VERSIUNE);
  await c.addAll(BAZA.map(u => new Request(u, { cache: 'reload' })));
  await Promise.all(CDN.map(u => fetch(u, { mode: 'cors', cache: 'no-cache' }).then(r => r.ok && c.put(u, r)).catch(() => {})));
  await self.skipWaiting();
})()));
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('terenuri-vlad-') && k !== VERSIUNE && k !== HARTI) await caches.delete(k);
  await self.clients.claim();
})()));
const cuTermen = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('timp')), ms))]);
async function pagina(req) {
  const c = await caches.open(VERSIUNE);
  try { const r = await cuTermen(fetch(req, { cache: 'no-cache' }), 8000); if (r.ok) await c.put('index.html', r.clone()); return r; }
  catch (e) { return (await c.match('index.html')) || (await c.match('./')) || Response.error(); }
}
async function dinMemorie(req, numeCache) {
  const c = await caches.open(numeCache);
  const m = await c.match(req, { ignoreSearch: false });
  if (m) return m;
  const r = await fetch(req);
  if (r.ok) c.put(req, r.clone());
  return r;
}
let taieri = 0;
async function bucataHarta(req) {
  const c = await caches.open(HARTI);
  const m = await c.match(req.url);
  if (m) return m;
  let r;
  try { r = await fetch(req.url, { mode: 'cors' }); } catch (e) { r = null; }
  if (!r || !r.ok) return fetch(req);
  try {
    await c.put(req.url, r.clone());
    if (++taieri % 100 === 0) { const k = await c.keys(); for (let i = 0; i < k.length - MAX_HARTI; i++) await c.delete(k[i]); }
  } catch (e) {}
  return r;
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (req.mode === 'navigate' || (u.origin === location.origin && (u.pathname.endsWith('/') || u.pathname.endsWith('/index.html')))) { e.respondWith(pagina(req)); return; }
  if (u.origin === location.origin || u.host === 'cdnjs.cloudflare.com' || u.host === 'fonts.googleapis.com' || u.host === 'fonts.gstatic.com') { e.respondWith(dinMemorie(req, VERSIUNE)); return; }
  if (u.host === 'server.arcgisonline.com' || u.host.endsWith('tile.openstreetmap.org')) { e.respondWith(bucataHarta(req)); return; }
});