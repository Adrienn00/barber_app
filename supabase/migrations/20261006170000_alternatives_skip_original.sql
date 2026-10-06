-- =============================================================================
-- Alternatív időpontok: az eredeti (elutasított / lemondott / lejárt) időpontot ne ajánljuk újra –
-- a barber épp azt jelezte, hogy akkor nem jó neki.
-- =============================================================================

create or replace function public.get_alternative_slots(p_booking_id uuid)
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
       where (s.starts_at >= v_booking.starts_at or v_day + i > (v_booking.starts_at at time zone 'Europe/Bucharest')::date)
         and s.starts_at <> v_booking.starts_at
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
