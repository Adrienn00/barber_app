@AGENTS.md

# Projekt

ChairTime – időpontfoglaló platform barbereknek (csak barberek, más szakma nem). Spec: `docs/barber_app_specifikacio_v1.1.pdf` (az 1.0 elavult),
kiegészítő döntések: `docs/dontesek.md` (ezek felülírják a PDF-et).
Fázisonként haladunk (spec 12. fejezet); minden fázis végén megállás, összefoglaló, jóváhagyás.

- Kommunikáció és minden UI szöveg magyarul.
- Időzóna: Europe/Bucharest, tárolás UTC `timestamptz`. Dátumkezelés: `src/shared/datetime/datetime.ts`.
- Mappaszerkezet (a felhasználó kérése, tartsd be): `src/app/` csak vékony oldalak; `src/frontend/components/{ui,layout,<téma>}/`
  egy fájl = egy komponens, props-ból dolgozik; `src/backend/<téma>/` (auth, profile, barbers, admin…) mappánként
  `<téma>.actions.ts` → `<téma>.service.ts` → `<téma>.queries.ts` (csak Supabase-hívás), közös rész `src/backend/core/`;
  backend fájlok elején `import "server-only"`;
  `src/shared/` közös kód. Új mappánál/fontos fájlnál frissítsd az adott mappa README.md-jét.
- Next 16: a middleware neve `proxy` (`src/proxy.ts`).
- Sémaváltozás csak `supabase/migrations`-ben. A biztonság az RLS-ben van, a proxy csak kényelmi réteg.
- Parancsok: `npm run dev | lint | typecheck | test | build`; adatbázis: `npm run db:start | db:reset | test:db | db:types`.
- Sémaváltozás után: `db:reset`, `db:types`, `test:db`. Új táblánál: `revoke all ... from anon, authenticated`, majd explicit
  (oszlopszintű) GRANT + RLS policy (lásd `20260924120100_rls.sql`, `20260926120000_shops.sql`). Minden új jogosultsághoz teszt kell
  (`tests/db/`), ami azt is ellenőrzi, amit NEM szabad (pl. státusz önjóváhagyása).
