// طابوني برو VIP — Edge Function: استقبال رسائل واتساب (WhatsApp Cloud API webhook)
//
// الفكرة: الزبون بيبعت من واتساب رقمه رسالة فيها رمز 6 أرقام لرقم طابوني برو.
// Meta بتبعتلنا الرسالة هون مع رقم المرسل الحقيقي ← إذا الرمز صالح لنفس الرقم: الحساب بيتأكد.
// ما بنرد على الزبون برسالة واتساب (هيك ما في أي تكلفة)، التطبيق نفسه بيورجيه "رقمك تأكّد".
//
// الحماية:
//   1) كل طلب من Meta لازم يكون موقّع (X-Hub-Signature-256) بسر التطبيق WA_APP_SECRET، وإلا بينرفض
//   2) رقم المرسل من Meta (مش من الزبون) ← ما حدا بيقدر يزوّر إنه بعت من رقم غيره
//   3) الرمز مربوط برقم وحساب، صالح 30 دقيقة ولمرة وحدة، وحد محاولات لكل رقم
//
// الإعداد (Secrets): WA_APP_SECRET (App secret من Meta) ، WA_VERIFY_TOKEN (نص عشوائي طويل بتختاره)
// بإعدادات الدالة: Verify JWT ❌ مطفي (Meta ما بتبعت JWT؛ الحماية بالتوقيع)
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const APP_SECRET = Deno.env.get('WA_APP_SECRET') || '';
const VERIFY_TOKEN = Deno.env.get('WA_VERIFY_TOKEN') || '';

function same(a, b) {   // مقارنة بوقت ثابت
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
async function hmacHex(secret, body) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
function normPhone(v) {   // 9725XXXXXXXX ← 05XXXXXXXX
  let d = String(v || '').replace(/\D/g, '');
  if (d.indexOf('972') === 0) d = '0' + d.slice(3);
  return d;
}
function findCode(text) {  // أول 6 أرقام بالرسالة (أرقام عربية أو إنجليزية)
  const t = String(text || '').replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x6F0));
  const m = t.match(/(?:^|\D)(\d{6})(?:\D|$)/);
  return m ? m[1] : '';
}

export async function handler(req) {
  const url = new URL(req.url);
  // تسجيل الـ webhook عند Meta (مرة وحدة): بترجع الـ challenge إذا التوكن صح
  if (req.method === 'GET') {
    const ok = VERIFY_TOKEN.length >= 16 && url.searchParams.get('hub.mode') === 'subscribe' && same(url.searchParams.get('hub.verify_token') || '', VERIFY_TOKEN);
    return new Response(ok ? (url.searchParams.get('hub.challenge') || '') : 'forbidden', { status: ok ? 200 : 403 });
  }
  if (req.method !== 'POST') return new Response('no', { status: 405 });
  if (APP_SECRET.length < 16 || !SUPABASE_URL || !SERVICE_KEY) return new Response('not configured', { status: 500 });

  const raw = await req.text();
  if (raw.length > 200000) return new Response('too big', { status: 413 });
  const sig = (req.headers.get('x-hub-signature-256') || '').replace(/^sha256=/, '');
  if (!sig || !same(sig, await hmacHex(APP_SECRET, raw))) return new Response('bad signature', { status: 401 });

  let body = null;
  try { body = JSON.parse(raw); } catch (_e) { return new Response('ok'); }
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const msgs = [];
  for (const e of (body && body.entry) || []) for (const ch of e.changes || []) for (const m of (ch.value && ch.value.messages) || []) msgs.push(m);
  for (const m of msgs.slice(0, 20)) {
    try {
      if (m.type !== 'text' || !m.text) continue;
      const phone = normPhone(m.from), code = findCode(m.text.body);
      if (!/^05[0-9]{8}$/.test(phone) || !code) continue;
      const r = (await admin.rpc('svc_wa_verify', { p_phone: phone, p_code: code })).data;
      if (r && r.ok && r.oldUserId) { try { await admin.auth.admin.deleteUser(r.oldUserId); } catch (_e) { /* مش مربوط، فما بيشوف إشي */ } }
    } catch (_e) { /* رسالة وحدة غلط ما بتوقف الباقي */ }
  }
  return new Response('ok');   // دايماً 200 لـ Meta (وإلا بتعيد الإرسال)
}

Deno.serve(handler);
