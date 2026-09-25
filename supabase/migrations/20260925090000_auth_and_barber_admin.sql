-- =============================================================================
-- 2. fázis – regisztráció, barberjelentkezés, platform admin
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Regisztráció: a feltételek elfogadását a regisztrációs metaadatból rögzítjük
-- (e-mail megerősítés mellett a regisztráció után még nincs munkamenet).
-- -----------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name  text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')), '');
  v_phone text := nullif(trim(new.raw_user_meta_data ->> 'phone'), '');
begin
  insert into public.profiles (id, full_name, phone, terms_accepted_at)
  values (
    new.id,
    left(v_name, 100),
    case when private.is_valid_phone(v_phone) then v_phone end,
    case when (new.raw_user_meta_data ->> 'terms_accepted') = 'true' then now() end
  );
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Barber státuszváltás – csak admin. Engedélyezett átmenetek:
--   pending   → approved | rejected
--   approved  → suspended
--   suspended → approved
-- Felfüggesztéskor a jövőbeli aktív foglalások lemondódnak (docs/dontesek.md 5.).
-- -----------------------------------------------------------------------------
create function public.admin_set_barber_status(
  p_barber_id uuid,
  p_status    public.barber_status,
  p_reason    text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.barber_status;
  v_reason  text := nullif(trim(p_reason), '');
begin
  if not private.is_admin() then
    raise exception 'Nincs jogosultságod ehhez a művelethez.' using errcode = '42501';
  end if;

  select status into v_current from public.barbers where id = p_barber_id for update;
  if not found then
    raise exception 'A barber nem található.' using errcode = 'P0002';
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

  update public.barbers
     set status        = p_status,
         reject_reason = case when p_status in ('rejected', 'suspended') then v_reason end,
         approved_at   = case when p_status = 'approved' then coalesce(approved_at, now()) else approved_at end
   where id = p_barber_id;

  if p_status = 'suspended' then
    update public.bookings
       set status        = 'cancelled',
           cancelled_by  = 'barber',
           decision_note = 'A barber jelenleg nem fogad foglalást.',
           decided_at    = now()
     where barber_id = p_barber_id
       and status in ('pending', 'confirmed')
       and starts_at > now();
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Elutasított jelentkezés újraküldése (a barber előtte javíthatja az adatait)
-- -----------------------------------------------------------------------------
create function public.reapply_as_barber()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.barbers
     set status = 'pending', reject_reason = null
   where user_id = (select auth.uid())
     and status = 'rejected';

  if not found then
    raise exception 'Nincs újraküldhető, elutasított jelentkezésed.' using errcode = '22023';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Alapszámok a platform adminnak (személyes adat nélkül)
-- -----------------------------------------------------------------------------
create function public.admin_stats()
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
    'customers',         (select count(*) from public.profiles p
                           where not p.is_admin
                             and not exists (select 1 from public.barbers b where b.user_id = p.id)),
    'bookings_total',    (select count(*) from public.bookings),
    'bookings_upcoming', (select count(*) from public.bookings
                           where status in ('pending', 'confirmed') and starts_at > now())
  );
end;
$$;

-- Csak bejelentkezett felhasználó hívhatja (a jogosultságot a függvény maga is ellenőrzi)
revoke execute on function public.admin_set_barber_status(uuid, public.barber_status, text) from public, anon;
revoke execute on function public.reapply_as_barber() from public, anon;
revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.admin_set_barber_status(uuid, public.barber_status, text) to authenticated;
grant execute on function public.reapply_as_barber() to authenticated;
grant execute on function public.admin_stats() to authenticated;
