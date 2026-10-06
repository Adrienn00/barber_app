-- =============================================================================
-- 7. fázis – Profilképek (barber és egység) a Storage-ban
--  - nyilvános olvasás (a nyilvános oldalakon látszik), írás csak a saját mappába:
--      barbers/<barber_id>/…   – a barber maga
--      shops/<shop_id>/…       – az egység vezetője
--  - az avatar_path csak a saját mappára mutathat (más képét nem lehet „kölcsönvenni”)
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- Saját mappa-e: a barber a sajátját, az egység vezetője az egységéét írhatja
create function private.can_write_avatar(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case (storage.foldername(p_name))[1]
    when 'barbers' then (storage.foldername(p_name))[2] = private.my_barber_id()::text
    when 'shops' then exists (
      select 1 from public.shops s
       where s.id::text = (storage.foldername(p_name))[2]
         and s.owner_barber_id = private.my_barber_id()
    )
    else false
  end;
$$;
revoke execute on function private.can_write_avatar(text) from public, anon;
grant execute on function private.can_write_avatar(text) to authenticated;

create policy "avatars: feltöltés a saját mappába" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and private.can_write_avatar(name));

-- A feltöltéshez (és a régi kép törléséhez) a sajátját látnia is kell
create policy "avatars: saját olvasása" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and private.can_write_avatar(name));

create policy "avatars: saját törlése" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and private.can_write_avatar(name));

alter table public.barbers
  add constraint barbers_avatar_own_folder
  check (avatar_path is null or avatar_path like 'barbers/' || id::text || '/%');

alter table public.shops
  add constraint shops_avatar_own_folder
  check (avatar_path is null or avatar_path like 'shops/' || id::text || '/%');

-- A jóváhagyott barbert az értesítés a beállító varázslóhoz viszi
create or replace function private.barbers_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return null;
  end if;
  if new.status = 'pending' then
    perform private.notify_admins('barber_application', 'Új barberjelentkezés', new.display_name || ', ' || new.city);
  elsif new.status = 'approved' then
    if old.status = 'suspended' then
      perform private.notify(new.user_id, 'barber_approved', 'Újra aktív a profilod',
        'A profilod újra látható, foglalhatnak nálad.', '/naptar');
    else
      perform private.notify(new.user_id, 'barber_approved', 'Jóváhagytuk a jelentkezésed',
        'Néhány lépésben állítsd be a profilodat, a szolgáltatásaidat és a munkaidődet – utána már foglalhatnak nálad.',
        '/kezdes');
    end if;
  elsif new.status = 'rejected' then
    perform private.notify(new.user_id, 'barber_rejected', 'Nem hagytuk jóvá a jelentkezésed',
      coalesce(new.reject_reason, 'Részletek a jelentkezésednél.'), '/barber-leszek');
  elsif new.status = 'suspended' then
    perform private.notify(new.user_id, 'barber_suspended', 'Felfüggesztettük a barberprofilod',
      coalesce(new.reject_reason, 'A jövőbeli foglalásaid lemondásra kerültek.'), '/barber-leszek');
  end if;
  return null;
end;
$$;
