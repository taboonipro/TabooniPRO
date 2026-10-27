/* Service worker: بيخزّن ملفات التطبيق (مش البيانات). البيانات دايماً من السيرفر.
 * لما تحدّث ملفات التطبيق: غيّر رقم VERSION عشان التلفونات تاخذ النسخة الجديدة. */
var VERSION = 'tabooni-v1.27';   // نفس رقم APP_VERSION
var FILES = ['./', 'index.html', 'config.js', 'css/app.css', 'js/guard.js', 'js/qrcode.js', 'js/vendor/supabase.js', 'js/shared.js', 'js/backend.js', 'js/customer.js', 'js/admin.js', 'js/app.js',
  'assets/logo.webp', 'assets/pizza.webp', 'assets/boat.webp', 'assets/icon-192.png', 'assets/favicon-32.png', 'manifest.webmanifest'];
self.addEventListener('install', function(e){
  e.waitUntil(caches.open(VERSION).then(function(c){ return c.addAll(FILES); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){ return Promise.all(keys.filter(function(k){ return k !== VERSION; }).map(function(k){ return caches.delete(k); })); })
    .then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  var req = e.request, url = new URL(req.url);
  if(req.method !== 'GET' || url.origin !== location.origin) return; // السيرفر والخطوط: مباشرة من الإنترنت
  var keep = !url.search; // روابط فيها رموز (?t= ?c=) ما بتنحفظ على الجهاز
  // الصفحة وملفات JS/CSS: من الإنترنت أول (عشان التحديثات توصل)، وإذا ما في إنترنت من الذاكرة
  e.respondWith(fetch(req).then(function(res){
    if(res && res.ok && keep){ var copy = res.clone(); caches.open(VERSION).then(function(c){ c.put(req, copy); }); }
    return res;
  }).catch(function(){
    return caches.match(req, {ignoreSearch: url.pathname.endsWith('/') || url.pathname.endsWith('index.html')}).then(function(r){ return r || caches.match('./'); });
  }));
});
