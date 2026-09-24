@AGENTS.md

# Projekt

Barber időpontfoglaló platform. Spec: `docs/barber_app_specifikacio_v1.1.pdf` (az 1.0 elavult).
Fázisonként haladunk (spec 12. fejezet); minden fázis végén megállás, összefoglaló, jóváhagyás.

- Kommunikáció és minden UI szöveg magyarul.
- Időzóna: Europe/Bucharest, tárolás UTC `timestamptz`. Dátumkezelés: `src/lib/datetime.ts`.
- Next 16: a middleware neve `proxy` (`src/proxy.ts`).
- Sémaváltozás csak `supabase/migrations`-ben. A biztonság az RLS-ben van, a proxy csak kényelmi réteg.
- Parancsok: `npm run dev | lint | typecheck | test | build`.
