// ---------------------------------------------------------------------------
// Service worker mínimo: cachea el "shell" de la PWA para que la app abra
// sin conexión. Los datos viven en IndexedDB (Dexie.js), no aquí.
// Solo se registra en producción (ver src/main.jsx).
// ---------------------------------------------------------------------------
const CACHE_NAME = 'prototipo-offline-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(claves.filter((clave) => clave !== CACHE_NAME).map((clave) => caches.delete(clave))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Solo peticiones GET del mismo origen (las llamadas a la API van directo)
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  // Estrategia "red primero"; sin red, cae al caché (navegación -> index.html)
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copia = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copia));
        return response;
      })
      .catch(() =>
        caches.match(request).then((cachado) => cachado ?? caches.match('/index.html')),
      ),
  );
});
