-- =============================================================================
-- 1. fázis – jogosultságok (spec v1.1, 7. fejezet)
-- Két réteg: (1) tábla-/oszlopszintű GRANT – mit írhat egyáltalán egy szerep;
--            (2) RLS – mely sorokhoz fér hozzá.
-- Állapotváltás (foglalás, barber státusz) csak security definer függvényeken át.
-- =============================================================================

-- Az auth szolgáltatás futtatja a profil-létrehozó triggert
grant usage on schema private to supabase_auth_admin;

-- -----------------------------------------------------------------------------
-- Segédfüggvények az RLS-hez (security definer: nem futnak bele saját RLS-be)
-- -----------------------------------------------------------------------------
create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = (select auth.uid())), false);
$$;

-- A bejelentkezett felhasználó barber-azonosítója (bármilyen státuszban), vagy null
create function private.my_barber_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select b.id from public.barbers b where b.user_id = (select auth.uid());
$$;

-- Jóváhagyott (nyilvánosan látható) barber-e
create function private.is_public_barber(p_barber_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.barbers b where b.id = p_barber_id and b.status = 'approved');
$$;

-- -----------------------------------------------------------------------------
-- GRANT-ok: alapból semmi, csak amit kifejezetten megengedünk
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;

-- profiles: csak név, telefon és a feltételek elfogadása írható (is_admin soha)
grant select on public.profiles to authenticated;
grant update (full_name, phone, terms_accepted_at) on public.profiles to authenticated;

-- barbers: a status / approved_at / reject_reason csak függvényen át változhat
grant select on public.barbers to anon, authenticated;
grant insert (user_id, slug, display_name, bio, city, address, phone, instagram, avatar_path, is_listed)
  on public.barbers to authenticated;
grant update (slug, display_name, bio, city, address, phone, instagram, avatar_path, is_listed)
  on public.barbers to authenticated;

grant select on public.barber_settings to authenticated;
grant update (approval_timeout_min, cancel_limit_hours, min_notice_min, max_days_ahead, buffer_min, slot_step_min)
  on public.barber_settings to authenticated;

grant select on public.services to anon, authenticated;
grant insert, update, delete on public.services to authenticated;

grant select on public.working_hours to anon, authenticated;
grant insert, update, delete on public.working_hours to authenticated;

grant select on public.barber_customers to authenticated;
grant update (is_trusted) on public.barber_customers to authenticated;

-- bookings: közvetlen írás senkinek (request_booking & co. függvények a 4–5. fázisban)
grant select on public.bookings to authenticated;

grant select, insert, update, delete on public.private_events to authenticated;
grant select, insert, delete on public.private_event_skips to authenticated;

grant select, insert, delete on public.push_subscriptions to authenticated;

grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- -----------------------------------------------------------------------------
-- RLS bekapcsolása mindenhol
-- -----------------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.barbers             enable row level security;
alter table public.barber_settings     enable row level security;
alter table public.services            enable row level security;
alter table public.working_hours       enable row level security;
alter table public.barber_customers    enable row level security;
alter table public.bookings            enable row level security;
alter table public.private_events      enable row level security;
alter table public.private_event_skips enable row level security;
alter table public.push_subscriptions  enable row level security;
alter table public.notifications       enable row level security;

-- -----------------------------------------------------------------------------
-- profiles: saját profil; a barber csak a saját vendégeiét látja. Az admin nem lát vendégadatot.
-- -----------------------------------------------------------------------------
create policy "profiles: saját olvasása" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: barber látja a saját vendégeit" on public.profiles
  for select to authenticated
  using (exists (
    select 1 from public.barber_customers bc
     where bc.customer_id = profiles.id
       and bc.barber_id = (select private.my_barber_id())
  ));

create policy "profiles: saját módosítása" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- barbers: jóváhagyott barber nyilvános; a sajátját mindenki látja; az admin mindet
-- -----------------------------------------------------------------------------
create policy "barbers: jóváhagyottak nyilvánosak" on public.barbers
  for select to anon, authenticated
  using (status = 'approved');

create policy "barbers: saját olvasása" on public.barbers
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "barbers: admin mindet látja" on public.barbers
  for select to authenticated
  using ((select private.is_admin()));

create policy "barbers: jelentkezés saját néven" on public.barbers
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "barbers: saját profil módosítása" on public.barbers
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- barber_settings: csak a tulajdonos
-- -----------------------------------------------------------------------------
create policy "barber_settings: saját olvasása" on public.barber_settings
  for select to authenticated
  using (barber_id = (select private.my_barber_id()));

create policy "barber_settings: saját módosítása" on public.barber_settings
  for update to authenticated
  using (barber_id = (select private.my_barber_id()))
  with check (barber_id = (select private.my_barber_id()));

-- -----------------------------------------------------------------------------
-- services: aktív szolgáltatás jóváhagyott barbernél nyilvános; írni csak a tulajdonos
-- -----------------------------------------------------------------------------
create policy "services: nyilvános aktívak" on public.services
  for select to anon, authenticated
  using (is_active and private.is_public_barber(barber_id));

create policy "services: saját olvasása" on public.services
  for select to authenticated
  using (barber_id = (select private.my_barber_id()));

create policy "services: saját létrehozása" on public.services
  for insert to authenticated
  with check (barber_id = (select private.my_barber_id()));

create policy "services: saját módosítása" on public.services
  for update to authenticated
  using (barber_id = (select private.my_barber_id()))
  with check (barber_id = (select private.my_barber_id()));

create policy "services: saját törlése" on public.services
  for delete to authenticated
  using (barber_id = (select private.my_barber_id()));

-- -----------------------------------------------------------------------------
-- working_hours: jóváhagyott barbernél nyilvános; írni csak a tulajdonos
-- -----------------------------------------------------------------------------
create policy "working_hours: nyilvános" on public.working_hours
  for select to anon, authenticated
  using (private.is_public_barber(barber_id));

create policy "working_hours: saját olvasása" on public.working_hours
  for select to authenticated
  using (barber_id = (select private.my_barber_id()));

create policy "working_hours: saját létrehozása" on public.working_hours
  for insert to authenticated
  with check (barber_id = (select private.my_barber_id()));

create policy "working_hours: saját módosítása" on public.working_hours
  for update to authenticated
  using (barber_id = (select private.my_barber_id()))
  with check (barber_id = (select private.my_barber_id()));

create policy "working_hours: saját törlése" on public.working_hours
  for delete to authenticated
  using (barber_id = (select private.my_barber_id()));

-- -----------------------------------------------------------------------------
-- barber_customers: csak a barber látja/jelöli a saját vendégeit
-- -----------------------------------------------------------------------------
create policy "barber_customers: saját olvasása" on public.barber_customers
  for select to authenticated
  using (barber_id = (select private.my_barber_id()));

create policy "barber_customers: megbízható jelölés" on public.barber_customers
  for update to authenticated
  using (barber_id = (select private.my_barber_id()))
  with check (barber_id = (select private.my_barber_id()));

-- -----------------------------------------------------------------------------
-- bookings: a vendég a sajátjait, a barber a nála lévőket látja. Írás csak függvényen át.
-- -----------------------------------------------------------------------------
create policy "bookings: vendég a sajátjait" on public.bookings
  for select to authenticated
  using (customer_id = (select auth.uid()));

create policy "bookings: barber a nála lévőket" on public.bookings
  for select to authenticated
  using (barber_id = (select private.my_barber_id()));

-- -----------------------------------------------------------------------------
-- private_events + skips: kizárólag a tulajdonos barber (az admin sem)
-- -----------------------------------------------------------------------------
create policy "private_events: csak a tulajdonos" on public.private_events
  for all to authenticated
  using (barber_id = (select private.my_barber_id()))
  with check (barber_id = (select private.my_barber_id()));

create policy "private_event_skips: csak a tulajdonos" on public.private_event_skips
  for all to authenticated
  using (exists (
    select 1 from public.private_events e
     where e.id = private_event_skips.event_id
       and e.barber_id = (select private.my_barber_id())
  ))
  with check (exists (
    select 1 from public.private_events e
     where e.id = private_event_skips.event_id
       and e.barber_id = (select private.my_barber_id())
  ));

-- -----------------------------------------------------------------------------
-- push_subscriptions, notifications: csak a saját
-- -----------------------------------------------------------------------------
create policy "push_subscriptions: saját" on public.push_subscriptions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "notifications: saját olvasása" on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "notifications: saját olvasottnak jelölése" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
