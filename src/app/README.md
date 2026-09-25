# app/ – útvonalak (oldalak)

A Next.js ebből a mappából tudja, milyen címek (URL-ek) léteznek. **Csak vékony oldal-fájlok vannak itt:**
egy oldal lekéri az adatot a `backend/`-ből, és átadja a `frontend/` komponenseinek. Logika és nagy JSX ide nem kerül.

| Fájl / mappa | URL | Mi ez |
| --- | --- | --- |
| `layout.tsx` | minden oldal | közös keret: nyelv, betűtípus, színek |
| `page.tsx` | `/` | kezdőlap (most: rendszerállapot) |

Egy mappa = egy URL-szakasz, pl. később `foglalasaim/page.tsx` → `/foglalasaim`, `b/[slug]/page.tsx` → `/b/kovacs-peter`.
