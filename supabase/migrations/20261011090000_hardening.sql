-- =============================================================================
-- Élesítés előtti szigorítás (biztonsági átnézés, 2026-10-07)
--
-- 1. A látogató (anon) a barberek és egységek nyilvános oszlopait látja csak: a belső
--    felhasználói azonosító (user_id, owner_barber_id) és az admin indoklása (reject_reason) nem.
-- 2. Jóváhagyáskor (pl. felfüggesztés után visszaállítva) az admin korábbi indoklása törlődik,
--    így bejelentkezett felhasználó sem olvashatja ki egy aktív barber régi felfüggesztési okát.
-- =============================================================================

revoke select on public.barbers from anon;
grant select (id, slug, display_name, bio, city, address, phone, instagram, avatar_path, is_listed, shop_id,
              status, approved_at, created_at)
  on public.barbers to anon;

revoke select on public.shops from anon;
grant select (id, slug, name, bio, city, address, phone, instagram, avatar_path, is_listed, status, approved_at,
              created_at)
  on public.shops to anon;

create function private.clear_reason_on_approve()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'approved' then
    new.reject_reason := null;
  end if;
  return new;
end;
$$;

create trigger barbers_clear_reason_on_approve
  before update of status on public.barbers
  for each row execute function private.clear_reason_on_approve();

create trigger shops_clear_reason_on_approve
  before update of status on public.shops
  for each row execute function private.clear_reason_on_approve();

-- A már jóváhagyottaknál maradt régi indoklás törlése
update public.barbers set reject_reason = null where status = 'approved' and reject_reason is not null;
update public.shops set reject_reason = null where status = 'approved' and reject_reason is not null;
