/* Guarda la plataforma en el celular para que abra aunque la señal sea mala.
   Siempre intenta la versión más nueva; si en 4 segundos no llega, usa la guardada.
   Los datos (Google Apps Script) NUNCA se guardan aquí: siempre se piden en vivo. */
const CACHE = 'cf-v1';
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
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // datos y Google Fonts: directo a internet
  const red = fetch(e.request).then(r => {
    if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); }
    return r;
  });
  const espera = new Promise((_, no) => setTimeout(no, 4000));
  e.respondWith(
    Promise.race([red, espera]).catch(() =>
      caches.match(e.request).then(g => g || caches.match('./index.html')).then(g => g || red))
  );
});
