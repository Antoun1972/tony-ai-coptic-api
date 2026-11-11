/* Cache only the public app shell. NEVER cache school data, authentication or API calls. */
const CACHE_NAME='tony-ict-cloud-shell-v2';
const ASSETS=['./','./index.html','./styles.css','./core.js','./pages.js','./extras.js','./import.js','./config.js','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME&&k.startsWith('tony-ict-cloud-shell-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  event.respondWith(fetch(request).then(response=>{
    if(response.ok&&ASSETS.some(a=>new URL(a,self.location.href).pathname===url.pathname)){
      const clone=response.clone();
      caches.open(CACHE_NAME).then(cache=>cache.put(request,clone));
    }
    return response;
  }).catch(()=>caches.match(request).then(cache=>cache||Response.error())));
});
