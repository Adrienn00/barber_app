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
| `npm test` | Vitest tesztek |
| `npm run db:start` / `db:stop` | Helyi Supabase (Docker) |
| `npm run db:types` | Supabase típusok generálása a helyi adatbázisból |

## Mappaszerkezet

```
docs/                  specifikáció
src/app/               oldalak (App Router)
src/components/        közös UI komponensek
src/lib/               logika (datetime, env)
src/lib/supabase/      Supabase kliensek (böngésző, szerver, proxy)
src/proxy.ts           munkamenet-frissítés minden kérésnél (Next 16: a middleware új neve)
supabase/migrations/   adatbázis-migrációk – minden sémaváltozás ide kerül
```

## Szabályok

- Minden időpontot UTC-ben (`timestamptz`) tárolunk, a megjelenítés `Europe/Bucharest` időzónában történik (`src/lib/datetime.ts`).
- Titkos kulcs (`SUPABASE_SECRET_KEY`, VAPID, Resend) soha nem kaphat `NEXT_PUBLIC_` előtagot, és soha nem kerül gitbe.
- A felület kizárólag magyar nyelvű.
