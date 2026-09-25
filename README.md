# Barber időpontfoglaló platform

Mobilra optimalizált webapp (PWA), amelyen önálló barberek kezelik az időpontjaikat, a vendégek pedig foglalási kérést küldenek nekik.
Specifikáció: [docs/barber_app_specifikacio_v1.1.pdf](docs/barber_app_specifikacio_v1.1.pdf) (az 1.0 elavult).

**Stack:** Next.js 16 (App Router) · TypeScript strict · Tailwind CSS 4 · Supabase (Postgres, Auth, RLS) · date-fns(-tz) · Vitest

## Előfeltételek

- Node.js 24 LTS
- Docker Desktop (a helyi Supabase-hez és az adatbázis-tesztekhez, az 1. fázistól)

## Indítás helyben

```bash
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
# töltsd ki a .env.local-t a Supabase Dashboard → Project Settings → API értékeivel
npm run dev
```

Nyisd meg a http://localhost:3000 címet. A kezdőlap mutatja, hogy él-e a Supabase kapcsolat.

## Parancsok

| Parancs | Mit csinál |
| --- | --- |
| `npm run dev` | Fejlesztői szerver |
| `npm run build` | Éles build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript ellenőrzés |
| `npm test` | Unit tesztek (adatbázis nélkül) |
| `npm run test:db` | Adatbázis-tesztek: RLS, megkötések (fusson a helyi Supabase) |
| `npm run db:start` / `db:stop` | Helyi Supabase indítása / leállítása (Docker) |
| `npm run db:reset` | Helyi adatbázis újraépítése: migrációk + tesztadatok |
| `npm run db:types` | Supabase típusok generálása a helyi adatbázisból |

## Helyi adatbázis

Előfeltétel: fut a Docker Desktop. `npm run db:start` után:

- Adatbázis-böngésző (Studio): http://127.0.0.1:54323
- Tesztfiókok (jelszó mindegyiknél: `Jelszo123!`), lásd [supabase/seed.sql](supabase/seed.sql):

| E-mail | Szerep |
| --- | --- |
| admin@barber.test | platform admin |
| peti@barber.test | jóváhagyott barber (Kovács Péter, `/b/kovacs-peter`) |
| laci@barber.test | jóváhagyott barber (Nagy László, `/b/nagy-laci`) |
| zoli@barber.test | függő barberjelentkezés |
| anna@vendeg.test | vendég, mindkét barbernél foglalt |
| bela@vendeg.test | vendég, csak Lacinál foglalt |

Munka végén: `npm run db:stop`, és a Docker Desktop bezárható.

## Mappaszerkezet

```
docs/                  specifikáció
src/app/               oldalak (App Router)
src/components/        közös UI komponensek
src/lib/               logika (datetime, env)
src/lib/supabase/      Supabase kliensek (böngésző, szerver, proxy)
src/proxy.ts           munkamenet-frissítés minden kérésnél (Next 16: a middleware új neve)
supabase/migrations/   adatbázis-migrációk – minden sémaváltozás ide kerül
supabase/seed.sql      helyi tesztadatok (élesbe nem kerül)
tests/db/              adatbázis-tesztek (RLS, megkötések)
```

A specifikációt kiegészítő döntések: [docs/dontesek.md](docs/dontesek.md).

## Szabályok

- Minden időpontot UTC-ben (`timestamptz`) tárolunk, a megjelenítés `Europe/Bucharest` időzónában történik (`src/lib/datetime.ts`).
- Titkos kulcs (`SUPABASE_SECRET_KEY`, VAPID, Resend) soha nem kaphat `NEXT_PUBLIC_` előtagot, és soha nem kerül gitbe.
- A felület kizárólag magyar nyelvű.
