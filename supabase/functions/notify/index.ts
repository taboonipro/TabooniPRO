// طابوني برو VIP — Edge Function: إيميل تنبيه لتقييم منخفض (اختياري)
//
// الداتابيس (03_notify.sql) بتبعت هون كل تقييم بدّه متابعة، ومن هون بيطلع إيميل عن طريق Resend.
// الحماية: سر مشترك (NOTIFY_SECRET) بالهيدر. بدونه الطلب بينرفض.
//
// النشر:  supabase functions deploy notify --no-verify-jwt
// Secrets: NOTIFY_SECRET, RESEND_API_KEY, ALERT_EMAIL, (اختياري) MAIL_FROM

const SECRET = Deno.env.get('NOTIFY_SECRET') || '';
const RESEND = Deno.env.get('RESEND_API_KEY') || '';
const TO = Deno.env.get('ALERT_EMAIL') || '';
const FROM = Deno.env.get('MAIL_FROM') || 'Tabooni Pro <onboarding@resend.dev>';

const h = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function same(a, b) { // مقارنة بوقت ثابت
  a = String(a); b = String(b);
  if (!a || a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function handler(req) {
  if (req.method !== 'POST') return new Response('no', { status: 405 });
  // السر لازم يكون طويل ومش النص المثال
  if (SECRET.length < 32 || /PUT-THE-SAME/i.test(SECRET) || !same(req.headers.get('x-tabooni-secret') || '', SECRET)) return new Response('no', { status: 401 });
  if (!RESEND || !TO) return new Response('not configured', { status: 200 });
  let b = null;
  try { b = await req.json(); } catch (_e) { return new Response('bad', { status: 400 }); }
  const rating = Math.max(1, Math.min(5, Number(b && b.rating) || 1));
  const name = String(b && b.name || '').slice(0, 40), phone = String(b && b.phone || '').replace(/[^0-9]/g, '').slice(0, 10);
  const comment = String(b && b.comment || '').slice(0, 500);
  const msg = 'السلام عليكم، شو الأخبار ' + name + '؟\nهون طابوني برو. شفنا تقييمك وبهمّنا نفهم شو صار عشان نصلّحه. ممكن تحكيلنا أكثر؟';
  const wa = /^05\d{8}$/.test(phone) ? 'https://wa.me/972' + phone.slice(1) + '?text=' + encodeURIComponent(msg) : '';
  const stars = '★★★★★'.slice(0, rating) + '☆☆☆☆☆'.slice(0, 5 - rating);
  const html = '<div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px">' +
    '<h2 style="color:#c0261f;margin:0 0 8px">تقييم ' + rating + '/5 بدّه متابعة</h2>' +
    '<p style="font-size:20px;color:#e8a33a;margin:0 0 12px;letter-spacing:2px">' + stars + '</p>' +
    '<p style="margin:4px 0"><b>الزبون:</b> ' + h(name) + '</p><p style="margin:4px 0"><b>الرقم:</b> <span dir="ltr">' + h(phone) + '</span></p>' +
    '<p style="margin:12px 0;padding:12px;background:#f4f1ea;border-radius:8px">' + h(comment || 'بدون تعليق') + '</p>' +
    (wa ? '<p><a href="' + h(wa) + '" style="display:inline-block;background:#1fae5b;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">احكي معه على واتساب</a></p>' : '') +
    '<p style="color:#888;font-size:12px">التقييم موجود بلوحة الإدارة ← متابعة.</p></div>';
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + RESEND, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [TO], subject: 'طابوني برو: تقييم ' + rating + '/5 من ' + name, html }),
  });
  return new Response(r.ok ? 'sent' : 'mail failed', { status: r.ok ? 200 : 502 });
}

Deno.serve(handler);
