-- =============================================================================
-- 8. fázis – Fiók törlése (spec 11., dontesek.md 3. és 8.)
--
-- 1. lépés (ez a függvény, a felhasználó nevében):
--    - vendégként: a jövőbeli foglalásai lemondódnak (a barber értesítést kap), a múltbeliek
--      anonimizálódnak (a barber statisztikája megmarad, de a vendég személyes adata nem);
--    - barberként: a jövőbeli foglalásai lemondódnak (a vendégek értesítést kapnak).
-- 2. lépés (a szerver, teljes joggal): a bejelentkezési fiók törlése → a profil, a barberprofil,
--    a szolgáltatások, a naptár, az értesítések, a feliratkozások kaszkádban törlődnek.
-- =============================================================================

create function public.prepare_account_deletion()
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

  -- A megmaradó (más barbernél lévő) foglalások anonimizálása: a fiók törlésekor a vendég kapcsolata
  -- megszűnik (customer_id → null), a megjegyzése törlődik
  update public.bookings
     set is_anonymized = true, customer_note = null
   where customer_id = v_uid;
end;
$$;

revoke execute on function public.prepare_account_deletion() from public, anon;
grant execute on function public.prepare_account_deletion() to authenticated;
