const CACHE='daftr-qismi-v3-student-cards-25';
const ASSETS=['./?stable=25','./index.html?stable=25','./styles.css?v=15-mobile-nav','./bundle.js?v=17-qa','./mobile-nav.js?v=17-qa','./calendar-sync.js?v=18-qa','./google-sync.js?v=19-qa','./textbook-link.js?v=20-qa','./hanane-import.js?v=21-qa','./hanane-direct.js?v=22-qa','./textbook/index.html','./manifest.webmanifest','./icon-192.svg','./icon-512.svg','./icon-192.png','./icon-512.png','./share-install.js?v=23.1','./share-install.css?v=23','./student-cards-memory.js?v=24','./roster-2ace-photos.js?v=25'];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(ASSETS))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>(k.startsWith('daftr-qismi-v3-')||k==='daftr-qismi-v22-hanane-direct-qa')&&k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const requestURL=new URL(event.request.url);
  const appScope=new URL('./',self.location.href);
  if(requestURL.origin!==appScope.origin || !requestURL.pathname.startsWith(appScope.pathname)) return;

  if(event.request.mode==='navigate'){
    event.respondWith((async()=>{
      const url=new URL(event.request.url);
      const textbook=url.pathname.includes('/daftr-qismi-v3/textbook/');
      const fallback=textbook?'./textbook/index.html':'./index.html?stable=25';
      try{
        const response=await fetch(event.request);
        if(response&&response.ok){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(fallback,copy));
        }
        return response;
      }catch{
        return caches.match(fallback);
      }
    })());
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response=>{
        if(response && response.ok){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        }
        return response;
      })
      .catch(()=>caches.match(event.request))
  );
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(windows=>{
      for(const w of windows){ if('focus' in w) return w.focus(); }
      return clients.openWindow('./');
    })
  );
});
