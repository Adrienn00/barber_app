-- =============================================================================
-- 8. fázis – E-mail csatorna: az értesítés e-mailben is kimegy (ha be van kapcsolva).
-- Az email_sent_at megakadályozza, hogy egy push-újrapróbálás miatt kétszer menjen ki a levél.
-- =============================================================================

alter table public.notifications add column email_sent_at timestamptz;
