-- =============================================================================
-- Admin jog kiosztása a felületről (dontesek.md 29.)
--  - csak admin láthatja az adminok listáját, és csak admin adhat / vehet el admin jogot;
--  - e-mail-cím alapján (a személynek előbb regisztrálnia kell az appban);
--  - saját magától senki nem veheti el → mindig marad legalább egy admin;
--  - aki admin jogot kap, értesítést kap róla.
-- A profiles.is_admin oszlopot a felhasználó közvetlenül továbbra sem írhatja (nincs rá GRANT).
-- =============================================================================

create function public.list_admins()
returns table (id uuid, full_name text, email text, is_me boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Csak admin láthatja az adminokat.' using errcode = '42501';
  end if;
  return query
    select p.id, p.full_name, u.email::text, p.id = (select auth.uid())
      from public.profiles p
      join auth.users u on u.id = p.id
     where p.is_admin
     order by p.full_name nulls last, u.email;
end;
$$;

create function public.set_user_admin(p_email text, p_admin boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not private.is_admin() then
    raise exception 'Csak admin adhat vagy vehet el admin jogot.' using errcode = '42501';
  end if;

  select id into v_id from auth.users where lower(email) = lower(trim(p_email));
  if v_id is null then
    raise exception 'Nincs ilyen e-mail-címmel regisztrált felhasználó. Előbb regisztráljon az appban.'
      using errcode = '22023';
  end if;
  if not p_admin and v_id = (select auth.uid()) then
    raise exception 'Saját magadtól nem veheted el az admin jogot – kérj meg erre egy másik admint.'
      using errcode = '22023';
  end if;

  update public.profiles set is_admin = p_admin where id = v_id and is_admin is distinct from p_admin;

  if found and p_admin then
    perform private.notify(v_id, 'admin_granted', 'Admin jogot kaptál',
      'Mostantól te is jóváhagyhatod a barber- és egységjelentkezéseket a Platform admin oldalon.', '/platform');
  end if;
end;
$$;

revoke execute on function public.list_admins() from public, anon;
revoke execute on function public.set_user_admin(text, boolean) from public, anon;
grant execute on function public.list_admins() to authenticated;
grant execute on function public.set_user_admin(text, boolean) to authenticated;
