-- =============================================================================
-- 5. fázis – jóváhagyás, elutasítás, lemondás, lejárat, alternatív időpontok, élő frissítés
-- Státuszváltás kizárólag ezeken a függvényeken át (spec 7. fejezet).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Lejárat: a határidőn túli függő kéréseket „lejárt”-ra teszi (opcionálisan csak egy barbernél).
-- Percenként fut (pg_cron), és a foglalás előtt is lefut, hogy a lejárt kérés ne foglalja az időt.
-- -----------------------------------------------------------------------------
create function private.expire_pending_bookings(p_barber_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.bookings
     set status = 'expired', decided_at = now()
   where status = 'pending'
     and expires_at <= now()
     and (p_barber_id is null or barber_id = p_barber_id);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- A szabad időpontok számításánál a már lejárt (de még át nem állított) kérés nem foglal időt
create or replace function public.get_available_slots(p_barber_id uuid, p_service_id uuid, p_date date)
returns table (starts_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  with params as (
    select s.duration_min, st.buffer_min, st.slot_step_min, st.min_notice_min, st.max_days_ahead
      from public.services s
      join public.barbers b on b.id = s.barber_id
      join public.barber_settings st on st.barber_id = b.id
     where s.id = p_service_id
       and s.barber_id = p_barber_id
       and s.is_active
       and b.status = 'approved'
       and p_date >= (now() at time zone 'Europe/Bucharest')::date
       and p_date <= (now() at time zone 'Europe/Bucharest')::date + st.max_days_ahead
  ),
  candidates as (
    select (local_start at time zone 'Europe/Bucharest') as starts_at,
           (local_start at time zone 'Europe/Bucharest') + make_interval(mins => p.duration_min) as ends_at,
           (local_start at time zone 'Europe/Bucharest') + make_interval(mins => p.duration_min + p.buffer_min) as block_end,
           p.min_notice_min
      from params p
      join public.working_hours w
        on w.barber_id = p_barber_id
       and w.weekday = extract(dow from p_date)::int
     cross join lateral generate_series(
       p_date + w.start_time,
       p_date + w.end_time - make_interval(mins => p.duration_min),
       make_interval(mins => p.slot_step_min)
     ) as local_start
  )
  select c.starts_at
    from candidates c
   where c.starts_at >= now() + make_interval(mins => c.min_notice_min)
     and not exists (
       select 1 from public.bookings b
        where b.barber_id = p_barber_id
          and (b.status = 'confirmed' or (b.status = 'pending' and b.expires_at > now()))
          and tstzrange(b.starts_at, b.block_end) && tstzrange(c.starts_at, c.block_end)
     )
     and not exists (
       select 1 from private.private_event_occurrences(p_barber_id, c.starts_at, c.ends_at) o
     )
   order by c.starts_at;
$$;

-- A foglalási kérés előtt a barber lejárt kéréseit lezárjuk (különben az adatbázis-szabály ütközést jelezne)
create or replace function public.request_booking(p_service_id uuid, p_starts_at timestamptz, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id  uuid := (select auth.uid());
  v_service  public.services;
  v_settings public.barber_settings;
  v_trusted  boolean;
  v_ends_at  timestamptz;
  v_id       uuid;
begin
  if v_user_id is null then
    raise exception 'A foglaláshoz be kell lépned.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.profiles
     where id = v_user_id and full_name is not null and phone is not null and terms_accepted_at is not null
  ) then
    raise exception 'Foglalás előtt add meg a neved és a telefonszámod a profilodban.' using errcode = '22023';
  end if;

  select * into v_service from public.services where id = p_service_id and is_active;
  if not found then
    raise exception 'Ez a szolgáltatás már nem elérhető.' using errcode = '22023';
  end if;
  if exists (select 1 from public.barbers where id = v_service.barber_id and user_id = v_user_id) then
    raise exception 'Saját magadhoz nem foglalhatsz – a naptáradban kézi foglalást vehetsz fel.' using errcode = '22023';
  end if;
  if char_length(coalesce(p_note, '')) > 500 then
    raise exception 'A megjegyzés legfeljebb 500 karakter lehet.' using errcode = '22023';
  end if;

  perform private.expire_pending_bookings(v_service.barber_id);

  if not exists (
    select 1
      from public.get_available_slots(v_service.barber_id, p_service_id, (p_starts_at at time zone 'Europe/Bucharest')::date) s
     where s.starts_at = p_starts_at
  ) then
    raise exception 'Ez az időpont már nem szabad. Válassz másikat.' using errcode = '22023';
  end if;

  select * into v_settings from public.barber_settings where barber_id = v_service.barber_id;
  select coalesce(bc.is_trusted, false) into v_trusted
    from public.barber_customers bc
   where bc.barber_id = v_service.barber_id and bc.customer_id = v_user_id;
  v_ends_at := p_starts_at + make_interval(mins => v_service.duration_min);

  begin
    insert into public.bookings (
      barber_id, customer_id, service_id, starts_at, ends_at, block_end,
      status, customer_note, expires_at, decided_at
    ) values (
      v_service.barber_id, v_user_id, p_service_id, p_starts_at, v_ends_at,
      v_ends_at + make_interval(mins => v_settings.buffer_min),
      (case when coalesce(v_trusted, false) then 'confirmed' else 'pending' end)::public.booking_status,
      nullif(trim(p_note), ''),
      case when coalesce(v_trusted, false) then null
           else least(now() + make_interval(mins => v_settings.approval_timeout_min), p_starts_at) end,
      case when coalesce(v_trusted, false) then now() end
    )
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'Ezt az időpontot közben lefoglalták. Válassz másikat.' using errcode = '22023';
  end;

  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Barber döntése: jóváhagyás / elutasítás (csak a saját, még érvényes függő kérésénél)
-- -----------------------------------------------------------------------------
create function public.approve_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.expire_pending_bookings(private.my_barber_id());
  update public.bookings
     set status = 'confirmed', decided_at = now()
   where id = p_booking_id
     and barber_id = private.my_barber_id()
     and status = 'pending';
  if not found then
    raise exception 'Ez a kérés már nem hagyható jóvá (lejárt, vagy közben megváltozott).' using errcode = '22023';
  end if;
end;
$$;

create function public.reject_booking(p_booking_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if char_length(coalesce(p_note, '')) > 500 then
    raise exception 'Az indoklás legfeljebb 500 karakter lehet.' using errcode = '22023';
  end if;
  update public.bookings
     set status = 'rejected', decision_note = nullif(trim(p_note), ''), decided_at = now()
   where id = p_booking_id
     and barber_id = private.my_barber_id()
     and status = 'pending';
  if not found then
    raise exception 'Ez a kérés már nem utasítható el.' using errcode = '22023';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Lemondás
--  - vendég: a saját függő kérését bármikor (kezdés előtt), a megerősítettet a barber
--    lemondási határideje előtt (alapból 24 óra)
--  - barber: a nála lévő függő vagy megerősített jövőbeli foglalást bármikor, indoklással
-- -----------------------------------------------------------------------------
create function public.cancel_booking(p_booking_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_limit   integer;
  v_note    text := nullif(trim(p_note), '');
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found or v_booking.status not in ('pending', 'confirmed') or v_booking.starts_at <= now() then
    raise exception 'Ez a foglalás már nem mondható le.' using errcode = '22023';
  end if;
  if char_length(coalesce(v_note, '')) > 500 then
    raise exception 'Az indoklás legfeljebb 500 karakter lehet.' using errcode = '22023';
  end if;

  if v_booking.barber_id = private.my_barber_id() then
    if v_booking.status = 'confirmed' and v_note is null then
      raise exception 'Megerősített foglalás lemondásához írd meg röviden az okát – a vendég látni fogja.' using errcode = '22023';
    end if;
    update public.bookings
       set status = 'cancelled', cancelled_by = 'barber', decision_note = v_note, decided_at = now()
     where id = p_booking_id;
  elsif v_booking.customer_id = (select auth.uid()) then
    select cancel_limit_hours into v_limit from public.barber_settings where barber_id = v_booking.barber_id;
    if v_booking.status = 'confirmed' and v_booking.starts_at - make_interval(hours => v_limit) < now() then
      raise exception 'A lemondási határidő (% óra) már lejárt – hívd fel a barbert.', v_limit using errcode = '22023';
    end if;
    update public.bookings
       set status = 'cancelled', cancelled_by = 'customer', customer_note = coalesce(v_note, customer_note), decided_at = now()
     where id = p_booking_id;
  else
    raise exception 'Nincs jogosultságod ehhez a foglaláshoz.' using errcode = '42501';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Alternatív időpontok (elutasított / lejárt / barber által lemondott foglaláshoz):
-- legfeljebb 3 szabad időpont ugyanannál a barbernél, ugyanarra a szolgáltatásra,
-- az eredeti nap körül kezdve, legfeljebb 14 napon át. Csak a foglalás vendége kérheti.
-- -----------------------------------------------------------------------------
create function public.get_alternative_slots(p_booking_id uuid)
returns table (starts_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_day     date;
  v_found   integer := 0;
  v_slot    timestamptz;
begin
  select * into v_booking from public.bookings
   where id = p_booking_id and customer_id = (select auth.uid());
  if not found then
    return;
  end if;

  v_day := greatest((v_booking.starts_at at time zone 'Europe/Bucharest')::date, (now() at time zone 'Europe/Bucharest')::date);
  for i in 0..13 loop
    for v_slot in
      select s.starts_at from public.get_available_slots(v_booking.barber_id, v_booking.service_id, v_day + i) s
       where s.starts_at >= v_booking.starts_at or v_day + i > (v_booking.starts_at at time zone 'Europe/Bucharest')::date
    loop
      starts_at := v_slot;
      return next;
      v_found := v_found + 1;
      exit when v_found >= 3;
    end loop;
    exit when v_found >= 3;
  end loop;
end;
$$;

revoke execute on function public.approve_booking(uuid) from public, anon;
revoke execute on function public.reject_booking(uuid, text) from public, anon;
revoke execute on function public.cancel_booking(uuid, text) from public, anon;
revoke execute on function public.get_alternative_slots(uuid) from public, anon;
grant execute on function public.approve_booking(uuid) to authenticated;
grant execute on function public.reject_booking(uuid, text) to authenticated;
grant execute on function public.cancel_booking(uuid, text) to authenticated;
grant execute on function public.get_alternative_slots(uuid) to authenticated;
revoke execute on function private.expire_pending_bookings(uuid) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Percenkénti lejárat (pg_cron)
-- -----------------------------------------------------------------------------
create extension if not exists pg_cron;
select cron.schedule('expire-pending-bookings', '* * * * *', $$select private.expire_pending_bookings()$$);

-- -----------------------------------------------------------------------------
-- Élő frissítés (Realtime): a foglalások változásai. Az RLS itt is érvényes:
-- a barber csak a saját, a vendég csak a saját foglalásairól kap eseményt.
-- -----------------------------------------------------------------------------
alter publication supabase_realtime add table public.bookings;
