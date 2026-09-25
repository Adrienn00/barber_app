# frontend/ – amit a felhasználó lát

| Mappa | Mi van benne |
| --- | --- |
| `components/ui/` | Általános építőkockák, bárhol használhatók: `Card`, `StatusRow`, később `Button`, `Input`, `Badge`… |
| `components/layout/` | Oldalkeretek: `PageContainer` (tartalom oszlop), `PageHeader` (cím), később fejléc, menü |
| `components/<téma>/` | Egy-egy témához tartozó komponensek, pl. `system/`, később `booking/`, `calendar/`, `barber/`, `auth/` |
| `styles/` | `globals.css` (színek, alapstílus), `fonts.ts` (betűtípusok) |
| `lib/` | Böngészőben futó segédkód, pl. `supabase-browser.ts` (élő frissítéshez) |

**Szabályok**
- Egy fájl = egy komponens, a fájl neve = a komponens neve (`Card.tsx` → `Card`).
- A komponens nem kér le adatot közvetlenül: az oldal (`app/`) adja át neki props-ként.
- Minden felirat magyar.
