# backend/ – szerveroldali kód

Ez a kód **csak a szerveren fut**, soha nem jut el a böngészőbe (minden fájl elején `import "server-only"` védi).
Itt lehetnek titkos kulcsok és itt beszélünk az adatbázissal.

| Mappa | Mi van benne |
| --- | --- |
| `supabase/` | Adatbázis-kapcsolat: `server-client.ts` (bejelentkezett felhasználó nevében), `session.ts` (bejelentkezés frissítése minden kérésnél) |
| `services/` | Üzleti logika témánként, egy fájl = egy téma: `health.service.ts`, később `barbers.service.ts`, `bookings.service.ts`, `slots.service.ts`… |
| `actions/` *(2. fázistól)* | Űrlapok beküldése (server actions): belépés, foglalás, jóváhagyás… – ezek hívják a service-eket |

**Hol van maga az adatbázis?** A projekt gyökerében, a `supabase/` mappában: táblák és jogosultságok (`migrations/`), tesztadatok (`seed.sql`).
