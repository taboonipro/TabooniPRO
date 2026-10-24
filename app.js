/* ========= التطبيق: شاشة دخول وحدة + توجيه ========= */
// اسم مستخدم الإدارة ← لوحة الإدارة | رقم تلفون ← بطاقة الزبون

function renderLogin(msg){
  PAGE = 'customer';
  $app.className = 'wrap';
  $app.innerHTML = demoBar() + header() +
    '<section class="panel login"><h1>' + esc(t('loginTitle')) + '</h1><p class="sub">' + esc(t('loginSub')) + '</p>' +
      '<form id="lf" autocomplete="on" novalidate>' +
        '<label for="lu">' + esc(t('userLabel')) + '</label><input id="lu" name="username" type="text" inputmode="text" dir="ltr" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="64" placeholder="' + esc(t('userPh')) + '">' +
        '<label for="lp">' + esc(t('passLabel')) + '</label><div class="passrow"><input id="lp" name="password" type="password" dir="ltr" autocomplete="current-password" maxlength="64">' +
          '<button class="btn small ghost" id="lshow" type="button" aria-pressed="false">' + esc(t('showPass')) + '</button></div>' +
        '<button class="btn" id="lgo" type="submit">' + esc(t('loginBtn')) + '</button><div class="err" id="err" role="alert">' + esc(msg || '') + '</div>' +
      '</form>' +
      '<p class="sub hint" style="margin:14px 0 0">' + esc(t('forgotHint')) + '</p></section>' +
    '<a class="btn ghost" href="' + esc(APP_URL + '?new=1') + '">' + esc(t('joinLink')) + '</a>' + howPanel();
  var u = document.getElementById('lu'), p = document.getElementById('lp'), sh = document.getElementById('lshow');
  var last = store('tp_user'); if(last) u.value = last;
  (last ? p : u).focus();
  sh.onclick = function(){ var on = p.type === 'password'; p.type = on ? 'text' : 'password'; sh.textContent = t(on ? 'hidePass' : 'showPass'); sh.setAttribute('aria-pressed', on ? 'true' : 'false'); };
  document.getElementById('lf').onsubmit = function(e){
    e.preventDefault();
    var err = document.getElementById('err'), btn = document.getElementById('lgo'), user = u.value.trim();
    if(!user || !p.value){ err.textContent = errText('BAD_LOGIN'); return; }
    btn.disabled = true; err.textContent = '';
    api('login', user, p.value).then(function(r){
      btn.disabled = false;
      if(!r.ok){ err.textContent = errText(r.error); p.value = ''; p.focus(); return; }
      p.value = '';
      if(r.role === 'mfa'){ store('tp_user', null); return renderMfa(); }
      if(r.role === 'admin'){
        store('tp_user', null);
        SESSION = r.session; sstore('tp_sess', SESSION);
        return startAdmin();
      }
      store('tp_user', normPhone(user)); // بنتذكر رقم الزبون بس (مش اسم الإدارة)
      CTOKEN = r.token; store('tp_ctok', CTOKEN);
      if(r.mustChange) return renderSetPassword(r.name, true);
      showMine(r);
    });
  };
  bindCommon(function(){ renderLogin(msg); });
}

// الخطوة الثانية لدخول الإدارة: كود 6 أرقام من تطبيق المصادقة
function renderMfa(){
  PAGE = 'customer'; $app.className = 'wrap';
  $app.innerHTML = header() + '<section class="panel login"><p class="sub">' + esc(t('sending')) + '</p></section>';
  api('mfaStart').then(function(r){
    if(!r.ok){ api('adminLogout'); return renderLogin(errText(r.error)); }
    $app.innerHTML = header() +
      '<section class="panel login"><h1>' + esc(t('mfaTitle')) + '</h1><p class="sub">' + esc(t(r.enrolled ? 'mfaSub' : 'mfaSetupSub')) + '</p>' +
        (r.enrolled ? '' : '<div class="qrbox" style="text-align:center">' + qrHtml(r.uri) + '</div><p class="sub">' + esc(t('mfaManual')) + '</p><p class="mono" dir="ltr" style="word-break:break-all;user-select:all">' + esc(r.secret) + '</p>') +
        '<form id="mf" novalidate><label for="mc">' + esc(t('mfaCode')) + '</label><input id="mc" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" maxlength="6" dir="ltr">' +
        '<button class="btn" id="mgo" type="submit">' + esc(t('loginBtn')) + '</button><div class="err" id="err" role="alert"></div></form>' +
        '<button class="btn ghost" id="mcancel" type="button" style="margin-top:10px">' + esc(t('signOut')) + '</button></section>';
    var c = document.getElementById('mc'); c.focus();
    document.getElementById('mcancel').onclick = function(){ api('adminLogout').then(function(){ renderLogin(); }); };
    document.getElementById('mf').onsubmit = function(e){
      e.preventDefault();
      var err = document.getElementById('err'), btn = document.getElementById('mgo');
      btn.disabled = true; err.textContent = '';
      api('mfaVerify', r.factorId, c.value).then(function(v){
        btn.disabled = false;
        if(!v.ok){ err.textContent = errText(v.error); c.value = ''; c.focus(); return; }
        SESSION = v.session; sstore('tp_sess', SESSION);
        startAdmin();
      });
    };
  });
}

function boot(){
  window.__BOOTED = true;
  var p = {}; try{ new URLSearchParams(location.search).forEach(function(v, k){ p[k] = v; }); }catch(e){}
  // روابط الواتساب بتشتغل بدون دخول (زي قبل)
  if(p.t || p.c || p['new']) return routeLink(p);
  if(SESSION) return startAdmin();
  if(CTOKEN) return viewMyCard();
  renderLogin();
}
try{ boot(); }catch(e){ if(window.__crash) __crash('B: ' + (e && e.message)); }

// Service worker: التطبيق بيفتح أسرع وبيتثبّت على الشاشة الرئيسية
if('serviceWorker' in navigator && location.protocol === 'https:'){
  window.addEventListener('load', function(){ navigator.serviceWorker.register('sw.js').catch(function(){}); });
}
