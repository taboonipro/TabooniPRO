-- =====================================================================
-- طابوني برو VIP — 04_import_tables.sql : نقل البيانات من Google Sheets (مرة وحدة)
--
-- الخطوات:
--   1) شغّل هالملف (بيعمل 5 جداول مؤقتة فاضية بأسماء أعمدة الشيت نفسها)
--   2) بالشيت: كل ورقة ← File ← Download ← CSV
--      (Customers, Tokens, Feedback, Rewards, Settings)
--   3) Supabase ← Table Editor ← افتح import_customers ← Insert ← Import data from CSV ← اختار الملف
--      وهيك لكل ورقة بالجدول تبعها
--   4) شغّل 05_migrate.sql
-- الجداول المؤقتة مقفولة (RLS + بدون صلاحيات) وبتنحذف بآخر 05_migrate.sql
-- =====================================================================
begin;

create table if not exists public.import_customers (
  "id" text, "name" text, "phone" text, "stamps" text, "totalStamps" text, "cycle" text, "createdAt" text, "lastStampAt" text,
  "source" text, "consentAt" text, "verifiedAt" text, "nudgedStage" text, "gender" text, "bday" text, "bdaySent" text,
  "passHash" text, "passSalt" text, "mustChange" text, "passSetAt" text, "lastLoginAt" text);
create table if not exists public.import_tokens (
  "token" text, "phone" text, "createdAt" text, "expiresAt" text, "usedAt" text, "status" text, "note" text, "qty" text);
create table if not exists public.import_feedback (
  "id" text, "timestamp" text, "customerId" text, "name" text, "phone" text, "rating" text, "comment" text, "token" text,
  "stamped" text, "followUp" text, "status" text, "source" text, "qty" text);
create table if not exists public.import_rewards (
  "rewardId" text, "customerId" text, "name" text, "phone" text, "type" text, "cycle" text, "earnedAt" text, "redeemedAt" text, "status" text);
create table if not exists public.import_settings ("key" text, "value" text);

alter table public.import_customers enable row level security;
alter table public.import_tokens    enable row level security;
alter table public.import_feedback  enable row level security;
alter table public.import_rewards   enable row level security;
alter table public.import_settings  enable row level security;
revoke all on public.import_customers, public.import_tokens, public.import_feedback, public.import_rewards, public.import_settings from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on public.import_customers, public.import_tokens, public.import_feedback, public.import_rewards, public.import_settings from anon, authenticated';
  end if;
end $$;

commit;
