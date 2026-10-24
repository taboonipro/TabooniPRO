-- =====================================================================
-- طابوني برو VIP — 03_notify.sql (اختياري): إيميل لما يجي تقييم منخفض
--
-- قبل ما تشغّله:
--   1) Database ← Extensions ← فعّل pg_net
--   2) انشر الـ Edge Function: notify (README خطوة 5)
--   3) غيّر القيمتين تحت (رابط الدالة + السر نفسه اللي حطيته بـ NOTIFY_SECRET)
-- =====================================================================
begin;

insert into app.settings(key, value) values
  ('NOTIFY_URL',    'https://YOUR-PROJECT.supabase.co/functions/v1/notify'),
  ('NOTIFY_SECRET', 'PUT-THE-SAME-LONG-RANDOM-SECRET-HERE')
on conflict (key) do update set value = excluded.value;

create or replace function app.notify_low_rating() returns trigger language plpgsql security definer set search_path = app, pg_catalog as $$
declare u text; s text;
begin
  if new.follow_up <> 'needed' then return new; end if;
  select value into u from app.settings where key = 'NOTIFY_URL';
  select value into s from app.settings where key = 'NOTIFY_SECRET';
  if coalesce(u, '') !~ '^https://[a-z0-9-]+\.supabase\.co/functions/v1/notify$' or length(coalesce(s, '')) < 32 or s ilike '%PUT-THE-SAME%' then return new; end if;   -- سر مثال أو قصير ← ما بنبعث
  if not app.hit('notify:d:all', 25, 86400) then return new; end if;    -- سقف 25 إيميل باليوم
  begin
    perform net.http_post(url := u,
      body := jsonb_build_object('name', new.name, 'phone', new.phone, 'rating', new.rating, 'comment', new.comment),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-tabooni-secret', s));
  exception when others then null;   -- الإيميل ما بيوقف التقييم أبداً
  end;
  return new;
end $$;
revoke all on function app.notify_low_rating() from public;

drop trigger if exists feedback_notify on app.feedback;
create trigger feedback_notify after insert on app.feedback for each row execute function app.notify_low_rating();

commit;
