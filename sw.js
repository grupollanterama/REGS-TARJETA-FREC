/* Guarda la plataforma en el celular para que abra aunque la señal sea mala.
   Siempre intenta la versión más nueva; si en 4 segundos no llega, usa la guardada.
   Si algo falla, SIEMPRE deja pasar la petición normal a internet (nunca se queda en blanco).
   Los datos (Google Apps Script) NUNCA se guardan aquí: siempre se piden en vivo. */
const CACHE = 'cf-v4';
const BASE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== 'GET' || u.origin !== location.origin) return;   // datos y Google Fonts: directo a internet
  const nav = req.mode === 'navigate';
  e.respondWith((async () => {
    try {
      // 1) Internet primero (versión más nueva), con límite de 4 s
      const red = fetch(nav ? req.url : req, { cache: 'no-cache' }).then(r => {
        if (r && r.ok && !r.redirected) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(nav ? './index.html' : req, cp)).catch(() => {}); }
        return r;
      }).catch(() => null);
      const r = await Promise.race([red, new Promise(ok => setTimeout(() => ok(null), 4000))]);
      if (r && r.ok) return nav && r.redirected ? Response.redirect(r.url, 302) : r;
      // 2) Copia guardada en el celular
      const g = (await caches.match(req, { ignoreSearch: true })) || (nav ? (await caches.match('./index.html')) || (await caches.match('./')) : null);
      if (g) return g;
      // 3) Lo que conteste internet aunque tarde
      const r2 = await red;
      if (r2) return nav && r2.redirected ? Response.redirect(r2.url, 302) : r2;
    } catch (err) {}
    // 4) Último recurso: la petición normal del navegador, como si no existiera este archivo
    return fetch(req);
  })());
});
