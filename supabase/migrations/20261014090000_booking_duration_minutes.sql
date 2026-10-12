-- =============================================================================
-- A foglalás időtartama percre pontosan is megadható (a barber beírja a befejezést, pl. 15:22).
-- Korábban csak 5 perces lépés volt elfogadható. Határok maradnak: 5 perc – 8 óra.
-- =============================================================================

create or replace function public.set_booking_duration(p_booking_id uuid, p_duration_min integer)
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
  if p_duration_min is null or p_duration_min < 5 or p_duration_min > 480 then
    raise exception 'Az időtartam 5 perc és 8 óra között lehet.' using errcode = '22023';
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
