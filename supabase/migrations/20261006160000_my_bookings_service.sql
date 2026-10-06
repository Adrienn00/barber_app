-- =============================================================================
-- 5. fázis – „Foglalásaim” kiegészítése a szolgáltatás azonosítójával
-- (az alternatív időpontra egy kattintással új kérés küldhető ugyanarra a szolgáltatásra)
-- A visszatérési típus változik, ezért a függvényt újra kell létrehozni.
-- =============================================================================
drop function public.get_my_bookings();

create function public.get_my_bookings()
returns table (
  id uuid,
  status public.booking_status,
  starts_at timestamptz,
  ends_at timestamptz,
  expires_at timestamptz,
  customer_note text,
  decision_note text,
  cancelled_by public.cancelled_by,
  service_id uuid,
  service_name text,
  price numeric,
  barber_name text,
  barber_slug text,
  barber_address text,
  barber_city text,
  barber_phone text,
  cancel_limit_hours integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select bk.id, bk.status, bk.starts_at, bk.ends_at, bk.expires_at, bk.customer_note, bk.decision_note,
         bk.cancelled_by, sv.id, sv.name, sv.price, b.display_name, b.slug, b.address, b.city, b.phone,
         st.cancel_limit_hours
    from public.bookings bk
    join public.services sv on sv.id = bk.service_id
    join public.barbers b on b.id = bk.barber_id
    join public.barber_settings st on st.barber_id = b.id
   where bk.customer_id = (select auth.uid())
   order by bk.starts_at desc;
$$;

revoke execute on function public.get_my_bookings() from public, anon;
grant execute on function public.get_my_bookings() to authenticated;
