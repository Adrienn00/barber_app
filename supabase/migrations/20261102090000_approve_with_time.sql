-- =============================================================================
-- Jóváhagyás módosított idővel (dontesek.md 37.)
--  - Ha csak a befejezés változik (rövidebb / hosszabb): a kérés azonnal megerősítve, az új hosszal.
--  - Ha a kezdés is változik: a vendég javaslatot kap (booking_reschedules); a kérés addig függő marad.
--      elfogadja  → a foglalás az új időponttal megerősített;
--      nemet mond / nem válaszol / a barber visszavonja → a kérés függő marad az eredeti időponttal,
--      a barber újra dönthet (jóváhagyja, elutasítja, vagy új időpontot javasol).
--    Hogy a barbernek legyen ideje dönteni, a kérés lejárata: a javaslat határideje + a jóváhagyási idő.
-- =============================================================================

create function public.approve_booking_with_time(
  p_booking_id   uuid,
  p_starts_at    timestamptz,
  p_duration_min integer,
  p_note         text default null
)
returns text  -- 'approved' | 'proposed'
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_timeout integer;
  v_ends_at timestamptz;
  v_buffer  interval;
  v_expires timestamptz;
begin
  perform private.expire_pending_bookings(private.my_barber_id());
  perform private.expire_reschedules(private.my_barber_id());

  select * into v_booking from public.bookings
   where id = p_booking_id and barber_id = private.my_barber_id()
   for update;
  if not found then
    raise exception 'Nincs jogosultságod ehhez a foglaláshoz.' using errcode = '42501';
  end if;
  if v_booking.status <> 'pending' or v_booking.expires_at <= now() then
    raise exception 'Ez a kérés már nem hagyható jóvá (lejárt, vagy közben megváltozott).' using errcode = '22023';
  end if;
  if p_duration_min is null or p_duration_min < 5 or p_duration_min > 480 then
    raise exception 'Az időtartam 5 perc és 8 óra között lehet.' using errcode = '22023';
  end if;
  if char_length(coalesce(p_note, '')) > 500 then
    raise exception 'Az üzenet legfeljebb 500 karakter lehet.' using errcode = '22023';
  end if;

  v_buffer := v_booking.block_end - v_booking.ends_at;

  -- Ugyanaz a kezdés: azonnali jóváhagyás az új hosszal (a vendégnek nem kell újra döntenie)
  if p_starts_at is null or p_starts_at = v_booking.starts_at then
    -- Egy esetleges függő javaslat ezzel tárgytalan (a barber mégis az eredeti időpontot vállalja)
    update public.booking_reschedules set status = 'withdrawn', decided_at = now()
     where booking_id = p_booking_id and status = 'pending';
    v_ends_at := v_booking.starts_at + make_interval(mins => p_duration_min);
    begin
      update public.bookings
         set ends_at = v_ends_at, block_end = v_ends_at + v_buffer,
             status = 'confirmed', decided_at = now(),
             decision_note = coalesce(nullif(trim(p_note), ''), decision_note)
       where id = p_booking_id;
    exception when exclusion_violation then
      raise exception 'Így ütközne egy másik foglalással (a pufferidővel együtt).' using errcode = '23P01';
    end;
    return 'approved';
  end if;

  -- Más kezdés: javaslat a vendégnek
  if p_starts_at <= now() then
    raise exception 'Az új időpont már elmúlt – válassz egy későbbit.' using errcode = '22023';
  end if;
  if v_booking.customer_id is null then
    raise exception 'Fiók nélküli vendégnél nincs kitől kérdezni.' using errcode = '22023';
  end if;
  if exists (select 1 from public.booking_reschedules where booking_id = p_booking_id and status = 'pending') then
    raise exception 'Ehhez a kéréshez már van függő javaslat – előbb vond vissza.' using errcode = '22023';
  end if;

  select approval_timeout_min into v_timeout from public.barber_settings where barber_id = v_booking.barber_id;
  v_expires := least(now() + make_interval(mins => v_timeout), v_booking.starts_at, p_starts_at);
  v_ends_at := p_starts_at + make_interval(mins => p_duration_min);

  begin
    insert into public.booking_reschedules (
      booking_id, barber_id, customer_id, starts_at, ends_at, block_end, note, expires_at
    ) values (
      p_booking_id, v_booking.barber_id, v_booking.customer_id,
      p_starts_at, v_ends_at, v_ends_at + v_buffer, nullif(trim(p_note), ''), v_expires
    );
  exception when exclusion_violation then
    raise exception 'Az új időpont ütközik egy másik foglalással vagy javaslattal (a pufferidővel együtt).'
      using errcode = '23P01';
  end;

  -- Amíg a vendég dönt, a kérés nem jár le; utána a barbernek még egy teljes jóváhagyási ideje van
  update public.bookings
     set expires_at = greatest(expires_at, least(starts_at, v_expires + make_interval(mins => v_timeout)))
   where id = p_booking_id;
  return 'proposed';
end;
$$;

revoke execute on function public.approve_booking_with_time(uuid, timestamptz, integer, text) from public, anon;
grant execute on function public.approve_booking_with_time(uuid, timestamptz, integer, text) to authenticated;

-- -----------------------------------------------------------------------------
-- A vendég válasza: függő kérésnél az elfogadás egyben a megerősítés; a nemet mondott javaslat után
-- a kérés egyszerűen függő marad (nincs külön „marad a régi / lemondom” döntés)
-- -----------------------------------------------------------------------------
create or replace function public.respond_reschedule(p_reschedule_id uuid, p_accept boolean)
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

  select * into v_booking from public.bookings where id = v_r.booking_id for update;

  if not p_accept then
    update public.booking_reschedules
       set status = 'declined', needs_decision = (v_booking.status = 'confirmed'), decided_at = now()
     where id = p_reschedule_id;
    return;
  end if;

  update public.booking_reschedules set status = 'accepted', decided_at = now() where id = p_reschedule_id;
  begin
    update public.bookings
       set starts_at = v_r.starts_at, ends_at = v_r.ends_at, block_end = v_r.block_end,
           -- Megerősített foglalásnál „Áthelyezve” jelzés; függő kérésnél ez maga a megerősítés
           moved_from = case when v_booking.status = 'confirmed' then v_booking.starts_at else moved_from end,
           status = 'confirmed',
           decided_at = case when v_booking.status = 'pending' then now() else decided_at end,
           decision_note = coalesce(v_r.note, decision_note)
     where id = v_r.booking_id;
  exception when exclusion_violation then
    raise exception 'Az új időpont közben foglalt lett.' using errcode = '22023';
  end;
end;
$$;

-- -----------------------------------------------------------------------------
-- Értesítések: függő kérésre adott javaslatnál más szöveg; nemet / nem válaszolt → a barber újra dönt
-- -----------------------------------------------------------------------------
create or replace function private.reschedules_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_barber   public.barbers;
  v_booking  public.bookings;
  v_customer text;
  v_request  boolean;
begin
  select * into v_barber from public.barbers where id = new.barber_id;
  select * into v_booking from public.bookings where id = new.booking_id;
  select coalesce(full_name, 'A vendég') into v_customer from public.profiles where id = new.customer_id;
  -- Függő kérésre adott javaslat (a jóváhagyáskor módosított kezdés)
  v_request := v_booking.status = 'pending';

  if tg_op = 'INSERT' then
    if v_request then
      perform private.notify(new.customer_id, 'reschedule_proposed', v_barber.display_name || ' más időpontot javasol',
        private.format_hu(new.starts_at) || ' (kérted: ' || private.format_hu(v_booking.starts_at) || '). Fogadd el '
          || private.format_hu(new.expires_at) || '-ig, és a foglalásod megerősített.', '/foglalasaim');
    else
      perform private.notify(new.customer_id, 'reschedule_proposed', v_barber.display_name || ' új időpontot javasol',
        private.format_hu(new.starts_at) || ' (most: ' || private.format_hu(v_booking.starts_at) || '). Válaszolj '
          || private.format_hu(new.expires_at) || '-ig.', '/foglalasaim');
    end if;
  elsif new.status is distinct from old.status then
    if new.status = 'accepted' then
      perform private.notify(v_barber.user_id, 'reschedule_accepted', v_customer || ' elfogadta az új időpontot',
        private.format_hu(new.starts_at), '/naptar');
    elsif v_request and new.status in ('declined', 'expired') then
      perform private.notify(v_barber.user_id, 'reschedule_declined',
        v_customer || case when new.status = 'declined' then ' nem fogadta el' else ' nem válaszolt' end
          || ' a javasolt időpontra',
        'A kérése (' || private.format_hu(v_booking.starts_at) || ') újra függő – döntsd el.', '/keresek');
    elsif new.status = 'declined' then
      perform private.notify(v_barber.user_id, 'reschedule_declined', v_customer || ' nem fogadta el az új időpontot',
        'Döntsd el, marad-e a régi (' || private.format_hu(v_booking.starts_at) || ').', '/keresek');
    elsif new.status = 'expired' and new.needs_decision then
      perform private.notify(v_barber.user_id, 'reschedule_expired', v_customer || ' nem válaszolt az áthelyezésre',
        'Döntsd el, marad-e a régi (' || private.format_hu(v_booking.starts_at) || ').', '/keresek');
    end if;
  end if;
  return null;
end;
$$;
