-- =============================================================================
-- 6. fázis – Értesítések (spec 9. fejezet, dontesek.md 18.)
--
-- Az értesítéseket az adatbázis hozza létre (triggerek + időzítő), így minden eseményről szól –
-- az időzítő által kiváltottakról (lejárat, emlékeztető) is. Csatornák:
--   - appon belüli: maga a notifications sor (a felület listázza, élőben frissül);
--   - push: a Next.js szerver küldi (/api/notifications/dispatch) – az adatbázis pg_net-tel „szól” neki,
--     és percenként újra is próbálja; az elküldött sor push_sent_at-ot kap;
--   - e-mail: előkészítve, kikapcsolva (8. fázis).
-- =============================================================================

create extension if not exists pg_net;

alter table public.notifications
  add column push_sent_at  timestamptz,
  add column push_attempts integer not null default 0;

create index notifications_push_queue_idx on public.notifications (created_at) where push_sent_at is null;

-- Emlékeztető: egyszer foglalásonként (áthelyezéskor újra)
alter table public.bookings add column reminder_sent_at timestamptz;

-- -----------------------------------------------------------------------------
-- Beállítások (a küldő címe és titkos kulcsa) – csak a szerver írja (service_role), senki nem olvassa
-- -----------------------------------------------------------------------------
create table private.app_config (
  key   text primary key,
  value text not null
);
revoke all on private.app_config from public, anon, authenticated;

create function public.set_app_config(p_key text, p_value text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.app_config (key, value) values (p_key, p_value)
  on conflict (key) do update set value = excluded.value;
$$;
revoke execute on function public.set_app_config(text, text) from public, anon, authenticated;
grant execute on function public.set_app_config(text, text) to service_role;

-- -----------------------------------------------------------------------------
-- Segédek
-- -----------------------------------------------------------------------------

-- Pl. „október 15., csütörtök 10:00” (bukaresti idő)
create function private.format_hu(p_ts timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select (array['január','február','március','április','május','június','július','augusztus',
                'szeptember','október','november','december'])[extract(month from l)::int]
         || ' ' || extract(day from l)::int || '., '
         || (array['vasárnap','hétfő','kedd','szerda','csütörtök','péntek','szombat'])[extract(dow from l)::int + 1]
         || ' ' || to_char(l, 'HH24:MI')
    from (select p_ts at time zone 'Europe/Bucharest' as l) x;
$$;

-- Egy értesítés létrehozása (url: hová vigyen a koppintás)
create function private.notify(p_user_id uuid, p_type text, p_title text, p_body text, p_url text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, type, title, body, data)
  select p_user_id, p_type, p_title, p_body, jsonb_build_object('url', p_url)
   where p_user_id is not null;
$$;

-- Szól a küldőnek (ha be van állítva). A kérés a tranzakció lezárulta után megy ki.
create function private.ping_dispatcher()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url    text;
  v_secret text;
begin
  select value into v_url from private.app_config where key = 'dispatch_url';
  select value into v_secret from private.app_config where key = 'dispatch_secret';
  if v_url is null or v_secret is null then
    return;
  end if;
  perform net.http_post(
    url := v_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-dispatch-secret', v_secret),
    timeout_milliseconds := 5000
  );
end;
$$;

create function private.notifications_ping()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.ping_dispatcher();
  return null;
end;
$$;

create trigger notifications_ping
  after insert on public.notifications
  for each statement execute function private.notifications_ping();

-- A küldő ezzel „foglalja le” a kiküldendő értesítéseket (két párhuzamos futás nem küld kétszer)
create function public.claim_push_notifications(p_limit integer default 100)
returns setof public.notifications
language sql
security definer
set search_path = ''
as $$
  update public.notifications n
     set push_sent_at = now(), push_attempts = n.push_attempts + 1
   where n.id in (
     select id from public.notifications
      where push_sent_at is null and push_attempts < 5 and created_at > now() - interval '1 day'
      order by created_at
      limit p_limit
      for update skip locked
   )
  returning n.*;
$$;
revoke execute on function public.claim_push_notifications(integer) from public, anon, authenticated;
grant execute on function public.claim_push_notifications(integer) to service_role;

-- Push-feliratkozás mentése: az eszköz (endpoint) mindig az épp belépett felhasználóé lesz
create function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Bejelentkezés szükséges.' using errcode = '42501';
  end if;
  if p_endpoint !~ '^https://' or char_length(p_endpoint) > 1000
     or char_length(coalesce(p_p256dh, '')) not between 1 and 200
     or char_length(coalesce(p_auth, '')) not between 1 and 100 then
    raise exception 'Érvénytelen feliratkozás.' using errcode = '22023';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values ((select auth.uid()), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
     set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, created_at = now();
end;
$$;
revoke execute on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Foglalások
-- -----------------------------------------------------------------------------
create function private.bookings_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_barber   public.barbers;
  v_service  text;
  v_customer text;
  v_actor    uuid := (select auth.uid());
  v_when     text := private.format_hu(new.starts_at);
  v_limit    integer;
  v_note     text := case when new.decision_note is not null then '„' || new.decision_note || '” ' else '' end;
begin
  select * into v_barber from public.barbers where id = new.barber_id;
  select name into v_service from public.services where id = new.service_id;
  select coalesce((select full_name from public.profiles where id = new.customer_id), new.guest_name, 'Vendég')
    into v_customer;

  if tg_op = 'INSERT' then
    if new.status = 'pending' then
      perform private.notify(v_barber.user_id, 'booking_request', 'Új foglalási kérés',
        v_customer || ' · ' || v_service || ' · ' || v_when, '/keresek');
    elsif new.status = 'confirmed' and new.customer_id is not null and v_actor = new.customer_id then
      -- Megbízható vendég: azonnal megerősítve (a barber kézi foglalásáról nem szólunk)
      perform private.notify(v_barber.user_id, 'booking_new', 'Új foglalás',
        v_customer || ' · ' || v_service || ' · ' || v_when, '/naptar');
      perform private.notify(new.customer_id, 'booking_confirmed', 'Foglalásod megerősítve',
        v_barber.display_name || ' · ' || v_when || ' · ' || v_barber.city || ', ' || v_barber.address, '/foglalasaim');
    end if;
    return null;
  end if;

  if new.status is distinct from old.status then
    if old.status = 'pending' and new.status = 'confirmed' then
      select cancel_limit_hours into v_limit from public.barber_settings where barber_id = new.barber_id;
      perform private.notify(new.customer_id, 'booking_confirmed', 'Foglalásod megerősítve',
        v_barber.display_name || ' · ' || v_when || ' · ' || v_barber.city || ', ' || v_barber.address
          || ' · Lemondani legkésőbb ' || v_limit || ' órával előtte tudod.', '/foglalasaim');
    elsif new.status = 'rejected' then
      perform private.notify(new.customer_id, 'booking_rejected', v_barber.display_name || ' nem tudja vállalni a kérésed',
        v_note || v_when || '. Nézd meg a felajánlott másik időpontokat.', '/foglalasaim');
    elsif new.status = 'expired' then
      perform private.notify(new.customer_id, 'booking_expired', 'A foglalási kérésed lejárt',
        v_barber.display_name || ' nem válaszolt időben (' || v_when || '). Nézd meg a másik időpontokat.', '/foglalasaim');
    elsif new.status = 'cancelled' and new.cancelled_by = 'barber' then
      perform private.notify(new.customer_id, 'booking_cancelled', v_barber.display_name || ' lemondta a foglalásod',
        v_note || v_when || '. Nézd meg a felajánlott másik időpontokat.', '/foglalasaim');
    elsif new.status = 'cancelled' and new.cancelled_by = 'customer' then
      perform private.notify(v_barber.user_id, 'booking_cancelled_by_customer',
        case when old.status = 'pending' then 'Visszavont kérés' else 'Lemondott foglalás' end,
        v_customer || ' · ' || v_service || ' · ' || v_when || ' – az időpont felszabadult.', '/naptar');
    end if;
  elsif new.starts_at is distinct from old.starts_at and new.status = 'confirmed'
        and v_actor is distinct from new.customer_id then
    -- A barber közvetlenül áthelyezte (a vendég saját elfogadásáról a vendégnek nem szólunk)
    perform private.notify(new.customer_id, 'booking_moved', v_barber.display_name || ' áthelyezte a foglalásod',
      'Új időpont: ' || v_when || ' (korábban: ' || private.format_hu(old.starts_at) || ').', '/foglalasaim');
  end if;
  return null;
end;
$$;

create trigger bookings_notify
  after insert or update of status, starts_at on public.bookings
  for each row execute function private.bookings_notify();

-- Áthelyezéskor az emlékeztető újra kimegy (az új időponthoz)
create function private.bookings_reset_reminder()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.starts_at is distinct from old.starts_at then
    new.reminder_sent_at := null;
  end if;
  return new;
end;
$$;

create trigger bookings_reset_reminder
  before update of starts_at on public.bookings
  for each row execute function private.bookings_reset_reminder();

-- -----------------------------------------------------------------------------
-- Áthelyezési javaslatok
-- -----------------------------------------------------------------------------
create function private.reschedules_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_barber   public.barbers;
  v_booking  public.bookings;
  v_customer text;
begin
  select * into v_barber from public.barbers where id = new.barber_id;
  select * into v_booking from public.bookings where id = new.booking_id;
  select coalesce(full_name, 'A vendég') into v_customer from public.profiles where id = new.customer_id;

  if tg_op = 'INSERT' then
    perform private.notify(new.customer_id, 'reschedule_proposed', v_barber.display_name || ' új időpontot javasol',
      private.format_hu(new.starts_at) || ' (most: ' || private.format_hu(v_booking.starts_at) || '). Válaszolj '
        || private.format_hu(new.expires_at) || '-ig.', '/foglalasaim');
  elsif new.status is distinct from old.status then
    if new.status = 'accepted' then
      perform private.notify(v_barber.user_id, 'reschedule_accepted', v_customer || ' elfogadta az új időpontot',
        private.format_hu(new.starts_at), '/naptar');
    elsif new.status = 'declined' then
      perform private.notify(v_barber.user_id, 'reschedule_declined', v_customer || ' nem fogadta el az új időpontot',
        'Döntsd el, marad-e a régi (' || private.format_hu(v_booking.starts_at) || ').', '/keresek');
    elsif new.status = 'expired' and new.needs_decision then
      perform private.notify(v_barber.user_id, 'reschedule_expired', v_customer || ' nem válaszolt az áthelyezésre',
        'Döntsd el, marad-e a régi (' || private.format_hu(v_booking.starts_at) || ').', '/keresek');
    end if;
  end if;
  return null;
end;
$$;

create trigger reschedules_notify
  after insert or update of status on public.booking_reschedules
  for each row execute function private.reschedules_notify();

-- -----------------------------------------------------------------------------
-- Barber- és egységjelentkezések
-- -----------------------------------------------------------------------------
create function private.notify_admins(p_type text, p_title text, p_body text)
returns void
language sql
security definer
set search_path = ''
as $$
  select private.notify(p.id, p_type, p_title, p_body, '/platform') from public.profiles p where p.is_admin;
$$;

create function private.barbers_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return null;
  end if;
  if new.status = 'pending' then
    perform private.notify_admins('barber_application', 'Új barberjelentkezés', new.display_name || ', ' || new.city);
  elsif new.status = 'approved' then
    perform private.notify(new.user_id, 'barber_approved',
      case when old.status = 'suspended' then 'Újra aktív a profilod' else 'Jóváhagytuk a jelentkezésed' end,
      'Állítsd be a szolgáltatásaidat és a munkaidődet, és már foglalhatnak nálad.', '/naptar');
  elsif new.status = 'rejected' then
    perform private.notify(new.user_id, 'barber_rejected', 'Nem hagytuk jóvá a jelentkezésed',
      coalesce(new.reject_reason, 'Részletek a jelentkezésednél.'), '/barber-leszek');
  elsif new.status = 'suspended' then
    perform private.notify(new.user_id, 'barber_suspended', 'Felfüggesztettük a barberprofilod',
      coalesce(new.reject_reason, 'A jövőbeli foglalásaid lemondásra kerültek.'), '/barber-leszek');
  end if;
  return null;
end;
$$;

create trigger barbers_notify
  after insert or update of status on public.barbers
  for each row execute function private.barbers_notify();

create function private.shops_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return null;
  end if;
  select user_id into v_owner from public.barbers where id = new.owner_barber_id;
  if new.status = 'pending' then
    perform private.notify_admins('shop_application', 'Új egység jelentkezett', new.name || ', ' || new.city);
  elsif new.status = 'approved' then
    perform private.notify(v_owner, 'shop_approved', 'Jóváhagytuk az egységed', new.name || ' oldala már látható.', '/egysegem');
  elsif new.status in ('rejected', 'suspended') then
    perform private.notify(v_owner, 'shop_' || new.status,
      case when new.status = 'rejected' then 'Nem hagytuk jóvá az egységed' else 'Felfüggesztettük az egységed' end,
      coalesce(new.reject_reason, new.name), '/egysegem');
  end if;
  return null;
end;
$$;

create trigger shops_notify
  after insert or update of status on public.shops
  for each row execute function private.shops_notify();

-- -----------------------------------------------------------------------------
-- Emlékeztető (spec: előző nap 18:00; dontesek.md 10.: 18:00 után leadott másnapi foglalás azonnal kap).
-- Az aznapra szóló (aznap megerősített) foglalás nem kap emlékeztetőt.
-- -----------------------------------------------------------------------------
create function public.send_due_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
  r record;
begin
  for r in
    select b.id, b.customer_id, b.starts_at, br.display_name, br.city, br.address, s.name as service_name
      from public.bookings b
      join public.barbers br on br.id = b.barber_id
      join public.services s on s.id = b.service_id
     where b.status = 'confirmed'
       and b.customer_id is not null
       and b.reminder_sent_at is null
       and b.starts_at > now()
       and now() >= ((((b.starts_at at time zone 'Europe/Bucharest')::date - 1) + time '18:00') at time zone 'Europe/Bucharest')
       and coalesce(b.decided_at, b.created_at)
           < (((b.starts_at at time zone 'Europe/Bucharest')::date)::timestamp at time zone 'Europe/Bucharest')
     for update of b skip locked
  loop
    perform private.notify(r.customer_id, 'reminder',
      'Emlékeztető: holnap ' || to_char(r.starts_at at time zone 'Europe/Bucharest', 'HH24:MI'),
      r.display_name || ' · ' || r.service_name || ' · ' || r.city || ', ' || r.address, '/foglalasaim');
    update public.bookings set reminder_sent_at = now() where id = r.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function public.send_due_reminders() from public, anon, authenticated;
grant execute on function public.send_due_reminders() to service_role;

revoke execute on function private.notify(uuid, text, text, text, text) from public, anon, authenticated;
revoke execute on function private.notify_admins(text, text, text) from public, anon, authenticated;
revoke execute on function private.ping_dispatcher() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Időzítők: emlékeztetők és a push-küldés újrapróbálása (percenként)
-- -----------------------------------------------------------------------------
select cron.schedule('send-reminders', '* * * * *', $$select public.send_due_reminders()$$);
select cron.schedule('dispatch-notifications', '* * * * *', $$
  select private.ping_dispatcher()
   where exists (
     select 1 from public.notifications
      where push_sent_at is null and push_attempts < 5 and created_at > now() - interval '1 day'
   )
$$);

-- Élő frissítés: a harang számjelzője (RLS: mindenki csak a sajátját kapja)
alter publication supabase_realtime add table public.notifications;
