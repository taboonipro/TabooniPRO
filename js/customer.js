/* ========= صفحة الزبون ========= */
var $app = document.getElementById('app');
function loading(){ $app.innerHTML = '<p class="loading">…</p>'; }
function myCardBtn(){ return '<a class="lang" target="_top" href="' + esc(APP_URL) + '">' + esc(t('myCard')) + '</a>'; }

/* رابط تقييم Google بلغة الصفحة: عربي (ar) أو عبري (iw) */
function reviewHref(u){
  u = String(u || ''); if(!/^https:\/\//.test(u) || /[?&]hl=/.test(u)) return u;
  var h = u.split('#'), hl = LANG === 'he' ? 'iw' : 'ar';
  h[0] += (h[0].indexOf('?') > -1 ? '&' : '?') + 'hl=' + hl;
  return h.join('#');
}
/* 1) الانضمام للبرنامج (بدون طبعة) */
function viewJoin(keep){
  keep = keep || {phone:'', name:'', gender:'', bday:''};
  $app.innerHTML = demoBar() + header(myCardBtn()) +
    '<section class="panel"><h1>' + esc(t('joinTitle')) + '</h1><p class="sub">' + esc(t('joinSub')) + '</p>' + howPanel() +
      '<label for="nm">' + esc(t('nameLabel')) + '</label><input id="nm" type="text" autocomplete="name" maxlength="40" placeholder="' + esc(t('namePh')) + '">' +
      '<label for="ph">' + esc(t('phoneLabel')) + '</label><input id="ph" type="tel" inputmode="tel" dir="ltr" autocomplete="tel" placeholder="05XXXXXXXX">' +
      personFields('j', keep.gender, keep.bday) +
      consentBox() +
      '<button class="btn" id="send" type="button">' + esc(t('joinBtn')) + '</button><div class="err" id="err" role="alert"></div>' +
    '</section>';
  var ph = document.getElementById('ph'), nm = document.getElementById('nm');
  ph.value = keep.phone; nm.value = keep.name;
  bindCommon(function(){ var pp = readPerson('j'); viewJoin({phone:ph.value, name:nm.value, gender:pp.gender, bday:pp.bday}); });
  document.getElementById('send').onclick = function(){
    var err = document.getElementById('err'), p = normPhone(ph.value);
    if(!nm.value.trim()){ err.textContent = errText('NEED_NAME'); nm.focus(); return; }
    if(!validName(nm.value)){ err.textContent = errText('BAD_NAME'); nm.focus(); return; }
    if(!/^05\d{8}$/.test(p)){ err.textContent = errText('BAD_PHONE'); ph.focus(); return; }
    var pp = readPerson('j');
    if(!pp.gender){ err.textContent = errText('NEED_GENDER'); return; }
    if(pp.partial){ err.textContent = errText('BAD_BDAY'); return; }
    if(!document.getElementById('cs').checked){ err.textContent = errText('NEED_CONSENT'); return; }
    var btn = this; btn.disabled = true; btn.textContent = t('sending');
    api('joinProgram', p, nm.value, true, pp.gender, pp.bday).then(function(r){
      if(!r.ok){ btn.disabled = false; btn.textContent = t('joinBtn'); err.textContent = errText(r.error); return; }
      // نفس الرد لكل رقم (ما بنكشف مين مسجّل). البطاقة بتنفتح من رابط الواتساب بعد ما يتأكد الرقم
      viewMessage(t('joinedExisting'));
    });
  };
}
function consentBox(){
  return '<label class="consent"><input type="checkbox" id="cs"> <span>' + esc(t('consent')) + '</span></label>';
}
// 3 خطوات مرئية: كيف بتاخذ طبعة (بالأعلى، مش آخر الصفحة)
function howPanel(){
  var ic = ['\uD83C\uDF55', '\uD83D\uDCF2', '\u2B50'];
  return '<div class="steps" aria-label="' + esc(t('stTitle')) + '"><p class="steps-t">' + esc(t('stTitle')) + '</p><ol>' +
    [1,2,3].map(function(n){ return '<li><span class="si" aria-hidden="true">' + ic[n - 1] + '</span><span class="sn">' + n + '</span><span class="stx">' + esc(t('st' + n)) + '</span></li>'; }).join('') +
    '</ol></div>';
}

/* 2) رابط الواتساب: طبعة فورية */
function viewFeedback(token){
  loading();
  api('getTokenInfo', token).then(function(info){
    if(!info.ok) return viewMessage(errText(info.error));
    if(info.status === 'used') return viewUsed();
    if(info.status !== 'valid') return viewMessage(errText(info.status === 'expired' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID'));
    TOKEN_QTY = Math.max(1, Math.min(10, Number(info.qty) || 1));
    renderTokenForm(token, info.knownName);
  });
}
var TOKEN_QTY = 1; // عدد البيتسات بهالطلب (من الرابط)
// mine = {card} ← الزبون داخل بحسابه وبيقيّم طلب اليوم من التطبيق
function renderTokenForm(token, knownName, keep, mine){
  keep = keep || {rating:0, name:'', comment:'', gender:'', bday:''};
  $app.className = 'wrap';
  $app.innerHTML = demoBar() + header() + (mine ? accountBtns() : '') +
    '<section class="panel">' + (knownName ? '<p class="hello">' + esc(t('hello')) + ' ' + esc(knownName) + ' \uD83D\uDC4B</p>' : '') +
      '<h1>' + esc(t('fbTitle')) + '</h1><p class="sub">' + esc(tq('fbSub', TOKEN_QTY)) + '</p>' + starsInput() + '<p class="gnext" id="gNext" aria-live="polite"></p>' +
      (knownName ? '' : '<label for="nm">' + esc(t('nameLabel')) + '</label><input id="nm" type="text" autocomplete="given-name" maxlength="40" placeholder="' + esc(t('namePh')) + '">' + personFields('k', keep.gender, keep.bday)) +
      '<label for="cm">' + esc(t('commentLabel')) + '</label><textarea id="cm" maxlength="500" placeholder="' + esc(t('commentPh')) + '"></textarea>' +
      (knownName ? '' : consentBox()) +
      '<button class="btn" id="send" type="button">' + esc(tq('submit', TOKEN_QTY)) + '</button><div class="err" id="err" role="alert"></div>' +
      (mine ? '<button class="btn ghost" id="later" type="button" style="margin-top:10px">' + esc(t('rateLater')) + '</button>' : '') + '</section>';
  var nm = document.getElementById('nm'), cm = document.getElementById('cm');
  if(nm) nm.value = keep.name; cm.value = keep.comment;
  bindStars(keep);
  if(mine){ bindAccount(mine.card); document.getElementById('later').onclick = function(){ renderCard(mine.card, {mine:true, pending:{token:token, qty:TOKEN_QTY}}); }; }
  bindCommon(function(){ var pp = nm ? readPerson('k') : {}; renderTokenForm(token, knownName, {rating:keep.rating, name: nm ? nm.value : '', comment:cm.value, gender:pp.gender || '', bday:pp.bday || ''}, mine); });
  document.getElementById('send').onclick = function(){
    var err = document.getElementById('err');
    if(!keep.rating){ err.textContent = errText('BAD_RATING'); return; }
    if(cm.value.replace(/\s/g, '').length < 2){ err.textContent = errText('NEED_COMMENT'); cm.focus(); return; }
    if(nm && !nm.value.trim()){ err.textContent = errText('NEED_NAME'); nm.focus(); return; }
    if(nm && !validName(nm.value)){ err.textContent = errText('BAD_NAME'); nm.focus(); return; }
    var pk = nm ? readPerson('k') : {gender:'', bday:''};
    if(nm && !pk.gender){ err.textContent = errText('NEED_GENDER'); return; }
    if(nm && pk.partial){ err.textContent = errText('BAD_BDAY'); return; }
    var cs = document.getElementById('cs');
    if(cs && !cs.checked){ err.textContent = errText('NEED_CONSENT'); return; }
    var btn = this; btn.disabled = true; btn.textContent = t('sending');
    var call = mine ? api('custRate', token, keep.rating, cm.value) : api('submitFeedback', token, keep.rating, cm.value, nm ? nm.value : '', cs ? cs.checked : false, pk.gender, pk.bday);
    call.then(function(r){
      if(!r.ok){
        if(mine && r.error === 'NO_SESSION') return custSignOut(t('sessionExpired'));
        if(mine && (r.error === 'TOKEN_USED' || r.error === 'TOKEN_INVALID' || r.error === 'TOKEN_EXPIRED')) return viewMyCard();
        if(r.error === 'TOKEN_USED') return viewUsed(); btn.disabled = false; btn.textContent = tq('submit', TOKEN_QTY); err.textContent = errText(r.error); return;
      }
      renderCard(r.card, {mine:!!mine, justStamped:r.stamped, added:r.added || 1, rewards:r.rewards || [], newReward:r.newReward, reviewUrl:r.reviewUrl, contactPhone:r.contactPhone, comment:cm.value.trim(), low: keep.rating < 4});
    });
  };
}
function viewUsed(){
  $app.innerHTML = demoBar() + header() + '<section class="panel"><h1>' + esc(t('usedTitle')) + '</h1><p class="sub">' + esc(t('usedText')) + '</p>' +
    '<a class="btn gold" target="_top" href="' + esc(APP_URL) + '">' + esc(t('openCard')) + '</a></section>';
  bindCommon(function(){ viewUsed(); });
}
function viewMessage(msg){
  $app.innerHTML = demoBar() + header() + '<section class="panel"><p>' + esc(msg) + '</p><a class="btn ghost" target="_top" href="' + esc(CUSTOMER_URL + '?new=1') + '">' + esc(t('joinBtn')) + '</a></section>';
  bindCommon(function(){ viewMessage(msg); });
}

/* 3) بطاقة VIP (بتبيّن بس بعد الدخول بالحساب) */
function renderCard(card, opts){
  opts = opts || {};
  var s = card.stamps, slots = '';
  for(var i = 1; i <= 10; i++){
    var gift = (i === 5 || i === 10), on = i <= s, isNew = opts.justStamped && i <= s && i > s - (opts.added || 1), art = pizzaSVG(on, i === 5);
    if(gift && on) art = giftGlow(art);
    slots += '<div class="slot' + (gift ? ' gift' : '') + (isNew ? ' new' : '') + '"><span class="n">' + i + (gift ? ' \uD83C\uDF81' : '') + '</span>' + art + '</div>';
  }
  var toBoat = Math.max(0, 5 - s), toPizza = 10 - s, toast = '';
  if(opts.welcome) toast = '<div class="toast" role="status">' + esc(t('welcome')) + '</div>';
  else if(opts.newReward) toast = '<div class="toast gift" role="status">' + (opts.justStamped ? esc(tq('stampAdded', opts.added || 1)) + '<br>' : '') + ((opts.rewards && opts.rewards.length ? opts.rewards : [opts.newReward]).map(function(r){ return esc(t('congrats' + r)); }).join('<br>')) + '</div>';
  else if(opts.justStamped === true) toast = '<div class="toast" role="status">' + esc(tq(opts.low ? 'stampLow' : 'stampAdded', opts.added || 1)) + '</div>';
  else if(opts.justStamped === false) toast = '<div class="toast" role="status">' + esc(t('thanksNoStamp')) + '</div>';
  var ready = card.rewards.length ? '<section class="panel ready"><h2>' + esc(t('readyTitle')) + '</h2><div class="rewards">' +
    card.rewards.map(function(r){ return '<div class="rw">' + pizzaSVG(true, r.type === 'BOAT') + '<p><b>' + esc(t(r.type)) + '</b><small>' + esc(fmtDate(r.earnedAt)) + '</small></p></div>'; }).join('') +
    '</div><p class="sub" style="margin:10px 0 0">' + esc(t('readyHint')) + '</p></section>' : '';
  // طلب تقييم على Google: بس إذا السيرفر بعث رابط (صالح ومن Google)
  // بعد تقييم 4-5: رسالة، وبس إذا كبس الزر بنفتح Google (ورأيه بينسخ عشان يلصقه هناك)
  var review = /^https:\/\//.test(opts.reviewUrl || '') ? '<section class="panel review"><h2 class="sec">' + esc(t('reviewTitle')) + '</h2>' + (T[LANG].reviewText ? '<p class="sub" style="margin-bottom:0">' + esc(T[LANG].reviewText) + '</p>' : '') +
    '<a class="btn" id="gRev" target="_blank" rel="noopener noreferrer" href="' + esc(reviewHref(opts.reviewUrl)) + '">★ ' + esc(t('reviewBtn')) + '</a><p class="sub" id="gPaste" aria-live="polite" style="margin:8px 0 0;text-align:center"></p></section>' : '';
  // بعد تقييم 1-3: تواصل مباشر مع صاحب المصلحة
  var contact = /^05\d{8}$/.test(opts.contactPhone || '') ? '<section class="panel review"><h2 class="sec">' + esc(t('contactTitle')) + '</h2><p class="sub" style="margin-bottom:0">' + esc(t('contactText')) + '</p>' +
    '<a class="btn wa" target="_blank" rel="noopener" href="' + esc(waLink(opts.contactPhone, t('contactMsg') + (opts.comment ? '\n' + opts.comment : ''))) + '">' + CHAT_ICO + esc(t('contactBtn')) + '</a></section>' : '';
  // طلب اليوم لسا ما انقيّم: تذكير فوق البطاقة
  var pend = opts.mine && opts.pending ? '<section class="panel review"><h2 class="sec">' + esc(t('pendingTitle')) + '</h2><p class="sub" style="margin-bottom:0">' + esc(tq('pendingText', opts.pending.qty)) + '</p>' +
    '<button class="btn" id="goRate" type="button">★ ' + esc(t('pendingBtn')) + '</button></section>' : '';
  $app.className = 'wrap';
  $app.innerHTML = demoBar() + header() + (opts.mine ? accountBtns() : '') + toast + (opts.flash ? '<div class="toast" role="status">' + esc(opts.flash) + '</div>' : '') + pend + review + contact + (opts.mine ? installBox() : '') +
    '<section class="panel"><div class="cardhead"><div class="who"><small>' + esc(t('customerName')) + '</small><b>' + esc(card.name) + '</b></div>' +
      '</div>' +
      '<div class="grid">' + slots + '</div>' +
      '<div class="counts">' +
        '<div class="count"><b>' + s + '</b><span>' + esc(t('current')) + '<br>' + esc(t('purchases')) + '</span></div>' +
        '<div class="count' + (toBoat === 0 ? ' done' : '') + '"><b>' + (toBoat === 0 ? '✓' : toBoat) + '</b><span>' + esc(t('toBoat')) + '<br>' + esc(toBoat === 0 ? t('reached') : t('remaining')) + '</span></div>' +
        '<div class="count' + (toPizza === 0 ? ' done' : '') + '"><b>' + (toPizza === 0 ? '✓' : toPizza) + '</b><span>' + esc(t('toPizza')) + '<br>' + esc(toPizza === 0 ? t('reached') : t('remaining')) + '</span></div>' +
      '</div>' + howPanel() + '<div class="rewards">' +
        '<div class="rw">' + pizzaSVG(true, true) + '<p><small>' + esc(t('at5')) + '</small><b>' + esc(t('BOAT')) + '</b></p></div>' +
        '<div class="rw">' + pizzaSVG(true, false) + '<p><small>' + esc(t('at10')) + '</small><b>' + esc(t('PIZZA')) + '</b></p></div>' +
      '</div></section>' + ready +
    '<p class="privacy">' + esc(t('privacyNote')) + '</p>';
  var gr = document.getElementById('gRev');
  if(gr && opts.comment) gr.addEventListener('click', function(){ try{ copyText(opts.comment, null, function(){ var p = document.getElementById('gPaste'); if(p) p.textContent = t('pasteHint'); }); }catch(e){} });
  if(opts.mine){ bindAccount(card); bindInstall(); }
  var gr2 = document.getElementById('goRate'); if(gr2) gr2.onclick = function(){ rateMine(card, opts.pending); };
  bindCommon(function(){ renderCard(card, {reviewUrl: opts.reviewUrl, contactPhone: opts.contactPhone, comment: opts.comment, mine: opts.mine, pending: opts.pending}); });
}

/* روابط بدون دخول: ?t= تقييم (لزبون بدون حساب)، ?new=1 انضمام.
   روابط بطاقة قديمة (?c=) ← شاشة الدخول: البطاقة صارت بالحساب بس */
function routeLink(p){
  if(p.t) viewFeedback(p.t);
  else if(p.c){ try{ history.replaceState(null, '', location.pathname); }catch(e){} if(CTOKEN) viewMyCard(); else renderLogin(t('cardInApp')); }
  else viewJoin();
}

/* ========= الزبون بعد تسجيل الدخول ========= */
var CTOKEN = store('tp_ctok') || '';
function custSignOut(msg){
  if(CTOKEN) api('custLogout', CTOKEN);
  CTOKEN = ''; store('tp_ctok', null);
  renderLogin(msg);
}
function viewMyCard(flash){
  loading();
  api('custMe', CTOKEN).then(function(r){
    if(!r.ok){
      if(r.error === 'NO_SESSION'){ CTOKEN = ''; store('tp_ctok', null); return renderLogin(t('sessionExpired')); }
      return viewRetry(errText(r.error), function(){ viewMyCard(flash); });
    }
    if(r.mustChange) return renderSetPassword(r.name, true);
    showMine(r, flash);
  });
}
// بعد الدخول: إذا في طلب من اليوم لسا ما انقيّم ← التقييم أول. غير هيك ← البطاقة طوالي
function showMine(r, flash){
  store('tp_card', null);
  var p = (r.pending || [])[0];
  if(p) return rateMine(r.card, p);
  renderCard(r.card, {mine:true, flash:flash});
}
function rateMine(card, p){
  TOKEN_QTY = Math.max(1, Math.min(10, Number(p.qty) || 1));
  renderTokenForm(p.token, card.name, null, {card:card});
}
function viewRetry(msg, again){
  $app.className = 'wrap';
  $app.innerHTML = header() + '<section class="panel"><p>' + esc(msg) + '</p><button class="btn" id="again" type="button">' + esc(t('retry')) + '</button></section>';
  document.getElementById('again').onclick = again;
  bindCommon(function(){ viewRetry(msg, again); });
}
function accountBtns(noPass){
  return '<div class="acctbar">' + (noPass ? '' : '<button class="lang" id="accPass" type="button">' + esc(t('myAccount')) + '</button>') + '<button class="lang" id="accOut" type="button">' + esc(t('signOut')) + '</button></div>';
}
function bindAccount(card){
  var p = document.getElementById('accPass'), o = document.getElementById('accOut');
  if(p) p.onclick = function(){ renderSetPassword(card.name, false); };
  if(o) o.onclick = function(){ custSignOut(); };
}
// forced=true: أول دخول بكلمة سر مؤقتة (لازم يغيّرها قبل ما يشوف البطاقة)
function renderSetPassword(name, forced){
  $app.className = 'wrap';
  $app.innerHTML = demoBar() + header() + (forced ? accountBtns(true) : '') +
    '<section class="panel">' + (name ? '<p class="hello">' + esc(t('hiName')) + ' ' + esc(name) + ' \uD83D\uDC4B</p>' : '') +
      '<h1>' + esc(forced ? t('setPassTitle') : t('changePassTitle')) + '</h1>' + (forced ? '<p class="sub">' + esc(t('setPassSub')) + '</p>' : '') +
      '<label for="pc">' + esc(forced ? t('tempPass') : t('curPass')) + '</label><input id="pc" type="password" autocomplete="current-password" maxlength="64" dir="ltr">' +
      '<label for="pn">' + esc(t('newPass')) + '</label><input id="pn" type="password" autocomplete="new-password" maxlength="64" dir="ltr">' +
      '<label for="pn2">' + esc(t('newPass2')) + '</label><input id="pn2" type="password" autocomplete="new-password" maxlength="64" dir="ltr">' +
      '<button class="btn" id="psave" type="button">' + esc(t('savePass')) + '</button>' +
      (forced ? '' : '<button class="btn ghost" id="pback" type="button">' + esc(t('cancel')) + '</button>') +
      '<div class="err" id="err" role="alert"></div></section>';
  var out = document.getElementById('accOut'); if(out) out.onclick = function(){ custSignOut(); };
  var back = document.getElementById('pback'); if(back) back.onclick = function(){ viewMyCard(); };
  document.getElementById('psave').onclick = function(){
    var err = document.getElementById('err'), cur = document.getElementById('pc').value, np = document.getElementById('pn').value, np2 = document.getElementById('pn2').value;
    if(!cur){ err.textContent = errText('WRONG_PIN'); return; }
    if(np.length < 8){ err.textContent = errText('WEAK_PASS'); return; }
    if(np !== np2){ err.textContent = t('passMismatch'); return; }
    var btn = this; btn.disabled = true;
    api('custChangePassword', CTOKEN, cur, np).then(function(r){
      btn.disabled = false;
      if(!r.ok){ if(r.error === 'NO_SESSION') return custSignOut(t('sessionExpired')); err.textContent = errText(r.error); return; }
      CTOKEN = r.token; store('tp_ctok', CTOKEN);
      viewMyCard(t('passSaved'));
    });
  };
  bindCommon(function(){ renderSetPassword(name, forced); });
}

/* تثبيت التطبيق على الشاشة الرئيسية */
var INSTALL_EVT = null;
window.addEventListener('beforeinstallprompt', function(e){ e.preventDefault(); INSTALL_EVT = e; var b = document.getElementById('instBox'); if(b) b.hidden = false; });
function isStandalone(){ return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
function installBox(){
  if(isStandalone()) return '';
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if(ios) return '<p class="sub hint install-hint">' + esc(t('iosInstall')) + '</p>';
  return '<div id="instBox"' + (INSTALL_EVT ? '' : ' hidden') + '><button class="btn ghost" id="instBtn" type="button">' + esc(t('installApp')) + '</button></div>';
}
function bindInstall(){
  var b = document.getElementById('instBtn');
  if(b) b.onclick = function(){ if(!INSTALL_EVT) return; INSTALL_EVT.prompt(); INSTALL_EVT.userChoice.then(function(){ INSTALL_EVT = null; var x = document.getElementById('instBox'); if(x) x.hidden = true; }); };
}
