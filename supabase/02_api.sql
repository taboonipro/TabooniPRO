-- =====================================================================
-- طابوني برو VIP — 02_api.sql : الدوال اللي التطبيق بيستدعيها (Supabase RPC)
--
-- كل دالة:
--   * security definer + search_path ثابت (ما حدا بيقدر يحقن دوال/جداول)
--   * بتفحص الصلاحية بأول سطر: زائر / زبون (حسابه مربوط ببطاقة) / إدارة (app.staff)
--   * بترجع JSON بنفس شكل النظام القديم: { ok:true, ... } أو { ok:false, error:'...' }
--   * أخطاء غير متوقعة بترجع DEFAULT بدون تفاصيل
-- بآخر الملف: سحب كل الصلاحيات وإعطاء كل دالة بس للدور اللي محتاجها.
-- =====================================================================

begin;  -- كل الملف بمعاملة وحدة: إذا صار أي خطأ، ولا إشي بيتطبّق (ما في نص-تركيب مفتوح)

-- ================================================================= زوّار (بدون دخول)

-- الانضمام للبرنامج. ما بيعطي طبعات. رقم مسجّل ما بيرجّع البطاقة.
-- الانضمام صار من خلال التسجيل مع كلمة سر (Edge Function: signup)
drop function if exists public.join_program(text, text, boolean, text, text);

create or replace function public.get_token_info(p_token text)
returns jsonb language plpgsql volatile security definer set search_path = app, pg_catalog as $$
declare t app.tokens; c app.customers;
begin
  if not app.is_hex(p_token, 14, 32) then return jsonb_build_object('ok', true, 'status', 'invalid'); end if;
  if not app.hit_ip('pub', 120, 60) or not app.hit_ip('tk', 30, 60) then return app.err('RATE_LIMIT'); end if;
  -- العدّاد فوق برّا هالبلوك: أي خطأ تحت ما بيلغي العد
  begin
  select * into t from app.tokens where token = p_token;
  if not found or t.status in ('cancelled', 'purged') then return jsonb_build_object('ok', true, 'status', 'invalid'); end if;
  if t.status = 'used' then return jsonb_build_object('ok', true, 'status', 'used'); end if;
  if t.expires_at <= now() then return jsonb_build_object('ok', true, 'status', 'expired'); end if;
  select * into c from app.customers where phone = t.phone;
  -- اسم رقم غير مؤكد ممكن يكون حدا ثاني كتبه: ما بنعرضه
  return jsonb_build_object('ok', true, 'status', 'valid', 'qty', t.qty,
    'knownName', case when c.verified_at is not null then c.name else '' end);
  exception when others then return app.err(sqlerrm);
  end;
end $$;

-- تقييم برابط لمرة وحدة ← طبعات. الرابط وصل على واتساب الرقم، فاستعماله بيثبت ملكية الرقم.
create or replace function public.submit_feedback(p_token text, p_rating int, p_comment text, p_name text default '',
  p_consent boolean default false, p_gender text default '', p_bday text default '')
returns jsonb language plpgsql volatile security definer set search_path = app, pg_catalog as $$
declare ip text := app.client_ip(); t app.tokens; c app.customers; cm text; n text; g text; b text; rating int;
  is_new boolean := false; got text[] := '{}'; stamped boolean; low int; review text := ''; contact text := '';
begin
  if not app.is_hex(p_token, 14, 32) then return app.err('TOKEN_INVALID'); end if;
  if not app.hit_ip('pub', 120, 60) or not app.hit_ip('fb', 20, 60) or not app.hit('fbt:' || p_token, 10, 60) then return app.err('RATE_LIMIT'); end if;
  -- العدّاد فوق برّا هالبلوك: أي خطأ تحت ما بيلغي العد
  begin
  rating := p_rating;
  if rating is null or rating < 1 or rating > 5 then return app.err('BAD_RATING'); end if;
  cm := app.clean(p_comment, 500);
  if length(regexp_replace(cm, '\s', '', 'g')) < 2 then return app.err('NEED_COMMENT'); end if;
  begin
    n := app.clean_name(p_name);
    b := app.clean_bday(p_bday);
  exception when others then return app.err(sqlerrm); end;
  g := app.clean_gender(p_gender);

  -- القفل على الرابط: طلبين بنفس اللحظة ما بياخذوا طبعتين
  select * into t from app.tokens where token = p_token for update;
  if not found or t.status in ('cancelled', 'purged') then return app.err('TOKEN_INVALID'); end if;
  if t.status = 'used' then return app.err('TOKEN_USED'); end if;
  if t.expires_at <= now() then return app.err('TOKEN_EXPIRED'); end if;

  select * into c from app.customers where phone = t.phone for update;
  if not found or c.verified_at is null then
    if n = '' then return app.err('NEED_NAME'); end if;
    if g = '' then return app.err('NEED_GENDER'); end if;
    if p_consent is distinct from true then return app.err('NEED_CONSENT'); end if;
  end if;

  update app.tokens set status = 'used', used_at = now() where token = t.token;  -- الرابط بينقفل قبل أي إشي ثاني
  if not found then
    -- (مستحيل عملياً) بس للأمان
    return app.err('TOKEN_INVALID');
  end if;
  if c.id is null then
    insert into app.customers(id, name, phone, source, consent_at, verified_at, gender, bday)
    values (app.new_id(16), n, t.phone, 'link', now(), now(), g, b) returning * into c;
    is_new := true;
  elsif c.verified_at is null then
    -- كان مسجّل بدون تأكيد: الاسم من صاحب الرقم، ورابط بطاقة جديد (اللي سجّل قبل ما عاد بيشوفها)
    update app.customers set verified_at = now(), consent_at = now(), name = coalesce(nullif(n, ''), name),
      gender = coalesce(nullif(g, ''), gender), bday = coalesce(nullif(b, ''), bday) where id = c.id;
    c.id := app.rotate_card(c.id);
  end if;

  stamped := rating >= app.setting('MIN_RATING_FOR_STAMP')::int;
  if stamped then got := app.add_stamps(c.id, t.qty); end if;
  select * into c from app.customers where id = c.id;
  low := app.setting('LOW_RATING_ALERT')::int;
  insert into app.feedback(id, customer_id, name, phone, rating, comment, token, stamped, follow_up, status, source, qty)
  values (app.new_id(12), c.id, c.name, c.phone, rating, cm, t.token, stamped, case when rating <= low then 'needed' else '' end,
          'approved', 'link', case when stamped then t.qty else 0 end);
  if app.setting('REVIEW_ASK') = 'all' or rating >= 4 then review := app.setting('GOOGLE_REVIEW_URL'); end if;
  if rating < 4 then contact := app.setting('CONTACT_PHONE'); end if;
  return jsonb_build_object('ok', true, 'stamped', stamped, 'added', case when stamped then t.qty else 0 end,
    'rewards', to_jsonb(got), 'newReward', case when cardinality(got) > 0 then to_jsonb(got[cardinality(got)]) else 'null'::jsonb end,
    'reviewUrl', review, 'contactPhone', contact, 'card', app.card_json(c.id));
  exception when others then return app.err(sqlerrm);
  end;
end $$;

-- ما في روابط بطاقة (?c=): البطاقة بتبيّن بس للزبون بعد ما يدخل بحسابه
drop function if exists public.get_card(text);

-- تقييمات بتستنّى الزبون: طلبات اليوم (بتوقيت البلاد) اللي لسا ما انقيّمت
create or replace function app.pending_for(p_phone text) returns jsonb language sql stable security definer set search_path = app, pg_catalog as $$
  select coalesce(jsonb_agg(jsonb_build_object('token', token, 'qty', qty) order by created_at), '[]'::jsonb)
  from app.tokens
  where phone = p_phone and status = 'open' and expires_at > now()
    and (created_at at time zone 'Asia/Jerusalem')::date = (now() at time zone 'Asia/Jerusalem')::date
$$;

-- ================================================================= بعد الدخول

-- مين أنا؟ إدارة ولا زبون (وبطاقتي). التطبيق بيقرر أي صفحة يفتح حسب هالرد.
create or replace function public.me()
returns jsonb language plpgsql volatile security definer set search_path = app, pg_catalog as $$
declare uid uuid := app.uid(); c app.customers;
begin
  if uid is null then return app.err('NO_SESSION'); end if;
  if app.is_admin() then return jsonb_build_object('ok', true, 'role', 'admin'); end if;
  if app.is_staff() then return jsonb_build_object('ok', true, 'role', 'admin_mfa'); end if;   -- باقي الكود من تطبيق المصادقة
  select * into c from app.customers where user_id = uid for update;
  if not found then return app.err('NO_LOGIN'); end if;          -- حساب مش مربوط ببطاقة (أو انحذف)
  if c.must_change then
    -- كلمة سر مؤقتة صلاحيتها أسبوع (حتى لو تغيّرت بعد الأسبوع: لازم كلمة سر جديدة من الإدارة)
    if c.pass_set_at < now() - interval '7 days' then return app.err('TEMP_EXPIRED'); end if;
    -- السيرفر بيتأكد بنفسه: إذا بصمة كلمة السر بـ Auth تغيّرت عن المؤقتة ← الزبون غيّرها فعلاً
    if c.temp_hash is not null and c.temp_hash is distinct from (select encrypted_password from auth.users where id = uid) then
      update app.customers set must_change = false, temp_hash = null, pass_set_at = now() where id = c.id;
      c.must_change := false;
    end if;
  end if;
  update app.customers set last_login_at = now() where id = c.id and (last_login_at is null or last_login_at < now() - interval '10 minutes');
  -- سجّل لحاله على رقم كان عنده بطاقة من قبل: البطاقة بتبيّن بس بعد موافقة الإدارة (يمكن الرقم مش إله)
  if c.signup_at is not null and c.approved_at is null and c.source <> 'app' then
    return jsonb_build_object('ok', true, 'role', 'customer', 'name', c.name, 'mustChange', false, 'card', null, 'waitApproval', true, 'pending', '[]'::jsonb);
  end if;
  return jsonb_build_object('ok', true, 'role', 'customer', 'name', c.name, 'mustChange', c.must_change,
    'card', case when c.must_change then null else app.card_json(c.id) end,
    -- طلبات اليوم للتقييم: بس لحساب موافَق عليه (أو حساب عملته الإدارة)
    'pending', case when c.must_change or (c.signup_at is not null and c.approved_at is null) then '[]'::jsonb else app.pending_for(c.phone) end);
exception when others then return app.err(sqlerrm);
end $$;

-- الزبون غيّر كلمة السر (عبر Supabase Auth) ← بنشيل علامة "مؤقتة"
create or replace function public.cust_password_changed()
returns jsonb language plpgsql volatile security definer set search_path = app, pg_catalog as $$
declare uid uuid := app.uid();
begin
  if uid is null then return app.err('NO_SESSION'); end if;
  -- ما بنصدّق المتصفح: بنقارن بصمة كلمة السر الحالية بـ Auth مع المؤقتة
  update app.customers c set must_change = false, temp_hash = null, pass_set_at = now()
  where c.user_id = uid and c.must_change and c.pass_set_at >= now() - interval '7 days'
    and c.temp_hash is distinct from (select u.encrypted_password from auth.users u where u.id = uid);
  if not found then
    if exists (select 1 from app.customers where user_id = uid and not must_change) then return jsonb_build_object('ok', true); end if;
    return app.err('NO_LOGIN');
  end if;
  perform app.audit('cust_password_changed', '', '');
  return jsonb_build_object('ok', true);
exception when others then return app.err(sqlerrm);
end $$;

-- الزبون (داخل بحسابه) بيقيّم طلب اليوم من التطبيق ← طبعات
create or replace function public.cust_submit_feedback(p_token text, p_rating int, p_comment text)
returns jsonb language plpgsql volatile security definer set search_path = app, pg_catalog as $$
declare uid uuid := app.uid(); c app.customers;
begin
  if uid is null then return app.err('NO_SESSION'); end if;
  select * into c from app.customers where user_id = uid;
  if not found then return app.err('NO_LOGIN'); end if;
  if c.must_change then return app.err('NO_SESSION'); end if;
  if c.signup_at is not null and c.approved_at is null then return app.err('TOKEN_INVALID'); end if;
  -- الطلب لازم يكون إله هو (نفس رقم التلفون)، ومن اليوم، ولسا ما انقيّم
  if not app.is_hex(p_token, 14, 32) or not exists (select 1 from jsonb_array_elements(app.pending_for(c.phone)) e where e ->> 'token' = p_token) then
    if exists (select 1 from app.tokens where token = p_token and phone = c.phone and status = 'used') then return app.err('TOKEN_USED'); end if;
    return app.err('TOKEN_INVALID');
  end if;
  return public.submit_feedback(p_token, p_rating, p_comment);
exception when others then return app.err(sqlerrm);
end $$;

-- ================================================================= إدارة
-- كل دالة: if not app.is_admin() → NO_SESSION (التطبيق بيرجع لشاشة الدخول)

create or replace function public.admin_dashboard()
returns jsonb language plpgsql stable security definer set search_path = app, pg_catalog as $$
declare m0 timestamptz := date_trunc('month', now() at time zone 'Asia/Jerusalem') at time zone 'Asia/Jerusalem';
  yr text := to_char(now() at time zone 'Asia/Jerusalem', 'YYYY'); res jsonb;
begin
  if not app.is_admin() then return app.err('NO_SESSION'); end if;
  with fb as (select f.*, coalesce(c.gender, '') as cg from app.feedback f left join app.customers c on c.id = f.customer_id where f.status <> 'deleted'),
       fbo as (select fb.*, jsonb_build_object('id', id, 'name', name, 'phone', phone, 'rating', rating, 'comment', comment, 'timestamp', created_at,
                 'source', source, 'followUp', follow_up, 'gender', cg) as j from fb),
       opn as (select distinct phone from app.tokens where status = 'open' and expires_at > now())
  select jsonb_build_object(
    'ok', true,
    'stats', jsonb_build_object(
      'customers', (select count(*) from app.customers),
      'stampsMonth', (select coalesce(sum(case when qty > 0 then qty else 1 end), 0) from fb where stamped and created_at >= m0),
      'avgRating', (select round(avg(rating)::numeric, 1) from fb where created_at >= m0),
      'pendingGifts', (select count(*) from app.rewards where status = 'available'),
      'followUps', (select count(*) from fb where follow_up = 'needed'),
      'signups', (select count(*) from app.customers where signup_at is not null and approved_at is null)),
    'followUps', coalesce((select jsonb_agg(j order by created_at desc) from fbo where follow_up = 'needed'), '[]'),
    'reviews', jsonb_build_object(
      'positive', coalesce((select jsonb_agg(j order by created_at desc) from (select * from fbo where rating >= 4 order by created_at desc limit 200) x), '[]'),
      'negative', coalesce((select jsonb_agg(j order by created_at desc) from (select * from fbo where rating < 4 order by created_at desc limit 200) x), '[]'),
      'counts', jsonb_build_object(
        'posAll', (select count(*) from fb where rating >= 4), 'negAll', (select count(*) from fb where rating < 4),
        'posMonth', (select count(*) from fb where rating >= 4 and created_at >= m0), 'negMonth', (select count(*) from fb where rating < 4 and created_at >= m0),
        'negOpen', (select count(*) from fb where rating < 4 and follow_up = 'needed'))),
    'nudges', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'phone', phone, 'stamps', stamps, 'next', case when stamps = 4 then 'BOAT' else 'PIZZA' end,
        'gender', gender, 'sent', nudged_stage = 'c' || cycle || 's' || stamps, 'verified', verified_at is not null, 'lastStampAt', last_stamp_at)
        order by (nudged_stage = 'c' || cycle || 's' || stamps), last_stamp_at desc nulls last)
      from app.customers where stamps in (4, 9)), '[]'),
    'gifts', coalesce((select jsonb_agg(jsonb_build_object('rewardId', r.reward_id, 'type', r.type, 'name', c.name, 'phone', c.phone, 'earnedAt', r.earned_at, 'gender', c.gender) order by r.earned_at)
      from app.rewards r join app.customers c on c.id = r.customer_id where r.status = 'available'), '[]'),
    'birthdays', coalesce((select jsonb_agg(x.j order by x.d) from (
        select app.days_to_bday(bday) as d, jsonb_build_object('id', id, 'name', name, 'phone', phone, 'bday', bday, 'gender', gender,
          'days', app.days_to_bday(bday), 'sent', bday_sent = yr, 'verified', verified_at is not null) as j
        from app.customers where bday <> '') x where x.d between 0 and 14), '[]'),
    'customers', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'phone', c.phone, 'stamps', c.stamps,
        'lastStampAt', c.last_stamp_at, 'createdAt', c.created_at, 'openLink', exists (select 1 from opn where opn.phone = c.phone),
        'consent', c.consent_at is not null, 'verified', c.verified_at is not null, 'gender', c.gender, 'bday', c.bday,
        'gifts', coalesce((select jsonb_agg(jsonb_build_object('type', type, 'status', status, 'earnedAt', earned_at, 'redeemedAt', redeemed_at) order by earned_at desc)
                           from (select * from app.rewards r where r.customer_id = c.id order by earned_at desc limit 10) g), '[]'),
        'hasLogin', c.user_id is not null, 'mustChange', c.user_id is not null and c.must_change, 'lastLoginAt', c.last_login_at,
        'signupPending', c.signup_at is not null and c.approved_at is null, 'signupAt', c.signup_at, 'claim', c.source <> 'app', 'totalStamps', c.total_stamps)
        order by coalesce(c.last_stamp_at, c.created_at) desc) from app.customers c), '[]'),
    'openTokens', coalesce((select jsonb_agg(jsonb_build_object('token', token, 'phone', phone, 'createdAt', created_at, 'note', note, 'qty', qty) order by created_at desc)
      from (select * from app.tokens where status = 'open' and expires_at > now() order by created_at desc limit 30) t), '[]'),
    'adminUser', coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'email', ''),
    'settings', app.settings_json()
  ) into res;
  return res;
exception when others then return app.err(sqlerrm);
end $$;

create or replace function public.admin_create_token(p_phone text, p_note text default '', p_qty int default 1)
returns jsonb language plpgsql volatile security definer set search_path = app, pg_catalog as $$
declare p text := app.norm_phone(p_phone); tk text := app.new_id(32); q int := app.qty_of(p_qty); c app.customers;
begin
  if not app.is_admin() then return app.err('NO_SESSION'); end if;
  if p !~ '^05[0-9]{8}$' then return app.err('BAD_PHONE'); end if;
  insert into app.tokens(token, phone, expires_at, note, qty)
  values (tk, p, now() + make_interval(hours => app.setting('TOKEN_HOURS')::int), app.clean(p_note, 100), q);
  perform app.audit('token_created', app.mask_phone(p), 'qty ' || q);
  select * into c from app.customers where phone = p;
  -- سجّلتله طلب = إنت شفت الزبون صاحب الرقم ← التسجيل بيتوافق والرقم بيتأكد لحاله
  if c.id is not null and c.signup_at is not null and c.approved_at is null then
    update app.customers set approved_at = now(), verified_at = coalesce(verified_at, now()) where id = c.id returning * into c;
    perform app.audit('signup_approved', app.mask_phone(p), 'by order');
  end if;
  -- اسم من تسجيل غير مؤكد ممكن يكون من حدا ثاني: ما بنحطه برسالة الواتساب
  return jsonb_build_object('ok', true, 'token', tk, 'phone', p, 'qty', q,
    'customerName', case when c.verified_at is not null then c.name else '' end,
    'gender', case when c.verified_at is not null then c.gender else '' end,
    'inApp', c.user_id is not null);   -- عنده حساب: التقييم بيستنّاه بالتطبيق (بدون رابط)
exception when others then return app.err(sqlerrm);
end $$;

create or replace function public.admin_add_customer(p_name text, p_phone text, p_gender text default '', p_bday text default '')
returns jsonb language plpgsql volatile security definer set search_path = app, pg_catalog as $$
declare p text := app.norm_phone(p_phone); n text; b text; cid text := app.new_id(16);
begin
  if not app.is_admin() then return app.err('NO_SESSION'); end if;
  if p !~ '^05[0-9]{8}$' then return app.err('BAD_PHONE'); end if;
  n := app.clean_name(p_name);
  if n = '' then return app.err('NEED_NAME'); end if;
  b := app.clean_bday(p_bday);
  if exists (select 1 from app.customers where phone = p) then return app.err('EXISTS'); end if;
  insert into app.customers(id, name, phone, source, verified_at, gender, bday) values (cid, n, p, 'manual', now(), app.clean_gender(p_gender), b);
  perform app.audit('customer_added', app.mask_phone(p), '');
  return jsonb_build_object('ok', true, 'id', cid, 'name', n);
exception when unique_violation then return app.err('EXISTS');
  when others then return app.err(sqlerrm);
end $$;

create or replace function public.admin_update_customer_info(p_customer_id text, p_gender text, p_bday text)
returns jsonb language plpgsql volatile security definer set search_path = app, pg_catalog as $$
begin
  if not app.is_admin() then return app.err('NO_SESSION'); end if;
  update app.customers set gender = app.clean_gender(p_gender), bday = app.clean_bday(p_bday) where id = p_customer_id;
  if not found then return app.err('CARD_NOT_FOUND'); end if;
  return jsonb_build_object('ok', true);
exception when others then return app.err(sqlerrm);
end $$;

create or replace function public.admin_mark_bday(p_customer_id text)
returns jsonb language plpgsql volatile security definer set search_path = app, pg_catalog as $$
begin
  if not app.is_admin() then return app.err('NO_SESSION'); end if;
  update app.customers set bday_sent = to_char(now() at time zone 'Asia/Jerusalem', 'YYYY') where id = p_customer_id;
  if not found then return app.err('CARD_NOT_FOUND'); end if;
  return jsonb_build_object('ok', true);
exception when others then return app.err(sqlerrm);
end $$;

create or replace function public.admin_mark_nudged(p_customer_id text)
returns jsonb language plpgsql volatile security definer set search_path = app, pg_catalog as $$
begin
  if not app.is_admin() then return app.err('NO_SESSION'); end if;
  update app.customers set nudged_stage = 'c' || cycle || 's' || stamps where id = p_customer_id;
  if not found then return app.err('CARD_NOT_FOUND'); end if;
  return jsonb_build_object('ok', true);
exception when others then return app.err(sqlerrm);
end $$;

-- إضافة زبائن من قائمة [{name, phone}] (لحد 500)
create or replace function public.admin_import(p_list jsonb)
returns jsonb language plpgsql volatile security definer set search_path = app, pg_catalog as $$
declare x jsonb; p text; n text; added int := 0; skipped int := 0; invalid int := 0;
begin
  if not app.is_admin() then return app.err('NO_SESSION'); end if;
  if jsonb_typeof(p_list) is distinct from 'array' then return app.err('BAD_REQUEST'); end if;
  for x in select value from jsonb_array_elements(p_list) with ordinality e(value, i) where i <= 500 loop
    if jsonb_typeof(x) <> 'object' then invalid := invalid + 1; continue; end if;
    p := app.norm_phone(x ->> 'phone');
    begin n := app.clean_name(x ->> 'name'); exception when others then n := ''; end;
    if p !~ '^05[0-9]{8}$' or n = '' then invalid := invalid + 1; continue; end if;
    insert into app.customers(id, name, phone, source, verified_at) values (app.new_id(16), n, p, 'import', now()) on conflict (phone) do nothing;
    if found then added := added + 1; else skipped := skipped + 1; end if;
  end loop;
  perform app.audit('import', '', 'added ' || added || ', skipped ' || skipped || ', invalid ' || invalid);
  return jsonb_build_object('ok', true, 'added', added, 'skipped', skipped, 'invalid', invalid);
exception when others then return app.err(sqlerrm);
end $$;

create or replace function public.admin_adjust_stamps(p_customer_id text, p_delta int)
returns jsonb language plpgsql volatile security definer set search_path = app, pg_catalog as $$
declare c app.customers; got text[] := '{}';
begin
  if not app.is_admin() then return app.err('NO_SESSION'); end if;
  select * into c from app.customers where id = p_customer_id for update;
  if not found then return app.err('CARD_NOT_FOUND'); end if;
  -- رقم غير مؤكد (سجّل من صفحة الانضمام): إنت شايف الزبون، فبنأكّده ورابط بطاقة جديد (أي رابط قديم بيوقف)
  if c.verified_at is null then
    c.id := app.rotate_card(c.id);
    update app.customers set verified_at = now() where id = c.id;
  end if;
  if coalesce(p_delta, 0) > 0 then got := app.add_stamps(c.id, 1);
  else update app.customers set stamps = greatest(0, stamps - 1), total_stamps = greatest(0, total_stamps - 1) where id = c.id;
  end if;
  perform app.audit(case when p_delta > 0 then 'stamp_add_manual' else 'stamp_remove_manual' end, app.mask_phone(c.phone), '');
  return jsonb_build_object('ok', true, 'name', c.name, 'newReward', case when cardinality(got) > 0 then to_jsonb(got[cardinality(got)]) else 'null'::jsonb end);
exception when others then return app.err(sqlerrm);
end $$;

create or replace function public.admin_rename_customer(p_customer_id text, p_name text)
returns jsonb language plpgsql volatile security definer set search_path = app, pg_catalog as $$
declare n text;
begin
  if not app.is_admin() then return app.err('NO_SESSION'); end if;
  n := app.clean_name(p_name);
  if n = '' then return app.err('NEED_NAME'); end if;
  update app.customers set name = n where id = p_customer_id;
  if not found then return app.err('CARD_NOT_FOUND'); end if;
  update app.feedback set name = n where customer_id = p_customer_id;
  return jsonb_build_object('ok', true);
exception when others then return app.err(sqlerrm);
end $$;

create or replace function public.admin_rotate_card_link(p_customer_id text)
returns jsonb language plpgsql volatile security definer set search_path = app, pg_catalog as $$
declare nid text;
begin
  if not app.is_admin() then return app.err('NO_SESSION'); end if;
  perform 1 from app.customers where id = p_customer_id for update;
  if not found then return app.err('CARD_NOT_FOUND'); end if;
  nid := app.rotate_card(p_customer_id);
  perform app.audit('card_link_rotated', '', '');
  return jsonb_build_object('ok', true, 'id', nid);
exception when others then return app.err(sqlerrm);
end $$;

create or replace function public.admin_cancel_token(p_token text)
returns jsonb language plpgsql volatile security definer set search_path = app, pg_catalog as $$
begin
  if not app.is_admin() then return app.err('NO_SESSION'); end if;
  update app.tokens set status = 'cancelled' where token = p_token and status = 'open';
  return jsonb_build_object('ok', true);
exception when others then return app.err(sqlerrm);
end $$;

create or replace function public.admin_redeem(p_reward_id text)
returns jsonb language plpgsql volatile security definer set search_path = app, pg_catalog as $$
begin
  if not app.is_admin() then return app.err('NO_SESSION'); end if;
  update app.rewards set status = 'redeemed', redeemed_at = now() where reward_id = p_reward_id and status = 'available';
  if not found then return app.err('NOT_FOUND'); end if;
  perform app.audit('reward_redeemed', '', p_reward_id);
  return jsonb_build_object('ok', true);
exception when others then return app.err(sqlerrm);
end $$;

create or replace function public.admin_delete_feedback(p_feedback_id text)
returns jsonb language plpgsql volatile security definer set search_path = app, pg_catalog as $$
begin
  if not app.is_admin() then return app.err('NO_SESSION'); end if;
  update app.feedback set status = 'deleted', comment = '', follow_up = '' where id = p_feedback_id and status <> 'deleted';
  if not found then return app.err('NOT_FOUND'); end if;
  perform app.audit('feedback_deleted', '', p_feedback_id);
  return jsonb_build_object('ok', true);
exception when others then return app.err(sqlerrm);
end $$;

create or replace function public.admin_resolve_follow_up(p_feedback_id text)
returns jsonb language plpgsql volatile security definer set search_path = app, pg_catalog as $$
begin
  if not app.is_admin() then return app.err('NO_SESSION'); end if;
  update app.feedback set follow_up = 'done' where id = p_feedback_id and status <> 'deleted';
  if not found then return app.err('NOT_FOUND'); end if;
  return jsonb_build_object('ok', true);
exception when others then return app.err(sqlerrm);
end $$;

-- حفظ الإعدادات: مفاتيح معروفة بس، وكل قيمة مفحوصة
create or replace function public.admin_save_settings(p_obj jsonb)
returns jsonb language plpgsql volatile security definer set search_path = app, pg_catalog as $$
declare k text; v text; changed text[] := '{}';
begin
  if not app.is_admin() then return app.err('NO_SESSION'); end if;
  if jsonb_typeof(p_obj) is distinct from 'object' then return app.err('BAD_REQUEST'); end if;
  for k, v in select key, case when jsonb_typeof(value) in ('string', 'number', 'boolean') then value #>> '{}' else null end from jsonb_each(p_obj) loop
    if v is null then return app.err('BAD_REQUEST'); end if;
    v := btrim(v);
    case k
      when 'MIN_RATING_FOR_STAMP' then v := greatest(1, least(5, coalesce(nullif(regexp_replace(v, '[^0-9]', '', 'g'), '')::numeric, 1)))::int::text;
      when 'LOW_RATING_ALERT'     then v := greatest(0, least(5, coalesce(nullif(regexp_replace(v, '[^0-9]', '', 'g'), '')::numeric, 3)))::int::text;
      when 'TOKEN_HOURS'          then v := greatest(1, least(168, coalesce(nullif(regexp_replace(v, '[^0-9]', '', 'g'), '')::numeric, 48)))::int::text;
      when 'ALERT_EMAIL'          then v := case when v ~* '^[^\s@<>"'',;]+@[^\s@<>"'',;]+\.[a-z]{2,}$' then left(v, 120) else '' end;
      when 'PUBLIC_URL'           then v := regexp_replace(regexp_replace(v, '[?#].*$', ''), '/index\.html$', '/', 'i');
                                       if not app.valid_app_url(v) then return app.err('BAD_URL'); end if;
      when 'GOOGLE_REVIEW_URL'    then if v <> '' and not app.valid_review_url(v) then return app.err('BAD_REVIEW_URL'); end if;
      when 'REVIEW_ASK'           then v := case when v = 'all' then 'all' else 'positive' end;
      when 'CONTACT_PHONE'        then v := app.norm_phone(v); if v <> '' and v !~ '^05[0-9]{8}$' then return app.err('BAD_PHONE'); end if;
      else continue;   -- مفتاح مش معروف: بنتجاهله
    end case;
    insert into app.settings(key, value) values (k, v) on conflict (key) do update set value = excluded.value;
    changed := changed || k;
  end loop;
  perform app.audit('settings', '', array_to_string(changed, ','));
  return jsonb_build_object('ok', true);
exception when others then return app.err(sqlerrm);
end $$;


-- ================================================================= للـ Edge Function بس (service_role)
-- تجهيز كلمة سر لزبون: بيرجّع المعلومات وبيأكّد الرقم. رقم كان غير مؤكد ← رابط بطاقة جديد
create or replace function public.svc_login_prepare(p_customer_id text)
returns jsonb language plpgsql volatile security definer set search_path = app, pg_catalog as $$
declare c app.customers; cid text;
begin
  select * into c from app.customers where id = p_customer_id for update;
  if not found then return app.err('CARD_NOT_FOUND'); end if;
  cid := c.id;
  if c.verified_at is null then
    cid := app.rotate_card(c.id);       -- اللي سجّل الرقم بدون ما يكون صاحبه بيفقد الوصول
    update app.customers set verified_at = now() where id = cid;
  end if;
  return jsonb_build_object('ok', true, 'id', cid, 'phone', c.phone, 'name', c.name, 'gender', c.gender, 'userId', c.user_id);
exception when others then return app.err(sqlerrm);
end $$;

-- ربط حساب الدخول الجديد بالبطاقة. بيرجّع الحساب القديم عشان الـ Edge Function تحذفه (كل أجهزته بتطلع)
create or replace function public.svc_login_link(p_customer_id text, p_user_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = app, pg_catalog as $$
declare old uuid;
begin
  select user_id into old from app.customers where id = p_customer_id for update;
  if not found then return app.err('CARD_NOT_FOUND'); end if;
  if exists (select 1 from app.staff where user_id = p_user_id) then return app.err('FORBIDDEN'); end if;
  update app.customers set user_id = null where user_id = p_user_id and id <> p_customer_id;
  update app.customers set user_id = p_user_id, must_change = true, pass_set_at = now(),
    temp_hash = (select encrypted_password from auth.users where id = p_user_id) where id = p_customer_id;
  perform app.audit('cust_password_set', '', '');
  return jsonb_build_object('ok', true, 'oldUserId', case when old is distinct from p_user_id and not exists (select 1 from app.staff where user_id = old) then old end);
exception when others then return app.err(sqlerrm);
end $$;

-- إيقاف دخول زبون: بنفك الربط فوراً (ما عاد يشوف إشي)، والـ Edge Function بتحذف الحساب
create or replace function public.svc_disable_login(p_customer_id text)
returns jsonb language plpgsql volatile security definer set search_path = app, pg_catalog as $$
declare u uuid;
begin
  select user_id into u from app.customers where id = p_customer_id for update;
  if not found then return app.err('CARD_NOT_FOUND'); end if;
  update app.customers set user_id = null, must_change = false, signup_at = null, approved_at = null where id = p_customer_id;
  perform app.audit('cust_login_disabled', '', '');
  -- حساب إدارة ما بينحذف أبداً من هون
  if u is not null and exists (select 1 from app.staff where user_id = u) then u := null; end if;
  return jsonb_build_object('ok', true, 'oldUserId', u);
exception when others then return app.err(sqlerrm);
end $$;

-- حق الحذف: الزبون وهداياه وروابطه. التقييمات بتضل بدون اسم ورقم. الـ Edge Function بتحذف حساب الدخول
create or replace function public.svc_delete_customer(p_customer_id text)
returns jsonb language plpgsql volatile security definer set search_path = app, pg_catalog as $$
declare c app.customers;
begin
  select * into c from app.customers where id = p_customer_id for update;
  if not found then return app.err('CARD_NOT_FOUND'); end if;
  update app.feedback set name = '—', phone = '', comment = '', customer_id = null where customer_id = c.id or phone = c.phone;
  update app.tokens set status = 'cancelled' where phone = c.phone and status = 'open';
  update app.tokens set phone = '', note = '' where phone = c.phone;
  delete from app.customers where id = c.id;                  -- الهدايا بتنحذف معه (cascade)
  perform app.audit('customer_deleted', app.mask_phone(c.phone), '');
  return jsonb_build_object('ok', true, 'oldUserId', case when exists (select 1 from app.staff where user_id = c.user_id) then null else c.user_id end);
exception when others then return app.err(sqlerrm);
end $$;

-- حساب Auth قديم بنفس الإيميل (مثلاً بقي بعد خطأ): بيرجّع الـ id عشان ينحذف
create or replace function public.svc_auth_user_by_email(p_email text)
returns jsonb language plpgsql stable security definer set search_path = app, pg_catalog as $$
declare u uuid;
begin
  select id into u from auth.users where lower(email) = lower(p_email);
  if u is not null and exists (select 1 from app.staff where user_id = u) then return app.err('FORBIDDEN'); end if;
  return jsonb_build_object('ok', true, 'userId', u);
end $$;

create or replace function public.am_i_admin() returns boolean language sql stable security definer set search_path = app, pg_catalog as $$
  select app.is_admin()
$$;

-- ================================================================= الصلاحيات
-- Supabase بيعطي تلقائياً كل الدوال الجديدة لـ anon و authenticated. بنسحب الكل، وبنعطي بالاسم بس.
revoke execute on all functions in schema public from public;
-- دوال جديدة بالمستقبل ما بتنفتح تلقائياً للزوار (لازم صلاحية بالاسم)
do $$ begin
  execute 'alter default privileges revoke execute on functions from public';   -- (PUBLIC بينشال بس على مستوى عام)
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'alter default privileges in schema public revoke execute on functions from anon, authenticated';
  end if;
exception when others then raise notice 'default privileges: %', sqlerrm;
end $$;
-- ================================================================= تسجيل ذاتي (من Edge Function: signup)
-- الحماية من الإغراق: حد لكل جهاز (IP)، لكل رقم، وسقف لعدد التسجيلات اللي بتستنى موافقة
create or replace function public.svc_signup_prepare(p_phone text, p_name text, p_gender text, p_bday text, p_consent boolean, p_ip text)
returns jsonb language plpgsql volatile security definer set search_path = app, pg_catalog as $$
declare ip text := app.norm_ip(p_ip); f int := case when app.norm_ip(p_ip) = 'noip' then 20 else 1 end;
  p text := app.norm_phone(p_phone); n text; g text; b text; c app.customers; waiting int;
begin
  if not app.hit('su:' || ip, 5 * f, 3600) or not app.hit('sud:' || ip, 20 * f, 86400) then return app.err('RATE_LIMIT'); end if;
  if p !~ '^05[0-9]{8}$' then return app.err('BAD_PHONE'); end if;
  if not app.hit('sup:' || p, 3, 86400) then return app.err('RATE_LIMIT'); end if;
  begin
  begin
    n := app.clean_name(p_name);
    b := app.clean_bday(p_bday);
  exception when others then return app.err(sqlerrm); end;
  if n = '' then return app.err('NEED_NAME'); end if;
  g := app.clean_gender(p_gender);
  if g = '' then return app.err('NEED_GENDER'); end if;
  if p_consent is distinct from true then return app.err('NEED_CONSENT'); end if;
  -- سقف: أكثر من 200 تسجيل بيستنوا موافقة ← التسجيل بيتسكّر مؤقتاً (هجوم) + تنبيه
  select count(*) into waiting from app.customers where signup_at > now() - interval '7 days' and approved_at is null;
  if waiting >= 200 then
    if app.hit('su:alert', 1, 86400) then perform app.audit('signup_flood', '', waiting || ' waiting'); end if;
    return app.err('SIGNUP_CLOSED');
  end if;
  if not app.hit('su:h:all', 60, 3600) and app.hit('su:h:alert', 1, 3600) then perform app.audit('signup_flood', '', 'more than 60 signups this hour'); end if;
  select * into c from app.customers where phone = p for update;
  if found then
    if c.user_id is not null then return app.err('PHONE_TAKEN'); end if;
    return jsonb_build_object('ok', true, 'customerId', c.id, 'existing', true);
  end if;
  insert into app.customers(id, name, phone, source, consent_at, gender, bday)
  values (app.new_id(16), n, p, 'app', now(), g, b) returning * into c;
  return jsonb_build_object('ok', true, 'customerId', c.id, 'existing', false);
  exception when others then return app.err(sqlerrm);
  end;
end $$;

create or replace function public.svc_signup_link(p_customer_id text, p_user_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = app, pg_catalog as $$
begin
  update app.customers set user_id = p_user_id, must_change = false, temp_hash = null, pass_set_at = now(),
    signup_at = now(), approved_at = null, consent_at = coalesce(consent_at, now())
  where id = p_customer_id and user_id is null;
  if not found then return app.err('PHONE_TAKEN'); end if;
  perform app.audit('signup', app.mask_phone((select phone from app.customers where id = p_customer_id)), '');
  return jsonb_build_object('ok', true);
exception when others then return app.err(sqlerrm);
end $$;

-- تسجيل فشل بنص الطريق: بنحذف بس زبون جديد فاضي انعمل هلأ
create or replace function public.svc_signup_abort(p_customer_id text)
returns jsonb language plpgsql volatile security definer set search_path = app, pg_catalog as $$
begin
  delete from app.customers where id = p_customer_id and source = 'app' and user_id is null and total_stamps = 0
    and created_at > now() - interval '10 minutes';
  return jsonb_build_object('ok', true);
end $$;

-- الإدارة: موافقة على تسجيل (الرفض من Edge Function: حذف أو إيقاف دخول)
create or replace function public.admin_approve_signup(p_customer_id text)
returns jsonb language plpgsql volatile security definer set search_path = app, pg_catalog as $$
begin
  if not app.is_admin() then return app.err('NO_SESSION'); end if;
  update app.customers set approved_at = now(), verified_at = coalesce(verified_at, now())
  where id = p_customer_id and signup_at is not null and approved_at is null;
  if not found then return app.err('NOT_FOUND'); end if;
  perform app.audit('signup_approved', app.mask_phone((select phone from app.customers where id = p_customer_id)), '');
  return jsonb_build_object('ok', true);
exception when others then return app.err(sqlerrm);
end $$;

-- رقم نسخة السيرفر (الداتابيس + الدالة admin-users). بيتغيّر بس لما ملفات السيرفر تتغيّر
create or replace function app.db_version() returns text language sql immutable set search_path = pg_catalog as $$ select '1.17'::text $$;

-- الإدارة: حالة السيرفر (التطبيق بيقارن النسخ وبينبّه إذا إشي مش محدّث)
create or replace function public.admin_health()
returns jsonb language plpgsql stable security definer set search_path = app, pg_catalog as $$
begin
  if not app.is_admin() then return app.err('NO_SESSION'); end if;
  return jsonb_build_object('ok', true, 'db', app.db_version(),
    'signup', exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'svc_signup_prepare'),
    'oldJoin', exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'join_program'),
    'mfa', not exists (select 1 from app.staff where not require_mfa));
exception when others then return app.err(sqlerrm);
end $$;

-- الإدارة: بطاقة الزبون مثل ما هو بيشوفها
create or replace function public.admin_card(p_customer_id text)
returns jsonb language plpgsql stable security definer set search_path = app, pg_catalog as $$
begin
  if not app.is_admin() then return app.err('NO_SESSION'); end if;
  if not exists (select 1 from app.customers where id = p_customer_id) then return app.err('NOT_FOUND'); end if;
  return jsonb_build_object('ok', true, 'card', app.card_json(p_customer_id));
exception when others then return app.err(sqlerrm);
end $$;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on all functions in schema public from anon, authenticated, service_role';
    -- زوّار + مسجّلين
    execute 'grant execute on function public.get_token_info(text),
      public.submit_feedback(text, int, text, text, boolean, text, text) to anon, authenticated';
    -- مسجّلين بس (كل دالة بتفحص الدور لحالها)
    execute 'grant execute on function public.me(), public.cust_password_changed(), public.cust_submit_feedback(text, int, text), public.am_i_admin(),
      public.admin_dashboard(), public.admin_create_token(text, text, int), public.admin_add_customer(text, text, text, text),
      public.admin_update_customer_info(text, text, text), public.admin_mark_bday(text), public.admin_mark_nudged(text),
      public.admin_import(jsonb), public.admin_adjust_stamps(text, int), public.admin_rename_customer(text, text),
      public.admin_rotate_card_link(text), public.admin_cancel_token(text),
      public.admin_redeem(text), public.admin_delete_feedback(text), public.admin_resolve_follow_up(text),
      public.admin_save_settings(jsonb), public.admin_approve_signup(text), public.admin_card(text), public.admin_health() to authenticated';
    -- Edge Function بس
    execute 'grant execute on function public.svc_login_prepare(text), public.svc_login_link(text, uuid), public.svc_auth_user_by_email(text),
      public.svc_disable_login(text), public.svc_delete_customer(text),
      public.svc_signup_prepare(text, text, text, text, boolean, text), public.svc_signup_link(text, uuid), public.svc_signup_abort(text) to service_role';
  end if;
end $$;

commit;
