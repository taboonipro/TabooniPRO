-- =====================================================================
-- طابوني برو VIP — 06_security_check.sql : فحص أمان ذاتي (ما بيغيّر إشي)
-- شغّله بعد التركيب، وبعد أي تعديل بالداتابيس. كل سطر لازم يطلع ✅
-- =====================================================================
with checks as (
  -- 1) ولا جدول بمخطط public مفتوح للزوار/المسجّلين
  select '1. ما في جداول مكشوفة بـ public' as check_name,
         not exists (select 1 from information_schema.role_table_grants
                     where table_schema = 'public' and grantee in ('anon', 'authenticated')) as ok
  union all
  -- 2) مخطط app مقفول (ما في USAGE للزوار/المسجّلين)
  select '2. المخطط app مقفول', not (has_schema_privilege('anon', 'app', 'USAGE') or has_schema_privilege('authenticated', 'app', 'USAGE'))
  union all
  -- 3) RLS مفعّل على كل جداول app
  select '3. RLS مفعّل على كل الجداول', not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                     where n.nspname = 'app' and c.relkind = 'r' and not c.relrowsecurity)
  union all
  -- 4) الزوار بيقدروا ينفّذوا 4 دوال بس
  select '4. الزوار: دالتين بس (رابط تقييم، تقييم)',
         (select array_agg(p.proname::text order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'EXECUTE'))
         = array['get_token_info', 'submit_feedback']
  union all
  -- 5) دوال svc_ (حسابات الدخول) للـ service_role بس
  select '5. دوال svc_ مقفولة عن المتصفح', not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname like 'svc\_%' and (has_function_privilege('anon', p.oid, 'EXECUTE') or has_function_privilege('authenticated', p.oid, 'EXECUTE')))
  union all
  -- 6) كل دوال public: security definer + search_path ثابت
  select '6. كل الدوال security definer مع search_path ثابت', not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and (not p.prosecdef or p.proconfig is null or not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%')))
  union all
  -- 7) كل دالة admin_ بتفحص إنه الطالب إدارة
  select '7. كل دوال admin_ بتفحص صلاحية الإدارة', not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname like 'admin\_%' and p.prosrc not like '%app.is_admin()%')
  union all
  -- 8) في حساب إدارة واحد على الأقل
  select '8. في حساب إدارة (app.staff)', exists (select 1 from app.staff s join auth.users u on u.id = s.user_id)
  union all
  -- 9) ما في جداول import_ منسية من النقل
  select '9. ما في جداول نقل مؤقتة منسية', not exists (select 1 from pg_tables where schemaname = 'public' and tablename like 'import\_%')
  union all
  -- 10) كل حسابات الإدارة لازم تدخل بخطوتين (كلمة سر + كود من تطبيق)
  select '10. دخول الإدارة بخطوتين (MFA) مفروض', not exists (select 1 from app.staff where not require_mfa)
  union all
  -- 11) أي دالة جديدة بالمستقبل ما بتنفتح تلقائياً للزوار
  select '11. دوال جديدة مش مفتوحة تلقائياً', exists (select 1 from pg_default_acl where defaclnamespace = 0 and defaclobjtype = 'f' and defaclacl::text !~ '[{,]=X')
         and not exists (select 1 from pg_default_acl where defaclnamespace = 'public'::regnamespace and defaclobjtype = 'f' and defaclacl::text ~ '(anon|authenticated)=[^,}]*X')
  union all
  -- 12) أرقام البطاقات طويلة (ما بتنخمّن)
  select '12. كل أرقام البطاقات 16 خانة أو أكثر', not exists (select 1 from app.customers where length(id) < 16)
)
select check_name as "الفحص", case when ok then '✅' else '❌ لازم تصليح' end as "النتيجة" from checks;
