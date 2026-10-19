-- =============================================================================
-- Kézi foglalás saját befejezéssel (dontesek.md 35.): a barber a kezdés mellett a befejezést is megadja.
-- Ha nem adja meg, a szolgáltatás időtartama számít (mint eddig). 5 perc – 8 óra, mint az utólagos módosításnál.
-- Új paraméter → a régi (6 paraméteres) változat helyett új függvény.
-- =============================================================================

drop function public.create_manual_booking(uuid, timestamptz, uuid, text, text, text);

create function public.create_manual_booking(
  p_service_id   uuid,
  p_starts_at    timestamptz,
  p_customer_id  uuid default null,
  p_guest_name   text default null,
  p_guest_phone  text default null,
  p_note         text default null,
  p_duration_min integer default null
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

  -- A barber által megadott befejezés felülírja a szolgáltatás szokásos hosszát
  if p_duration_min is not null then
    if p_duration_min not between 5 and 480 then
      raise exception 'Az időtartam 5 perc és 8 óra között lehet.' using errcode = '22023';
    end if;
    v_duration := p_duration_min;
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

revoke execute on function public.create_manual_booking(uuid, timestamptz, uuid, text, text, text, integer) from public, anon;
grant execute on function public.create_manual_booking(uuid, timestamptz, uuid, text, text, text, integer) to authenticated;
