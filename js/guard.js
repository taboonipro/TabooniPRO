/* منع فتح التطبيق جوا إطار بموقع ثاني (clickjacking): GitHub Pages ما بيسمح بـ X-Frame-Options */
if(window.top !== window.self){
  document.documentElement.style.display = 'none';
  try{ window.top.location.replace(window.self.location.href); }catch(e){}
  throw new Error('framed');
}
/* حارس الشاشة الفاضية: إذا صار أي خطأ أو ما تحمّلت الصفحة، بتطلع رسالة وزر إعادة */
window.__BOOTED = false;
window.__crash = function(info){
  var show = function(){
    var a = document.getElementById('app'); if(!a) return;
    a.innerHTML = '<section class="panel" style="text-align:center;color:#ecdec4;padding:28px 16px"><p style="font-size:17px">صار خلل بتحميل الصفحة.</p>' +
      '<button class="btn" type="button" id="crashRetry" style="margin-top:10px">حاول مرة ثانية</button>' +
      '<p dir="ltr" style="font-size:11px;opacity:.55;margin-top:14px;word-break:break-all">' + String(info || '').replace(/[<>&"]/g, '').slice(0, 180) + '</p></section>';
    var b = document.getElementById('crashRetry'); if(b) b.onclick = function(){ location.reload(); };
  };
  if(document.getElementById('app')) show(); else document.addEventListener('DOMContentLoaded', show);
};
window.addEventListener('error', function(e){ if(e && e.target && e.target !== window && e.target.tagName) return; window.__crash('JS: ' + (e.message || '') + ' @' + (e.lineno || '')); });
window.addEventListener('unhandledrejection', function(e){ window.__crash('P: ' + ((e.reason && e.reason.message) || e.reason || '')); });
setTimeout(function(){ if(!window.__BOOTED) window.__crash('TIMEOUT'); }, 20000);
