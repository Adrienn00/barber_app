-- =============================================================================
-- Áthelyezés (dontesek.md 17.): a barber egy megerősített foglalást új időpontra tehet
--  a) javaslattal: a vendég elfogadja vagy elutasítja; addig az új időpont foglalt (más nem kérheti).
--     Ha a vendég nem fogadja el vagy nem válaszol időben, a régi időpont marad, és a barber dönt:
--     marad a régi, vagy lemondja (needs_decision).
--  b) közvetlenül (már megbeszélték telefonon): azonnal átkerül; a vendég „Áthelyezve” jelzést lát.
-- =============================================================================

-- Az áthelyezés előtti kezdés (a vendégnek: „Áthelyezve, korábban: …”)
alter table public.bookings add column moved_from timestamptz;

create table public.booking_reschedules (
  id             uuid primary key default gen_random_uuid(),
  booking_id     uuid not null references public.bookings (id) on delete cascade,
  -- A jogosultsághoz és az élő frissítés szűrőjéhez (a foglalásból másolva)
  barber_id      uuid not null references public.barbers (id) on delete cascade,
  customer_id    uuid not null references public.profiles (id) on delete cascade,
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  block_end      timestamptz not null,
  status         text not null default 'pending'
                 check (status in ('pending', 'accepted', 'declined', 'expired', 'withdrawn')),
  note           text check (char_length(note) <= 500),
  expires_at     timestamptz not null,
  -- Elutasított / lejárt javaslat után a barbernek döntenie kell: marad a régi, vagy lemondja
  needs_decision boolean not null default false,
  created_at     timestamptz not null default now(),
  decided_at     timestamptz,

  constraint booking_reschedules_time_order check (starts_at < ends_at and ends_at <= block_end),
  -- Két függő javaslat nem fedheti egymást
  constraint booking_reschedules_no_overlap exclude using gist (
    barber_id with =,
    tstzrange(starts_at, block_end) with &&
  ) where (status = 'pending')
);

-- Egy foglaláshoz egyszerre egy függő javaslat
create unique index booking_reschedules_one_pending on public.booking_reschedules (booking_id) where status = 'pending';
create index booking_reschedules_barber on public.booking_reschedules (barber_id, status);
create index booking_reschedules_customer on public.booking_reschedules (customer_id, status);

-- Jogosultság: csak olvasás (a barber a sajátjait, a vendég a neki szólókat); írás csak függvényen át
revoke all on public.booking_reschedules from anon, authenticated;
grant select on public.booking_reschedules to authenticated;
alter table public.booking_reschedules enable row level security;

create policy "booking_reschedules: barber a sajátjait" on public.booking_reschedules
  for select to authenticated
  using (barber_id = (select private.my_barber_id()));

create policy "booking_reschedules: vendég a neki szólókat" on public.booking_reschedules
  for select to authenticated
  using (customer_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Ütközésvédelem a két tábla között (foglalás ↔ függő javaslat).
-- A barberenkénti zár miatt két egyszerre érkező művelet nem csúszhat át egymás mellett.
-- -----------------------------------------------------------------------------
create function private.lock_barber_schedule(p_barber_id uuid)
returns void
language sql
as $$
  select pg_advisory_xact_lock(hashtextextended('barber-schedule:' || p_barber_id::text, 0));
$$;

-- Új / áthelyezett foglalás nem eshet egy (más foglaláshoz tartozó) függő javaslat idejére
create function private.bookings_check_reschedule_holds()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status not in ('pending', 'confirmed') then
    return new;
  end if;
  perform private.lock_barber_schedule(new.barber_id);
  if exists (
    select 1 from public.booking_reschedules r
     where r.barber_id = new.barber_id
       and r.status = 'pending'
       and r.expires_at > now()
       and r.booking_id <> new.id
       and tstzrange(r.starts_at, r.block_end) && tstzrange(new.starts_at, new.block_end)
  ) then
    raise exception 'Ez az időpont egy függő áthelyezési javaslat miatt foglalt.' using errcode = '23P01';
  end if;
  return new;
end;
$$;

create trigger bookings_check_reschedule_holds
  before insert or update of starts_at, block_end on public.bookings
  for each row execute function private.bookings_check_reschedule_holds();

-- Új javaslat nem eshet egy másik aktív foglalás idejére (a saját foglalásával átfedhet)
create function private.reschedules_check_bookings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.lock_barber_schedule(new.barber_id);
  if exists (
    select 1 from public.bookings b
     where b.barber_id = new.barber_id
       and b.id <> new.booking_id
       and (b.status = 'confirmed' or (b.status = 'pending' and b.expires_at > now()))
       and tstzrange(b.starts_at, b.block_end) && tstzrange(new.starts_at, new.block_end)
  ) then
    raise exception 'Az új időpont ütközik egy másik foglalással (a pufferidővel együtt).' using errcode = '23P01';
  end if;
  return new;
end;
$$;

create trigger reschedules_check_bookings
  before insert on public.booking_reschedules
  for each row execute function private.reschedules_check_bookings();

-- Ha a foglalás lezárul (lemondás stb.), a hozzá tartozó javaslat és döntési feladat is megszűnik
create function private.bookings_close_reschedules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.booking_reschedules
     set status = case when status = 'pending' then 'withdrawn' else status end,
         needs_decision = false,
         decided_at = coalesce(decided_at, now())
   where booking_id = new.id
     and (status = 'pending' or needs_decision);
  return new;
end;
$$;

create trigger bookings_close_reschedules
  after update of status on public.bookings
  for each row
  when (new.status not in ('pending', 'confirmed'))
  execute function private.bookings_close_reschedules();

-- -----------------------------------------------------------------------------
-- Lejárat: a válasz nélküli javaslat lejár; ha a foglalás még él, a barbernek döntenie kell
-- -----------------------------------------------------------------------------
create function private.expire_reschedules(p_barber_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.booking_reschedules r
     set status = 'expired',
         decided_at = now(),
         needs_decision = exists (
           select 1 from public.bookings b
            where b.id = r.booking_id and b.status = 'confirmed' and b.starts_at > now()
         )
   where r.status = 'pending'
     and r.expires_at <= now()
     and (p_barber_id is null or r.barber_id = p_barber_id);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

select cron.schedule('expire-reschedules', '* * * * *', $$select private.expire_reschedules()$$);

-- -----------------------------------------------------------------------------
-- Szabad időpontok: a függő javaslat ideje is foglalt
-- -----------------------------------------------------------------------------
create or replace function public.get_available_slots(p_barber_id uuid, p_service_id uuid, p_date date)
returns table (starts_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  with params as (
    select s.duration_min, st.buffer_min, st.slot_step_min, st.min_notice_min, st.max_days_ahead
      from public.services s
      join public.barbers b on b.id = s.barber_id
      join public.barber_settings st on st.barber_id = b.id
     where s.id = p_service_id
       and s.barber_id = p_barber_id
       and s.is_active
       and b.status = 'approved'
       and p_date >= (now() at time zone 'Europe/Bucharest')::date
       and p_date <= (now() at time zone 'Europe/Bucharest')::date + st.max_days_ahead
  ),
  candidates as (
    select (local_start at time zone 'Europe/Bucharest') as starts_at,
           (local_start at time zone 'Europe/Bucharest') + make_interval(mins => p.duration_min) as ends_at,
           (local_start at time zone 'Europe/Bucharest') + make_interval(mins => p.duration_min + p.buffer_min) as block_end,
           p.min_notice_min
      from params p
      join public.working_hours w
        on w.barber_id = p_barber_id
       and w.weekday = extract(dow from p_date)::int
     cross join lateral generate_series(
       p_date + w.start_time,
       p_date + w.end_time - make_interval(mins => p.duration_min),
       make_interval(mins => p.slot_step_min)
     ) as local_start
  )
  select c.starts_at
    from candidates c
   where c.starts_at >= now() + make_interval(mins => c.min_notice_min)
     and not exists (
       select 1 from public.bookings b
        where b.barber_id = p_barber_id
          and (b.status = 'confirmed' or (b.status = 'pending' and b.expires_at > now()))
          and tstzrange(b.starts_at, b.block_end) && tstzrange(c.starts_at, c.block_end)
     )
     and not exists (
       select 1 from public.booking_reschedules r
        where r.barber_id = p_barber_id
          and r.status = 'pending'
          and r.expires_at > now()
          and tstzrange(r.starts_at, r.block_end) && tstzrange(c.starts_at, c.block_end)
     )
     and not exists (
       select 1 from private.private_event_occurrences(p_barber_id, c.starts_at, c.ends_at) o
     )
   order by c.starts_at;
$$;

-- -----------------------------------------------------------------------------
-- Közös ellenőrzés: a barber saját, jövőbeli, megerősített foglalása, és érvényes új időpont
-- -----------------------------------------------------------------------------
create function private.barber_movable_booking(p_booking_id uuid, p_starts_at timestamptz, p_note text)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings
   where id = p_booking_id and barber_id = private.my_barber_id()
   for update;
  if not found then
    raise exception 'Nincs jogosultságod ehhez a foglaláshoz.' using errcode = '42501';
  end if;
  if v_booking.status <> 'confirmed' or v_booking.starts_at <= now() then
    raise exception 'Csak jövőbeli, megerősített foglalás helyezhető át.' using errcode = '22023';
  end if;
  if p_starts_at is null or p_starts_at <= now() then
    raise exception 'Az új időpont már elmúlt – válassz egy későbbit.' using errcode = '22023';
  end if;
  if p_starts_at = v_booking.starts_at then
    raise exception 'Ez ugyanaz az időpont, mint a mostani.' using errcode = '22023';
  end if;
  if char_length(coalesce(p_note, '')) > 500 then
    raise exception 'Az üzenet legfeljebb 500 karakter lehet.' using errcode = '22023';
  end if;
  return v_booking;
end;
$$;

-- a) Javaslat a vendégnek. Határidő: mint a jóváhagyásnál, de legkésőbb a régi / új időpont kezdetéig.
create function public.propose_reschedule(p_booking_id uuid, p_starts_at timestamptz, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_timeout integer;
  v_id      uuid;
begin
  v_booking := private.barber_movable_booking(p_booking_id, p_starts_at, p_note);
  if v_booking.customer_id is null then
    raise exception 'Fiók nélküli vendégnél nincs kitől kérdezni – helyezd át közvetlenül.' using errcode = '22023';
  end if;

  perform private.expire_reschedules(v_booking.barber_id);
  if exists (select 1 from public.booking_reschedules where booking_id = p_booking_id and status = 'pending') then
    raise exception 'Ehhez a foglaláshoz már van függő javaslat – előbb vond vissza.' using errcode = '22023';
  end if;

  -- Egy korábbi elutasított / lejárt javaslat döntési feladata az új javaslattal megszűnik
  update public.booking_reschedules set needs_decision = false
   where booking_id = p_booking_id and needs_decision;

  select approval_timeout_min into v_timeout from public.barber_settings where barber_id = v_booking.barber_id;

  begin
    insert into public.booking_reschedules (
      booking_id, barber_id, customer_id, starts_at, ends_at, block_end, note, expires_at
    ) values (
      p_booking_id, v_booking.barber_id, v_booking.customer_id,
      p_starts_at,
      p_starts_at + (v_booking.ends_at - v_booking.starts_at),
      p_starts_at + (v_booking.block_end - v_booking.starts_at),
      nullif(trim(p_note), ''),
      least(now() + make_interval(mins => v_timeout), v_booking.starts_at, p_starts_at)
    )
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'Az új időpont ütközik egy másik foglalással vagy javaslattal (a pufferidővel együtt).'
      using errcode = '23P01';
  end;
  return v_id;
end;
$$;

-- b) Közvetlen áthelyezés (a vendég nem kap kérdést, csak „Áthelyezve” jelzést). Munkaidőn kívülre is lehet.
create function public.move_booking(p_booking_id uuid, p_starts_at timestamptz, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  v_booking := private.barber_movable_booking(p_booking_id, p_starts_at, p_note);

  -- Az esetleges függő javaslat és döntési feladat ezzel tárgytalan
  update public.booking_reschedules
     set status = case when status = 'pending' then 'withdrawn' else status end,
         needs_decision = false,
         decided_at = coalesce(decided_at, now())
   where booking_id = p_booking_id and (status = 'pending' or needs_decision);

  begin
    update public.bookings
       set starts_at = p_starts_at,
           ends_at = p_starts_at + (v_booking.ends_at - v_booking.starts_at),
           block_end = p_starts_at + (v_booking.block_end - v_booking.starts_at),
           moved_from = v_booking.starts_at,
           decision_note = coalesce(nullif(trim(p_note), ''), decision_note)
     where id = p_booking_id;
  exception when exclusion_violation then
    raise exception 'Az új időpont ütközik egy másik foglalással vagy javaslattal (a pufferidővel együtt).'
      using errcode = '23P01';
  end;
end;
$$;

-- A vendég válasza a javaslatra
create function public.respond_reschedule(p_reschedule_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_r public.booking_reschedules;
  v_booking public.bookings;
begin
  select * into v_r from public.booking_reschedules
   where id = p_reschedule_id and customer_id = (select auth.uid())
   for update;
  if not found then
    raise exception 'Nincs jogosultságod ehhez a javaslathoz.' using errcode = '42501';
  end if;
  if v_r.status <> 'pending' or v_r.expires_at <= now() then
    raise exception 'Erre a javaslatra már nem lehet válaszolni (lejárt vagy a barber visszavonta).' using errcode = '22023';
  end if;

  if not p_accept then
    update public.booking_reschedules
       set status = 'declined', needs_decision = true, decided_at = now()
     where id = p_reschedule_id;
    return;
  end if;

  select * into v_booking from public.bookings where id = v_r.booking_id for update;
  update public.booking_reschedules set status = 'accepted', decided_at = now() where id = p_reschedule_id;
  begin
    update public.bookings
       set starts_at = v_r.starts_at, ends_at = v_r.ends_at, block_end = v_r.block_end,
           moved_from = v_booking.starts_at,
           decision_note = coalesce(v_r.note, decision_note)
     where id = v_r.booking_id;
  exception when exclusion_violation then
    raise exception 'Az új időpont közben foglalt lett – a régi időpontod marad.' using errcode = '22023';
  end;
end;
$$;

-- A barber visszavonja a még függő javaslatát (a régi időpont marad)
create function public.withdraw_reschedule(p_reschedule_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.booking_reschedules
     set status = 'withdrawn', decided_at = now()
   where id = p_reschedule_id
     and barber_id = private.my_barber_id()
     and status = 'pending';
  if not found then
    raise exception 'Ez a javaslat már nem vonható vissza.' using errcode = '22023';
  end if;
end;
$$;

-- A barber döntése elutasított / lejárt javaslat után: marad a régi, vagy lemondja (indoklással)
create function public.resolve_reschedule(p_reschedule_id uuid, p_keep boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_r public.booking_reschedules;
begin
  select * into v_r from public.booking_reschedules
   where id = p_reschedule_id and barber_id = private.my_barber_id()
   for update;
  if not found then
    raise exception 'Nincs jogosultságod ehhez a javaslathoz.' using errcode = '42501';
  end if;
  if not v_r.needs_decision then
    raise exception 'Erről már döntöttél.' using errcode = '22023';
  end if;

  if p_keep then
    update public.booking_reschedules set needs_decision = false where id = p_reschedule_id;
  else
    -- A lemondás szabályai (kötelező indoklás) a cancel_booking-ban vannak; a döntési feladatot a trigger zárja
    perform public.cancel_booking(v_r.booking_id, p_note);
  end if;
end;
$$;

revoke execute on function public.propose_reschedule(uuid, timestamptz, text) from public, anon;
revoke execute on function public.move_booking(uuid, timestamptz, text) from public, anon;
revoke execute on function public.respond_reschedule(uuid, boolean) from public, anon;
revoke execute on function public.withdraw_reschedule(uuid) from public, anon;
revoke execute on function public.resolve_reschedule(uuid, boolean, text) from public, anon;
grant execute on function public.propose_reschedule(uuid, timestamptz, text) to authenticated;
grant execute on function public.move_booking(uuid, timestamptz, text) to authenticated;
grant execute on function public.respond_reschedule(uuid, boolean) to authenticated;
grant execute on function public.withdraw_reschedule(uuid) to authenticated;
grant execute on function public.resolve_reschedule(uuid, boolean, text) to authenticated;
revoke execute on function private.expire_reschedules(uuid) from public, anon, authenticated;
revoke execute on function private.barber_movable_booking(uuid, timestamptz, text) from public, anon, authenticated;
revoke execute on function private.lock_barber_schedule(uuid) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- „Foglalásaim”: áthelyezés jelzése és a függő javaslat
-- -----------------------------------------------------------------------------
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
  moved_from timestamptz,
  service_id uuid,
  service_name text,
  price numeric,
  barber_name text,
  barber_slug text,
  barber_address text,
  barber_city text,
  barber_phone text,
  cancel_limit_hours integer,
  proposal_id uuid,
  proposal_starts_at timestamptz,
  proposal_ends_at timestamptz,
  proposal_expires_at timestamptz,
  proposal_note text,
  -- A vendég nemet mondott / nem válaszolt egy javaslatra, és a barber még nem döntött a régi időpontról
  awaiting_barber_decision boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select bk.id, bk.status, bk.starts_at, bk.ends_at, bk.expires_at, bk.customer_note, bk.decision_note,
         bk.cancelled_by, bk.moved_from, sv.id, sv.name, sv.price, b.display_name, b.slug, b.address, b.city, b.phone,
         st.cancel_limit_hours,
         r.id, r.starts_at, r.ends_at, r.expires_at, r.note,
         exists (select 1 from public.booking_reschedules d where d.booking_id = bk.id and d.needs_decision)
    from public.bookings bk
    join public.services sv on sv.id = bk.service_id
    join public.barbers b on b.id = bk.barber_id
    join public.barber_settings st on st.barber_id = b.id
    left join public.booking_reschedules r
      on r.booking_id = bk.id and r.status = 'pending' and r.expires_at > now()
   where bk.customer_id = (select auth.uid())
   order by bk.starts_at desc;
$$;

revoke execute on function public.get_my_bookings() from public, anon;
grant execute on function public.get_my_bookings() to authenticated;

-- Élő frissítés a javaslatokra is (RLS szerint: barber a sajátjait, vendég a neki szólókat)
alter publication supabase_realtime add table public.booking_reschedules;
