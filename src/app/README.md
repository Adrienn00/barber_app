# app/ – útvonalak (oldalak)

A Next.js ebből a mappából tudja, milyen címek (URL-ek) léteznek. **Csak vékony oldal-fájlok vannak itt:**
egy oldal lekéri az adatot a `backend/`-ből, és átadja a `frontend/` komponenseinek. Logika és nagy JSX ide nem kerül.

| Fájl | URL | Ki láthatja | Mi ez |
| --- | --- | --- | --- |
| `layout.tsx` | minden oldal | – | közös keret: fejléc, betűtípus, színek |
| `page.tsx` | `/` | mindenki | kezdőlap: „Barbert keresel?” / „Barber vagy?” |
| `belepes/page.tsx` | `/belepes` | kijelentkezett | belépés |
| `regisztracio/page.tsx` | `/regisztracio` | kijelentkezett | regisztráció |
| `auth/callback/route.ts` | `/auth/callback` | – | Google-belépés / e-mail megerősítés visszatérése |
| `auth/tovabb/route.ts` | `/auth/tovabb` | – | belépés után eldönti, hova menjen (profil, naptár, platform, kért oldal) |
| `profil/page.tsx` | `/profil` | bejelentkezett | saját adatok, kötelező telefonszám |
| `barber-leszek/page.tsx` | `/barber-leszek` | mindenki | barberjelentkezés és állapota |
| `(barber)/layout.tsx` | – | jóváhagyott barber | védi a barber oldalakat |
| `(barber)/naptar/page.tsx` | `/naptar` | jóváhagyott barber | naptár (3. fázis) |
| `platform/page.tsx` | `/platform` | admin | barberek jóváhagyása, alapszámok |
| `allapot/page.tsx` | `/allapot` | mindenki | technikai állapot |
| `aszf/`, `adatvedelem/` | `/aszf`, `/adatvedelem` | mindenki | jogi oldalak (szöveg a 8. fázisban) |

Egy mappa = egy URL-szakasz. A zárójeles mappa, pl. `(barber)`, nem jelenik meg az URL-ben – csak csoportosít.
