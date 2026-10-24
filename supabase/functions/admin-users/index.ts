// طابوني برو VIP — Edge Function: إدارة حسابات دخول الزبائن
//
// ليش Edge Function؟ إنشاء/حذف حساب دخول بيحتاج المفتاح السري (service_role).
// هاد المفتاح ما بيطلع أبداً للمتصفح: موجود بس هون، بسيرفر Supabase.
//
// الحماية:
//   1) لازم توكن دخول (JWT) تبع حساب إدارة. بنفحص الدور عن طريق الداتابيس (am_i_admin)
//   2) طلبات POST بس، حجم صغير، ورقم بطاقة بصيغة صحيحة
//   3) CORS لرابط التطبيق بس (ALLOWED_ORIGINS)
//
// العمليات (action):
//   set_password : كلمة سر مؤقتة جديدة (حساب جديد، القديم بينحذف وكل أجهزته بتطلع)
//   disable      : إيقاف الدخول (البطاقة بتضل)
//   delete       : حذف الزبون كلياً + حساب الدخول
//
// النشر: supabase functions deploy admin-users
// الإعدادات (Secrets): ALLOWED_ORIGINS=https://USER.github.io

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const ALLOWED = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map((s) => s.trim()).filter(Boolean);
// إيميل داخلي للزبون (مش إيميل حقيقي): رقم التلفون + دومين محجوز ما حدا بيقدر يملكه
const CUSTOMER_EMAIL_DOMAIN = 'tabooni.invalid';
const ABC = 'abcdefghjkmnpqrstuvwxyz23456789'; // بدون 0/O و 1/l/I

function corsHeaders(origin) {
  const ok = !!origin && ALLOWED.indexOf(origin) > -1;   // بدون ALLOWED_ORIGINS: ولا موقع مسموح
  return {
    'Access-Control-Allow-Origin': ok ? origin : (ALLOWED[0] || 'null'),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}
function json(body, origin, status) {
  return new Response(JSON.stringify(body), { status: status || 200, headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders(origin)) });
}
function tempPassword(len) {
  const out = [], buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  for (let i = 0; i < len; i++) out.push(ABC[buf[i] % ABC.length]);
  return out.join('');
}

export async function handler(req) {
  const origin = req.headers.get('Origin') || '';
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== 'POST') return json({ ok: false, error: 'BAD_REQUEST' }, origin, 405);
  if (!ALLOWED.length) return json({ ok: false, error: 'NOT_CONFIGURED' }, origin, 500);     // لازم تحط ALLOWED_ORIGINS
  if (!origin || ALLOWED.indexOf(origin) < 0) return json({ ok: false, error: 'FORBIDDEN' }, origin, 403);
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) return json({ ok: false, error: 'DEFAULT' }, origin, 500);

  // 1) مين اللي بيطلب؟ لازم إدارة
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!jwt || jwt === ANON_KEY) return json({ ok: false, error: 'NO_SESSION' }, origin, 401);
  const asUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: 'Bearer ' + jwt } }, auth: { persistSession: false, autoRefreshToken: false } });
  const who = await asUser.rpc('am_i_admin');
  if (who.error || who.data !== true) return json({ ok: false, error: 'NO_SESSION' }, origin, 401);

  // 2) الطلب
  const len = Number(req.headers.get('Content-Length') || 0);
  if (len > 2000) return json({ ok: false, error: 'BAD_REQUEST' }, origin, 413);
  let body = null;
  try { body = await req.json(); } catch (_e) { body = null; }
  const action = body && typeof body.action === 'string' ? body.action : '';
  const customerId = body && typeof body.customerId === 'string' ? body.customerId : '';
  if (!/^[a-f0-9]{8,32}$/.test(customerId)) return json({ ok: false, error: 'CARD_NOT_FOUND' }, origin, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const del = async (uid) => { if (uid) { try { await admin.auth.admin.deleteUser(uid); } catch (_e) { /* الحساب مش مربوط، فما بيقدر يشوف إشي */ } } };

  try {
    if (action === 'set_password') {
      const prep = (await admin.rpc('svc_login_prepare', { p_customer_id: customerId })).data;
      if (!prep || !prep.ok) return json(prep || { ok: false, error: 'DEFAULT' }, origin);
      const email = prep.phone + '@' + CUSTOMER_EMAIL_DOMAIN;
      // حساب قديم بنفس الإيميل (من قبل): بينحذف، وهيك كل أجهزته بتطلع
      const old = (await admin.rpc('svc_auth_user_by_email', { p_email: email })).data;
      if (!old || !old.ok) return json(old || { ok: false, error: 'DEFAULT' }, origin);
      await del(old.userId);
      const password = tempPassword(10);
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { kind: 'customer' } });
      if (created.error || !created.data || !created.data.user) return json({ ok: false, error: 'DEFAULT' }, origin, 500);
      const link = (await admin.rpc('svc_login_link', { p_customer_id: prep.id, p_user_id: created.data.user.id })).data;
      if (!link || !link.ok) { await del(created.data.user.id); return json(link || { ok: false, error: 'DEFAULT' }, origin); }
      if (link.oldUserId && link.oldUserId !== old.userId) await del(link.oldUserId);
      return json({ ok: true, password, phone: prep.phone, name: prep.name, gender: prep.gender, id: prep.id }, origin);
    }
    if (action === 'disable' || action === 'delete') {
      const r = (await admin.rpc(action === 'disable' ? 'svc_disable_login' : 'svc_delete_customer', { p_customer_id: customerId })).data;
      if (!r || !r.ok) return json(r || { ok: false, error: 'DEFAULT' }, origin);
      await del(r.oldUserId);
      return json({ ok: true }, origin);
    }
    return json({ ok: false, error: 'BAD_REQUEST' }, origin, 400);
  } catch (_e) {
    return json({ ok: false, error: 'DEFAULT' }, origin, 500);
  }
}

Deno.serve(handler);
