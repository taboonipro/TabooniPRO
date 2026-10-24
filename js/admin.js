/* ========= لوحة الإدارة ========= */
var LINK_ICO = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/></svg>';
/* سجل هدايا الزبون: متى استحقها ومتى استلمها (مرجع إذا صار خلاف) */
function giftHist(list){
  if(!list || !list.length) return '';
  return '<div class="ghist">' + list.map(function(g){
    var got = g.status === 'redeemed';
    return '<div class="gh' + (got ? ' got' : '') + '">\uD83C\uDF81 <b>' + esc(t(g.type)) + '</b> · ' + esc(t('giftEarned')) + ' ' + esc(fmtDate(g.earnedAt)) + ' · ' +
      (got ? '<span class="ok">✓ ' + esc(t('giftGot')) + ' ' + esc(g.redeemedAt ? fmtDate(g.redeemedAt) : t('giftNoDate')) + '</span>' : '<span class="wait">' + esc(t('giftWaiting')) + '</span>') + '</div>';
  }).join('') + '</div>';
}
/* ========= أيقونات (SVG داخلية، خطوط ناعمة، بتاخذ لون النص) ========= */
var ICO_P = {
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  trend:'<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
  gift:'<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
  chat:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/>',
  cake:'<path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20M7 8v3M12 8v3M17 8v3M7 4h.01M12 4h.01M17 4h.01"/>',
  star:'<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  link:'<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  user:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  home:'<path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  chart:'<path d="M6 20V10M12 20V4M18 20v-7"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h10"/>',
  chev:'<path d="M15 6l-6 6 6 6"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  refresh:'<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/>',
  hourglass:'<path d="M6 2h12M6 22h12M6 2c0 6 6 6 6 10s-6 4-6 10M18 2c0 6-6 6-6 10s6 4 6 10"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  stamp:'<circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1.3"/><circle cx="14.5" cy="9" r="1.1"/><circle cx="13.5" cy="14.5" r="1.4"/><circle cx="8.5" cy="14.5" r="1"/>',
  store:'<path d="M3 9l1.5-5h15L21 9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M5 12v8h14v-8"/>'
};
function ico(n, cls){ return '<svg class="i ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICO_P[n] || '') + '</svg>'; }
var TAB_ICO = {customers:'users', follow:'trend', gifts:'gift', nudges:'chat', bdays:'cake', recent:'star', links:'hourglass', import:'upload', settings:'gear'};
// صورة الزبون: أول حرفين من اسمه، بلون ثابت حسب الاسم
function avatar(name, online){
  var w = String(name || '?').trim().split(/\s+/), s = (w[0] || '?').charAt(0) + (w[1] ? w[1].charAt(0) : ''), h = 0, i;
  for(i = 0; i < String(name).length; i++) h = (h * 31 + String(name).charCodeAt(i)) % 360;
  return '<span class="av" style="--h:' + h + '" aria-hidden="true">' + esc(s) + (online ? '<i class="dot"></i>' : '') + '</span>';
}
var $app = document.getElementById('app');
var SESSION = sstore('tp_sess') || '';
var ADM = {tab:null, q:'', data:null, last:null, flash:'', rv:'neg', adding:false};

function viewAdmin(){
  if(!SESSION) return renderLogin();
  api('adminDashboard', SESSION).then(function(r){
    if(!r.ok){ if(r.error === 'NO_SESSION'){ SESSION = ''; sstore('tp_sess', null); return renderLogin(t('sessionExpired')); } $app.innerHTML = '<p class="err">' + esc(errText(r.error)) + '</p>'; return; }
    ADM.data = r;
    // رابط التطبيق بيتحفظ بالسيرفر تلقائياً (لتحويل روابط Apps Script القديمة للتطبيق)
    if(IS_LIVE && !r.settings.PUBLIC_URL && /^https:/.test(APP_URL)) api('adminSaveSettings', SESSION, {PUBLIC_URL: APP_URL});
    if(!ADM.tab) ADM.tab = r.followUps.length ? 'follow' : r.gifts.length ? 'gifts' : 'customers';
    if(IS_LIVE) GREVIEW = r.settings.GOOGLE_REVIEW_URL || '';
    renderAdmin();
  });
}
function renderAdmin(){
  var d = ADM.data, st = d.stats;
  var nudgeOpen = d.nudges.filter(function(n){ return !n.sent; }).length;
  var tabs = [['customers', t('tCustomers'), 0], ['follow', t('tFollow'), d.followUps.length], ['gifts', t('tGifts'), d.gifts.length],
              ['nudges', t('tNudges'), nudgeOpen], ['bdays', t('tBdays'), (d.birthdays || []).filter(function(b){ return !b.sent && b.days <= 7; }).length], ['recent', t('tRecent'), 0], ['links', t('tLinks'), 0], ['import', t('tImport'), 0], ['settings', t('tSettings'), 0]];
  $app.className = 'wrap wide';
  $app.innerHTML = demoBar() +
    '<header class="ahead"><div class="brand-row">' + logoImg(64) + '<div><h1>' + esc(t('adminTitle')) + '</h1><small>' + esc(t('brand')) + '</small></div></div>' +
      '<div class="hacts"><div class="langseg" role="group"><button type="button" class="lseg' + (LANG === 'ar' ? ' on' : '') + '" data-lang="ar">' + (LANG === 'ar' ? ico('globe') : '') + 'عربي</button><button type="button" class="lseg' + (LANG === 'he' ? ' on' : '') + '" data-lang="he">' + (LANG === 'he' ? ico('globe') : '') + 'עברית</button></div>' +
      '<button class="ibtn" id="rf" type="button" title="' + esc(t('refresh')) + '" aria-label="' + esc(t('refresh')) + '">' + ico('refresh') + '</button>' +
      '<button class="ibtn" id="lo" type="button" title="' + esc(t('logout')) + '" aria-label="' + esc(t('logout')) + '">' + ico('logout') + '</button></div></header>' +
    (ADM.flash ? '<div class="toast gift" role="status">' + esc(ADM.flash) + '</div>' : '') +
    '<div class="stats">' +
      stat(st.followUps, t('sFollow'), st.followUps ? 'alert' : '', 'star', 'follow') +
      stat(st.pendingGifts, t('sGifts'), st.pendingGifts ? 'goldb' : '', 'gift', 'gifts') +
      stat(st.avgRating === null ? '–' : st.avgRating, t('sAvg'), '', 'chart', 'recent') +
      stat(st.stampsMonth, t('sStamps'), '', 'stamp', 'recent') +
      stat(st.customers, t('sCustomers'), 'wide', 'users', 'customers') +
    '</div>' +
    '<div class="adm-grid">' +
      '<aside class="adm-side"><section class="panel linkcard"><div class="lc-head"><div><h2 class="sec">' + esc(t('newStamp')) + '</h2><p class="sub" style="margin:0">' + esc(t('newStampHint')) + '</p></div><span class="lc-ico">' + ico('link') + '</span></div>' +
        '<label for="ph" class="sr">' + esc(t('whoLabel')) + '</label><div class="ac withico">' + ico('user', 'fi') + '<input id="ph" type="text" autocomplete="off" placeholder="' + esc(t('whoPh')) + '" role="combobox" aria-autocomplete="list" aria-controls="acl"><div class="acl" id="acl" role="listbox"></div></div>' +
        '<label for="qty">' + esc(t('qtyLabel')) + '</label>' + qtyStepper('qty') +
        '<label for="nt">' + esc(t('note')) + '</label><input id="nt" type="text" maxlength="100" placeholder="' + esc(t('notePh')) + '">' +
        '<button class="btn goldfill" id="mk" type="button">' + ico('link') + esc(t('createLink')) + '</button><div class="err" id="err" role="alert"></div>' +
        '<div id="res">' + resultBox() + '</div></section></aside>' +
      '<main id="amain"><div class="tabs" role="tablist">' + tabs.map(function(x){ var sec = ['links', 'import', 'settings'].indexOf(x[0]) > -1; return '<button class="tab' + (sec ? ' sec' : '') + '" role="tab" type="button" data-tab="' + x[0] + '" aria-selected="' + (ADM.tab === x[0]) + '">' + ico(TAB_ICO[x[0]]) + '<span>' + esc(x[1]) + '</span>' + (x[2] ? '<span class="badge">' + x[2] + '</span>' : '') + '</button>'; }).join('') +
      '</div><div id="tabBody">' + tabBody() + '</div></main></div>' + bottomNav();
  ADM.flash = '';
  document.getElementById('rf').onclick = viewAdmin;
  document.getElementById('lo').onclick = function(){ adminSignOut(); };
  document.querySelectorAll('.tab').forEach(function(b){ b.onclick = function(){ ADM.tab = b.dataset.tab; renderAdmin(); }; });
  bindAdminChrome();
  document.getElementById('mk').onclick = createToken;
  bindWho();
  bindResult(); bindTab(); bindQty(); bindCommon(renderAdmin);
}
function sendStampLink(phone, name, btn){
  var gender = (btn && btn.dataset.gender) || '';
  var dlg = document.getElementById('qr');
  dlg.innerHTML = '<h2>' + esc(t('sendStampLink')) + ' · ' + esc(name || phone) + '</h2><p class="sub" dir="ltr" style="margin:0 0 10px">' + esc(phone) + '</p>' +
    '<label for="dq" style="text-align:start">' + esc(t('qtyLabel')) + '</label>' + qtyStepper('dq') +
    '<button class="btn" id="dGo" type="button">' + esc(t('createFor')) + '</button><div class="err" id="dErr" role="alert"></div>' +
    '<button class="btn small ghost" type="button" id="qc" style="margin-top:12px">' + esc(t('close')) + '</button>';
  bindQty();
  document.getElementById('qc').onclick = function(){ dlg.close(); };
  document.getElementById('dGo').onclick = function(){
    var go = this, q = qtyVal('dq'); go.disabled = true;
    api('adminCreateToken', SESSION, phone, '', q).then(function(r){
      if(!r.ok){ go.disabled = false; if(r.error === 'NO_SESSION'){ dlg.close(); SESSION = ''; sstore('tp_sess', null); return renderLogin(t('sessionExpired')); } document.getElementById('dErr').textContent = errText(r.error); return; }
      var msg = r.inApp ? fill(tqg('orderAppMsg', q, gender), name) + APP_URL : fill(tqg('waMsgNamed', q, gender), name) + tokenUrl(r.token);
      go.outerHTML = (r.inApp ? '<p class="sub" style="margin:0 0 10px;color:var(--gold)">' + esc(t('orderInApp')) + '</p>' : '<p class="sub" style="margin:0 0 10px">' + esc(t('orderNoLogin')) + '</p>') +
        '<a class="btn wa" id="waGo" target="_blank" rel="noopener" href="' + esc(waLink(phone, msg)) + '">' + CHAT_ICO + esc(r.inApp ? t('sendNudge') : t('sendWa')) + ' · ' + esc(tq('qtyPizzas', q)) + '</a>';
      document.querySelectorAll('#qr .qty button, #qr .qty input').forEach(function(el){ el.disabled = true; });
      document.getElementById('waGo').onclick = function(){ setTimeout(function(){ dlg.close(); viewAdmin(); }, 300); };
    });
  };
  if(dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  if(btn) btn.disabled = false;
}
function hint(k){ return '<p class="sub hint">' + esc(t(k)) + '</p>'; }
function waBtn(phone, msg, cls, label, extra){ return phone ? '<a class="btn small wa ' + (cls || '') + '" target="_blank" rel="noopener" href="' + esc(waLink(phone, msg)) + '"' + (extra || '') + '>' + CHAT_ICO + esc(label || t('whatsapp')) + '</a>' : ''; }
function fbRow(f, withActs){
  return '<div class="item' + (f.rating < 4 ? ' neg' : '') + '"><div style="flex:1;min-width:200px"><b>' + esc(f.name) + '</b> ' + stars(f.rating) +
    (f.rating < 4 ? ' <span class="pill ' + (f.followUp === 'needed' ? 'warn' : 'muted') + '">' + esc(f.followUp === 'needed' ? t('rNeeded') : t('rDone')) + '</span>' : '') +
    '<div class="meta">' + (f.phone ? '<span dir="ltr">' + esc(f.phone) + '</span> · ' : '') + esc(fmtDate(f.timestamp)) + '</div><p class="comment">' + esc(f.comment || t('noComment')) + '</p></div>' +
    (withActs ? '<div class="acts">' + (f.rating < 4 ? waBtn(f.phone, fill(t('followMsg'), f.name)) + (f.phone ? '<a class="btn small ghost" href="tel:' + esc(f.phone) + '">' + esc(t('call')) + '</a>' : '') +
      (f.followUp === 'needed' ? '<button class="btn small gold" type="button" data-done="' + esc(f.id) + '">' + esc(t('markDone')) + '</button>' : '') : '') +
      (f.id ? '<button class="btn small ghost danger" type="button" data-delfb="' + esc(f.id) + '">' + esc(t('delReview')) + '</button>' : '') + '</div>' : '') + '</div>';
}
// عدّاد عدد البيتسات (1-10) مع شرح كم طبعة بتنضاف
function qtyStepper(id){
  return '<div class="qty"><button type="button" class="qbtn" data-qd="' + id + '" data-d="-1" aria-label="−">−</button>' +
    '<input id="' + id + '" type="number" inputmode="numeric" min="1" max="10" value="1" dir="ltr">' +
    '<button type="button" class="qbtn" data-qd="' + id + '" data-d="1" aria-label="+">+</button>' +
    '<span class="qeq" id="' + id + 'Eq">' + esc(tq('qtyEq', 1)) + '</span></div>';
}
function qtyVal(id){ var el = document.getElementById(id); var n = Math.round(Number(el && el.value) || 1); return Math.max(1, Math.min(10, n)); }
function bindQty(){
  document.querySelectorAll('.qty input').forEach(function(inp){
    var eq = document.getElementById(inp.id + 'Eq');
    function upd(){ var n = qtyVal(inp.id); if(eq) eq.textContent = tq('qtyEq', n); }
    inp.oninput = upd; inp.onblur = function(){ inp.value = qtyVal(inp.id); upd(); };
  });
  document.querySelectorAll('[data-qd]').forEach(function(b){ b.onclick = function(){ var inp = document.getElementById(b.dataset.qd); inp.value = Math.max(1, Math.min(10, qtyVal(inp.id) + Number(b.dataset.d))); inp.oninput(); }; });
}
function bdayTxt(mmdd){ var p = String(mmdd || '').split('-'); if(p.length !== 2) return ''; return p[1] + '.' + p[0]; }
function editInfo(id){
  var c = (ADM.data.customers || []).filter(function(x){ return x.id === id; })[0]; if(!c) return;
  var dlg = document.getElementById('qr');
  dlg.innerHTML = '<h2>' + esc(t('editInfo')) + ' · ' + esc(c.name) + '</h2><div style="text-align:start">' + personFields('e', c.gender, c.bday) + '</div>' +
    '<button class="btn" id="eSave" type="button">' + esc(t('saveInfo')) + '</button><div class="err" id="eErr" role="alert"></div>' +
    '<button class="btn small ghost" type="button" id="qc" style="margin-top:12px">' + esc(t('close')) + '</button>';
  document.getElementById('qc').onclick = function(){ dlg.close(); };
  document.getElementById('eSave').onclick = function(){
    var pe = readPerson('e'), sv = this; if(pe.partial){ document.getElementById('eErr').textContent = errText('BAD_BDAY'); return; }
    sv.disabled = true;
    api('adminUpdateCustomerInfo', SESSION, id, pe.gender, pe.bday).then(function(r){
      if(!r.ok){ sv.disabled = false; document.getElementById('eErr').textContent = errText(r.error); return; }
      c.gender = pe.gender; c.bday = pe.bday; dlg.close(); renderAdmin(); viewAdmin();
    });
  };
  if(dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
}
function stat(v, label, cls, icon, go){
  return '<button type="button" class="stat ' + (cls || '') + '" data-go="' + esc(go || '') + '"><span class="si">' + ico(icon || 'star') + '</span><span class="sv"><b>' + esc(v) + '</b><span>' + esc(label) + '</span></span>' + ico('chev', 'chev') + '</button>';
}
function stars(n){ return '<span class="rate' + (n <= 3 ? ' low' : '') + '">' + '★★★★★'.slice(0, n) + '<span style="opacity:.25">' + '★★★★★'.slice(0, 5 - n) + '</span></span>'; }
function resultBox(){
  var L = ADM.last; if(!L) return '';
  var url = tokenUrl(L.token);
  var q = L.qty || 1;
  if(L.inApp) return '<div class="result"><b>' + esc(t('orderSaved')) + '</b> · ' + esc(L.customerName) + ' <span dir="ltr">' + esc(L.phone) + '</span> · <span class="pill">' + esc(tq('qtyPizzas', q)) + '</span>' +
    '<p class="sub" style="margin:8px 0">' + esc(t('orderInApp')) + '</p>' +
    '<a class="btn gold" target="_blank" rel="noopener" href="' + esc(waLink(L.phone, fill(tqg('orderAppMsg', q, L.gender), L.customerName) + APP_URL)) + '">' + esc(t('sendNudge')) + '</a></div>';
  return '<div class="result"><b>' + esc(t('linkReady')) + '</b> · ' + esc(L.customerName || t('newCustomer')) + ' <span dir="ltr">' + esc(L.phone) + '</span> · <span class="pill">' + esc(tq('qtyPizzas', q)) + '</span>' +
    '<p class="sub" style="margin:8px 0 0">' + esc(t('orderNoLogin')) + '</p>' +
    '<div class="linkrow"><input type="text" readonly value="' + esc(url) + '" aria-label="link"><button class="btn small ghost" id="cpl" type="button">' + esc(t('copy')) + '</button></div>' +
    '<a class="btn gold" target="_blank" rel="noopener" href="' + esc(waLink(L.phone, (L.customerName ? fill(tqg('waMsgNamed', q, L.gender), L.customerName) : tq('waMsg', q)) + url)) + '">' + esc(t('sendWa')) + '</a></div>';
}
function bindResult(){ var b = document.getElementById('cpl'); if(b) b.onclick = function(){ copyText(tokenUrl(ADM.last.token), b); }; }
// توحيد الأسماء للبحث: بدون تشكيل، أ/إ/آ = ا، ة = ه، ى = ي
function normName(s){ return String(s || '').toLowerCase().replace(/[\u064B-\u0652\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim(); }
function findCustomers(q){
  var n = normName(q), d = String(q).replace(/\D/g, ''), list = (ADM.data && ADM.data.customers) || [];
  if(!n && !d) return [];
  return list.filter(function(c){ return (n && normName(c.name).indexOf(n) > -1) || (d.length >= 3 && String(c.phone).indexOf(d) > -1); });
}
// اقتراحات وأنت بتكتب
function bindWho(){
  var ph = document.getElementById('ph'), box = document.getElementById('acl'); if(!ph || !box) return;
  function close(){ box.innerHTML = ''; box.classList.remove('open'); }
  function pick(c){ ADM.pick = {phone:c.phone, name:c.name}; ph.value = c.name; close(); document.getElementById('err').textContent = ''; }
  ph.oninput = function(){
    ADM.pick = null;
    var v = ph.value.trim(); if(!v || /^[\d\s+-]{6,}$/.test(v)){ close(); return; }
    var m = findCustomers(v).slice(0, 6);
    box.innerHTML = m.map(function(c, i){ return '<button type="button" role="option" class="aco" data-i="' + i + '"><b>' + esc(c.name) + '</b><span dir="ltr">' + esc(c.phone) + '</span></button>'; }).join('');
    box.classList.toggle('open', m.length > 0);
    box.querySelectorAll('.aco').forEach(function(b){ b.onmousedown = function(e){ e.preventDefault(); pick(m[+b.dataset.i]); }; });
  };
  ph.onblur = function(){ setTimeout(close, 150); };
  ph.onkeydown = function(e){
    if(e.key === 'Enter'){ var f = box.querySelector('.aco'); if(f && box.classList.contains('open') && !ADM.pick){ e.preventDefault(); f.onmousedown(e); return; } createToken(); }
    if(e.key === 'Escape') close();
  };
}
// لما في أكثر من زبون بنفس الاسم: بنسأل عن الرقم
function askWhich(list, name){
  var res = document.getElementById('res');
  res.innerHTML = '<div class="result"><b>' + esc(fill(t('dupName'), name)) + '</b><div class="list" style="margin-top:10px">' +
    list.map(function(c, i){ return '<button type="button" class="btn small ghost whopick" data-i="' + i + '" style="justify-content:space-between;width:100%"><span>' + esc(c.name) + '</span><span dir="ltr">' + esc(c.phone) + '</span></button>'; }).join('') +
    '</div><p class="sub" style="margin:10px 0 0">' + esc(t('orTypePhone')) + '</p></div>';
  res.querySelectorAll('.whopick').forEach(function(b){ b.onclick = function(){ var c = list[+b.dataset.i]; ADM.pick = {phone:c.phone, name:c.name}; document.getElementById('ph').value = c.name; res.innerHTML = ''; createToken(); }; });
}
function createToken(){
  var ph = document.getElementById('ph'), nt = document.getElementById('nt'), err = document.getElementById('err'), btn = document.getElementById('mk');
  var raw = ph.value.trim(), p = '';
  if(ADM.pick && raw === ADM.pick.name) p = ADM.pick.phone;
  else if(/^05\d{8}$/.test(normPhone(raw))) p = normPhone(raw);
  else if(raw && !/^[\d\s+-]+$/.test(raw)){
    var exact = ((ADM.data && ADM.data.customers) || []).filter(function(c){ return normName(c.name) === normName(raw); });
    var m = exact.length ? exact : findCustomers(raw);
    if(m.length === 1){ p = m[0].phone; ph.value = m[0].name; }
    else if(m.length > 1){ err.textContent = ''; askWhich(m, raw); return; }
    else { err.textContent = t('noMatch'); ph.focus(); return; }
  }
  if(!/^05\d{8}$/.test(p)){ err.textContent = errText('BAD_PHONE'); ph.focus(); return; }
  err.textContent = ''; btn.disabled = true;
  var q = qtyVal('qty');
  api('adminCreateToken', SESSION, p, nt.value, q).then(function(r){
    btn.disabled = false;
    if(!r.ok){ err.textContent = errText(r.error); return; }
    ADM.last = r; ADM.pick = null; ph.value = ''; nt.value = ''; document.getElementById('qty').value = 1; document.getElementById('qty').oninput();
    document.getElementById('res').innerHTML = resultBox(); bindResult();
    ADM.data.openTokens.unshift({token:r.token, phone:r.phone, createdAt:new Date().toISOString(), note:'', qty:r.qty || q});
  });
}

function tabBody(){
  var d = ADM.data, rows = [];
  if(ADM.tab === 'follow'){
    return hint('followHint') + '<div class="list">' + (d.followUps.map(function(f){ return fbRow(f, true); }).join('') || '<p class="empty">' + esc(t('empty')) + '</p>') + '</div>';
  } else if(ADM.tab === 'gifts'){
    rows = d.gifts.map(function(g){ return '<div class="item"><div style="display:flex;gap:12px;align-items:center"><span style="width:48px;display:block">' + pizzaSVG(true, g.type === 'BOAT') + '</span><div><b>' + esc(g.name) + '</b><div class="meta">' + esc(t(g.type)) + ' · <span dir="ltr">' + esc(g.phone) + '</span> · ' + esc(fmtDate(g.earnedAt)) + '</div></div></div>' +
      '<div class="acts">' + waBtn(g.phone, fill(tqg('giftMsg', 1, g.gender), g.name).replace('{gift}', t(g.type).replace(/ هدية$| במתנה$/, '')), 'ghost', t('notifyGift')) +
      '<button class="btn small gold" type="button" data-redeem="' + esc(g.rewardId) + '">' + esc(t('redeem')) + '</button></div></div>'; });
    return hint('giftsHint') + '<div class="list">' + (rows.join('') || '<p class="empty">' + esc(t('empty')) + '</p>') + '</div>';
  } else if(ADM.tab === 'bdays'){
    rows = (d.birthdays || []).map(function(b){ var nm = b.verified ? b.name : '';
      return '<div class="item' + (b.sent ? ' done' : '') + (b.days === 0 ? ' today' : '') + '"><div><b>' + esc(b.name) + '</b> <span class="pill' + (b.days === 0 ? '' : ' muted') + '">' + esc(b.days === 0 ? t('bdayToday') : tq('bdayIn', b.days)) + '</span>' +
        (b.sent ? ' <span class="pill muted">' + esc(t('bdayDone')) + '</span>' : '') +
        '<div class="meta">\uD83C\uDF82 ' + esc(bdayTxt(b.bday)) + ' · <span dir="ltr">' + esc(b.phone) + '</span>' + (b.gender ? '' : ' · ' + esc(t('noGender'))) + '</div></div>' +
        '<div class="acts">' + waBtn(b.phone, fill(tqg('bdayMsg', 1, b.gender), nm), b.sent ? 'ghost' : '', b.sent ? t('resend') : t('sendBday'), ' data-bday="' + esc(b.id) + '"') + '</div></div>'; });
    return hint('bdaysHint') + '<div class="list">' + (rows.join('') || '<p class="empty">' + esc(t('empty')) + '</p>') + '</div>';
  } else if(ADM.tab === 'nudges'){
    rows = d.nudges.map(function(n){ var nm = n.verified ? n.name : '';
      return '<div class="item' + (n.sent ? ' done' : '') + '"><div style="display:flex;gap:12px;align-items:center"><span style="width:48px;display:block">' + pizzaSVG(true, n.next === 'BOAT') + '</span><div><b>' + esc(n.name) + '</b>' +
        (n.sent ? ' <span class="pill muted">' + esc(t('reminderSent')) + '</span>' : '') +
        '<div class="meta">' + esc(t('oneLeft' + n.next)) + ' · ' + n.stamps + '/10 · <span dir="ltr">' + esc(n.phone) + '</span></div></div></div>' +
        '<div class="acts">' + waBtn(n.phone, fill(tqg('nudgeMsg' + n.next, 1, n.gender), nm), n.sent ? 'ghost' : '', n.sent ? t('resend') : t('sendReminder'), ' data-nudge="' + esc(n.id) + '"') + '</div></div>'; });
    return hint('nudgesHint') + '<div class="list">' + (rows.join('') || '<p class="empty">' + esc(t('empty')) + '</p>') + '</div>';
  } else if(ADM.tab === 'customers'){
    var q = ADM.q.trim().toLowerCase(), qd = q.replace(/\D/g, '');
    rows = d.customers.filter(function(c){ return !q || String(c.name).toLowerCase().indexOf(q) > -1 || (qd && String(c.phone).indexOf(qd) > -1); }).map(function(c){
      return '<div class="item cust">' + avatar(c.name, c.hasLogin && !c.mustChange) + '<div class="cinfo"><b>' + esc(c.name) + '</b>' + (c.openLink ? ' <span class="pill">' + esc(t('linkOpen')) + '</span>' : '') + (c.hasLogin ? ' <span class="pill' + (c.mustChange ? ' muted' : ' ok') + '" title="' + esc(c.lastLoginAt ? t('lastLogin') + ': ' + fmtDate(c.lastLoginAt) : '') + '">' + esc(c.mustChange ? t('loginPending') : t('loginOn')) + '</span>' : '') + (c.consent === false ? ' <span class="pill muted">' + esc(t('noConsent')) + '</span>' : '') + (c.verified === false ? ' <span class="pill warn">' + esc(t('unverified')) + '</span>' : '') + (!c.gender ? ' <span class="pill muted">' + esc(t('noGender')) + '</span>' : '') + (c.bday ? ' <span class="pill">\uD83C\uDF82 ' + esc(bdayTxt(c.bday)) + '</span>' : '') +
        '<div class="meta"><span dir="ltr">' + esc(c.phone) + '</span> · ' + c.stamps + '/10 ' + esc(t('stamps')) + (c.lastStampAt ? ' · ' + esc(fmtDate(c.lastStampAt)) : '') + '</div><div class="bar"><i style="width:' + (c.stamps * 10) + '%"></i></div>' + giftHist(c.gifts) + '</div>' +
        '<div class="acts"><button class="btn small" type="button" data-send="' + esc(c.phone) + '" data-name="' + esc(c.verified === false ? '' : c.name) + '" data-gender="' + esc(c.gender || '') + '">' + esc(t('sendStampLink')) + '</button>' +
        (c.hasLogin ? '' : '<button class="btn small gold" type="button" data-login="' + esc(c.id) + '">' + esc(t('makeLogin')) + '</button>') +
        '<details class="more"><summary class="btn small ghost">⋯</summary><div class="acts">' +
        '<button class="btn small ghost" type="button" data-plus="' + esc(c.id) + '">' + esc(t('addStamp')) + '</button><button class="btn small ghost" type="button" data-minus="' + esc(c.id) + '">' + esc(t('removeStamp')) + '</button>' +
        '<button class="btn small ghost" type="button" data-info="' + esc(c.id) + '">' + esc(t('editInfo')) + '</button>' +
        '<button class="btn small ghost" type="button" data-rename="' + esc(c.id) + '" data-name="' + esc(c.name) + '">' + esc(t('rename')) + '</button>' +
        '<button class="btn small gold" type="button" data-login="' + esc(c.id) + '" data-has="' + (c.hasLogin ? '1' : '') + '">' + esc(c.hasLogin ? t('resetLogin') : t('makeLogin')) + '</button>' +
        (c.hasLogin ? '<button class="btn small ghost" type="button" data-nologin="' + esc(c.id) + '">' + esc(t('disableLogin')) + '</button>' : '') +
        '<button class="btn small ghost danger" type="button" data-del="' + esc(c.id) + '" data-name="' + esc(c.name) + '">' + esc(t('deleteCustomer')) + '</button></div></details></div></div>'; });
    var addForm = ADM.adding ? '<section class="panel addform"><h2 class="sec">' + esc(t('addCustomer')) + '</h2><p class="sub" style="margin-bottom:0">' + esc(t('addCustomerHint')) + '</p>' +
        '<div class="row2"><div><label for="an">' + esc(t('customerName')) + '</label><input id="an" type="text" maxlength="40" autocomplete="off"></div>' +
        '<div><label for="ap">' + esc(t('phone')) + '</label><input id="ap" type="tel" inputmode="tel" dir="ltr" placeholder="05XXXXXXXX" autocomplete="off"></div></div>' +
        personFields('a', '', '') +
        '<div class="acts" style="margin-top:14px"><button class="btn small" id="aSave" type="button">' + esc(t('addBtn')) + '</button><button class="btn small ghost" id="aCancel" type="button">' + esc(t('cancel')) + '</button></div>' +
        '<div class="err" id="aErr" role="alert"></div></section>'
      : '<button class="btn addbtn" id="aOpen" type="button">' + ico('plus') + esc(t('addCustomer')) + '</button>';
    return addForm + '<div class="searchbox">' + ico('search', 'fi') + '<input type="search" id="q" placeholder="' + esc(t('search')) + '" value="' + esc(ADM.q) + '"></div>' +
      '<h3 class="lhead">' + ico('clock') + esc(t('custList')) + ' <small>' + rows.length + '</small></h3><div class="list">' + (rows.join('') || '<p class="empty">' + esc(t('empty')) + '</p>') + '</div>';
  } else if(ADM.tab === 'recent'){
    var rv = d.reviews, k = rv.counts, neg = ADM.rv === 'neg';
    var sw = '<div class="rvswitch">' +
      '<button type="button" class="rvtab neg' + (neg ? ' on' : '') + '" data-rv="neg"><span>' + esc(t('rNegative')) + '</span><b>' + k.negAll + '</b><small>' + esc(t('rMonth')) + ': ' + k.negMonth + ' · ' + esc(t('rOpen')) + ': ' + k.negOpen + '</small></button>' +
      '<button type="button" class="rvtab pos' + (!neg ? ' on' : '') + '" data-rv="pos"><span>' + esc(t('rPositive')) + '</span><b>' + k.posAll + '</b><small>' + esc(t('rMonth')) + ': ' + k.posMonth + '</small></button></div>';
    var list = (neg ? rv.negative : rv.positive).map(function(f){ return fbRow(f, true); }).join('');
    return sw + '<div class="list">' + (list || '<p class="empty">' + esc(t('empty')) + '</p>') + '</div>';
  } else if(ADM.tab === 'links'){
    rows = d.openTokens.map(function(x){ return '<div class="item"><div><span dir="ltr">' + esc(x.phone) + '</span><div class="meta">' + esc(fmtDate(x.createdAt)) + ' · ' + esc(tq('qtyPizzas', x.qty || 1)) + (x.note ? ' · ' + esc(x.note) : '') + '</div></div>' +
      '<div class="acts"><button class="btn small ghost" type="button" data-cancel="' + esc(x.token) + '">' + esc(t('cancelLink')) + '</button><a class="btn small gold" target="_blank" rel="noopener" href="' + esc(waLink(x.phone, tq('waMsg', x.qty || 1) + tokenUrl(x.token))) + '">' + esc(t('sendWa')) + '</a></div></div>'; });
  } else if(ADM.tab === 'import'){
    return '<section class="panel"><h2 class="sec">' + esc(t('tImport')) + '</h2><p class="sub" style="margin-bottom:8px">' + esc(t('importHint')) + '</p>' +
      '<textarea id="imp" style="min-height:180px" placeholder="أيمن 0501234567&#10;رنا 054-111-2233"></textarea>' +
      '<button class="btn" id="impBtn" type="button">' + esc(t('importBtn')) + '</button><div class="err" id="impRes" role="status" style="color:var(--gold)"></div></section>' +
      '<section class="panel"><h2 class="sec">' + esc(t('joinLinkTitle')) + '</h2><p class="sub" style="margin-bottom:8px">' + esc(t('joinLinkHint')) + '</p>' +
      (CUSTOMER_URL ? '' : '<p class="err">' + esc(t('needPublicUrl')) + '</p>') + '<div class="linkrow"><input type="text" readonly value="' + esc(CUSTOMER_URL ? CUSTOMER_URL + '?new=1' : '') + '" aria-label="link"><button class="btn small ghost" id="cpp" type="button">' + esc(t('copy')) + '</button><button class="btn small gold" id="qrp" type="button">' + esc(t('qr')) + '</button></div></section>';
  } else if(ADM.tab === 'settings'){
    var s = d.settings;
    return '<section class="panel"><h2 class="sec">' + esc(t('joinLinkTitle')) + '</h2><p class="sub" style="margin-bottom:8px">' + esc(t('joinLinkHint')) + '</p>' +
        (CUSTOMER_URL ? '' : '<p class="err">' + esc(t('needPublicUrl')) + '</p>') + '<div class="linkrow"><input type="text" readonly value="' + esc(CUSTOMER_URL ? CUSTOMER_URL + '?new=1' : '') + '" aria-label="link"><button class="btn small ghost" id="cpp" type="button">' + esc(t('copy')) + '</button><button class="btn small gold" id="qrp" type="button">' + esc(t('qr')) + '</button></div></section>' +
      '<section class="panel"><h2 class="sec">' + esc(t('tSettings')) + '</h2>' +
        '<label for="s0">' + esc(t('publicUrl')) + '</label><div class="linkrow"><input id="s0" type="url" dir="ltr" value="' + esc(s.PUBLIC_URL || '') + '" placeholder="https://…github.io/…/"><button class="btn small ghost" id="s0me" type="button">' + esc(t('useThisUrl')) + '</button></div>' +
        '<label for="s5">' + esc(t('googleUrl')) + '</label><input id="s5" type="url" dir="ltr" value="' + esc(s.GOOGLE_REVIEW_URL || '') + '" placeholder="https://g.page/r/…/review">' +
        '<label for="s7">' + esc(t('contactPhone')) + '</label><input id="s7" type="tel" dir="ltr" inputmode="tel" value="' + esc(s.CONTACT_PHONE || '') + '" placeholder="05XXXXXXXX">' +
        '<label for="s6">' + esc(t('reviewAsk')) + '</label><select id="s6"><option value="positive"' + (s.REVIEW_ASK !== 'all' ? ' selected' : '') + '>' + esc(t('askPositive')) + '</option><option value="all"' + (s.REVIEW_ASK === 'all' ? ' selected' : '') + '>' + esc(t('askAll')) + '</option></select>' +
        '<label for="s1">' + esc(t('setMin')) + '</label><input id="s1" type="number" min="1" max="5" value="' + esc(s.MIN_RATING_FOR_STAMP) + '">' +
        '<label for="s3">' + esc(t('setLow')) + '</label><input id="s3" type="number" min="0" max="5" value="' + esc(s.LOW_RATING_ALERT) + '">' +
        '<label for="s2">' + esc(t('setHours')) + '</label><input id="s2" type="number" min="1" max="720" value="' + esc(s.TOKEN_HOURS) + '">' +
        '<label for="s4">' + esc(t('setEmail')) + '</label><input id="s4" type="email" dir="ltr" value="' + esc(s.ALERT_EMAIL || '') + '">' +
        '<button class="btn" id="sv" type="button">' + esc(t('save')) + '</button><div class="err" id="serr" role="alert"></div></section>' +
      '<section class="panel"><h2 class="sec">' + esc(t('securityTitle')) + '</h2><p class="sub" style="margin-bottom:0">' + esc(t('securityHint')) + '</p>' +
        '<p class="sub" style="margin:10px 0 0">' + esc(t('currentUser')) + ' <b dir="ltr">' + esc(typeof staffName === 'function' ? staffName(d.adminUser) : (d.adminUser || '')) + '</b> · <span dir="ltr">v' + esc(APP_VERSION) + '</span></p>' +
        '<label for="p1">' + esc(t('curPin')) + '</label><input id="p1" type="password" autocomplete="current-password" dir="ltr">' +
        '<label for="p2">' + esc(t('newPin')) + '</label><input id="p2" type="password" autocomplete="new-password" minlength="8" dir="ltr">' +
        '<button class="btn ghost" id="cpin" type="button">' + esc(t('changePin')) + '</button><div class="err" id="perr" role="alert"></div>' +
        '<button class="btn ghost danger" id="lall" type="button">' + esc(t('logoutAll')) + '</button></section>';
  }
  return '<div class="list">' + (rows.join('') || '<p class="empty">' + esc(t('empty')) + '</p>') + '</div>';
}

// local: تحديث فوري للشاشة قبل ما يرجع السيرفر، وبعدها بنحدّث البيانات بالخلفية
function act(promise, btn, local){
  if(btn) btn.disabled = true;
  if(local){ try{ local(ADM.data); renderAdmin(); }catch(e){} }
  promise.then(function(r){
    if(!r.ok){ if(r.error === 'NO_SESSION'){ SESSION = ''; sstore('tp_sess', null); return renderLogin(t('sessionExpired')); } if(btn) btn.disabled = false; alert(errText(r.error)); return; }
    if(r.newReward) ADM.flash = t('rewardNow') + (r.name || '') + ' · ' + t(r.newReward);
    viewAdmin();
  });
}
function bindTab(){
  var q = document.getElementById('q');
  if(q) q.oninput = function(){ ADM.q = q.value; clearTimeout(ADM.qt); ADM.qt = setTimeout(function(){ var q = document.getElementById('q'); if(!q) return; var pos = q.selectionStart; document.getElementById('tabBody').innerHTML = tabBody(); bindTab(); var nq = document.getElementById('q'); nq.focus(); nq.setSelectionRange(pos, pos); }, 120); };
  function each(sel, fn){ document.querySelectorAll(sel).forEach(function(b){ b.onclick = function(){ fn(b); }; }); }
  each('[data-send]', function(b){ sendStampLink(b.dataset.send, b.dataset.name, b); });
  each('[data-info]', function(b){ editInfo(b.dataset.info); });
  document.querySelectorAll('[data-bday]').forEach(function(b){ b.addEventListener('click', function(){ var id = b.dataset.bday;
    setTimeout(function(){ (ADM.data.birthdays || []).forEach(function(x){ if(x.id === id) x.sent = true; }); renderAdmin(); }, 300);
    api('adminMarkBday', SESSION, id).then(function(r){ if(!r.ok) viewAdmin(); }); }); });
  document.querySelectorAll('[data-nudge]').forEach(function(b){ b.addEventListener('click', function(){ var id = b.dataset.nudge;
    setTimeout(function(){ ADM.data.nudges.forEach(function(n){ if(n.id === id) n.sent = true; }); renderAdmin(); }, 300);
    api('adminMarkNudged', SESSION, id).then(function(r){ if(!r.ok) viewAdmin(); }); }); });
  each('[data-rv]', function(b){ ADM.rv = b.dataset.rv; document.getElementById('tabBody').innerHTML = tabBody(); bindTab(); });
  var ao = document.getElementById('aOpen'); if(ao) ao.onclick = function(){ ADM.adding = true; document.getElementById('tabBody').innerHTML = tabBody(); bindTab(); document.getElementById('an').focus(); };
  var ac = document.getElementById('aCancel'); if(ac) ac.onclick = function(){ ADM.adding = false; document.getElementById('tabBody').innerHTML = tabBody(); bindTab(); };
  var as = document.getElementById('aSave');
  if(as) as.onclick = function(){
    var n = document.getElementById('an').value.trim(), p = normPhone(document.getElementById('ap').value), e = document.getElementById('aErr');
    if(!n){ e.textContent = errText('NEED_NAME'); return; }
    if(!validName(n)){ e.textContent = errText('BAD_NAME'); return; }
    if(!/^05\d{8}$/.test(p)){ e.textContent = errText('BAD_PHONE'); return; }
    var pa = readPerson('a'); if(pa.partial){ e.textContent = errText('BAD_BDAY'); return; }
    as.disabled = true;
    api('adminAddCustomer', SESSION, n, p, pa.gender, pa.bday).then(function(r){
      as.disabled = false;
      if(!r.ok){ if(r.error === 'NO_SESSION'){ SESSION = ''; sstore('tp_sess', null); return renderLogin(t('sessionExpired')); } e.textContent = errText(r.error); return; }
      ADM.adding = false; ADM.q = ''; ADM.flash = t('addedOk') + r.name; viewAdmin();
    });
  };
  var ib = document.getElementById('impBtn');
  if(ib) ib.onclick = function(){
    var list = document.getElementById('imp').value.split(/\n+/).map(function(line){
      var m = line.match(/(\+?972[\d\s-]{8,}|0?5[\d\s-]{8,})/); if(!m) return line.trim() ? {name:'', phone:''} : null;
      return {phone: normPhone(m[1]), name: line.replace(m[1], '').replace(/[,،;:|\t-]+/g, ' ').trim()};
    }).filter(Boolean);
    ib.disabled = true;
    api('adminImport', SESSION, list).then(function(r){
      ib.disabled = false;
      if(!r.ok){ document.getElementById('impRes').textContent = errText(r.error); return; }
      document.getElementById('imp').value = '';
      ADM.flash = fill(t('importResult'), '').replace('{a}', r.added).replace('{s}', r.skipped).replace('{i}', r.invalid);
      ADM.tab = 'customers'; viewAdmin();
    });
  };
  each('[data-done]', function(b){ var id = b.dataset.done; act(api('adminResolveFollowUp', SESSION, id), b, function(d){
    d.followUps = d.followUps.filter(function(f){ return f.id !== id; }); d.stats.followUps = d.followUps.length;
    d.reviews.negative.forEach(function(f){ if(f.id === id) f.followUp = 'done'; }); d.reviews.counts.negOpen = Math.max(0, d.reviews.counts.negOpen - 1); }); });
  each('[data-redeem]', function(b){ var id = b.dataset.redeem; if(confirm(t('confirmRedeem'))) act(api('adminRedeem', SESSION, id), b, function(d){
    var gone = d.gifts.filter(function(g){ return g.rewardId === id; })[0]; d.gifts = d.gifts.filter(function(g){ return g.rewardId !== id; }); d.stats.pendingGifts = d.gifts.length;
    if(gone) d.customers.forEach(function(c){ if(c.phone === gone.phone) (c.gifts || []).forEach(function(x){ if(x.status === 'available' && x.type === gone.type && x.earnedAt === gone.earnedAt){ x.status = 'redeemed'; x.redeemedAt = new Date().toISOString(); } }); }); }); });
  function bump(id, n){ return function(d){ d.customers.forEach(function(c){ if(c.id === id) c.stamps = Math.max(0, Math.min(10, c.stamps + n)); }); }; }
  each('[data-plus]', function(b){ act(api('adminAdjustStamps', SESSION, b.dataset.plus, 1), b, bump(b.dataset.plus, 1)); });
  each('[data-minus]', function(b){ if(confirm(t('confirmRemove'))) act(api('adminAdjustStamps', SESSION, b.dataset.minus, -1), b, bump(b.dataset.minus, -1)); });
  each('[data-rename]', function(b){ var n = prompt(t('renamePrompt'), b.dataset.name); if(n && n.trim()) act(api('adminRenameCustomer', SESSION, b.dataset.rename, n.trim()), b); });
  each('[data-cancel]', function(b){ if(confirm(t('confirmCancel'))) act(api('adminCancelToken', SESSION, b.dataset.cancel), b); });
  each('[data-delfb]', function(b){ var id = b.dataset.delfb; if(confirm(t('confirmDelReview'))) act(api('adminDeleteFeedback', SESSION, id), b, function(d){
    var rv = d.reviews, gone = rv.positive.concat(rv.negative).filter(function(f){ return f.id === id; })[0];
    rv.positive = rv.positive.filter(function(f){ return f.id !== id; }); rv.negative = rv.negative.filter(function(f){ return f.id !== id; });
    d.followUps = d.followUps.filter(function(f){ return f.id !== id; }); d.stats.followUps = d.followUps.length;
    if(gone){ var neg = gone.rating < 4; rv.counts[neg ? 'negAll' : 'posAll'] = Math.max(0, rv.counts[neg ? 'negAll' : 'posAll'] - 1); if(neg && gone.followUp === 'needed') rv.counts.negOpen = Math.max(0, rv.counts.negOpen - 1); }
  }); });
  each('[data-login]', function(b){ if(b.dataset.has && !confirm(t('confirmResetLogin'))) return; makeLogin(b.dataset.login, b); });
  each('[data-nologin]', function(b){ if(confirm(t('confirmDisableLogin'))) act(api('adminDisableCustomerLogin', SESSION, b.dataset.nologin), b, function(d){ d.customers.forEach(function(c){ if(c.id === b.dataset.nologin){ c.hasLogin = false; c.mustChange = false; } }); }); });
  each('[data-del]', function(b){ if(confirm(fill(t('confirmDelete'), b.dataset.name)) && confirm(t('deleteCustomer') + ' — ' + b.dataset.name + '?')) act(api('adminDeleteCustomer', SESSION, b.dataset.del), b); });
  each('[data-rot]', function(b){ if(confirm(t('confirmRotate'))){ ADM.flash = t('rotated'); act(api('adminRotateCardLink', SESSION, b.dataset.rot), b); } });
  var la = document.getElementById('lall');
  if(la) la.onclick = function(){ la.disabled = true; api('adminLogoutAll', SESSION).then(function(){ adminSignOut(t('logoutAllDone'), true); }); };
  var cpp = document.getElementById('cpp'); if(cpp) cpp.onclick = function(){ if(CUSTOMER_URL) copyText(CUSTOMER_URL + '?new=1', cpp); };
  var qrp = document.getElementById('qrp'); if(qrp) qrp.onclick = function(){ if(CUSTOMER_URL) showQR(t('customerPage'), CUSTOMER_URL + '?new=1'); };
  var sv = document.getElementById('sv');
  if(sv) sv.onclick = function(){
    var serr = document.getElementById('serr'); sv.disabled = true;
    api('adminSaveSettings', SESSION, {MIN_RATING_FOR_STAMP:document.getElementById('s1').value, LOW_RATING_ALERT:document.getElementById('s3').value,
      TOKEN_HOURS:document.getElementById('s2').value, ALERT_EMAIL:document.getElementById('s4').value.trim(), PUBLIC_URL:document.getElementById('s0').value.trim(), GOOGLE_REVIEW_URL:document.getElementById('s5').value.trim(), REVIEW_ASK:document.getElementById('s6').value, CONTACT_PHONE:document.getElementById('s7').value.trim()}).then(function(r){
      sv.disabled = false;
      if(!r.ok){ serr.textContent = errText(r.error); return; }
      sv.textContent = t('saved'); setTimeout(viewAdmin, 900);
    });
  };
  var s0me = document.getElementById('s0me'); if(s0me) s0me.onclick = function(){ document.getElementById('s0').value = APP_URL; };
  var cp = document.getElementById('cpin');
  if(cp) cp.onclick = function(){
    var p0 = document.getElementById('p0'), cur = document.getElementById('p1').value, nu = p0 ? p0.value.trim().toLowerCase() : '', np = document.getElementById('p2').value, perr = document.getElementById('perr');
    if(!cur){ perr.textContent = errText('WRONG_PIN'); return; }
    if(!nu && !np) return;
    if(np && np.length < 8){ perr.textContent = errText('WEAK_PIN'); return; }
    if(nu && !/^[a-z][a-z0-9._-]{2,31}$/.test(nu)){ perr.textContent = errText('BAD_USER'); return; }
    cp.disabled = true;
    api('adminChangePassword', SESSION, cur, nu, np).then(function(r){
      cp.disabled = false;
      if(!r.ok){ perr.textContent = errText(r.error); return; }
      adminSignOut(t('pinChanged'), true);
    });
  };
}

/* ========= شريط سفلي للتلفون + قائمة "المزيد" ========= */
function bottomNav(){
  var items = [['home', 'home', t('nHome')], ['customers', 'users', t('tCustomers')], ['recent', 'chart', t('nReports')], ['gifts', 'gift', t('tGifts')], ['more', 'menu', t('nMore')]];
  var cur = ['customers', 'recent', 'gifts'].indexOf(ADM.tab) > -1 ? ADM.tab : (ADM.navMore ? 'more' : '');
  return '<nav class="bnav" aria-label="nav">' + items.map(function(x){
    var badge = x[0] === 'gifts' && ADM.data.gifts.length ? '<span class="nb">' + ADM.data.gifts.length + '</span>' : '';
    return '<button type="button" data-nav="' + x[0] + '" class="' + (cur === x[0] ? 'on' : '') + '">' + ico(x[1]) + '<span>' + esc(x[2]) + '</span>' + badge + '</button>';
  }).join('') + '</nav>';
}
function goTab(tab){ ADM.tab = tab; renderAdmin(); var m = document.getElementById('amain'); if(m) m.scrollIntoView({behavior:'smooth', block:'start'}); }
function openMore(){
  var dlg = document.getElementById('qr'), d = ADM.data;
  var rows = [['follow', 'trend', t('tFollow'), d.followUps.length], ['nudges', 'chat', t('tNudges'), d.nudges.filter(function(n){ return !n.sent; }).length], ['bdays', 'cake', t('tBdays'), 0],
              ['links', 'hourglass', t('tLinks'), 0], ['import', 'upload', t('tImport'), 0], ['settings', 'gear', t('tSettings'), 0]];
  dlg.className = 'sheet';
  dlg.innerHTML = '<div class="sheet-grip"></div><div class="sheet-list">' + rows.map(function(r){ return '<button type="button" data-more="' + r[0] + '">' + ico(r[1]) + '<span>' + esc(r[2]) + '</span>' + (r[3] ? '<span class="badge">' + r[3] + '</span>' : '') + ico('chev', 'chev') + '</button>'; }).join('') +
    '<a href="' + esc(CUSTOMER_URL) + '" target="_blank" rel="noopener">' + ico('store') + '<span>' + esc(t('customerPage')) + '</span>' + ico('chev', 'chev') + '</a>' +
    '<button type="button" data-more="refresh">' + ico('refresh') + '<span>' + esc(t('refresh')) + '</span></button>' +
    '<button type="button" data-more="logout" class="danger">' + ico('logout') + '<span>' + esc(t('logout')) + '</span></button></div>';
  dlg.querySelectorAll('[data-more]').forEach(function(b){ b.onclick = function(){ dlg.close(); dlg.className = ''; if(b.dataset.more === 'logout') return adminSignOut(); if(b.dataset.more === 'refresh') return viewAdmin(); goTab(b.dataset.more); }; });
  dlg.onclick = function(e){ if(e.target === dlg){ dlg.close(); dlg.className = ''; } };
  dlg.addEventListener('close', function(){ dlg.className = ''; dlg.innerHTML = ''; }, {once:true});
  if(dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
}
function bindAdminChrome(){
  document.querySelectorAll('[data-go]').forEach(function(b){ b.onclick = function(){ if(b.dataset.go) goTab(b.dataset.go); }; });
  document.querySelectorAll('[data-lang]').forEach(function(b){ b.onclick = function(){ if(LANG === b.dataset.lang) return; LANG = b.dataset.lang; store('tp_lang', LANG); document.documentElement.lang = LANG; renderAdmin(); }; });
  document.querySelectorAll('[data-nav]').forEach(function(b){ b.onclick = function(){
    var n = b.dataset.nav;
    if(n === 'home') return window.scrollTo({top:0, behavior:'smooth'});
    if(n === 'more') return openMore();
    goTab(n);
  }; });
}

// كلمة سر مؤقتة لزبون + رسالة واتساب جاهزة
function makeLogin(id, btn){
  if(btn) btn.disabled = true;
  api('adminSetCustomerPassword', SESSION, id).then(function(r){
    if(btn) btn.disabled = false;
    if(!r.ok){ if(r.error === 'NO_SESSION') return adminSignOut(t('sessionExpired')); alert(errText(r.error)); return; }
    (ADM.data.customers || []).forEach(function(c){ if(c.id === id){ c.hasLogin = true; c.mustChange = true; } });
    var dlg = document.getElementById('qr'), msg = fillLogin(T[LANG][r.gender === 'f' ? 'loginMsgF' : 'loginMsg'], r.name, r.phone, r.password, APP_URL);
    dlg.innerHTML = '<h2>' + esc(t('loginInfoTitle')) + ' — ' + esc(r.name) + '</h2><p class="sub">' + esc(t('loginInfoHint')) + '</p>' +
      '<div class="cred"><div><small>' + esc(t('loginUser')) + '</small><b dir="ltr">' + esc(r.phone) + '</b></div><div><small>' + esc(t('loginPass')) + '</small><b dir="ltr" class="mono">' + esc(r.password) + '</b></div></div>' +
      '<a class="btn wa" id="lgWa" target="_blank" rel="noopener" href="' + esc(waLink(r.phone, msg)) + '">' + CHAT_ICO + esc(t('sendLoginWa')) + '</a>' +
      '<button class="btn small ghost" type="button" id="lgCp">' + esc(t('copyAll')) + '</button> <button class="btn small ghost" type="button" id="qc">' + esc(t('close')) + '</button>';
    document.getElementById('lgCp').onclick = function(){ copyText(msg, this); };
    var wipe = function(){ dlg.close(); dlg.innerHTML = ''; msg = ''; renderAdmin(); }; // كلمة السر ما بتضل بالصفحة
    document.getElementById('qc').onclick = wipe;
    document.getElementById('lgWa').onclick = function(){ setTimeout(wipe, 300); };
    dlg.addEventListener('cancel', function(){ setTimeout(function(){ dlg.innerHTML = ''; }, 0); }, {once:true});
    if(dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  });
}
function adminSignOut(msg, skipServer){
  if(SESSION || skipServer) api('adminLogout', SESSION); // بيمسح الجلسة من هالجهاز
  SESSION = ''; sstore('tp_sess', null); PAGE = 'customer';
  ADM = {tab:null, q:'', data:null, last:null, flash:'', rv:'neg', adding:false};
  var d = document.getElementById('qr'); if(d && d.open) d.close();
  renderLogin(msg);
}
var IDLE_TIMER = null;
function startAdmin(){
  PAGE = 'admin';
  $app.className = 'wrap wide'; $app.innerHTML = '<p class="loading">…</p>';
  viewAdmin();
  /* خروج تلقائي بعد 30 دقيقة بدون استعمال */
  if(IDLE_TIMER) return;
  var last = Date.now();
  ['click','keydown','touchstart'].forEach(function(ev){ document.addEventListener(ev, function(){ last = Date.now(); }, {passive:true}); });
  IDLE_TIMER = setInterval(function(){
    if(SESSION && Date.now() - last > 30 * 60 * 1000) adminSignOut(t('idleOut'));
  }, 60 * 1000);
}
