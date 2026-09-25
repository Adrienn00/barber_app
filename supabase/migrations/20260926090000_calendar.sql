-- =============================================================================
-- 3. fázis – barber naptár: magánprogram-alkalmak, kézi foglalás, ütközésjelzés
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Magánprogramok alkalmai egy időszakban (egyszeri + heti ismétlődő, kihagyások nélkül).
-- A heti alkalmakat HELYI (bukaresti) időben lépteti: minden kedden 12:00 marad 12:00
-- az óraátállítás után is. Ez az egyetlen hely, ahol az ismétlődést számoljuk – a naptár
-- és a szabad időpontok (4. fázis) is ezt használják.
-- -----------------------------------------------------------------------------
create function private.private_event_occurrences(p_barber_id uuid, p_from timestamptz, p_to timestamptz)
returns table (event_id uuid, occurrence_date date, starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  -- Egyszeri események
  select e.id,
         (e.starts_at at time zone 'Europe/Bucharest')::date,
         e.starts_at,
         e.ends_at
    from public.private_events e
   where e.barber_id = p_barber_id
     and e.repeat = 'none'
     and e.starts_at < p_to
     and e.ends_at > p_from

  union all

  -- Heti ismétlődés: az első alkalom helyi dátumától 7 naponként, a lekérdezett időszakig / a záró dátumig
  select o.event_id, o.occurrence_date, o.starts_at, o.ends_at
    from (
      select e.id as event_id,
             d::date as occurrence_date,
             ((e.starts_at at time zone 'Europe/Bucharest') + (d::date - l.start_date) * interval '1 day')
               at time zone 'Europe/Bucharest' as starts_at,
             ((e.ends_at at time zone 'Europe/Bucharest') + (d::date - l.start_date) * interval '1 day')
               at time zone 'Europe/Bucharest' as ends_at
        from public.private_events e
        cross join lateral (
          select (e.starts_at at time zone 'Europe/Bucharest')::date as start_date,
                 (p_from at time zone 'Europe/Bucharest')::date - 7 as from_date,  -- -7: a többnapos alkalmak miatt
                 (p_to at time zone 'Europe/Bucharest')::date as to_date
        ) l
        cross join lateral generate_series(
          -- az első olyan heti alkalom, ami már számíthat (a régi alkalmakat átugorjuk)
          (l.start_date + 7 * greatest(0, floor((l.from_date - l.start_date) / 7.0))::int)::timestamp,
          least(coalesce(e.repeat_until, l.to_date), l.to_date)::timestamp,
          interval '7 days'
        ) d
       where e.barber_id = p_barber_id
         and e.repeat = 'weekly'
    ) o
   where o.starts_at < p_to
     and o.ends_at > p_from
     and not exists (
       select 1 from public.private_event_skips s
        where s.event_id = o.event_id and s.occurrence_date = o.occurrence_date
     );
$$;

-- A bejelentkezett barber saját magánprogram-alkalmai a naptárhoz (címmel, megjegyzéssel)
create function public.get_my_private_event_occurrences(p_from timestamptz, p_to timestamptz)
returns table (
  event_id uuid,
  occurrence_date date,
  starts_at timestamptz,
  ends_at timestamptz,
  title text,
  note text,
  all_day boolean,
  repeat public.event_repeat,
  repeat_until date
)
language sql
stable
security definer
set search_path = ''
as $$
  select o.event_id, o.occurrence_date, o.starts_at, o.ends_at, e.title, e.note, e.all_day, e.repeat, e.repeat_until
    from private.private_event_occurrences((select private.my_barber_id()), p_from, p_to) o
    join public.private_events e on e.id = o.event_id
   where (select private.my_barber_id()) is not null
   order by o.starts_at;
$$;

-- -----------------------------------------------------------------------------
-- Egy magánprogram mely jövőbeli aktív foglalásokkal ütközik (a következő 1 évben).
-- A barber menthet ütközőt is – ezt figyelmeztetésként mutatjuk (docs/dontesek.md 10.).
-- -----------------------------------------------------------------------------
create function public.get_private_event_conflicts(p_event_id uuid)
returns table (booking_id uuid, starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct b.id, b.starts_at, b.ends_at
    from public.private_events e
    cross join lateral private.private_event_occurrences(e.barber_id, now(), now() + interval '1 year') o
    join public.bookings b
      on b.barber_id = e.barber_id
     and b.status in ('pending', 'confirmed')
     and tstzrange(b.starts_at, b.ends_at) && tstzrange(o.starts_at, o.ends_at)
   where e.id = p_event_id
     and o.event_id = e.id
     and e.barber_id = (select private.my_barber_id())
   order by b.starts_at;
$$;

-- -----------------------------------------------------------------------------
-- Kézi foglalás a barbertől (pl. telefonos vendég) – azonnal megerősített.
-- Munkaidőn kívülre és a min/max szabályoktól függetlenül is lehet (docs/dontesek.md 6.);
-- a foglalások közti ütközést (pufferrel) az adatbázis ekkor is tiltja.
-- Vendég: vagy egy korábbi vendége (p_customer_id), vagy név + telefon fiók nélkül.
-- -----------------------------------------------------------------------------
create function public.create_manual_booking(
  p_service_id  uuid,
  p_starts_at   timestamptz,
  p_customer_id uuid default null,
  p_guest_name  text default null,
  p_guest_phone text default null,
  p_note        text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_barber_id uuid := private.my_barber_id();
  v_duration  integer;
  v_buffer    integer;
  v_ends_at   timestamptz;
  v_id        uuid;
begin
  if v_barber_id is null
     or not exists (select 1 from public.barbers where id = v_barber_id and status = 'approved') then
    raise exception 'Csak jóváhagyott barber vehet fel foglalást.' using errcode = '42501';
  end if;

  select s.duration_min into v_duration
    from public.services s
   where s.id = p_service_id and s.barber_id = v_barber_id and s.is_active;
  if not found then
    raise exception 'A szolgáltatás nem található.' using errcode = '22023';
  end if;

  if p_customer_id is not null then
    if not exists (select 1 from public.barber_customers
                    where barber_id = v_barber_id and customer_id = p_customer_id) then
      raise exception 'Ez a vendég még nem foglalt nálad – add meg a nevét és telefonszámát.' using errcode = '22023';
    end if;
  elsif nullif(trim(p_guest_name), '') is null or nullif(trim(p_guest_phone), '') is null then
    raise exception 'Add meg a vendég nevét és telefonszámát.' using errcode = '22023';
  end if;

  select buffer_min into v_buffer from public.barber_settings where barber_id = v_barber_id;
  v_ends_at := p_starts_at + make_interval(mins => v_duration);

  begin
    insert into public.bookings (
      barber_id, customer_id, guest_name, guest_phone, service_id,
      starts_at, ends_at, block_end, status, customer_note, decided_at
    ) values (
      v_barber_id,
      p_customer_id,
      case when p_customer_id is null then trim(p_guest_name) end,
      case when p_customer_id is null then trim(p_guest_phone) end,
      p_service_id,
      p_starts_at,
      v_ends_at,
      v_ends_at + make_interval(mins => coalesce(v_buffer, 0)),
      'confirmed',
      nullif(trim(p_note), ''),
      now()
    )
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'Ez az időpont ütközik egy másik foglalással (a pufferidővel együtt).' using errcode = '23P01';
  end;

  return v_id;
end;
$$;

revoke execute on function public.get_my_private_event_occurrences(timestamptz, timestamptz) from public, anon;
revoke execute on function public.get_private_event_conflicts(uuid) from public, anon;
revoke execute on function public.create_manual_booking(uuid, timestamptz, uuid, text, text, text) from public, anon;
grant execute on function public.get_my_private_event_occurrences(timestamptz, timestamptz) to authenticated;
grant execute on function public.get_private_event_conflicts(uuid) to authenticated;
grant execute on function public.create_manual_booking(uuid, timestamptz, uuid, text, text, text) to authenticated;
-- A belső számoló függvényt kívülről senki ne hívhassa közvetlenül
revoke execute on function private.private_event_occurrences(uuid, timestamptz, timestamptz) from public, anon, authenticated;
