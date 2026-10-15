-- =============================================================================
-- „Ma még szabad” a kezdőlapon (dontesek.md 34.)
-- A listázott, foglalható barberek első néhány szabad időpontja egy napon, a fő (első) szolgáltatásukra.
-- Ugyanazt számolja, mint a foglalás (get_available_slots): munkaidő, foglalások, magánprogramok,
-- legkorábbi foglalhatóság. A látogató csak a nyilvános adatokat kapja (a barber belső azonosítóját nem).
-- =============================================================================

create function public.get_open_slots(p_date date, p_per_barber integer default 4, p_max_barbers integer default 12)
returns table (
  barber_slug text,
  barber_name text,
  city text,
  address text,
  avatar_path text,
  service_id uuid,
  service_name text,
  duration_min integer,
  price numeric,
  starts_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with barbers as (
    -- Ugyanaz a kör, aki a barberlistában (közvetlenül vagy az egységén keresztül) megtalálható
    select b.id, b.slug, b.display_name, b.city, b.address, b.avatar_path
      from public.barbers b
      left join public.shops s on s.id = b.shop_id
     where private.is_bookable_barber(b.id)
       and (b.is_listed or (s.status = 'approved' and s.is_listed))
  ),
  main_service as (
    -- A barber fő szolgáltatása: az árlistája első aktív tétele
    select distinct on (sv.barber_id) sv.barber_id, sv.id, sv.name, sv.duration_min, sv.price
      from public.services sv
      join barbers b on b.id = sv.barber_id
     where sv.is_active
     order by sv.barber_id, sv.sort_order, sv.created_at
  ),
  slots as (
    select b.*, ms.id as service_id, ms.name as service_name, ms.duration_min, ms.price, a.starts_at,
           row_number() over (partition by b.id order by a.starts_at) as n
      from barbers b
      join main_service ms on ms.barber_id = b.id
     cross join lateral public.get_available_slots(b.id, ms.id, p_date) a
  ),
  firsts as (
    -- A legkorábban ráérő barberek elöl
    select s.id, min(s.starts_at) as first_at
      from slots s
     group by s.id
     order by first_at, s.id
     limit least(greatest(p_max_barbers, 1), 30)
  )
  select s.slug, s.display_name, s.city, s.address, s.avatar_path,
         s.service_id, s.service_name, s.duration_min, s.price, s.starts_at
    from slots s
    join firsts f on f.id = s.id
   where s.n <= least(greatest(p_per_barber, 1), 8)
   order by f.first_at, s.id, s.starts_at;
$$;

revoke execute on function public.get_open_slots(date, integer, integer) from public;
grant execute on function public.get_open_slots(date, integer, integer) to anon, authenticated;
