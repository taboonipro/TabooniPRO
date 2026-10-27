-- =====================================================================
-- طابوني برو VIP — قاعدة البيانات على Supabase
-- 01_schema.sql : الجداول + الحماية + الدوال المساعدة
--
-- الفكرة الأمنية:
--   * كل الجداول بمخطط خاص اسمه app. الـ API تبع Supabase ما بيشوفه أبداً
--     (Supabase بيعرض بس مخطط public). وكمان RLS مفعّل على كل جدول بدون سياسات.
--   * التطبيق ما بيلمس الجداول مباشرة. بيستدعي بس دوال محددة بـ public (02_api.sql)،
--     وكل دالة بتفحص بنفسها: مين المستخدم (زائر / زبون / إدارة) وشو مسموحله.
--   * كلمات السر عند Supabase Auth (bcrypt). ما في كلمة سر بجداولنا.
--
-- شغّلها مرة وحدة: Supabase ← SQL Editor ← الصق ← Run
-- =====================================================================

begin;  -- كل الملف بمعاملة وحدة: إذا صار أي خطأ، ولا إشي بيتطبّق (ما في نص-تركيب مفتوح)

create schema if not exists app;
revoke all on schema app from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then execute 'revoke all on schema app from anon'; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then execute 'revoke all on schema app from authenticated'; end if;
end $$;

-- ---------------------------------------------------------------- الجداول
create table if not exists app.customers (
  id            text primary key,                 -- رقم البطاقة (برابط ?c=)
  name          text not null,
  phone         text not null unique check (phone ~ '^05[0-9]{8}$'),
  stamps        int  not null default 0 check (stamps between 0 and 10),
  total_stamps  int  not null default 0 check (total_stamps >= 0),
  cycle         int  not null default 1 check (cycle >= 1),
  created_at    timestamptz not null default now(),
  last_stamp_at timestamptz,
  source        text not null default '',
  consent_at    timestamptz,
  verified_at   timestamptz,
  nudged_stage  text not null default '',
  gender        text not null default '' check (gender in ('', 'm', 'f')),
  bday          text not null default '' check (bday = '' or bday ~ '^[0-1][0-9]-[0-3][0-9]$'),
  bday_sent     text not null default '',
  user_id       uuid unique,                      -- حساب الدخول (Supabase Auth)
  must_change   boolean not null default false,   -- كلمة سر مؤقتة: لازم يغيّرها
  temp_hash     text,                             -- بصمة كلمة السر المؤقتة (من Auth): السيرفر بيعرف إذا الزبون غيّرها فعلاً
  signup_at     timestamptz,                      -- سجّل لحاله من التطبيق (مع كلمة سر)
  approved_at   timestamptz,                      -- الإدارة وافقت على التسجيل (أو سجّلتله طلب)
  pass_set_at   timestamptz,
  last_login_at timestamptz
);

create table if not exists app.tokens (            -- روابط التقييم لمرة وحدة (?t=)
  token       text primary key,
  phone       text not null default '',
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  used_at     timestamptz,
  status      text not null default 'open' check (status in ('open', 'used', 'cancelled', 'purged')),
  note        text not null default '',
  qty         int  not null default 1 check (qty between 1 and 10)
);
create index if not exists tokens_phone_idx on app.tokens(phone);

create table if not exists app.feedback (
  id          text primary key,
  created_at  timestamptz not null default now(),
  customer_id text,                                -- null بعد حذف الزبون
  name        text not null default '',
  phone       text not null default '',
  rating      int  not null check (rating between 1 and 5),
  comment     text not null default '',
  token       text not null default '',
  stamped     boolean not null default false,
  follow_up   text not null default '' check (follow_up in ('', 'needed', 'done')),
  status      text not null default 'approved' check (status in ('approved', 'deleted')),
  source      text not null default 'link',
  qty         int  not null default 0
);
create index if not exists feedback_customer_idx on app.feedback(customer_id);
create index if not exists feedback_created_idx on app.feedback(created_at);

create table if not exists app.rewards (
  reward_id   text primary key,
  customer_id text not null references app.customers(id) on update cascade on delete cascade,
  type        text not null check (type in ('BOAT', 'PIZZA')),
  cycle       int  not null default 1,
  earned_at   timestamptz not null default now(),
  redeemed_at timestamptz,
  status      text not null default 'available' check (status in ('available', 'redeemed'))
);
create index if not exists rewards_customer_idx on app.rewards(customer_id);

create table if not exists app.settings (key text primary key, value text not null default '');

create table if not exists app.staff (              -- مين إدارة (بالـ user id تبع Supabase Auth)
  user_id    uuid primary key,
  require_mfa boolean not null default true,        -- دخول الإدارة بكود من تطبيق (Google Authenticator)
  created_at timestamptz not null default now()
);

create table if not exists app.audit_log (
  id      bigserial primary key,
  at      timestamptz not null default now(),
  actor   text not null default '',
  action  text not null,
  target  text not null default '',
  details text not null default ''
);

-- تأكيد الرقم بالواتساب: الزبون بيبعت رمز من واتساب رقمه لرقم طابوني برو
--   signup   : حساب سجّل لحاله (user_id) ← لما يوصل الرمز من نفس الرقم، الحساب بيتوافق
--   takeover : صاحب الرقم بده يسترجع رقمه من حساب مش مؤكد ← الحساب المزيّف بينفك
create table if not exists app.wa_codes (
  id         bigserial primary key,
  code       text not null check (code ~ '^[0-9]{6}$'),
  phone      text not null check (phone ~ '^05[0-9]{8}$'),
  user_id    uuid,
  purpose    text not null check (purpose in ('signup', 'takeover')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at    timestamptz
);
create index if not exists wa_codes_phone_idx on app.wa_codes(phone);

create table if not exists app.rate_limits (
  k      text   not null,
  bucket bigint not null,
  n      int    not null default 0,
  primary key (k, bucket)
);

-- ترقية تركيب قديم (لو 01 انشغّل قبل): أعمدة جديدة
alter table app.customers add column if not exists temp_hash text;
alter table app.customers add column if not exists signup_at timestamptz;
alter table app.customers add column if not exists approved_at timestamptz;
alter table app.staff add column if not exists require_mfa boolean not null default true;

-- RLS على كل جدول، بدون ولا سياسة = ما حدا بيقدر يقرأ/يكتب مباشرة (حتى لو انكشف المخطط بالغلط)
alter table app.customers   enable row level security;
alter table app.tokens      enable row level security;
alter table app.feedback    enable row level security;
alter table app.rewards     enable row level security;
alter table app.settings    enable row level security;
alter table app.staff       enable row level security;
alter table app.audit_log   enable row level security;
alter table app.rate_limits enable row level security;
alter table app.wa_codes    enable row level security;
revoke all on all tables in schema app from public;
revoke all on all sequences in schema app from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on all tables in schema app from anon, authenticated';
    execute 'revoke all on all sequences in schema app from anon, authenticated';
  end if;
end $$;

-- إعدادات أولية (ما بتغيّر قيم موجودة)
insert into app.settings(key, value) values
  ('MIN_RATING_FOR_STAMP', '1'), ('TOKEN_HOURS', '48'), ('LOW_RATING_ALERT', '3'), ('ALERT_EMAIL', ''),
  ('PUBLIC_URL', ''), ('GOOGLE_REVIEW_URL', 'https://g.page/r/CevtOd_PNw2PECE/review'), ('REVIEW_ASK', 'positive'), ('CONTACT_PHONE', ''), ('WA_VERIFY_NUMBER', '')
on conflict (key) do nothing;
insert into app.settings(key, value) values ('WA_VERIFY_NUMBER', ''), ('AUTO_APPROVE_NEW', '1') on conflict (key) do nothing;

-- ---------------------------------------------------------------- أدوات
-- خطأ معروف للتطبيق (أي خطأ ثاني بيرجع DEFAULT، والتفاصيل بتضل بالسيرفر)
create or replace function app.err(e text) returns jsonb language sql immutable set search_path = pg_catalog as $$
  select jsonb_build_object('ok', false, 'error',
    case when e = any (array['TOKEN_INVALID','TOKEN_EXPIRED','TOKEN_USED','NEED_NAME','NEED_CONSENT','BAD_RATING','BAD_PHONE',
      'BAD_URL','BAD_REVIEW_URL','BAD_NAME','NEED_GENDER','NEED_COMMENT','BAD_BDAY','EXISTS','NO_SESSION','FORBIDDEN',
      'RATE_LIMIT','CARD_NOT_FOUND','NOT_FOUND','TEMP_EXPIRED','NO_LOGIN','BAD_REQUEST','PHONE_TAKEN','SIGNUP_CLOSED','PHONE_UNVERIFIED','WA_OFF']) then e else 'DEFAULT' end)
$$;
create or replace function app.fail(code text) returns void language plpgsql set search_path = pg_catalog as $$
begin raise exception using message = code, errcode = 'P0001'; end $$;

create or replace function app.new_id(len int) returns text language sql volatile set search_path = pg_catalog as $$
  select left(replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''), len)
$$;

-- رقم تلفون: أرقام عربية/فارسية ← إنجليزية، بدون رموز، 972 ← 0
create or replace function app.norm_phone(p text) returns text language plpgsql immutable set search_path = pg_catalog as $$
declare d text;
begin
  d := translate(coalesce(p, ''), '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789');
  d := regexp_replace(d, '[^0-9]', '', 'g');
  if left(d, 3) = '972' then d := '0' || substr(d, 4); end if;
  if length(d) = 9 and left(d, 1) = '5' then d := '0' || d; end if;
  return d;
end $$;

create or replace function app.mask_phone(p text) returns text language sql immutable set search_path = pg_catalog as $$
  select case when coalesce(p, '') = '' then '' else left(p, 3) || '****' || right(p, 3) end
$$;

-- نص: بدون رموز تحكم أو اتجاه مخفي، مسافة وحدة، بدون بداية معادلة (= + - @)
create or replace function app.clean(v text, maxlen int) returns text language sql immutable set search_path = pg_catalog as $$
  select left(regexp_replace(btrim(regexp_replace(regexp_replace(coalesce(v, ''),
    E'[\\x01-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u2069\\uFEFF]', '', 'g'),
    E'\\s+', ' ', 'g')), E'^[=+@\\s-]+', ''), maxlen)
$$;

-- اسم: حروف بس (عربي/عبري/لاتيني) + مسافة ' - ׳ ״ . فاضي = ''، غلط = BAD_NAME
create or replace function app.clean_name(v text) returns text language plpgsql immutable set search_path = pg_catalog as $$
declare n text := app.clean(v, 40);
begin
  if n = '' then return ''; end if;
  if n !~ E'^[A-Za-z\\u00C0-\\u024F\\u0591-\\u05F4\\u0610-\\u061A\\u0620-\\u065F\\u066E-\\u06D3\\u06D5-\\u06EF\\u06FA-\\u06FF][A-Za-z\\u00C0-\\u024F\\u0591-\\u05F4\\u0610-\\u061A\\u0620-\\u065F\\u066E-\\u06D3\\u06D5-\\u06EF\\u06FA-\\u06FF '' -]{0,39}$' then
    perform app.fail('BAD_NAME');
  end if;
  return n;
end $$;

create or replace function app.clean_gender(g text) returns text language sql immutable set search_path = pg_catalog as $$
  select case when lower(coalesce(g, '')) in ('m', 'f') then lower(g) else '' end
$$;

-- عيد ميلاد: 'MM-DD' أو '' (تاريخ مستحيل = BAD_BDAY)
create or replace function app.clean_bday(v text) returns text language plpgsql immutable set search_path = pg_catalog as $$
declare m text[]; mo int; d int; mx int;
begin
  v := btrim(coalesce(v, ''));
  if v = '' then return ''; end if;
  m := regexp_match(v, '^([0-9]{1,2})-([0-9]{1,2})$');
  if m is null then perform app.fail('BAD_BDAY'); end if;
  mo := m[1]::int; d := m[2]::int;
  if mo < 1 or mo > 12 then perform app.fail('BAD_BDAY'); end if;
  mx := (array[31,29,31,30,31,30,31,31,30,31,30,31])[mo];
  if d < 1 or d > mx then perform app.fail('BAD_BDAY'); end if;
  return lpad(mo::text, 2, '0') || '-' || lpad(d::text, 2, '0');
end $$;

create or replace function app.is_hex(v text, mn int, mx int) returns boolean language sql immutable set search_path = pg_catalog as $$
  select v is not null and length(v) between mn and mx and v ~ '^[a-f0-9]+$'
$$;

create or replace function app.qty_of(v numeric) returns int language sql immutable set search_path = pg_catalog as $$
  select greatest(1, least(10, round(coalesce(v, 1))::int))
$$;

-- رابط Google: https ومن دومينات Google بس (google.com بس /search و /maps)
create or replace function app.valid_review_url(u text) returns boolean language plpgsql immutable set search_path = pg_catalog as $$
declare m text[]; host text; path text;
begin
  u := coalesce(u, '');
  if length(u) > 1500 or u !~ E'^https://[^\\s"''<>]+$' then return false; end if;
  m := regexp_match(u, E'^https://([^/?#:@]+)(/[^?#]*)?');
  if m is null then return false; end if;
  host := lower(m[1]); path := coalesce(m[2], '/');
  if host in ('www.google.com', 'google.com', 'www.google.co.il', 'google.co.il') then return path ~ '^/(search|maps)(/|$)'; end if;
  return host in ('g.page', 'search.google.com', 'maps.google.com', 'maps.app.goo.gl', 'g.co');
end $$;

create or replace function app.valid_app_url(u text) returns boolean language sql immutable set search_path = pg_catalog as $$
  select coalesce(u, '') = '' or (length(u) <= 300 and u ~* '^https://[a-z0-9.-]+\.[a-z]{2,}(:[0-9]+)?(/[A-Za-z0-9._~%/-]*)?$' and u !~* '^https://script\.google\.com/')
$$;

-- إعداد واحد، مفحوص (قيمة غلط بالجدول = قيمة آمنة)
create or replace function app.setting(k text) returns text language plpgsql stable security definer set search_path = app, pg_catalog as $$
declare v text; n numeric;
begin
  select value into v from app.settings where key = k;
  v := coalesce(v, '');
  case k
    when 'MIN_RATING_FOR_STAMP' then n := case when v ~ '^[0-9]+$' then v::numeric end; return case when n between 1 and 5 then n::text else '1' end;
    when 'LOW_RATING_ALERT'     then n := case when v ~ '^[0-9]+$' then v::numeric end; return case when n between 0 and 5 then n::text else '3' end;
    when 'TOKEN_HOURS'          then n := case when v ~ '^[0-9]+$' then v::numeric end; return case when n between 1 and 168 then n::text else '48' end;
    when 'REVIEW_ASK'           then return case when v = 'all' then 'all' else 'positive' end;
    when 'GOOGLE_REVIEW_URL'    then return case when app.valid_review_url(v) then v else '' end;
    when 'PUBLIC_URL'           then return case when app.valid_app_url(v) then v else '' end;
    when 'CONTACT_PHONE'        then return case when app.norm_phone(v) ~ '^05[0-9]{8}$' then app.norm_phone(v) else '' end;
    when 'WA_VERIFY_NUMBER'     then return case when app.norm_phone(v) ~ '^05[0-9]{8}$' then app.norm_phone(v) else '' end;
    when 'AUTO_APPROVE_NEW'     then return case when v = '0' then '0' else '1' end;
    when 'ALERT_EMAIL'          then return case when v ~* '^[^\s@<>"'',;]+@[^\s@<>"'',;]+\.[a-z]{2,}$' then btrim(v) else '' end;
    else return v;
  end case;
end $$;

create or replace function app.settings_json() returns jsonb language sql stable security definer set search_path = app, pg_catalog as $$
  select jsonb_object_agg(k, app.setting(k)) from unnest(array['MIN_RATING_FOR_STAMP','TOKEN_HOURS','LOW_RATING_ALERT','ALERT_EMAIL','PUBLIC_URL','GOOGLE_REVIEW_URL','REVIEW_ASK','CONTACT_PHONE','WA_VERIFY_NUMBER','AUTO_APPROVE_NEW']) k
$$;

-- ---------------------------------------------------------------- هوية الطالب
create or replace function app.uid() returns uuid language sql stable set search_path = pg_catalog as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
$$;
create or replace function app.aal() returns text language sql stable set search_path = pg_catalog as $$
  select coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'aal', '')
$$;
-- إدارة = موجود بـ app.staff، ودخل بخطوتين (كلمة سر + كود من التطبيق) إلا إذا require_mfa = false
create or replace function app.is_admin() returns boolean language sql stable security definer set search_path = app, pg_catalog as $$
  select app.uid() is not null and exists (select 1 from app.staff where user_id = app.uid() and (not require_mfa or app.aal() = 'aal2'))
$$;
create or replace function app.is_staff() returns boolean language sql stable security definer set search_path = app, pg_catalog as $$
  select app.uid() is not null and exists (select 1 from app.staff where user_id = app.uid())
$$;
-- IP الزائر (Supabase ورا Cloudflare: cf-connecting-ip ما بينزوّر)
-- IP الزائر من Cloudflare بس (x-forwarded-for الزائر بيقدر يزوّره، فما بنستعمله).
-- IPv6: بنعدّ كل /64 كعنوان واحد (عشان ما حدا يبدّل عناوين ويتخطى الحد)
create or replace function app.norm_ip(p text) returns text language plpgsql immutable set search_path = pg_catalog as $$
declare ip text := coalesce(p, '');
begin
  if ip !~ '^[0-9a-fA-F:.]{3,45}$' then return 'noip'; end if;
  if position(':' in ip) > 0 then
    ip := array_to_string((string_to_array(lower(ip), ':'))[1:4], ':') || '::/64';
  end if;
  return ip;
end $$;
create or replace function app.client_ip() returns text language plpgsql stable set search_path = pg_catalog as $$
declare h jsonb; ip text;
begin
  begin h := nullif(current_setting('request.headers', true), '')::jsonb; exception when others then h := null; end;
  ip := coalesce(h ->> 'cf-connecting-ip', '');
  if ip !~ '^[0-9a-fA-F:.]{3,45}$' then return 'noip'; end if;
  if position(':' in ip) > 0 then
    ip := array_to_string((string_to_array(lower(ip), ':'))[1:4], ':') || '::/64';
  end if;
  return ip;
end $$;
-- حد للـ IP. إذا ما في IP (noip) كل الزوار بيشاركوا نفس العدّاد، فبنكبّر الحد ×20 عشان ما يوقف الكل
create or replace function app.hit_ip(p_kind text, p_max int, p_win int) returns boolean language plpgsql volatile security definer set search_path = app, pg_catalog as $$
declare ip text := app.client_ip();
begin
  return app.hit(p_kind || ':' || ip, case when ip = 'noip' then p_max * 20 else p_max end, p_win);
end $$;

-- ---------------------------------------------------------------- حدود الاستعمال
-- true = مسموح. العدّاد بيزيد حتى لو الطلب بعدين فشل (الدوال بترجع أخطاء بدون ما تلغي العدّاد)
create or replace function app.hit(p_key text, p_max int, p_win int) returns boolean language plpgsql volatile security definer set search_path = app, pg_catalog as $$
-- bucket = بداية النافذة بالثواني (epoch)، فالتنظيف بيعرف شو قديم مهما كان طول النافذة
declare b bigint := floor(extract(epoch from now()) / p_win) * p_win; c int;
begin
  insert into app.rate_limits as r (k, bucket, n) values (p_key, b, 1)
  on conflict (k, bucket) do update set n = r.n + 1 returning r.n into c;
  -- تنظيف: كل نافذة بلّشت قبل أكثر من يومين (أطول نافذة عنا يوم واحد)
  if random() < 0.01 then delete from app.rate_limits where bucket < extract(epoch from now()) - 2 * 86400; end if;
  return c <= p_max;
end $$;

create or replace function app.audit(action text, target text, details text) returns void language sql volatile security definer set search_path = app, pg_catalog as $$
  insert into app.audit_log(actor, action, target, details)
  values (coalesce(app.uid()::text, app.client_ip()), left(action, 60), left(coalesce(target, ''), 120), left(coalesce(details, ''), 300))
$$;

-- ---------------------------------------------------------------- منطق الطبعات
-- بيضيف n طبعات وبيرجّع الهدايا اللي انربحت (BOAT عند 5، PIZZA عند 10، وبعدها بطاقة جديدة)
create or replace function app.add_stamps(cid text, n int) returns text[] language plpgsql volatile security definer set search_path = app, pg_catalog as $$
declare c app.customers; s int; cy int; i int; got text[] := '{}';
begin
  n := app.qty_of(n);
  select * into c from app.customers where id = cid for update;
  if not found then perform app.fail('CARD_NOT_FOUND'); end if;
  s := c.stamps; cy := c.cycle;
  for i in 1..n loop
    if s >= 10 then s := 0; cy := cy + 1; end if;
    s := s + 1;
    if s = 5 then got := array_append(got, 'BOAT'::text); insert into app.rewards(reward_id, customer_id, type, cycle) values (app.new_id(16), cid, 'BOAT', cy); end if;
    if s = 10 then got := array_append(got, 'PIZZA'::text); insert into app.rewards(reward_id, customer_id, type, cycle) values (app.new_id(16), cid, 'PIZZA', cy); end if;
  end loop;
  update app.customers set stamps = s, cycle = cy, total_stamps = total_stamps + n, last_stamp_at = now() where id = cid;
  return got;
end $$;

-- البطاقة كما بتظهر للزبون: الاسم والطبعات والهدايا. بدون تلفون.
create or replace function app.card_json(cid text) returns jsonb language plpgsql stable security definer set search_path = app, pg_catalog as $$
declare c app.customers;
begin
  select * into c from app.customers where id = cid;
  if not found then perform app.fail('CARD_NOT_FOUND'); end if;
  return jsonb_build_object('id', c.id, 'name', c.name, 'stamps', c.stamps,
    'rewards', coalesce((select jsonb_agg(jsonb_build_object('type', r.type, 'earnedAt', r.earned_at) order by r.earned_at)
                         from app.rewards r where r.customer_id = c.id and r.status = 'available'), '[]'::jsonb));
end $$;

-- رابط بطاقة جديد (القديم بيوقف). الهدايا بتلحق تلقائياً (on update cascade)
create or replace function app.rotate_card(cid text) returns text language plpgsql volatile security definer set search_path = app, pg_catalog as $$
declare nid text := app.new_id(16);
begin
  update app.feedback set customer_id = nid where customer_id = cid;
  update app.customers set id = nid where id = cid;
  return nid;
end $$;

create or replace function app.days_to_bday(mmdd text) returns int language plpgsql stable set search_path = pg_catalog as $$
declare today date := (now() at time zone 'Asia/Jerusalem')::date; y int := extract(year from today); t date; mo int; d int;
begin
  if coalesce(mmdd, '') !~ '^[0-9]{2}-[0-9]{2}$' then return -1; end if;
  mo := split_part(mmdd, '-', 1)::int; d := split_part(mmdd, '-', 2)::int;
  -- 29.02 بسنة مش كبيسة = 01.03 (زي JavaScript)
  t := make_date(y, mo, 1) + (d - 1);
  if t < today then t := make_date(y + 1, mo, 1) + (d - 1); end if;
  return t - today;
end $$;

-- كل الدوال بمخطط app ممنوعة على الكل (بتنستدعى بس من دوال public المعرّفة كـ security definer)
revoke all on all functions in schema app from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on all functions in schema app from anon, authenticated';
  end if;
end $$;

commit;
