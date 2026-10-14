-- =============================================================================
-- Vágásnapló és „Ideje vágatni” emlékeztető (dontesek.md 32–33.)
--
-- Vágásnapló: a barber a lezajlott (megerősített, elkezdődött) foglaláshoz fotót és rövid jegyzetet ment
-- („oldalt 1-es fade, felül ollóval 4 cm”). Látja: a barber (a saját foglalásainál) és a vendég (a saját
-- foglalásainál). Más barber NEM látja – a vendég vágásai barberenként külön vannak.
-- A fotók a privát „cuts” tárban: <barber_id>/<booking_id>/<fájl>.webp, csak aláírt (lejáró) linkkel olvashatók.
--
-- „Ideje vágatni”: ha a vendég szokásos ideje (a legutóbbi közök átlaga, egy látogatásnál 4 hét) letelt,
-- és nincs új foglalása ennél a barbernél, értesítést kap a legközelebbi szabad időponttal – egy koppintással
-- a foglalás megerősítéséhez jut. Látogatásonként legfeljebb egyszer; a profilban kikapcsolható.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Vágásnapló
-- -----------------------------------------------------------------------------
create table public.cut_notes (
  booking_id uuid primary key references public.bookings (id) on delete cascade,
  barber_id  uuid not null references public.barbers (id) on delete cascade,
  note       text check (char_length(note) between 1 and 500),
  photo_path text,
  updated_at timestamptz not null default now(),
  constraint cut_notes_not_empty check (note is not null or photo_path is not null),
  -- csak a saját foglalás mappájára mutathat (más fotóját nem lehet „kölcsönvenni”)
  constraint cut_notes_photo_folder
    check (photo_path is null or photo_path like barber_id::text || '/' || booking_id::text || '/%')
);

create index cut_notes_barber_idx on public.cut_notes (barber_id);

-- A barber a saját, megerősített, már elkezdődött foglalásához írhat
create function private.can_write_cut_note(p_booking_id uuid, p_barber_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.bookings b
     where b.id = p_booking_id
       and b.barber_id = p_barber_id
       and b.barber_id = private.my_barber_id()
       and b.status = 'confirmed'
       and b.starts_at <= now()
  );
$$;
revoke execute on function private.can_write_cut_note(uuid, uuid) from public, anon;
grant execute on function private.can_write_cut_note(uuid, uuid) to authenticated;

-- A vendég a saját foglalásaiét látja
create function private.is_my_booking(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.bookings b
     where b.id = p_booking_id and b.customer_id = (select auth.uid()) and not b.is_anonymized
  );
$$;
revoke execute on function private.is_my_booking(uuid) from public, anon;
grant execute on function private.is_my_booking(uuid) to authenticated;

create function private.cut_notes_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger cut_notes_touch
  before update on public.cut_notes
  for each row execute function private.cut_notes_touch();

alter table public.cut_notes enable row level security;
revoke all on public.cut_notes from anon, authenticated;
grant select on public.cut_notes to authenticated;
grant insert (booking_id, barber_id, note, photo_path) on public.cut_notes to authenticated;
grant update (note, photo_path) on public.cut_notes to authenticated;
grant delete on public.cut_notes to authenticated;

create policy "cut_notes: barber a sajátjait" on public.cut_notes
  for select to authenticated
  using (barber_id = (select private.my_barber_id()));

create policy "cut_notes: vendég a saját foglalásaiét" on public.cut_notes
  for select to authenticated
  using (private.is_my_booking(booking_id));

create policy "cut_notes: barber létrehozza" on public.cut_notes
  for insert to authenticated
  with check (private.can_write_cut_note(booking_id, barber_id));

create policy "cut_notes: barber módosítja" on public.cut_notes
  for update to authenticated
  using (barber_id = (select private.my_barber_id()))
  with check (private.can_write_cut_note(booking_id, barber_id));

create policy "cut_notes: barber törli" on public.cut_notes
  for delete to authenticated
  using (barber_id = (select private.my_barber_id()));

-- -----------------------------------------------------------------------------
-- Fotók: privát tár (csak aláírt linkkel), írás csak a saját foglalás mappájába
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cuts', 'cuts', false, 3145728, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create function private.can_write_cut_photo(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.bookings b
     where b.barber_id = private.my_barber_id()
       and b.barber_id::text = (storage.foldername(p_name))[1]
       and b.id::text = (storage.foldername(p_name))[2]
       and b.status = 'confirmed'
       and b.starts_at <= now()
  );
$$;

-- Olvasás: a barber a saját mappáját; a vendég azt a fotót, amely a saját foglalásának naplójában szerepel
create function private.can_read_cut_photo(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (storage.foldername(p_name))[1] = private.my_barber_id()::text
      or exists (
        select 1 from public.cut_notes n
          join public.bookings b on b.id = n.booking_id
         where n.photo_path = p_name
           and b.customer_id = (select auth.uid())
           and not b.is_anonymized
      );
$$;
revoke execute on function private.can_write_cut_photo(text) from public, anon;
revoke execute on function private.can_read_cut_photo(text) from public, anon;
grant execute on function private.can_write_cut_photo(text) to authenticated;
grant execute on function private.can_read_cut_photo(text) to authenticated;

create policy "cuts: feltöltés a saját foglalás mappájába" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'cuts' and private.can_write_cut_photo(name));

create policy "cuts: olvasás (barber, érintett vendég)" on storage.objects
  for select to authenticated
  using (bucket_id = 'cuts' and private.can_read_cut_photo(name));

create policy "cuts: saját törlése" on storage.objects
  for delete to authenticated
  using (bucket_id = 'cuts' and (storage.foldername(name))[1] = private.my_barber_id()::text);

-- -----------------------------------------------------------------------------
-- Fióktörlés: a vendég vágásnaplója is törlődik (a fotókat a szerver előtte törli a tárból)
-- -----------------------------------------------------------------------------
create or replace function public.prepare_account_deletion()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := (select auth.uid());
  v_barber_id uuid;
begin
  if v_uid is null then
    raise exception 'Bejelentkezés szükséges.' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where id = v_uid and is_admin) then
    raise exception 'Admin fiókot itt nem lehet törölni – előbb vond vissza az admin jogot.' using errcode = '22023';
  end if;

  -- Barberként: a jövőbeli foglalások lemondása (a vendégek értesítést kapnak)
  select id into v_barber_id from public.barbers where user_id = v_uid;
  if v_barber_id is not null then
    update public.bookings
       set status = 'cancelled', cancelled_by = 'barber', decided_at = now(),
           decision_note = 'A barber megszüntette a fiókját.'
     where barber_id = v_barber_id and status in ('pending', 'confirmed') and starts_at > now();
  end if;

  -- Vendégként: a jövőbeli foglalások lemondása (a barber értesítést kap)
  update public.bookings
     set status = 'cancelled', cancelled_by = 'customer', decided_at = now()
   where customer_id = v_uid and status in ('pending', 'confirmed') and starts_at > now();

  -- A vendégről készült vágásnapló (fotó, jegyzet) személyes adat: törlődik
  delete from public.cut_notes n
   using public.bookings b
   where b.id = n.booking_id and b.customer_id = v_uid;

  -- A megmaradó (más barbernél lévő) foglalások anonimizálása: a fiók törlésekor a vendég kapcsolata
  -- megszűnik (customer_id → null), a megjegyzése törlődik
  update public.bookings
     set is_anonymized = true, customer_note = null
   where customer_id = v_uid;
end;
$$;

-- -----------------------------------------------------------------------------
-- „Ideje vágatni” emlékeztető
-- -----------------------------------------------------------------------------
alter table public.profiles add column rebook_reminders boolean not null default true;
grant update (rebook_reminders) on public.profiles to authenticated;

-- Melyik látogatás után ment már ki emlékeztető (barber–vendég páronként)
create table private.rebook_reminders (
  barber_id   uuid not null references public.barbers (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  last_visit  timestamptz not null,
  sent_at     timestamptz not null default now(),
  primary key (barber_id, customer_id)
);

create function public.send_rebook_reminders(p_any_time boolean default false)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Europe/Bucharest')::date;
  v_count integer := 0;
  v_slot  timestamptz;
  v_url   text;
  r       record;
begin
  -- Csak napközben (10–20 óra, helyi idő), hogy ne éjjel jöjjön az értesítés (a tesztek p_any_time-mal futtatják)
  if not p_any_time and extract(hour from now() at time zone 'Europe/Bucharest') not between 10 and 19 then
    return 0;
  end if;

  for r in
    with visits as (
      select b.barber_id, b.customer_id, b.starts_at, b.service_id,
             b.starts_at - lag(b.starts_at) over (partition by b.barber_id, b.customer_id order by b.starts_at) as gap,
             row_number() over (partition by b.barber_id, b.customer_id order by b.starts_at desc) as rn
        from public.bookings b
       where b.status = 'confirmed'
         and b.customer_id is not null
         and not b.is_anonymized
         and b.starts_at < now()
    ),
    pairs as (
      -- Szokásos idő: a legutóbbi (legfeljebb 5) köz átlaga, legalább 2 hét; egyetlen látogatásnál 4 hét
      select v.barber_id, v.customer_id, max(v.starts_at) as last_visit,
             greatest(coalesce(avg(v.gap) filter (where v.rn <= 5 and v.gap is not null), interval '28 days'),
                      interval '14 days') as cycle
        from visits v
       group by v.barber_id, v.customer_id
    )
    select p.barber_id, p.customer_id, p.last_visit, last.service_id, br.display_name, br.slug
      from pairs p
      join visits last on last.barber_id = p.barber_id and last.customer_id = p.customer_id and last.rn = 1
      join public.barbers br on br.id = p.barber_id and br.status = 'approved'
      join public.profiles pr on pr.id = p.customer_id and pr.rebook_reminders
     -- 10 hétnél ritkábban járónak nincs „szokása”; 3 héttel a szokásos idő után már nem zavarjuk
     where p.cycle <= interval '70 days'
       and now() >= p.last_visit + p.cycle
       and now() < p.last_visit + p.cycle + interval '21 days'
       and not exists (
         select 1 from public.bookings f
          where f.barber_id = p.barber_id and f.customer_id = p.customer_id
            and f.status in ('pending', 'confirmed') and f.starts_at >= now()
       )
       and not exists (
         select 1 from private.rebook_reminders s
          where s.barber_id = p.barber_id and s.customer_id = p.customer_id and s.last_visit >= p.last_visit
       )
  loop
    -- A legközelebbi szabad időpont ugyanarra a szolgáltatásra (2 héten belül)
    v_slot := null;
    if exists (select 1 from public.services s where s.id = r.service_id and s.is_active) then
      for i in 0..13 loop
        select a.starts_at into v_slot
          from public.get_available_slots(r.barber_id, r.service_id, v_today + i) a
         limit 1;
        exit when v_slot is not null;
      end loop;
      v_url := '/b/' || r.slug || '/foglalas?szolgaltatas=' || r.service_id
               || case when v_slot is not null
                       then '&idopont=' || to_char(v_slot at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
                       else '' end;
    else
      v_url := '/b/' || r.slug || '/foglalas';
    end if;

    perform private.notify(r.customer_id, 'rebook', 'Ideje egy friss vágásnak?',
      'Legutóbb ' || round(extract(epoch from now() - r.last_visit) / 86400)::int || ' napja voltál ' || r.display_name || ' székében. '
      || case when v_slot is not null
              then 'Legközelebbi szabad időpont: ' || private.format_hu(v_slot) || ' – egy koppintás, és foglalhatsz.'
              else 'Foglalj időpontot pár kattintással.' end,
      v_url);

    insert into private.rebook_reminders (barber_id, customer_id, last_visit)
    values (r.barber_id, r.customer_id, r.last_visit)
    on conflict (barber_id, customer_id) do update set last_visit = excluded.last_visit, sent_at = now();
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function public.send_rebook_reminders(boolean) from public, anon, authenticated;
grant execute on function public.send_rebook_reminders(boolean) to service_role;

-- Óránként (a függvény maga szűr a napszakra; egy látogatás után csak egyszer küld)
select cron.schedule('send-rebook-reminders', '7 * * * *', $$select public.send_rebook_reminders()$$);
