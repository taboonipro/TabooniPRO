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
/* 1) الاشتراك: الزبون بيسجّل لحاله وبيختار كلمة سر، وبيشوف بطاقته طوالي */
var JOIN_T0 = 0;
function viewJoin(keep){
  keep = keep || {phone:'', name:'', gender:'', bday:''};
  if(!JOIN_T0) JOIN_T0 = Date.now();
  $app.className = 'wrap';
  $app.innerHTML = demoBar() + header() +
    '<section class="panel"><h1>' + esc(t('joinTitle')) + '</h1><p class="sub">' + esc(t('joinSub')) + '</p>' +
      '<label for="nm">' + esc(t('nameLabel')) + '</label><input id="nm" type="text" autocomplete="name" maxlength="40" placeholder="' + esc(t('namePh')) + '">' +
      '<label for="ph">' + esc(t('phoneLabel')) + '</label><input id="ph" type="tel" inputmode="tel" dir="ltr" autocomplete="username" placeholder="05XXXXXXXX">' +
      personFields('j', keep.gender, keep.bday) +
      '<label for="jp">' + esc(t('newPass')) + '</label><input id="jp" type="password" autocomplete="new-password" maxlength="64" dir="ltr">' +
      '<label for="jp2">' + esc(t('newPass2')) + '</label><input id="jp2" type="password" autocomplete="new-password" maxlength="64" dir="ltr">' +
      // فخ للبوتات: خانة مخفية عن البشر
      '<div aria-hidden="true" style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;opacity:0;pointer-events:none"><label>Website<input id="jw" type="text" tabindex="-1" autocomplete="off"></label></div>' +
      consentBox() +
      '<button class="btn" id="send" type="button">' + esc(t('joinBtn')) + '</button><div class="err" id="err" role="alert"></div>' +
      '<p class="sub hint" style="margin:14px 0 0">' + esc(t('haveAccount')) + ' <a href="' + esc(APP_URL) + '">' + esc(t('loginBtn')) + '</a></p>' +
    '</section>' + howPanel();
  var ph = document.getElementById('ph'), nm = document.getElementById('nm');
  ph.value = keep.phone; nm.value = keep.name;
  bindCommon(function(){ var pp = readPerson('j'); viewJoin({phone:ph.value, name:nm.value, gender:pp.gender, bday:pp.bday}); });
  document.getElementById('send').onclick = function(){
    var err = document.getElementById('err'), p = normPhone(ph.value), pw = document.getElementById('jp').value, pw2 = document.getElementById('jp2').value;
    if(!nm.value.trim()){ err.textContent = errText('NEED_NAME'); nm.focus(); return; }
    if(!validName(nm.value)){ err.textContent = errText('BAD_NAME'); nm.focus(); return; }
    if(!/^05\d{8}$/.test(p)){ err.textContent = errText('BAD_PHONE'); ph.focus(); return; }
    var pp = readPerson('j');
    if(!pp.gender){ err.textContent = errText('NEED_GENDER'); return; }
    if(pp.partial){ err.textContent = errText('BAD_BDAY'); return; }
    if(!strongPass(pw, p)){ err.textContent = errText('WEAK_PASS'); document.getElementById('jp').focus(); return; }
    if(pw !== pw2){ err.textContent = t('passMismatch'); document.getElementById('jp2').focus(); return; }
    if(!document.getElementById('cs').checked){ err.textContent = errText('NEED_CONSENT'); return; }
    var btn = this; btn.disabled = true; btn.textContent = t('sending');
    var form = {name:nm.value.trim(), phone:p, gender:pp.gender, bday:pp.bday, password:pw, consent:true, website:document.getElementById('jw').value, ms:Date.now() - JOIN_T0};
    api('signup', form).then(function(r){
      if(!r.ok && r.error === 'PHONE_UNVERIFIED'){ btn.disabled = false; btn.textContent = t('joinBtn'); err.textContent = ''; return takeoverBox(form); }
      if(!r.ok){ btn.disabled = false; btn.textContent = t('joinBtn'); err.textContent = errText(r.error) + (r.detail ? ' [' + r.detail + ']' : ''); return; }
      store('tp_user', p);   // رقمه بيكون جاهز بشاشة الدخول
      try{ history.replaceState(null, '', location.pathname); }catch(e){}
      viewSignedUp(nm.value.trim());
    });
  };
}
/* ---------- تأكيد الرقم بالواتساب ----------
   الزبون بيكبس ← الواتساب بيفتح على رقم طابوني برو والرسالة جاهزة فيها رمز ← بيكبس إرسال.
   السيرفر بيستلم الرسالة من Meta (مع رقم المرسل الحقيقي) وبيأكّد. التطبيق بيفحص كل كم ثانية. */
// الرسالة فيها رابط: الإدارة بتكبس عليه من جوّا الواتساب ← شاشة موافقة بكبسة (?ok= تأكيد، ?tk= استرجاع رقم)
function waHref(v){
  var tk = v.kind === 'tk';
  var msg = t(tk ? 'waTakeMsg' : 'waVerifyMsg').replace('{code}', v.code) + '\n' + t('waApproveLink') + ' ' + APP_URL + '?' + (tk ? 'tk' : 'ok') + '=' + v.code;
  return 'https://wa.me/' + encodeURIComponent(v.wa) + '?text=' + encodeURIComponent(msg);
}
function verifyBox(v, title, text, btn){
  return '<section class="panel verify" id="vbox"><h2 class="sec">' + esc(title || t('verifyTitle')) + '</h2><p class="sub" style="margin-bottom:10px">' + esc(text || t('verifyText')) + '</p>' +
    '<a class="btn wa" id="vGo" target="_blank" rel="noopener" href="' + esc(waHref(v)) + '">' + CHAT_ICO + esc(btn || t('verifyBtn')) + '</a>' +
    '<p class="sub vwait" id="vWait" hidden>' + esc(t('verifyWaiting')) + '</p>' +
    '<p class="sub" style="margin:8px 0 0;font-size:13px">' + esc(t('verifyCodeIs')) + ' <b dir="ltr" style="letter-spacing:2px">' + esc(v.code) + '</b></p></section>';
}
// بيفحص كل 3-4 ثواني (وفوراً لما يرجع من الواتساب) لحد ما check يرجّع true أو تخلص المدة
var VPOLL = null;
function pollVerify(check, done){
  stopPoll();
  var t0 = Date.now(), busy = false;
  function tick(){
    if(busy || document.hidden) return;
    if(Date.now() - t0 > 30 * 60 * 1000) return stopPoll();
    busy = true;
    check().then(function(ok){ busy = false; if(ok){ stopPoll(); done(); } }, function(){ busy = false; });
  }
  VPOLL = { iv: setInterval(tick, 3500), vis: function(){ if(!document.hidden) tick(); } };
  document.addEventListener('visibilitychange', VPOLL.vis);
}
function stopPoll(){ if(VPOLL){ clearInterval(VPOLL.iv); document.removeEventListener('visibilitychange', VPOLL.vis); VPOLL = null; } }
function bindVerify(check, done){
  var go = document.getElementById('vGo'); if(!go) return;
  go.addEventListener('click', function(){ var w = document.getElementById('vWait'); if(w) w.hidden = false; });
  pollVerify(check, done);
}
// صاحب الرقم بيسترجع رقمه من حساب مش مؤكد، وبعدها التسجيل بيكمل لحاله
function takeoverBox(form){
  var err = document.getElementById('err');
  api('startTakeover', form.phone).then(function(r){
    if(!r.ok){ err.textContent = errText(r.error === 'NOT_FOUND' ? 'PHONE_TAKEN' : r.error); return; }
    r.kind = 'tk';
    var holder = document.getElementById('tkBox');
    if(!holder){ holder = document.createElement('div'); holder.id = 'tkBox'; err.parentNode.insertBefore(holder, err.nextSibling); }
    holder.innerHTML = verifyBox(r, t('takeTitle'), t('takeText'), t('takeBtn'));
    holder.scrollIntoView({behavior:'smooth', block:'center'});
    bindVerify(function(){ return api('takeoverStatus', form.phone, r.code).then(function(s){ return !!(s && s.ok && s.done); }); }, function(){
      holder.innerHTML = '<div class="toast" role="status">' + esc(t('verifiedOk')) + '</div>';
      form.ms = Math.max(form.ms, 5000);
      api('signup', form).then(function(r2){
        if(!r2.ok){ err.textContent = errText(r2.error); return; }
        store('tp_user', form.phone);
        try{ history.replaceState(null, '', location.pathname); }catch(e){}
        viewSignedUp(form.name);
      });
    });
  });
}

// "تم التسجيل بنجاح" ← بعد ثواني رجوع لحاله لشاشة الدخول
function viewSignedUp(name){
  $app.className = 'wrap';
  $app.innerHTML = header() + '<section class="panel done-panel" role="status"><div class="done-check" aria-hidden="true">✓</div>' +
    '<h1>' + esc(t('signedUpTitle')) + '</h1><p class="sub">' + esc(fill(t('signedUpText'), name)) + '</p>' +
    '<div class="done-bar"><i></i></div><button class="btn" id="goLogin" type="button">' + esc(t('loginBtn')) + '</button></section>';
  var go = function(){ clearTimeout(tm); renderLogin(); };
  var tm = setTimeout(go, 3500);
  document.getElementById('goLogin').onclick = go;
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
  var vbox = opts.mine && opts.verify ? verifyBox(opts.verify) : '';
  var pend = opts.mine && opts.pending ? '<section class="panel review"><h2 class="sec">' + esc(t('pendingTitle')) + '</h2><p class="sub" style="margin-bottom:0">' + esc(tq('pendingText', opts.pending.qty)) + '</p>' +
    '<button class="btn" id="goRate" type="button">★ ' + esc(t('pendingBtn')) + '</button></section>' : '';
  $app.className = 'wrap';
  $app.innerHTML = demoBar() + header() + (opts.mine ? accountBtns() : '') + toast + (opts.flash ? '<div class="toast" role="status">' + esc(opts.flash) + '</div>' : '') + vbox + pend + review + contact + (opts.mine ? installBox() : '') +
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
  if(opts.mine && opts.verify) bindVerify(verifyCheckMe, afterVerified);
  var gr2 = document.getElementById('goRate'); if(gr2) gr2.onclick = function(){ rateMine(card, opts.pending); };
  bindCommon(function(){ renderCard(card, {reviewUrl: opts.reviewUrl, contactPhone: opts.contactPhone, comment: opts.comment, mine: opts.mine, pending: opts.pending, verify: opts.verify}); });
}

/* روابط بدون دخول: ?t= تقييم (لزبون بدون حساب)، ?new=1 انضمام.
   روابط بطاقة قديمة (?c=) ← شاشة الدخول: البطاقة صارت بالحساب بس */
function routeLink(p){
  if(p.t) viewFeedback(p.t);
  else if(p.c){ try{ history.replaceState(null, '', location.pathname); }catch(e){} if(CTOKEN) viewMyCard(); else renderLogin(t('cardInApp')); }
  else if(CTOKEN){ try{ history.replaceState(null, '', location.pathname); }catch(e){} viewMyCard(); }   // داخل أصلاً ← بطاقته
  else viewJoin();
}

/* ========= الزبون بعد تسجيل الدخول ========= */
var CTOKEN = store('tp_ctok') || '';
function custSignOut(msg){
  stopPoll();
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
  stopPoll();
  if(r.waitApproval) return viewWaiting(r.name, r.verify);
  var p = (r.pending || [])[0];
  if(p) return rateMine(r.card, p);
  renderCard(r.card, {mine:true, flash:flash, verify:r.verify});
}
// لما الرقم يتأكد بالواتساب: البطاقة بتتحدّث لحالها
function verifyCheckMe(){ return api('custMe', CTOKEN).then(function(m){ return !!(m && m.ok && !m.verify && !m.waitApproval); }); }
function afterVerified(){ api('custMe', CTOKEN).then(function(m){ if(m && m.ok) showMine(m, t('verifiedOk')); }); }
// سجّل على رقم كان إله بطاقة: بنستنى موافقة الإدارة قبل ما نعرض البطاقة القديمة
function viewWaiting(name, verify){
  $app.className = 'wrap';
  $app.innerHTML = demoBar() + header() + accountBtns(true) +
    (verify ? verifyBox(verify, t('verifyTitle'), t('verifyOldCard')) :
    '<section class="panel">' + (name ? '<p class="hello">' + esc(t('hiName')) + ' ' + esc(name) + ' \uD83D\uDC4B</p>' : '') +
      '<h1>' + esc(t('waitTitle')) + '</h1><p class="sub">' + esc(t('waitText')) + '</p>' +
      '<button class="btn ghost" id="wRe" type="button">' + esc(t('retry')) + '</button></section>') + howPanel();
  document.getElementById('accOut').onclick = function(){ stopPoll(); custSignOut(); };
  var re = document.getElementById('wRe'); if(re) re.onclick = function(){ viewMyCard(); };
  if(verify) bindVerify(verifyCheckMe, afterVerified);
  bindCommon(function(){ viewWaiting(name, verify); });
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
window.addEventListener('appinstalled', function(){ store('tp_installed', '1'); closeInstallSheet(); });

/* نافذة "ثبّت التطبيق" بتقفز لكل زائر (بأي متصفح):
   أندرويد/كمبيوتر (Chrome, Edge, Samsung): زر تثبيت حقيقي
   آيفون: شرح بخطوتين مع أيقونة زر المشاركة
   متصفح داخل تطبيق (فيسبوك، إنستغرام…): "افتح بالمتصفح" أول
   "مش هلأ" ← بترجع بعد 3 أيام */
function installEnv(){
  var ua = navigator.userAgent || '';
  var ios = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var android = /android/i.test(ua);
  var inApp = /FBAN|FBAV|FB_IAB|Instagram|Line\/|Snapchat|TikTok|musical_ly|; wv\)/i.test(ua);
  return {ios:ios, android:android, inApp:inApp, iosChrome:ios && /CriOS|EdgiOS|FxiOS/i.test(ua), mobile:ios || android};
}
var SHARE_ICO = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-5px"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
var MENU_ICO = '<b style="font-size:20px;line-height:1">⋮</b>';
var ADD_ICO = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" style="vertical-align:-4px"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';
function installSnoozed(){
  if(store('tp_installed')) return true;
  var t0 = Number(store('tp_inst_skip') || 0);
  return t0 && Date.now() - t0 < 3 * 864e5;
}
function closeInstallSheet(){ var x = document.getElementById('instSheet'); if(x) x.remove(); }
function showInstallSheet(force){
  if(isStandalone() || document.getElementById('instSheet') || (!force && installSnoozed())) return;
  var env = installEnv(), body = '', canPrompt = !!INSTALL_EVT;
  if(env.inApp) body = '<p>' + esc(t('instInApp')) + '</p><ol class="isteps"><li>' + MENU_ICO + ' ' + esc(t(env.ios ? 'instInAppIos' : 'instInAppAnd')) + '</li></ol>';
  else if(canPrompt) body = '<p>' + esc(t('instWhy')) + '</p>';
  else if(env.ios) body = '<p>' + esc(t('instWhy')) + '</p><ol class="isteps"><li>' + esc(t(env.iosChrome ? 'instIos1c' : 'instIos1')) + ' ' + SHARE_ICO + '</li><li>' + esc(t('instIos2')) + ' ' + ADD_ICO + '</li><li>' + esc(t('instIos3')) + '</li></ol>';
  else if(env.android) body = '<p>' + esc(t('instWhy')) + '</p><ol class="isteps"><li>' + esc(t('instAnd1')) + ' ' + MENU_ICO + '</li><li>' + esc(t('instAnd2')) + '</li></ol>';
  else return;   // كمبيوتر بدون دعم تثبيت: ما بنزعج
  var d = document.createElement('div');
  d.id = 'instSheet'; d.className = 'isheet'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'instT');
  d.innerHTML = '<div class="isheet-box"><img src="assets/icon-192.png" alt="" class="iicon"><h2 id="instT">' + esc(t('instTitle')) + '</h2>' + body +
    '<div class="iacts">' + (canPrompt && !env.inApp ? '<button class="btn" id="instGo" type="button">' + esc(t('installApp')) + '</button>' : '') +
    '<button class="btn ghost" id="instNo" type="button">' + esc(canPrompt && !env.inApp ? t('instLater') : t('instOk')) + '</button></div></div>';
  document.body.appendChild(d);
  var go = document.getElementById('instGo');
  if(go) go.onclick = function(){
    if(!INSTALL_EVT) return closeInstallSheet();
    INSTALL_EVT.prompt();
    INSTALL_EVT.userChoice.then(function(c){ INSTALL_EVT = null; if(c && c.outcome === 'accepted') store('tp_installed', '1'); else store('tp_inst_skip', String(Date.now())); closeInstallSheet(); });
  };
  document.getElementById('instNo').onclick = function(){ store('tp_inst_skip', String(Date.now())); closeInstallSheet(); };
  d.addEventListener('click', function(e){ if(e.target === d){ store('tp_inst_skip', String(Date.now())); closeInstallSheet(); } });
  (go || document.getElementById('instNo')).focus();
}
// بعد ما الصفحة تفتح: بنستنى شوي زر التثبيت من المتصفح (أندرويد)، وبعدين بنعرض النافذة
function scheduleInstallSheet(){
  if(isStandalone() || installSnoozed()) return;
  var waited = 0;
  (function tick(){
    if(INSTALL_EVT || waited >= 3500) return showInstallSheet();
    var env = installEnv();
    if(env.ios || env.inApp) return showInstallSheet();
    waited += 500; setTimeout(tick, 500);
  })();
}
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
