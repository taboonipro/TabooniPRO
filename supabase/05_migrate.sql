-- =====================================================================
-- طابوني برو VIP — 05_migrate.sql : نقل البيانات من الجداول المؤقتة للجداول الحقيقية
--
-- * أرقام البطاقات بتضل نفسها: روابط ?c= اللي عند الزبائن بتضل شغّالة
-- * زبائن محذوفين وسطور فاضية بيتجاهلوا. رقم مكرر: بنوخذ الأول
-- * كلمات السر القديمة ما بتنتقل (Supabase بيشفّر غير). بتعطي الزبائن كلمات سر جديدة من الإدارة
-- * آمن للتكرار: بيتجاهل اللي انتقل قبل
-- بالآخر بيطلع ملخص، وبيحذف الجداول المؤقتة
-- =====================================================================
begin;

-- تاريخ من الشيت: 24.10.2026 15:00 أو 24/10/2026 15:00:00 أو ISO
create or replace function app.parse_ts(v text) returns timestamptz language plpgsql stable set search_path = pg_catalog as $$
declare f text;
begin
  v := btrim(coalesce(v, ''));
  if v = '' then return null; end if;
  if v ~ '^\d{4}-\d{2}-\d{2}' then
    begin return v::timestamptz; exception when others then return null; end;
  end if;
  v := replace(replace(v, '/', '.'), '-', '.');
  foreach f in array array['DD.MM.YYYY HH24:MI:SS', 'DD.MM.YYYY HH24:MI', 'DD.MM.YYYY'] loop
    begin
      return (to_timestamp(v, f)::timestamp) at time zone 'Asia/Jerusalem';
    exception when others then null;
    end;
  end loop;
  return null;
end $$;

-- اسم: نفس فحص التطبيق. اسم غلط (رموز، روابط، معادلات) بيصير "زبون" وبتقدر تغيّره من الإدارة
create or replace function app.safe_name(v text) returns text language plpgsql stable set search_path = pg_catalog as $$
begin
  return coalesce(nullif(app.clean_name(v), ''), 'زبون');
exception when others then return 'زبون';
end $$;

create temp table mig_log(step text, n int) on commit drop;

-- الزبائن
with src as (
  select distinct on (app.norm_phone("phone")) *
  from public.import_customers
  where coalesce("source", '') <> 'deleted' and app.norm_phone("phone") ~ '^05[0-9]{8}$'
  order by app.norm_phone("phone"), app.parse_ts("createdAt") nulls last
), ins as (
  insert into app.customers(id, name, phone, stamps, total_stamps, cycle, created_at, last_stamp_at, source, consent_at, verified_at,
                            nudged_stage, gender, bday, bday_sent)
  select case when coalesce(s."id", '') ~ '^[a-f0-9]{8,32}$' then s."id" else app.new_id(16) end,   -- رقم غريب ← رقم جديد (الزبون ما بيضيع)
         app.safe_name(s."name"),
         app.norm_phone(s."phone"),
         greatest(0, least(10, coalesce(nullif(regexp_replace(s."stamps", '[^0-9]', '', 'g'), '')::int, 0))),
         greatest(0, coalesce(nullif(regexp_replace(s."totalStamps", '[^0-9]', '', 'g'), '')::int, 0)),
         greatest(1, coalesce(nullif(regexp_replace(s."cycle", '[^0-9]', '', 'g'), '')::int, 1)),
         coalesce(app.parse_ts(s."createdAt"), now()), app.parse_ts(s."lastStampAt"), coalesce(s."source", ''),
         app.parse_ts(s."consentAt"), app.parse_ts(s."verifiedAt"), coalesce(s."nudgedStage", ''),
         app.clean_gender(s."gender"),
         case when coalesce(s."bday", '') ~ '^[0-1][0-9]-[0-3][0-9]$' then s."bday" else '' end,
         coalesce(s."bdaySent", '')
  from src s
  on conflict do nothing
  returning 1)
insert into mig_log select 'customers', count(*) from ins;

-- الهدايا (لزبائن انتقلوا بس)
with ins as (
  insert into app.rewards(reward_id, customer_id, type, cycle, earned_at, redeemed_at, status)
  select r."rewardId", r."customerId", r."type", greatest(1, coalesce(nullif(regexp_replace(r."cycle", '[^0-9]', '', 'g'), '')::int, 1)),
         coalesce(app.parse_ts(r."earnedAt"), now()), app.parse_ts(r."redeemedAt"), r."status"
  from public.import_rewards r
  where r."status" in ('available', 'redeemed') and r."type" in ('BOAT', 'PIZZA') and coalesce(r."rewardId", '') <> ''
    and exists (select 1 from app.customers c where c.id = r."customerId")
  on conflict do nothing
  returning 1)
insert into mig_log select 'rewards', count(*) from ins;

-- التقييمات
with ins as (
  insert into app.feedback(id, created_at, customer_id, name, phone, rating, comment, token, stamped, follow_up, status, source, qty)
  select f."id", coalesce(app.parse_ts(f."timestamp"), now()),
         case when exists (select 1 from app.customers c where c.id = f."customerId") then f."customerId" end,
         case when f."name" = '—' then '—' else app.safe_name(f."name") end, case when app.norm_phone(f."phone") ~ '^05[0-9]{8}$' then app.norm_phone(f."phone") else '' end,
         f."rating"::int, coalesce(app.clean(f."comment", 500), ''), coalesce(f."token", ''),
         upper(coalesce(f."stamped", '')) in ('TRUE', '1', 'YES'),
         case when f."followUp" in ('needed', 'done') then f."followUp" else '' end,
         case when f."status" = 'deleted' then 'deleted' else 'approved' end,
         coalesce(nullif(f."source", ''), 'link'),
         greatest(0, least(10, coalesce(nullif(regexp_replace(f."qty", '[^0-9]', '', 'g'), '')::int, 0)))
  from public.import_feedback f
  where coalesce(f."id", '') <> '' and coalesce(f."rating", '') ~ '^[1-5]$'
  on conflict do nothing
  returning 1)
insert into mig_log select 'feedback', count(*) from ins;

-- روابط التقييم المفتوحة (عشان روابط انبعتت وما انستعملت تضل شغّالة)
with ins as (
  insert into app.tokens(token, phone, created_at, expires_at, used_at, status, note, qty)
  select t."token", app.norm_phone(t."phone"), coalesce(app.parse_ts(t."createdAt"), now()),
         coalesce(app.parse_ts(t."expiresAt"), now()), app.parse_ts(t."usedAt"),
         case when t."status" in ('open', 'used', 'cancelled', 'purged') then t."status" else 'cancelled' end,
         coalesce(app.clean(t."note", 100), ''),
         greatest(1, least(10, coalesce(nullif(regexp_replace(t."qty", '[^0-9]', '', 'g'), '')::int, 1)))
  from public.import_tokens t
  where coalesce(t."token", '') ~ '^[a-f0-9]{14,32}$'
  on conflict do nothing
  returning 1)
insert into mig_log select 'tokens', count(*) from ins;

-- الإعدادات (مفاتيح معروفة بس)
with ins as (
  insert into app.settings(key, value)
  select s."key", coalesce(s."value", '') from public.import_settings s
  where s."key" in ('MIN_RATING_FOR_STAMP', 'TOKEN_HOURS', 'LOW_RATING_ALERT', 'ALERT_EMAIL', 'PUBLIC_URL', 'GOOGLE_REVIEW_URL', 'REVIEW_ASK', 'CONTACT_PHONE')
  on conflict (key) do update set value = excluded.value
  returning 1)
insert into mig_log select 'settings', count(*) from ins;

-- رابط التطبيق القديم (Apps Script) مش صالح هون: بيتعبّى تلقائياً من التطبيق الجديد
update app.settings set value = '' where key = 'PUBLIC_URL' and not app.valid_app_url(value);

-- أرقام بطاقات قصيرة (أقل من 16 خانة) سهل تنخمّن: بنعطيها رقم جديد (الرابط القديم تبعها بيوقف، ابعثله الجديد)
insert into mig_log select 'short_ids_rotated', count(app.rotate_card(id)) from (select id from app.customers where length(id) < 16) s;

insert into app.audit_log(actor, action, details)
select 'migration', 'import_from_sheets', string_agg(step || '=' || n, ', ') from mig_log;

drop table public.import_customers, public.import_tokens, public.import_feedback, public.import_rewards, public.import_settings;
drop function app.parse_ts(text);
drop function app.safe_name(text);

commit;

-- ملخص اللي انتقل
select details as "اللي انتقل" from app.audit_log where action = 'import_from_sheets' order by id desc limit 1;
