-- =============================================================================
-- 1. fázis – alap séma (spec v1.1, 6. fejezet + a 2026-09-24-i döntések)
-- Minden időpont timestamptz (UTC); a helyi idő mindig Europe/Bucharest.
-- =============================================================================

create extension if not exists btree_gist with schema extensions;

-- Belső segédfüggvények sémája: az API (PostgREST) nem teszi elérhetővé.
create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Típusok
-- -----------------------------------------------------------------------------
create type public.barber_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type public.booking_status as enum ('pending', 'confirmed', 'rejected', 'expired', 'cancelled');
create type public.cancelled_by as enum ('customer', 'barber');
create type public.event_repeat as enum ('none', 'weekly');
-- Időtartomány napon belül (munkaidő-sávok átfedésének tiltásához)
create type public.timerange as range (subtype = time);

-- -----------------------------------------------------------------------------
-- Validáló segédfüggvények
-- -----------------------------------------------------------------------------
create function private.is_reserved_slug(slug text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select slug = any (array[
    'admin', 'api', 'app', 'auth', 'aszf', 'adatvedelem', 'barber', 'barberek', 'barber-leszek',
    'beallitasok', 'belepes', 'foglalas', 'foglalasaim', 'keresek', 'kijelentkezes', 'naptar',
    'platform', 'profil', 'regisztracio', 'static', 'www'
  ]);
$$;

-- Telefonszám: opcionális +, számjegyek, szóköz; 7–20 karakter. (A formázás az appban történik.)
create function private.is_valid_phone(phone text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select phone ~ '^\+?[0-9 ]{7,20}$';
$$;

-- -----------------------------------------------------------------------------
-- profiles – minden felhasználó (vendég, barber, admin)
-- Barber = akinek van 'approved' sora a barbers táblában; admin = is_admin.
-- -----------------------------------------------------------------------------
create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  full_name         text check (char_length(full_name) between 1 and 100),
  phone             text check (private.is_valid_phone(phone)),
  is_admin          boolean not null default false,
  terms_accepted_at timestamptz,
  created_at        timestamptz not null default now()
);

-- Új auth felhasználó → profil. A Google a nevet full_name / name mezőben adja.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name  text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')), '');
  v_phone text := nullif(trim(new.raw_user_meta_data ->> 'phone'), '');
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    left(v_name, 100),
    case when private.is_valid_phone(v_phone) then v_phone end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- -----------------------------------------------------------------------------
-- barbers – barberprofil és regisztrációs státusz
-- -----------------------------------------------------------------------------
create table public.barbers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references public.profiles (id) on delete cascade,
  slug          text not null unique
                  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
                         and char_length(slug) between 3 and 30
                         and not private.is_reserved_slug(slug)),
  display_name  text not null check (char_length(display_name) between 2 and 60),
  bio           text check (char_length(bio) <= 1000),
  city          text not null check (char_length(city) between 2 and 60),
  address       text not null check (char_length(address) between 3 and 200),
  phone         text not null check (private.is_valid_phone(phone)),
  instagram     text check (instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  avatar_path   text,
  status        public.barber_status not null default 'pending',
  reject_reason text check (char_length(reject_reason) <= 500),
  is_listed     boolean not null default true,  -- csak a nyilvános listát szabályozza
  approved_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index barbers_status_idx on public.barbers (status);

-- -----------------------------------------------------------------------------
-- barber_settings – foglalási szabályok (barberenként egy sor, automatikusan jön létre)
-- -----------------------------------------------------------------------------
create table public.barber_settings (
  barber_id            uuid primary key references public.barbers (id) on delete cascade,
  approval_timeout_min integer not null default 120 check (approval_timeout_min between 15 and 2880),
  cancel_limit_hours   integer not null default 24  check (cancel_limit_hours between 0 and 168),
  min_notice_min       integer not null default 120 check (min_notice_min between 0 and 10080),
  max_days_ahead       integer not null default 30  check (max_days_ahead between 1 and 365),
  buffer_min           integer not null default 0   check (buffer_min between 0 and 60),
  slot_step_min        integer not null default 15  check (slot_step_min in (5, 10, 15, 20, 30, 60))
);

create function private.create_barber_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.barber_settings (barber_id) values (new.id);
  return new;
end;
$$;

create trigger on_barber_created
  after insert on public.barbers
  for each row execute function private.create_barber_settings();

-- -----------------------------------------------------------------------------
-- services – szolgáltatások
-- -----------------------------------------------------------------------------
create table public.services (
  id           uuid primary key default gen_random_uuid(),
  barber_id    uuid not null references public.barbers (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 80),
  duration_min integer not null check (duration_min between 5 and 480),
  price        numeric(10, 2) not null check (price >= 0),  -- RON
  is_active    boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create index services_barber_idx on public.services (barber_id, sort_order);

-- -----------------------------------------------------------------------------
-- working_hours – heti munkaidő; napon belül több sáv (ebédszünet). 0 = vasárnap.
-- -----------------------------------------------------------------------------
create table public.working_hours (
  id         uuid primary key default gen_random_uuid(),
  barber_id  uuid not null references public.barbers (id) on delete cascade,
  weekday    smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time   time not null,
  check (start_time < end_time),
  constraint working_hours_no_overlap exclude using gist (
    barber_id with =,
    weekday with =,
    public.timerange(start_time, end_time) with &&
  )
);

-- -----------------------------------------------------------------------------
-- barber_customers – a barber vendégei (első foglaláskor jön létre), megbízható jelölés
-- -----------------------------------------------------------------------------
create table public.barber_customers (
  barber_id   uuid not null references public.barbers (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  is_trusted  boolean not null default false,
  created_at  timestamptz not null default now(),
  primary key (barber_id, customer_id)
);

create index barber_customers_customer_idx on public.barber_customers (customer_id);

-- -----------------------------------------------------------------------------
-- bookings – foglalások
-- block_end = ends_at + a barber pufferideje (a létrehozáskor rögzítve).
-- Fiók nélküli (kézi) foglalásnál guest_name + guest_phone; törölt fióknál is_anonymized.
-- -----------------------------------------------------------------------------
create table public.bookings (
  id             uuid primary key default gen_random_uuid(),
  barber_id      uuid not null references public.barbers (id) on delete cascade,
  customer_id    uuid references public.profiles (id) on delete set null,
  guest_name     text check (char_length(guest_name) between 1 and 100),
  guest_phone    text check (private.is_valid_phone(guest_phone)),
  service_id     uuid not null references public.services (id),
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  block_end      timestamptz not null,
  status         public.booking_status not null default 'pending',
  cancelled_by   public.cancelled_by,
  customer_note  text check (char_length(customer_note) <= 500),
  decision_note  text check (char_length(decision_note) <= 500),
  is_anonymized  boolean not null default false,
  expires_at     timestamptz,
  created_at     timestamptz not null default now(),
  decided_at     timestamptz,

  constraint bookings_time_order check (starts_at < ends_at and ends_at <= block_end),
  constraint bookings_who check (
    customer_id is not null
    or is_anonymized
    or (guest_name is not null and guest_phone is not null)
  ),
  constraint bookings_cancelled_by check ((status = 'cancelled') = (cancelled_by is not null)),
  constraint bookings_pending_expires check (status <> 'pending' or expires_at is not null),
  -- Dupla foglalás kizárása pufferrel együtt, csak az aktív állapotokra
  constraint no_overlap exclude using gist (
    barber_id with =,
    tstzrange(starts_at, block_end) with &&
  ) where (status in ('pending', 'confirmed'))
);

create index bookings_barber_starts_idx on public.bookings (barber_id, starts_at);
create index bookings_customer_starts_idx on public.bookings (customer_id, starts_at);
create index bookings_pending_expires_idx on public.bookings (expires_at) where status = 'pending';

-- Foglaló vendég felvétele a barber vendégei közé
create function private.register_barber_customer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.barber_customers (barber_id, customer_id)
  values (new.barber_id, new.customer_id)
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_booking_created
  after insert on public.bookings
  for each row
  when (new.customer_id is not null)
  execute function private.register_barber_customer();

-- -----------------------------------------------------------------------------
-- private_events – magánprogramok (csak a tulajdonos barber látja)
-- Egész napos esemény: starts_at = helyi éjfél, ends_at = következő helyi éjfél.
-- Heti ismétlődés: az alkalmakat helyi időben számoljuk (óraátállításkor is ugyanaz az óra).
-- -----------------------------------------------------------------------------
create table public.private_events (
  id           uuid primary key default gen_random_uuid(),
  barber_id    uuid not null references public.barbers (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 100),
  note         text check (char_length(note) <= 1000),
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  all_day      boolean not null default false,
  repeat       public.event_repeat not null default 'none',
  repeat_until date,
  created_at   timestamptz not null default now(),
  check (starts_at < ends_at),
  check (repeat = 'weekly' or repeat_until is null),
  check (repeat = 'none' or ends_at - starts_at <= interval '7 days')
);

create index private_events_barber_starts_idx on public.private_events (barber_id, starts_at);

create table public.private_event_skips (
  event_id        uuid not null references public.private_events (id) on delete cascade,
  occurrence_date date not null,  -- az kihagyott alkalom helyi (bukaresti) dátuma
  primary key (event_id, occurrence_date)
);

-- -----------------------------------------------------------------------------
-- Értesítések
-- -----------------------------------------------------------------------------
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  data       jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Fióktörlés (GDPR): a jövőbeli aktív foglalások lemondódnak, a többi anonimizálódik.
-- (A barber értesítése a 6. fázisban kerül ide.)
-- -----------------------------------------------------------------------------
create function private.anonymize_customer_bookings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.bookings
     set status = 'cancelled', cancelled_by = 'customer', decided_at = now()
   where customer_id = old.id
     and status in ('pending', 'confirmed')
     and starts_at > now();

  update public.bookings
     set is_anonymized = true, guest_name = null, guest_phone = null, customer_note = null
   where customer_id = old.id;

  return old;
end;
$$;

create trigger on_profile_deleted
  before delete on public.profiles
  for each row execute function private.anonymize_customer_bookings();
