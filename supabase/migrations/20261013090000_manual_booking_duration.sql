-- =============================================================================
-- 1. Kézi foglalás telefonszám nélkül: a fiók nélküli vendégnél elég a név (dontesek.md 30.)
-- 2. Foglalás időtartamának módosítása a naptárban (dontesek.md 31.): a barber a saját függő vagy
--    megerősített foglalását rövidebbre / hosszabbra veheti (a kezdés marad). A puffer vele megy,
--    ütközést az adatbázis-szabály (no_overlap) és a javaslat-védelem kizár.
-- =============================================================================

alter table public.bookings drop constraint bookings_who;
alter table public.bookings add constraint bookings_who check (
  customer_id is not null
  or is_anonymized
  or guest_name is not null
);

create or replace function public.create_manual_booking(
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
      raise exception 'Ez a vendég még nem foglalt nálad – add meg a nevét.' using errcode = '22023';
    end if;
  elsif nullif(trim(p_guest_name), '') is null then
    raise exception 'Add meg a vendég nevét.' using errcode = '22023';
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
      case when p_customer_id is null then nullif(trim(p_guest_phone), '') end,
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

create function public.set_booking_duration(p_booking_id uuid, p_duration_min integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_ends_at timestamptz;
begin
  select * into v_booking from public.bookings
   where id = p_booking_id and barber_id = private.my_barber_id()
   for update;
  if not found then
    raise exception 'Nincs jogosultságod ehhez a foglaláshoz.' using errcode = '42501';
  end if;
  if v_booking.status not in ('pending', 'confirmed') then
    raise exception 'Lezárt foglalás időtartama nem módosítható.' using errcode = '22023';
  end if;
  if p_duration_min is null or p_duration_min < 5 or p_duration_min > 480 or p_duration_min % 5 <> 0 then
    raise exception 'Az időtartam 5 és 480 perc között, 5 perces lépésekben adható meg.' using errcode = '22023';
  end if;

  v_ends_at := v_booking.starts_at + make_interval(mins => p_duration_min);
  begin
    update public.bookings
       set ends_at = v_ends_at,
           block_end = v_ends_at + (v_booking.block_end - v_booking.ends_at)
     where id = p_booking_id;
  exception when exclusion_violation then
    raise exception 'Így ütközne a következő foglalással (a pufferidővel együtt).' using errcode = '23P01';
  end;
end;
$$;

revoke execute on function public.set_booking_duration(uuid, integer) from public, anon;
grant execute on function public.set_booking_duration(uuid, integer) to authenticated;
