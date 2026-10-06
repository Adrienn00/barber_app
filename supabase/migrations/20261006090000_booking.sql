-- =============================================================================
-- 4. fázis – szabad időpontok és foglalási kérés (spec 7. fejezet)
-- A vendég SOHA nem kérdezi le közvetlenül a táblákat: csak kezdési időpontokat kap, okot soha.
-- Minden időt helyi (bukaresti) időben számolunk – óraátállításkor is helyes.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Szabad kezdési időpontok egy barbernél, egy szolgáltatásra, egy (helyi) napon.
-- Figyelembe veszi: munkaidő-sávok, a barber SAJÁT időtartama, lépésköz, szünet két vendég
-- között (puffer), meglévő függő/megerősített foglalások, magánprogramok (heti ismétlődéssel),
-- legkorábbi (min. előre) és legkésőbbi (max. napok) foglalhatóság.
-- -----------------------------------------------------------------------------
create function public.get_available_slots(p_barber_id uuid, p_service_id uuid, p_date date)
returns table (starts_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  with params as (
    select s.duration_min,
           st.buffer_min,
           st.slot_step_min,
           st.min_notice_min,
           st.max_days_ahead
      from public.services s
      join public.barbers b on b.id = s.barber_id
      join public.barber_settings st on st.barber_id = b.id
     where s.id = p_service_id
       and s.barber_id = p_barber_id
       and s.is_active
       and b.status = 'approved'
       -- csak a mai naptól a max. előre foglalható napig
       and p_date >= (now() at time zone 'Europe/Bucharest')::date
       and p_date <= (now() at time zone 'Europe/Bucharest')::date + st.max_days_ahead
  ),
  candidates as (
    -- A munkaidő-sávokon belül lépésközönként, helyi időben (a sáv elejétől igazítva)
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
     -- nem ütközik függő / megerősített foglalással (a pufferrel együtt)
     and not exists (
       select 1 from public.bookings b
        where b.barber_id = p_barber_id
          and b.status in ('pending', 'confirmed')
          and tstzrange(b.starts_at, b.block_end) && tstzrange(c.starts_at, c.block_end)
     )
     -- nem ütközik magánprogrammal (a heti ismétlődőkkel sem)
     and not exists (
       select 1 from private.private_event_occurrences(p_barber_id, c.starts_at, c.ends_at) o
     )
   order by c.starts_at;
$$;

-- -----------------------------------------------------------------------------
-- Foglalási kérés a vendégtől. Szerveroldalon újraellenőriz mindent (a szabad időpontok
-- függvényével), kiszámolja a végét, a pufferes sávot és a lejáratot.
-- Megbízható vendégnél azonnal megerősített (spec 5.2).
-- -----------------------------------------------------------------------------
create function public.request_booking(p_service_id uuid, p_starts_at timestamptz, p_note text default null)
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

  -- Az időpont még szabad? (munkaidő, ütközés, magánprogram, min/max szabályok – egy helyen)
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
      v_service.barber_id,
      v_user_id,
      p_service_id,
      p_starts_at,
      v_ends_at,
      v_ends_at + make_interval(mins => v_settings.buffer_min),
      (case when coalesce(v_trusted, false) then 'confirmed' else 'pending' end)::public.booking_status,
      nullif(trim(p_note), ''),
      case when coalesce(v_trusted, false) then null
           else least(now() + make_interval(mins => v_settings.approval_timeout_min), p_starts_at) end,
      case when coalesce(v_trusted, false) then now() end
    )
    returning id into v_id;
  exception when exclusion_violation then
    -- Valaki egy pillanattal előbb lefoglalta
    raise exception 'Ezt az időpontot közben lefoglalták. Válassz másikat.' using errcode = '22023';
  end;

  return v_id;
end;
$$;

revoke execute on function public.get_available_slots(uuid, uuid, date) from public;
grant execute on function public.get_available_slots(uuid, uuid, date) to anon, authenticated;
revoke execute on function public.request_booking(uuid, timestamptz, text) from public, anon;
grant execute on function public.request_booking(uuid, timestamptz, text) to authenticated;
