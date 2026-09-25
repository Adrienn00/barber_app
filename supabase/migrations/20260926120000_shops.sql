-- =============================================================================
-- Egységek (üzletek) – docs/dontesek.md 12–16.
-- Egy barber önállóan vagy egy egység tagjaként dolgozik. Az egységet egy jóváhagyott
-- barber hozza létre (ő a vezető), a platform admin hagyja jóvá. Tagok meghívással kerülnek be.
-- =============================================================================

-- Biztonsági alapértelmezés: a jövőben létrehozott táblák ne kapjanak automatikusan jogot
-- (a Supabase alapból mindent megadna az anon/authenticated szerepnek). Mindig explicit GRANT kell.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- Új foglalt linkek (az egység oldala /u/[slug], a meghívó /meghivas/[token])
create or replace function private.is_reserved_slug(slug text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select slug = any (array[
    'admin', 'api', 'app', 'auth', 'aszf', 'adatvedelem', 'barber', 'barberek', 'barber-leszek',
    'beallitasok', 'belepes', 'egyseg', 'egysegek', 'foglalas', 'foglalasaim', 'keresek', 'kijelentkezes',
    'meghivas', 'naptar', 'platform', 'profil', 'regisztracio', 'static', 'www'
  ]);
$$;

-- -----------------------------------------------------------------------------
-- shops – egységek
-- -----------------------------------------------------------------------------
create table public.shops (
  id              uuid primary key default gen_random_uuid(),
  owner_barber_id uuid not null unique references public.barbers (id) on delete cascade,
  slug            text not null unique
                    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
                           and char_length(slug) between 3 and 30
                           and not private.is_reserved_slug(slug)),
  name            text not null check (char_length(name) between 2 and 60),
  bio             text check (char_length(bio) <= 1000),
  city            text not null check (char_length(city) between 2 and 60),
  address         text not null check (char_length(address) between 3 and 200),
  phone           text not null check (private.is_valid_phone(phone)),
  instagram       text check (instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  avatar_path     text,
  status          public.barber_status not null default 'pending',
  reject_reason   text check (char_length(reject_reason) <= 500),
  is_listed       boolean not null default true,
  approved_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index shops_status_idx on public.shops (status);

-- Tagság: melyik egységhez tartozik a barber (null = önálló). Csak függvény írhatja.
alter table public.barbers add column shop_id uuid references public.shops (id) on delete set null;
create index barbers_shop_idx on public.barbers (shop_id);

-- -----------------------------------------------------------------------------
-- shop_invites – meghívók (e-mail-címre, titkos linkkel, 7 napig érvényes)
-- -----------------------------------------------------------------------------
create type public.invite_status as enum ('pending', 'accepted', 'declined', 'revoked');

create table public.shop_invites (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references public.shops (id) on delete cascade,
  email       text not null check (email = lower(email) and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  token       text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  status      public.invite_status not null default 'pending',
  expires_at  timestamptz not null default now() + interval '7 days',
  created_at  timestamptz not null default now(),
  answered_at timestamptz
);

-- Egy címre egyszerre csak egy függő meghívó lehet egységenként
create unique index shop_invites_one_pending_idx on public.shop_invites (shop_id, email) where status = 'pending';

-- -----------------------------------------------------------------------------
-- Segédfüggvények
-- -----------------------------------------------------------------------------

-- A bejelentkezett felhasználó által vezetett egység azonosítója (bármilyen státuszban), vagy null
create function private.my_shop_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.id from public.shops s
    join public.barbers b on b.id = s.owner_barber_id
   where b.user_id = (select auth.uid());
$$;

create function private.is_approved_barber(p_barber_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.barbers where id = p_barber_id and status = 'approved');
$$;

-- -----------------------------------------------------------------------------
-- Jogosultságok
-- FONTOS: a Supabase alapból minden új táblára teljes jogot ad – ezt előbb visszavonjuk,
-- és csak a kifejezetten engedett oszlopokat adjuk meg (különben pl. a státusz is írható lenne).
-- -----------------------------------------------------------------------------
revoke all on public.shops, public.shop_invites from anon, authenticated;

grant select on public.shops to anon, authenticated;
grant insert (owner_barber_id, slug, name, bio, city, address, phone, instagram, avatar_path, is_listed)
  on public.shops to authenticated;
grant update (slug, name, bio, city, address, phone, instagram, avatar_path, is_listed)
  on public.shops to authenticated;

grant select, insert on public.shop_invites to authenticated;
grant update (status) on public.shop_invites to authenticated;

alter table public.shops enable row level security;
alter table public.shop_invites enable row level security;

create policy "shops: jóváhagyottak nyilvánosak" on public.shops
  for select to anon, authenticated
  using (status = 'approved');

-- Közvetlen oszlop-összevetés (nem my_shop_id), hogy a létrehozáskor visszaolvasott új sor is látsszon
create policy "shops: a vezető látja a sajátját" on public.shops
  for select to authenticated
  using (owner_barber_id = (select private.my_barber_id()));

create policy "shops: admin mindet látja" on public.shops
  for select to authenticated
  using ((select private.is_admin()));

-- Egységet csak jóváhagyott barber hozhat létre, saját magát vezetőként megadva
create policy "shops: létrehozás jóváhagyott barberként" on public.shops
  for insert to authenticated
  with check (
    owner_barber_id = (select private.my_barber_id())
    and private.is_approved_barber(owner_barber_id)
  );

create policy "shops: a vezető módosítja" on public.shops
  for update to authenticated
  using (id = (select private.my_shop_id()))
  with check (id = (select private.my_shop_id()));

-- Meghívókat csak a vezető lát és küld (jóváhagyott egységből); visszavonni is ő tudja
create policy "shop_invites: a vezető látja" on public.shop_invites
  for select to authenticated
  using (shop_id = (select private.my_shop_id()));

create policy "shop_invites: a vezető küldi" on public.shop_invites
  for insert to authenticated
  with check (
    shop_id = (select private.my_shop_id())
    and exists (select 1 from public.shops s where s.id = shop_id and s.status = 'approved')
  );

create policy "shop_invites: a vezető visszavonja" on public.shop_invites
  for update to authenticated
  using (shop_id = (select private.my_shop_id()) and status = 'pending')
  with check (shop_id = (select private.my_shop_id()) and status = 'revoked');

-- -----------------------------------------------------------------------------
-- Admin: egység jóváhagyása / elutasítása / felfüggesztése (a barberekével azonos szabályok)
-- Jóváhagyáskor a vezető tagja lesz a saját egységének.
-- -----------------------------------------------------------------------------
create function public.admin_set_shop_status(
  p_shop_id uuid,
  p_status  public.barber_status,
  p_reason  text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.barber_status;
  v_owner   uuid;
  v_reason  text := nullif(trim(p_reason), '');
begin
  if not private.is_admin() then
    raise exception 'Nincs jogosultságod ehhez a művelethez.' using errcode = '42501';
  end if;

  select status, owner_barber_id into v_current, v_owner from public.shops where id = p_shop_id for update;
  if not found then
    raise exception 'Az egység nem található.' using errcode = 'P0002';
  end if;

  if not (
       (v_current = 'pending'   and p_status in ('approved', 'rejected'))
    or (v_current = 'approved'  and p_status = 'suspended')
    or (v_current = 'suspended' and p_status = 'approved')
  ) then
    raise exception 'Érvénytelen státuszváltás: % → %.', v_current, p_status using errcode = '22023';
  end if;

  if p_status = 'rejected' and v_reason is null then
    raise exception 'Elutasításhoz indoklás szükséges.' using errcode = '22023';
  end if;

  update public.shops
     set status        = p_status,
         reject_reason = case when p_status in ('rejected', 'suspended') then v_reason end,
         approved_at   = case when p_status = 'approved' then coalesce(approved_at, now()) else approved_at end
   where id = p_shop_id;

  if p_status = 'approved' then
    update public.barbers set shop_id = p_shop_id where id = v_owner and shop_id is null;
  end if;
end;
$$;

-- Elutasított egység újraküldése (a vezető előtte javíthatja az adatokat)
create function public.reapply_shop()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.shops
     set status = 'pending', reject_reason = null
   where id = private.my_shop_id()
     and status = 'rejected';
  if not found then
    raise exception 'Nincs újraküldhető, elutasított egységed.' using errcode = '22023';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Meghívó megtekintése a titkos link alapján (a meghívó oldalhoz)
-- -----------------------------------------------------------------------------
create function public.get_shop_invite(p_token text)
returns table (
  shop_name text,
  shop_city text,
  shop_slug text,
  email text,
  status public.invite_status,
  is_expired boolean,
  is_for_me boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.name, s.city, s.slug, i.email, i.status,
         i.expires_at < now(),
         i.email = lower((select u.email from auth.users u where u.id = (select auth.uid())))
    from public.shop_invites i
    join public.shops s on s.id = i.shop_id
   where i.token = p_token;
$$;

-- -----------------------------------------------------------------------------
-- Meghívó elfogadása: a barber az egység tagja lesz, önállóként eltűnik a listából.
-- Ha még nem volt jóváhagyva, az egység kezeskedik érte: jóváhagyottá válik (docs/dontesek.md).
-- -----------------------------------------------------------------------------
create function public.accept_shop_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.shop_invites;
  v_email  text;
  v_barber public.barbers;
begin
  select * into v_invite from public.shop_invites where token = p_token for update;
  if not found or v_invite.status <> 'pending' then
    raise exception 'Ez a meghívó már nem érvényes.' using errcode = '22023';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'Ez a meghívó lejárt. Kérj újat az egység vezetőjétől.' using errcode = '22023';
  end if;

  select lower(email) into v_email from auth.users where id = (select auth.uid());
  if v_email is distinct from v_invite.email then
    raise exception 'Ez a meghívó egy másik e-mail-címre szól.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.shops where id = v_invite.shop_id and status = 'approved') then
    raise exception 'Az egység jelenleg nem fogad új tagot.' using errcode = '22023';
  end if;

  select * into v_barber from public.barbers where user_id = (select auth.uid()) for update;
  if not found then
    raise exception 'Előbb töltsd ki a barberprofilodat.' using errcode = '22023';
  end if;
  if v_barber.status = 'suspended' then
    raise exception 'A barberfiókod fel van függesztve.' using errcode = '42501';
  end if;
  if v_barber.shop_id is not null and v_barber.shop_id <> v_invite.shop_id then
    raise exception 'Már egy másik egység tagja vagy. Előbb lépj ki onnan.' using errcode = '22023';
  end if;

  update public.barbers
     set shop_id       = v_invite.shop_id,
         status        = 'approved',
         reject_reason = null,
         approved_at   = coalesce(approved_at, now())
   where id = v_barber.id;

  update public.shop_invites set status = 'accepted', answered_at = now() where id = v_invite.id;
  return v_invite.shop_id;
end;
$$;

create function public.decline_shop_invite(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.shop_invites
     set status = 'declined', answered_at = now()
   where token = p_token
     and status = 'pending'
     and email = lower((select u.email from auth.users u where u.id = (select auth.uid())));
  if not found then
    raise exception 'Ez a meghívó már nem érvényes.' using errcode = '22023';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Kilépés / tag eltávolítása: a barber újra önálló lesz, a foglalásai nála maradnak.
-- A vezető nem léphet ki a saját egységéből.
-- -----------------------------------------------------------------------------
create function public.leave_shop()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_barber_id uuid := private.my_barber_id();
begin
  if exists (select 1 from public.shops where owner_barber_id = v_barber_id) then
    raise exception 'A vezető nem léphet ki a saját egységéből.' using errcode = '22023';
  end if;
  update public.barbers set shop_id = null where id = v_barber_id and shop_id is not null;
  if not found then
    raise exception 'Nem vagy egység tagja.' using errcode = '22023';
  end if;
end;
$$;

create function public.remove_shop_member(p_barber_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop_id uuid := private.my_shop_id();
begin
  if v_shop_id is null then
    raise exception 'Nincs jogosultságod ehhez a művelethez.' using errcode = '42501';
  end if;
  if p_barber_id = (select owner_barber_id from public.shops where id = v_shop_id) then
    raise exception 'A vezetőt nem lehet eltávolítani.' using errcode = '22023';
  end if;
  update public.barbers set shop_id = null where id = p_barber_id and shop_id = v_shop_id;
  if not found then
    raise exception 'Ez a barber nem tagja az egységnek.' using errcode = '22023';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Tagok (nyilvános adatok) – a vezetőnek és az egység oldalának
-- -----------------------------------------------------------------------------
create function public.get_shop_members(p_shop_id uuid)
returns table (barber_id uuid, display_name text, slug text, avatar_path text, bio text, is_owner boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select b.id, b.display_name, b.slug, b.avatar_path, b.bio, b.id = s.owner_barber_id
    from public.shops s
    join public.barbers b on b.shop_id = s.id
   where s.id = p_shop_id
     and b.status = 'approved'
     and (s.status = 'approved' or s.id = (select private.my_shop_id()))
   order by b.id = s.owner_barber_id desc, b.display_name;
$$;

-- -----------------------------------------------------------------------------
-- A vezető csak olvasható áttekintése a tagok naptáráról (docs/dontesek.md 15.):
-- foglalások szolgáltatással és vendégnévvel; magánprogramok csak „Foglalt”-ként, tartalom nélkül.
-- -----------------------------------------------------------------------------
create function public.get_shop_calendar(p_from timestamptz, p_to timestamptz)
returns table (
  barber_id uuid,
  barber_name text,
  kind text,
  starts_at timestamptz,
  ends_at timestamptz,
  status public.booking_status,
  service_name text,
  customer_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  with members as (
    select b.id, b.display_name
      from public.barbers b
     where b.shop_id = (select private.my_shop_id())
       and (select private.my_shop_id()) is not null
  )
  select m.id, m.display_name, 'booking', bk.starts_at, bk.ends_at, bk.status, sv.name,
         coalesce(p.full_name, bk.guest_name, 'Vendég')
    from members m
    join public.bookings bk on bk.barber_id = m.id
    join public.services sv on sv.id = bk.service_id
    left join public.profiles p on p.id = bk.customer_id
   where bk.status in ('pending', 'confirmed')
     and bk.starts_at < p_to and bk.ends_at > p_from
  union all
  select m.id, m.display_name, 'busy', o.starts_at, o.ends_at, null, null, null
    from members m
    cross join lateral private.private_event_occurrences(m.id, p_from, p_to) o
  order by 4;
$$;

-- -----------------------------------------------------------------------------
-- Admin statisztika kiegészítése az egységekkel
-- -----------------------------------------------------------------------------
create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Nincs jogosultságod ehhez a művelethez.' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'barbers_approved',  (select count(*) from public.barbers where status = 'approved'),
    'barbers_pending',   (select count(*) from public.barbers where status = 'pending'),
    'barbers_suspended', (select count(*) from public.barbers where status = 'suspended'),
    'shops_approved',    (select count(*) from public.shops where status = 'approved'),
    'shops_pending',     (select count(*) from public.shops where status = 'pending'),
    'customers',         (select count(*) from public.profiles p
                           where not p.is_admin
                             and not exists (select 1 from public.barbers b where b.user_id = p.id)),
    'bookings_total',    (select count(*) from public.bookings),
    'bookings_upcoming', (select count(*) from public.bookings
                           where status in ('pending', 'confirmed') and starts_at > now())
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Függvények hívhatósága: csak bejelentkezve (az egység tagjai nyilvánosak)
-- -----------------------------------------------------------------------------
revoke execute on function public.admin_set_shop_status(uuid, public.barber_status, text) from public, anon;
revoke execute on function public.reapply_shop() from public, anon;
revoke execute on function public.get_shop_invite(text) from public, anon;
revoke execute on function public.accept_shop_invite(text) from public, anon;
revoke execute on function public.decline_shop_invite(text) from public, anon;
revoke execute on function public.leave_shop() from public, anon;
revoke execute on function public.remove_shop_member(uuid) from public, anon;
revoke execute on function public.get_shop_calendar(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_set_shop_status(uuid, public.barber_status, text) to authenticated;
grant execute on function public.reapply_shop() to authenticated;
grant execute on function public.get_shop_invite(text) to authenticated;
grant execute on function public.accept_shop_invite(text) to authenticated;
grant execute on function public.decline_shop_invite(text) to authenticated;
grant execute on function public.leave_shop() to authenticated;
grant execute on function public.remove_shop_member(uuid) to authenticated;
grant execute on function public.get_shop_calendar(timestamptz, timestamptz) to authenticated;
grant execute on function public.get_shop_members(uuid) to anon, authenticated;
