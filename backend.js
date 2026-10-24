/* ========= الربط مع Supabase =========
 * كل طلبات التطبيق بتمر من هون: api('اسم', ...) ← دالة بالداتابيس (RPC) / تسجيل دخول / Edge Function.
 * التطبيق ما بيلمس جداول أبداً. المفتاح العام (anon) آمن بالمتصفح لأنه الجداول مقفولة،
 * وكل دالة بتفحص الدور بنفسها بالسيرفر.
 */
var CUSTOMER_EMAIL_DOMAIN = 'tabooni.invalid'; // إيميل داخلي للزبون: رقمه@tabooni.invalid (دومين محجوز، ما حدا بيملكه)

// الجلسة: زبون ← بتضل بالتلفون (localStorage). إدارة ← بتنمسح لما تسكّر الصفحة (sessionStorage)
function adminMode(){ try{ return sessionStorage.getItem('tp_admin') === '1'; }catch(e){ return false; } }
var SB_STORE = {
  getItem: function(k){ try{ return sessionStorage.getItem(k) || localStorage.getItem(k); }catch(e){ return null; } },
  setItem: function(k, v){ try{ (adminMode() ? sessionStorage : localStorage).setItem(k, v); }catch(e){} },
  removeItem: function(k){ try{ sessionStorage.removeItem(k); localStorage.removeItem(k); }catch(e){} }
};
var SB = IS_LIVE ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
  auth: { storage: SB_STORE, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'tp-auth' }
}) : null;
function moveSessionToTab(){ // بعد دخول الإدارة: الجلسة بتنتقل لهالتاب بس
  try{ sessionStorage.setItem('tp_admin', '1'); var v = localStorage.getItem('tp-auth'); if(v){ sessionStorage.setItem('tp-auth', v); localStorage.removeItem('tp-auth'); } }catch(e){}
}
function clearAuthStore(){ try{ sessionStorage.removeItem('tp_admin'); sessionStorage.removeItem('tp-auth'); localStorage.removeItem('tp-auth'); }catch(e){} }

// اسم الدالة بالتطبيق ← [دالة الداتابيس، أسماء المتغيرات، هل أول متغير هو "جلسة" قديمة (بنتجاهله)]
var RPC_MAP = {
  joinProgram:            ['join_program', ['p_phone', 'p_name', 'p_consent', 'p_gender', 'p_bday']],
  getTokenInfo:           ['get_token_info', ['p_token']],
  submitFeedback:         ['submit_feedback', ['p_token', 'p_rating', 'p_comment', 'p_name', 'p_consent', 'p_gender', 'p_bday']],
  custRate:               ['cust_submit_feedback', ['p_token', 'p_rating', 'p_comment']],
  adminDashboard:         ['admin_dashboard', [], true],
  adminCreateToken:       ['admin_create_token', ['p_phone', 'p_note', 'p_qty'], true],
  adminAddCustomer:       ['admin_add_customer', ['p_name', 'p_phone', 'p_gender', 'p_bday'], true],
  adminUpdateCustomerInfo:['admin_update_customer_info', ['p_customer_id', 'p_gender', 'p_bday'], true],
  adminMarkBday:          ['admin_mark_bday', ['p_customer_id'], true],
  adminMarkNudged:        ['admin_mark_nudged', ['p_customer_id'], true],
  adminImport:            ['admin_import', ['p_list'], true],
  adminAdjustStamps:      ['admin_adjust_stamps', ['p_customer_id', 'p_delta'], true],
  adminRenameCustomer:    ['admin_rename_customer', ['p_customer_id', 'p_name'], true],
  adminRotateCardLink:    ['admin_rotate_card_link', ['p_customer_id'], true],
  adminCancelToken:       ['admin_cancel_token', ['p_token'], true],
  adminRedeem:            ['admin_redeem', ['p_reward_id'], true],
  adminDeleteFeedback:    ['admin_delete_feedback', ['p_feedback_id'], true],
  adminResolveFollowUp:   ['admin_resolve_follow_up', ['p_feedback_id'], true],
  adminSaveSettings:      ['admin_save_settings', ['p_obj'], true]
};
var EDGE_MAP = { adminSetCustomerPassword: 'set_password', adminDisableCustomerLogin: 'disable', adminDeleteCustomer: 'delete' };

function sbErr(e){
  var s = String((e && (e.status || e.code)) || ''), m = String((e && e.message) || '');
  if(/42501|401|403|JWT|permission/i.test(s + ' ' + m)) return {ok:false, error:'NO_SESSION'};
  if(/429|rate/i.test(s + ' ' + m)) return {ok:false, error:'RATE_LIMIT'};
  return {ok:false, error:'NETWORK'};
}
function customerEmail(phone){ return phone + '@' + CUSTOMER_EMAIL_DOMAIN; }
// كلمة سر زبون: 8 خانات، مش رقم التلفون، مش كلمة شائعة (Supabase كمان بيفحص الطول)
var COMMON_PW = ['12345678', '123456789', '1234567890', '11111111', '00000000', '87654321', '12341234', 'password', 'passw0rd', 'qwerty123', 'qwertyui', 'abcd1234', 'iloveyou', 'pizza123', 'pizza1234', 'tabooni', 'tabooni1', 'tabooni123', 'aaaaaaaa'];
function strongPass(p, phone){
  p = String(p || ''); phone = String(phone || '');
  return p.length >= 8 && p.length <= 72 && !/^(.)\1+$/.test(p) && (!phone || (p.indexOf(phone) < 0 && p.indexOf(phone.slice(-7)) < 0)) &&
    COMMON_PW.indexOf(p.toLowerCase()) < 0 && '01234567890123456789'.indexOf(p) < 0 && '98765432109876543210'.indexOf(p) < 0;
}
// عميل منفصل (بدون حفظ) للتأكد من كلمة السر الحالية وتغييرها، بدون ما نلمس الجلسة الأساسية
function verifyClient(){ return window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'tp-verify' } }); }
async function sessionUser(){ var r = await SB.auth.getUser(); return r && r.data && r.data.user ? r.data.user : null; }

async function sbCall(fn, args){
  try{
    // ---- دالة بالداتابيس
    if(RPC_MAP[fn]){
      var m = RPC_MAP[fn], a = m[2] ? args.slice(1) : args, params = {};
      m[1].forEach(function(n, i){ params[n] = a[i] === undefined ? null : a[i]; });
      var r = await SB.rpc(m[0], params);
      if(r.error) return sbErr(r.error);
      return r.data && typeof r.data === 'object' ? r.data : {ok:false, error:'NETWORK'};
    }
    // ---- حسابات دخول الزبائن (Edge Function، بالمفتاح السري على السيرفر)
    if(EDGE_MAP[fn]){
      var e = await SB.functions.invoke('admin-users', { body: { action: EDGE_MAP[fn], customerId: String(args[1] || '') } });
      if(e.error){ try{ return await e.error.context.json(); }catch(x){ return sbErr(e.error); } }
      return e.data;
    }
    // ---- تسجيل الدخول: إيميل ← إدارة، رقم تلفون ← زبون
    if(fn === 'login'){
      var u = String(args[0] || '').trim(), pw = String(args[1] || ''), email;
      if(u.indexOf('@') > -1) email = u.toLowerCase();
      else { var ph = normPhone(u); if(!/^05\d{8}$/.test(ph)) return {ok:false, error:'BAD_LOGIN'}; email = customerEmail(ph); }
      clearAuthStore();
      var s = await SB.auth.signInWithPassword({ email: email, password: pw });
      if(s.error) return {ok:false, error: s.error.status === 429 ? 'LOCKED' : 'BAD_LOGIN'};
      var me = await SB.rpc('me');
      var d = me.data || {};
      if(me.error || !d.ok){ await SB.auth.signOut({scope:'local'}); clearAuthStore(); return {ok:false, error: d.error === 'TEMP_EXPIRED' ? 'TEMP_EXPIRED' : 'BAD_LOGIN'}; }
      if(d.role === 'admin'){ moveSessionToTab(); return {ok:true, role:'admin', session:'sb'}; }
      if(d.role === 'admin_mfa') return {ok:true, role:'mfa'};       // الخطوة الثانية: كود من تطبيق المصادقة
      return {ok:true, role:'customer', token:'sb', mustChange: !!d.mustChange, name: d.name, card: d.card, pending: d.pending || []};
    }
    // ---- التحقق بخطوتين للإدارة (TOTP: Google Authenticator / Microsoft Authenticator)
    if(fn === 'mfaStart'){
      var f = await SB.auth.mfa.listFactors();
      if(f.error) return sbErr(f.error);
      var all = (f.data && f.data.all) || [], ver = all.filter(function(x){ return x.factor_type === 'totp' && x.status === 'verified'; });
      if(ver.length) return {ok:true, enrolled:true, factorId: ver[0].id};
      for(var i = 0; i < all.length; i++) if(all[i].status !== 'verified') await SB.auth.mfa.unenroll({ factorId: all[i].id });   // محاولة تفعيل قديمة ما كملت
      var en = await SB.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Tabooni ' + Date.now(), issuer: 'Tabooni Pro' });
      if(en.error) return sbErr(en.error);
      return {ok:true, enrolled:false, factorId: en.data.id, uri: en.data.totp.uri, secret: en.data.totp.secret};
    }
    if(fn === 'mfaVerify'){
      var code = String(args[1] || '').replace(/\s/g, '');
      if(!/^\d{6}$/.test(code)) return {ok:false, error:'BAD_CODE'};
      var cv = await SB.auth.mfa.challengeAndVerify({ factorId: String(args[0] || ''), code: code });
      if(cv.error) return {ok:false, error: cv.error.status === 429 ? 'LOCKED' : 'BAD_CODE'};
      var me3 = await SB.rpc('me'), d3 = me3.data || {};
      if(me3.error || d3.role !== 'admin') return {ok:false, error:'NO_SESSION'};
      moveSessionToTab();
      return {ok:true, role:'admin', session:'sb'};
    }
    if(fn === 'me' || fn === 'custMe'){
      var s2 = await SB.auth.getSession();
      if(!s2.data || !s2.data.session) return {ok:false, error:'NO_SESSION'};
      var r2 = await SB.rpc('me');
      if(r2.error) return sbErr(r2.error);
      var d2 = r2.data || {};
      if(!d2.ok && (d2.error === 'NO_LOGIN' || d2.error === 'TEMP_EXPIRED')){ await SB.auth.signOut({scope:'local'}); clearAuthStore(); return {ok:false, error: d2.error === 'TEMP_EXPIRED' ? 'TEMP_EXPIRED' : 'NO_SESSION'}; }
      return d2;
    }
    // ---- تغيير كلمة السر (زبون أو إدارة): لازم كلمة السر الحالية
    if(fn === 'custChangePassword' || fn === 'adminChangePassword'){
      var cur = String(args[fn === 'custChangePassword' ? 1 : 1] || ''), np = String(args[fn === 'custChangePassword' ? 2 : 3] || '');
      var user = await sessionUser();
      if(!user || !user.email) return {ok:false, error:'NO_SESSION'};
      var phone = user.email.split('@')[0];
      if(!np) return {ok:true};
      if(!strongPass(np, /^05\d{8}$/.test(phone) ? phone : '')) return {ok:false, error: fn === 'custChangePassword' ? 'WEAK_PASS' : 'WEAK_PIN'};
      // بنتأكد من كلمة السر الحالية بجلسة جديدة منفصلة (هيك كمان "Secure password change" بيقبل، لأنه الدخول طازة)
      var vc = verifyClient();
      var v = await vc.auth.signInWithPassword({ email: user.email, password: cur });
      if(v.error) return {ok:false, error: v.error.status === 429 ? 'LOCKED' : 'WRONG_PIN'};
      var up = await vc.auth.updateUser({ password: np });
      if(up.error && fn === 'adminChangePassword') up = await SB.auth.updateUser({ password: np });   // إدارة مع خطوتين: الجلسة الأساسية (aal2)
      try{ await vc.auth.signOut({scope:'local'}); }catch(x){}
      if(up.error) return {ok:false, error: /same|different/i.test(up.error.message || '') ? 'SAME_PASS' : (fn === 'custChangePassword' ? 'WEAK_PASS' : 'WEAK_PIN')};
      if(fn === 'custChangePassword'){ var cc = await SB.rpc('cust_password_changed'); if(cc.error) return sbErr(cc.error); if(cc.data && !cc.data.ok) return cc.data; }
      await SB.auth.signOut({scope:'others'});          // كل الأجهزة الثانية بتطلع
      return {ok:true, token:'sb'};
    }
    if(fn === 'custLogout' || fn === 'adminLogout'){ await SB.auth.signOut({scope:'local'}); clearAuthStore(); return {ok:true}; }
    if(fn === 'adminLogoutAll'){ await SB.auth.signOut({scope:'global'}); clearAuthStore(); return {ok:true}; }
    return {ok:false, error:'NOT_FOUND'};
  }catch(err){ return {ok:false, error:'NETWORK'}; }
}
