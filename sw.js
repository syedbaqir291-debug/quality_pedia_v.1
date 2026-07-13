const CACHE_NAME = 'qualitypedia-v2';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './data.js',
  './enrich.js',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/logo.png'
];

self.addEventListener('install', (e)=>{
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e)=>{
  if(e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Only cache same-origin app-shell requests; let CDN/API calls pass through to network.
  if(url.origin !== self.location.origin){
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached=>{
      const fetchPromise = fetch(e.request).then(networkRes=>{
        if(networkRes && networkRes.status===200){
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put(e.request, clone));
        }
        return networkRes;
      }).catch(()=>cached);
      return cached || fetchPromise;
    })
  );
});
