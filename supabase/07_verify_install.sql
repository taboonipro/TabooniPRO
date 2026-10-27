-- =====================================================================
-- طابوني برو VIP — 07_verify_install.sql : هل التركيب كامل ومحدّث؟ (ما بيغيّر إشي)
-- شغّله بعد 01 و 02. كل سطر لازم يطلع ✅
-- الدالة admin-users ما بتنفحص من هون: افحصها بالتطبيق ← الإعدادات ← "حالة النظام"
-- =====================================================================
with fn as (select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'),
col as (select table_name || '.' || column_name as c from information_schema.columns where table_schema = 'app'),
checks as (
  select 1 as n, 'نسخة الداتابيس' as check_name,
         coalesce((select substring(prosrc from '''([0-9.]+)''') from pg_proc where proname = 'db_version'), '?') = '1.27' as ok,
         'النسخة هلأ: ' || coalesce((select substring(prosrc from '''([0-9.]+)''') from pg_proc where proname = 'db_version'), 'قديمة') || ' ← شغّل 01_schema.sql و 02_api.sql من الإصدار الجديد' as fix
  union all select 2, 'دوال الاشتراك الذاتي',
         (select count(*) from fn where proname in ('svc_signup_prepare', 'svc_signup_link', 'svc_signup_abort')) = 3,
         'شغّل 02_api.sql'
  union all select 9, 'تأكيد الرقم بالواتساب (جدول + دوال)',
         to_regclass('app.wa_codes') is not null and (select count(*) from fn where proname in ('svc_wa_verify', 'start_takeover', 'takeover_status')) = 3,
         'شغّل 01_schema.sql و 02_api.sql'
  union all select 3, 'دوال الإدارة الجديدة',
         (select count(*) from fn where proname in ('admin_approve_signup', 'admin_card', 'admin_health', 'cust_submit_feedback')) = 4,
         'شغّل 02_api.sql'
  union all select 4, 'الدوال القديمة انشالت (join_program, get_card)',
         not exists (select 1 from fn where proname in ('join_program', 'get_card')),
         'شغّل 02_api.sql'
  union all select 5, 'أعمدة جديدة بجدول الزبائن',
         (select count(*) from col where c in ('customers.signup_at', 'customers.approved_at', 'customers.temp_hash', 'staff.require_mfa')) = 4,
         'شغّل 01_schema.sql'
  union all select 6, 'الزوار: 4 دوال بس',
         (select array_agg(p.proname::text order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'EXECUTE')) = array['get_token_info', 'start_takeover', 'submit_feedback', 'takeover_status'],
         'شغّل 02_api.sql (آخر جزء فيه الصلاحيات)'
  union all select 7, 'حساب إدارة موجود',
         exists (select 1 from app.staff s join auth.users u on u.id = s.user_id),
         'خطوة 4 بالـ README: insert into app.staff ...'
  union all select 8, 'دخول الإدارة بخطوتين',
         not exists (select 1 from app.staff s where coalesce((to_jsonb(s) ->> 'require_mfa')::boolean, false) = false),
         'update app.staff set require_mfa = true;'
)
select n as "#", check_name as "الفحص", case when ok then '✅' else '❌' end as "النتيجة", case when ok then '' else fix end as "شو تعمل"
from checks order by n;
