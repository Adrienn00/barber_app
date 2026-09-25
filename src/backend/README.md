# backend/ – szerveroldali kód

Ez a kód **csak a szerveren fut**, soha nem jut el a böngészőbe (a fájlok elején `import "server-only"` védi).
Itt beszélünk az adatbázissal, és itt lehetnek titkos kulcsok.

## Felépítés: témánként egy mappa, bennük mindig ugyanaz a három réteg

```
backend/
  core/        közös alap: adatbázis-kapcsolat, bejelentkezés-frissítés, hibaüzenetek
  auth/        belépés, regisztráció, kilépés, „ki van bejelentkezve”, oldalvédelem
  profile/     saját profil (név, telefon)
  barbers/     barberjelentkezés, barberprofil
  admin/       platform admin: jóváhagyás, felfüggesztés, statisztika
  calendar/    barber naptár: foglalások, magánprogramok (heti ismétlődés), kézi foglalás
  shops/       egységek (üzletek): létrehozás, meghívók, csatlakozás/kilépés, a vezető áttekintése
  health/      rendszerállapot-ellenőrzés
```

| Fájl | Mi van benne | Ki hívja |
| --- | --- | --- |
| `*.actions.ts` | Az űrlapok ide küldenek: ellenőrzi a beküldött adatot, meghívja a service-t, továbbirányít | a frontend űrlapjai |
| `*.service.ts` | Üzleti logika: mit szabad, mi történjen, milyen formában kapja a frontend az adatot | actions és oldalak (`app/`) |
| `*.queries.ts` | Supabase-hívások: csak lekérdez / ír, döntést nem hoz | csak a saját mappája service-e |

**Új téma** (pl. foglalások) → új mappa `bookings/` a három fájllal: `bookings.actions.ts`, `bookings.service.ts`, `bookings.queries.ts`.

## core/

| Fájl | Mi ez |
| --- | --- |
| `server-client.ts` | Adatbázis-kapcsolat a bejelentkezett felhasználó nevében (`createClient`, `DbClient` típus) |
| `session.ts` | Minden kérés előtt: bejelentkezés frissítése, védett oldalak átirányítása (a `src/proxy.ts` hívja) |
| `errors.ts` | Supabase-hibák magyar üzenetre fordítása |
| `origin.ts` | Az app címe (linkek összerakásához, pl. meghívó link) |

**Hol van maga az adatbázis?** A projekt gyökerében, a `supabase/` mappában: táblák és jogosultságok (`migrations/`), tesztadatok (`seed.sql`).
