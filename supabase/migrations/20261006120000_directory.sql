-- =============================================================================
-- 4. fázis – nyilvános barberlista (/barberek)
-- Egységek és önálló barberek egy listában (docs/dontesek.md 13.: az egységtag önállóként nem látszik).
-- Csak az jelenik meg, akinél tényleg lehet foglalni: jóváhagyott, listázott, van aktív
-- szolgáltatása és munkaideje. Keresés név és város szerint, ékezetektől függetlenül.
-- =============================================================================

create extension if not exists unaccent with schema extensions;

-- Foglalható-e egy barber (jóváhagyott + van aktív szolgáltatása + van munkaideje)
create function private.is_bookable_barber(p_barber_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.barbers b where b.id = p_barber_id and b.status = 'approved')
     and exists (select 1 from public.services s where s.barber_id = p_barber_id and s.is_active)
     and exists (select 1 from public.working_hours w where w.barber_id = p_barber_id);
$$;

create function public.list_directory(p_search text default null)
returns table (
  kind text,            -- 'shop' | 'barber'
  slug text,
  name text,
  city text,
  address text,
  bio text,
  avatar_path text,
  member_count integer, -- egységnél a foglalható tagok száma
  min_price numeric     -- „…-tól” ár
)
language sql
stable
security definer
set search_path = ''
as $$
  with search as (
    select nullif(trim(p_search), '') as q
  ),
  shops as (
    select 'shop'::text as kind, s.slug, s.name, s.city, s.address, s.bio, s.avatar_path,
           (select count(*)::int from public.barbers m
             where m.shop_id = s.id and private.is_bookable_barber(m.id)) as member_count,
           (select min(sv.price) from public.services sv
              join public.barbers m on m.id = sv.barber_id
             where m.shop_id = s.id and sv.is_active and m.status = 'approved') as min_price
      from public.shops s
     where s.status = 'approved' and s.is_listed
  ),
  solo as (
    select 'barber'::text as kind, b.slug, b.display_name as name, b.city, b.address, b.bio, b.avatar_path,
           1 as member_count,
           (select min(sv.price) from public.services sv where sv.barber_id = b.id and sv.is_active) as min_price
      from public.barbers b
      left join public.shops s on s.id = b.shop_id
     where b.is_listed
       and private.is_bookable_barber(b.id)
       -- egységtag csak akkor látszik önállóként, ha az egysége nem aktív
       and (b.shop_id is null or s.status <> 'approved')
  )
  select r.*
    from (select * from shops where member_count > 0
          union all
          select * from solo) r, search
   where search.q is null
      or extensions.unaccent(lower(r.name)) like '%' || extensions.unaccent(lower(search.q)) || '%'
      or extensions.unaccent(lower(r.city)) like '%' || extensions.unaccent(lower(search.q)) || '%'
   order by r.city, r.name;
$$;

revoke execute on function public.list_directory(text) from public;
grant execute on function public.list_directory(text) to anon, authenticated;
