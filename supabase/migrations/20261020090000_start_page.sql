-- =============================================================================
-- A barber indulóoldala (dontesek.md 36.): mi nyíljon meg, amikor megnyitja az appot.
--   home        – a kezdőlap (mint eddig)
--   calendar    – a naptára
--   new_booking – a naptára, rögtön a kézi foglalás űrlapjával (pl. ha vágás közben hívják)
-- =============================================================================

alter table public.barber_settings
  add column start_page text not null default 'home'
  check (start_page in ('home', 'calendar', 'new_booking'));

grant update (start_page) on public.barber_settings to authenticated;
