@AGENTS.md

# Projekt

Barber időpontfoglaló platform. Spec: `docs/barber_app_specifikacio_v1.1.pdf` (az 1.0 elavult),
kiegészítő döntések: `docs/dontesek.md` (ezek felülírják a PDF-et).
Fázisonként haladunk (spec 12. fejezet); minden fázis végén megállás, összefoglaló, jóváhagyás.

- Kommunikáció és minden UI szöveg magyarul.
- Időzóna: Europe/Bucharest, tárolás UTC `timestamptz`. Dátumkezelés: `src/shared/datetime/datetime.ts`.
- Mappaszerkezet (a felhasználó kérése, tartsd be): `src/app/` csak vékony oldalak; `src/frontend/components/{ui,layout,<téma>}/`
  egy fájl = egy komponens, props-ból dolgozik; `src/backend/{supabase,services,actions}/` szerveroldal, `import "server-only"`;
  `src/shared/` közös kód. Új mappánál/fontos fájlnál frissítsd az adott mappa README.md-jét.
- Next 16: a middleware neve `proxy` (`src/proxy.ts`).
- Sémaváltozás csak `supabase/migrations`-ben. A biztonság az RLS-ben van, a proxy csak kényelmi réteg.
- Parancsok: `npm run dev | lint | typecheck | test | build`; adatbázis: `npm run db:start | db:reset | test:db | db:types`.
- Sémaváltozás után: `db:reset`, `db:types`, `test:db`. Új táblánál explicit GRANT + RLS policy kell (lásd `20260924120100_rls.sql`).
