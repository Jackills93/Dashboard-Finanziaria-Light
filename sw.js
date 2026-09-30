/* Service worker di Bilancio Domestico.
   Va messo ACCANTO a bilancio-domestico.html sullo stesso host
   (GitHub Pages, Vercel, ecc.) — da file:// i browser non lo registrano
   nemmeno, e la pagina lo prevede: nessun errore, solo niente offline.

   Cosa fa: mette in cache la pagina al primo caricamento e la serve
   da lì quando la rete manca. Non tocca mai i dati (localStorage):
   quelli restano indipendenti dalla cache e da questo file. */

const CACHE = 'bilancio-domestico-v4';
const SHELL = ['./', './index.html'];

self.addEventListener('install', event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .catch(()=>{}) // pagina con nome diverso o path diverso: si ignora, si popolerà da sola coi fetch
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', event=>{
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

// network-first per la pagina stessa (così un aggiornamento arriva subito
// quando c'è rete), cache-first per tutto il resto (font, icone).
self.addEventListener('fetch', event=>{
  if(event.request.method !== 'GET') return;
  const isNav = event.request.mode === 'navigate';

  if(isNav){
    event.respondWith((async () => {
      try{
        const res = await fetch(event.request);
        const copy = res.clone();
        caches.open(CACHE).then(c=>c.put(event.request, copy));
        return res;
      }catch(e){
        // offline: la pagina esatta richiesta, o l'ultima versione nota della shell
        return (await caches.match(event.request))
          || (await caches.match('./index.html'))
          || (await caches.match('./'));
      }
    })());
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(res=>{
      const copy = res.clone();
      caches.open(CACHE).then(c=>c.put(event.request, copy));
      return res;
    }).catch(()=>cached))
  );
});
